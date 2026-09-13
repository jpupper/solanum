@echo off
title Despliegue FTP Solanum - wi551474.ferozo.com

echo ====================================================
echo    DESPLIEGUE FTP SOLANUM (ferozo.com)
echo ====================================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    goto END
)

if not exist "node_modules" (
    echo [INFO] Instalando dependencias necesarias para FTP...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias.
        echo.
        goto END
    )
)

if not exist "compiled" (
    echo [WARN] No se encontro la carpeta "compiled".
    echo [INFO] Ejecutando compilacion automatica primero...
    call node compile.js
    if errorlevel 1 (
        echo [ERROR] La compilacion previa al deploy ha fallado.
        echo.
        goto END
    )
)

echo [INFO] Iniciando proceso de despliegue por FTP...
echo.
call node deploy.js

if errorlevel 1 (
    echo.
    echo [ERROR] El despliegue FTP tuvo algunos errores. Revisa el reporte arriba.
) else (
    echo.
    echo ====================================================
    echo    DESPLIEGUE COMPLETADO EXITOSAMENTE!
    echo    El sitio solanum.com.ar esta actualizado en Ferozo.
    echo ====================================================
)

:END
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause
