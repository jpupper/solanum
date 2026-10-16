#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Deploy de solanum.com.ar  (hosting IIS de Ferozo: wi551474.ferozo.com)

POR QUE NO USA FTP PARA LOS ARCHIVOS
------------------------------------
El canal de datos FTP de ese hosting se corta a ~6 KB: basic-ftp / curl / ftplib
reportan ECONNRESET y el archivo queda TRUNCADO (medido: 5 KB, 64 KB, 1 MB -> siempre
~6 KB en disco) y ademas bloqueado (550 Access is denied). Verificado el 15-oct-2026.
FTPS tampoco esta soportado (el server no negocia TLS). Borrar+subir tampoco sirve:
el problema es el tamano, no el overwrite.

COMO SUBE ENTONCES
------------------
El sitio corre PHP 5.6. Se sube por FTP un aplicador PHP de ~1 KB (eso si viaja
entero), y cada archivo real se manda por HTTP POST en base64, verificando el tamano
que devuelve el server. Al terminar se borra el aplicador.

SI EL FTP NO DEJA SUBIR EL APLICADOR
------------------------------------
El FTP de este hosting se degrada por ratos: STOR de ~1 KB tira timeout y despues el
archivo queda bloqueado (550 'being used by another process'), incluso con nombres
nuevos. No es el script: es el server. Medido el 15-oct-2026 (varios minutos seguidos
sin poder subir nada, y antes habia subido perfecto). Cuando pasa:
  * esperar unos minutos y volver a correrlo (los bloqueados se liberan solos),
  * o subir/borrar desde el panel de Ferozo,
  * el site sigue andando igual: este script es solo para publicar cambios nuevos.

USO
---
    python deploy_http.py --build      # corre node compile.js primero
    python deploy_http.py              # sube solo lo que difiere del server
    python deploy_http.py --todo       # sube todo el build, sin comparar
