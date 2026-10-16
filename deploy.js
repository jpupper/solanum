// deploy.js — wrapper del deploy real.
//
// POR QUE EXISTE ESTE WRAPPER
// El FTP de este hosting (IIS de Ferozo, wi551474) corta el canal de datos a pocos KB:
// los archivos grandes llegan truncados o en 0 bytes y despues quedan bloqueados
// ("550 being used by another process"). El deploy viejo de este archivo subia todo por
// FTP (y ademas subia app_offline.htm, que en IIS PONE EL SITIO EN MANTENIMIENTO: eso
// tumbo solanum.com.ar). El deploy que funciona esta en deploy_http.py: sube un aplicador
// PHP minusculo por FTP y manda cada archivo por HTTP, verificando tamanos.
//
// Este wrapper mantiene el comando de siempre (`node deploy.js` y deploy.bat) funcionando
// pero apuntando al camino bueno. El deploy viejo queda en deploy.js.ftp-broken.bak.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repo = __dirname;
const args = ['deploy_http.py'];
if (!fs.existsSync(path.join(repo, 'compiled'))) args.push('--build');
if (process.argv.includes('--todo') || process.argv.includes('--all')) args.push('--todo');

const py = process.platform === 'win32' ? 'python' : 'python3';
console.log('[deploy.js] ejecutando: ' + py + ' ' + args.join(' '));
const r = spawnSync(py, args, { cwd: repo, stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