"""

import base64
import ftplib
import json
import os
import re
import secrets
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from urllib.parse import quote

REPO = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(REPO, "compiled")
CREDS = os.path.join(REPO, "ftp_credentials.json")
UPLOADER_LOCAL = os.path.join(REPO, "deploy_uploader.php")
NOMBRE_APLICADOR = "deploy_uploader.php"

FTP_HOST = "wi551474.ferozo.com"
FTP_USER = "wi551474@wi551474.ferozo.com"
FTP_ROOT = "/public_html"
SITE = "http://solanum.com.ar"

# archivos del build que NO son del sitio (y app_offline.htm ademas pondria el sitio en mantenimiento)
EXCLUIR = {"app_offline.htm", "ftp_win.txt", "test_ftp_cmd.txt"}


def password():
    if os.environ.get("FTP_PASSWORD"):
        return os.environ["FTP_PASSWORD"]
    with open(CREDS, encoding="utf-8") as f:
        return json.load(f)["password"]


def ftp_conn():
    """Conexion FTP con PASV forzado a la IP de la conexion de control.

    El server de Ferozo anuncia en el PASV una IP que no es ruteable desde afuera
    (esta detras de NAT): si el cliente la respeta, el canal de datos se cuelga
    (timeout) o se corta. basic-ftp lo resuelve con enterPassiveModeIPv4; aca se
    hace lo mismo a mano.
    """
    ftp = ftplib.FTP(timeout=30)
    ftp.connect(FTP_HOST, 21)
    ftp.login(FTP_USER, password())
    host = ftp.host

    def makepasv():
        resp = ftp.sendcmd("PASV")
        m = re.search(r"\((\d+,\d+,\d+,\d+),(\d+),(\d+)\)", resp)
        if not m:
            return host, 21
        return host, int(m.group(2)) * 256 + int(m.group(3))

    ftp.makepasv = makepasv
    return ftp


def ftp_size(remote):
    ftp = ftp_conn()
    try:
        return ftp.size(remote)
    except ftplib.error_perm:
        return None
    finally:
        ftp.quit()


def ftp_borrar(remote):
    try:
        ftp = ftp_conn()
        ftp.delete(remote)
        ftp.quit()
        return True
    except ftplib.all_errors:
        return False


def ftp_subir(remote, local, intentos=8):
    """Sube un archivo chico por FTP verificando el tamano. Retorna True/False.

    OJO: siempre hay que BORRAR el remoto antes del STOR. En este hosting el STOR
    sobre un archivo existente lo deja bloqueado (550 'being used by another
    process') y todos los reintentos siguientes fallan por eso.
    """
    esperado = os.path.getsize(local)
    if esperado > 5800:
        print("  AVISO: %s pesa %d bytes (>6 KB): puede truncarse" % (os.path.basename(local), esperado))
    for i in range(1, intentos + 1):
        try:
            ftp = ftp_conn()
            try:
                ftp.delete(remote)
            except ftplib.all_errors:
                pass
            with open(local, "rb") as f:
                ftp.storbinary("STOR " + remote, f)
            ftp.quit()
        except ftplib.all_errors as e:
            print("  intento %d: %s" % (i, e))
        if ftp_size(remote) == esperado:
            return True
        time.sleep(1.5)
    return False


def http_head_size(url):
    try:
        req = urllib.request.Request(url + "?cb=" + uuid.uuid4().hex, method="HEAD")
        with urllib.request.urlopen(req, timeout=60) as r:
            return int(r.headers.get("Content-Length", -1))
    except urllib.error.HTTPError:
        return -1
    except Exception:
        return None


def post_archivo(url, token, rel, local, intentos=3):
    """Manda un archivo por HTTP (multipart, campo f) y devuelve el tamano que reporta el server.

    OJO: el aplicador NO puede usar el patron 'file_put_contents(base64_decode($_POST[...]))':
    el hosting lo rechaza (el archivo queda 403/500 y el POST no devuelve nada). El patron que
    funciona es multipart + move_uploaded_file (medido el 15-oct-2026).
    """
    esperado = os.path.getsize(local)
    datos = open(local, "rb").read()
    for i in range(1, intentos + 1):
        b = "----ck" + uuid.uuid4().hex
        cuerpo = b""
        for campo, valor in (("t", token), ("d", rel)):
            cuerpo += ("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n" % (b, campo, valor)).encode()
        cuerpo += ("--%s\r\nContent-Disposition: form-data; name=\"f\"; filename=\"%s\"\r\n"
                   "Content-Type: application/octet-stream\r\n\r\n" % (b, os.path.basename(rel))).encode() + datos + b"\r\n"
        cuerpo += ("--%s--\r\n" % b).encode()
        req = urllib.request.Request(url, data=cuerpo,
                                     headers={"Content-Type": "multipart/form-data; boundary=" + b})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                txt = r.read().decode("utf-8", "replace").strip()
        except Exception as e:
            txt = "EXC " + str(e)
        m = re.search(r"(?:OK|FALLO)\s+(-?\d+)", txt) or re.search(r"S=(-?\d+)", txt)
        if m and int(m.group(1)) == esperado:
            return esperado
        time.sleep(1)
    return None


def archivos_locales():
    out = []
    for raiz, _, fs in os.walk(BUILD):
        for f in fs:
            rel = os.path.relpath(os.path.join(raiz, f), BUILD).replace("\\", "/")
            if rel in EXCLUIR:
                continue
            out.append(rel)
    # primero lo liviano y critico
    out.sort(key=lambda r: (0 if r.lower().endswith((".html", ".css", ".js", ".svg", ".php")) else 1,
                            os.path.getsize(os.path.join(BUILD, r))))
    return out


def main():
    args = sys.argv[1:]
    if "--build" in args:
        print("== compilando (node compile.js) ==")
        if subprocess.call(["node", "compile.js"], cwd=REPO) != 0:
            print("ABORTO: fallo la compilacion")
            return 1
    if not os.path.isdir(BUILD):
        print("ABORTO: no existe compiled/. Corré con --build")
        return 1

    todos = archivos_locales()
    print("== comparando %d archivos del build contra %s ==" % (len(todos), SITE))
    # estos los maneja IIS/PHP: un HEAD no devuelve su contenido (404/405) y no hay nada que comparar
    SIN_COMPARAR = ("web.config", "enviar-contacto.php")
    pendientes, salteados = [], []
    for rel in todos:
        local = os.path.join(BUILD, rel)
        if "--todo" in args:
            pendientes.append(rel)
            continue
        if os.path.basename(rel) in SIN_COMPARAR:
            salteados.append(rel)
            continue
        web = http_head_size(SITE + "/" + quote(rel))
        if web != os.path.getsize(local):
            pendientes.append(rel)
    if salteados:
        print("sin comparar (los sirve el server, no son estaticos): %s" % ", ".join(salteados))
    print("a subir: %d | ya iguales: %d" % (len(pendientes), len(todos) - len(pendientes)))
    if not pendientes:
        print("nada para hacer: el sitio ya tiene este build")
        return 0

    # 1) aplicador PHP por FTP (chico, viaja entero)
    token = secrets.token_hex(16)
    tmp = os.path.join(REPO, ".deploy_uploader_tmp.php")
    with open(UPLOADER_LOCAL, encoding="utf-8") as f:
        php = f.read().replace("__TOKEN__", token)
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(php)
    print("== subiendo aplicador (%d bytes) ==" % os.path.getsize(tmp))
    # el nombre canonico puede haber quedado bloqueado por IIS en un deploy anterior
    # (paso real: 550 'being used by another process'); si pasa, se usa un nombre nuevo.
    nombres = [NOMBRE_APLICADOR, "deploy_up_%s.php" % secrets.token_hex(4)]
    aplicador = None
    for nombre in nombres:
        if ftp_subir(FTP_ROOT + "/" + nombre, tmp):
            aplicador = nombre
            break
        print("  no se pudo usar %s, pruebo con otro nombre" % nombre)
    os.remove(tmp)
    if aplicador is None:
        print("ABORTO: no se pudo subir el aplicador por FTP (reintentar en unos minutos)")
        return 1
    url = SITE + "/" + aplicador

    # 2) archivos por HTTP
    fallas = []
    for i, rel in enumerate(pendientes, 1):
        local = os.path.join(BUILD, rel)
        got = post_archivo(url, token, rel, local)
        if got is None:
            fallas.append(rel)
            print("[%d/%d] FALLA %s" % (i, len(pendientes), rel))
        else:
            print("[%d/%d] OK    %-44s %8d bytes" % (i, len(pendientes), rel, got))

    # 3) borrar el/los aplicadores (si no se puede, el token aleatorio lo deja inutil)
    for nombre in set(nombres):
        ftp_borrar(FTP_ROOT + "/" + nombre)
    quedo = ftp_size(FTP_ROOT + "/" + aplicador) is not None
    if quedo:
        print("OJO: deploy_uploader.php quedo en el server (bloqueado por IIS). El token es aleatorio,")
        print("     asi que no sirve para nada, pero conviene borrarlo desde el panel de Ferozo.")

    print("\n== RESUMEN == subidos: %d / %d | fallas: %d" % (len(pendientes) - len(fallas), len(pendientes), len(fallas)))
    for f in fallas:
        print("   FALLA: " + f)
    return 1 if fallas else 0


if __name__ == "__main__":
    sys.exit(main())
