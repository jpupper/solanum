const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const { enterPassiveModeIPv4 } = require('basic-ftp/dist/transfer');

// Determine directories within D:\Programacion\solanum
const currentDir = __dirname;
const compiledDir = path.join(currentDir, 'compiled');
const credsPath = path.join(currentDir, 'ftp_credentials.json');

const FTP_CONFIG = {
  host: 'wi551474.ferozo.com', // Server IP: 200.58.120.2
  user: 'wi551474@wi551474.ferozo.com',
  port: 21,
  remoteRoot: '/public_html'
};

const DEFAULT_FTP_PASSWORD = '@XOwiEgfhJ8xN3/';

function getPassword() {
  if (process.env.FTP_PASSWORD) {
    return process.env.FTP_PASSWORD;
  }
  if (fs.existsSync(credsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (data.password) return data.password;
    } catch (e) {}
  }
  return DEFAULT_FTP_PASSWORD;
}

function getLocalFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getLocalFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Cleanup routine: Delete orphan temporary files (.tmp, .tmp_up, .TEMP)
async function cleanOrphanTempFiles(client, remoteDir) {
  try {
    const list = await client.list(remoteDir);
    for (const item of list) {
      if (!item.isDirectory && (item.name.endsWith('.tmp') || item.name.endsWith('.tmp_up') || item.name.endsWith('.TEMP') || item.name.includes('.unique_') || item.name.includes('.pasvtest') || item.name.includes('.test_pasv') || item.name.includes('test_iis'))) {
        console.log(`[LIMPIEZA] Eliminando archivo temporal huérfano: ${item.name}`);
        await client.remove(remoteDir + '/' + item.name).catch(() => {});
      }
    }
  } catch (e) {}
}

async function uploadFileStrictly(password, localFile, remotePath, remoteDir) {
  const localSize = fs.statSync(localFile).size;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    let client = new ftp.Client(15000); // 15s timeout
    try {
      client.prepareTransfer = (f) => enterPassiveModeIPv4(f);
      client.ftp.verbose = false;

      await client.access({
        host: FTP_CONFIG.host,
        user: FTP_CONFIG.user,
        password: password,
        port: FTP_CONFIG.port,
        secure: false
      });

      await client.ensureDir(remoteDir);

      // Attempt direct upload to remotePath
      let directError = null;
      try {
        await client.remove(remotePath).catch(() => {});
        await client.uploadFrom(localFile, remotePath);
      } catch (err) {
        directError = err;
      }

      // Check if direct upload succeeded and size matches
      try {
        const remoteSize = await client.size(remotePath);
        if (remoteSize === localSize) {
          client.close();
          return { success: true, verifiedSize: remoteSize, attempt };
        }
      } catch (e) {}

      // If direct upload failed due to IIS lock (550), try temp file + replace
      const tmpPath = remotePath + '.tmp_deploy';
      try {
        await client.uploadFrom(localFile, tmpPath);
        const tmpSize = await client.size(tmpPath);
        if (tmpSize === localSize) {
          await client.remove(remotePath).catch(() => {});
          await client.rename(tmpPath, remotePath);
          const finalSize = await client.size(remotePath);
          if (finalSize === localSize) {
            client.close();
            return { success: true, verifiedSize: finalSize, attempt };
          }
        }
        await client.remove(tmpPath).catch(() => {});
      } catch (tmpErr) {
        await client.remove(tmpPath).catch(() => {});
      }

      client.close();
    } catch (globalErr) {
      if (client) { try { client.close(); } catch (e) {} }
    }

    await sleep(1500);
  }

  // If all attempts failed, check final state one last time
  let finalClient = new ftp.Client(10000);
  try {
    finalClient.prepareTransfer = (f) => enterPassiveModeIPv4(f);
    await finalClient.access({ host: FTP_CONFIG.host, user: FTP_CONFIG.user, password: password, port: FTP_CONFIG.port, secure: false });
    const sz = await finalClient.size(remotePath);
    finalClient.close();
    if (sz === localSize) return { success: true, verifiedSize: sz, attempt: maxAttempts };
  } catch (e) {
    if (finalClient) try { finalClient.close(); } catch (err) {}
  }

  return { success: false, localSize, error: 'El servidor IIS tiene el archivo bloqueado o denegó el acceso (550).' };
}

(async () => {
  console.log('====================================================');
  console.log('       SOLANUM FTP DEPLOYMENT PIPELINE (ESTRICTO)   ');
  console.log('====================================================');
  console.log(`Server Host : ${FTP_CONFIG.host}`);
  console.log(`FTP User    : ${FTP_CONFIG.user}`);
  console.log(`Remote Path : ${FTP_CONFIG.remoteRoot}`);
  console.log(`Local Source: ${compiledDir}\n`);

  if (!fs.existsSync(compiledDir)) {
    console.error('[ERROR] Carpeta "compiled" no encontrada.');
    process.exit(1);
  }

  const password = getPassword();

  // Limpieza inicial de temporales antiguos en public_html
  let initClient = new ftp.Client(15000);
  try {
    initClient.prepareTransfer = (f) => enterPassiveModeIPv4(f);
    await initClient.access({ host: FTP_CONFIG.host, user: FTP_CONFIG.user, password: password, port: FTP_CONFIG.port, secure: false });
    console.log('[LIMPIEZA] Eliminando temporales obsoletos en public_html...');
    await cleanOrphanTempFiles(initClient, FTP_CONFIG.remoteRoot);
    initClient.close();
  } catch (e) {
    if (initClient) try { initClient.close(); } catch (err) {}
  }

  const localFiles = getLocalFiles(compiledDir);
  console.log(`\nArchivos locales a desplegar: ${localFiles.length}`);
  console.log('Iniciando transferencia con verificación estricta de tamaño...\n');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const failedFilesList = [];

  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i];
    const relPath = path.relative(compiledDir, file).replace(/\\/g, '/');
    const remotePath = (FTP_CONFIG.remoteRoot + '/' + relPath).replace(/\/+/g, '/');
    const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
    const sizeKb = Math.round(fs.statSync(file).size / 1024 * 10) / 10;

    process.stdout.write(`[${i + 1}/${localFiles.length}] Subiendo ${relPath} (${sizeKb} KB)... `);

    const res = await uploadFileStrictly(password, file, remotePath, remoteDir);

    if (res.success) {
      successCount++;
      const vSizeKb = Math.round(res.verifiedSize / 1024 * 10) / 10;
      console.log(`✔ OK (Verificado: ${vSizeKb} KB en FTP)`);
    } else {
      failCount++;
      failedFilesList.push({ file: relPath, error: res.error });
      console.log(`✖ FALLÓ (${res.error})`);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log('\n====================================================');
  console.log('             RESUMEN DE DESPLIEGUE FTP              ');
  console.log('====================================================');
  console.log(`Total archivos       : ${localFiles.length}`);
  console.log(`Subidos y Verificados: ${successCount}`);
  console.log(`Errores / Bloqueados : ${failCount}`);
  console.log(`Tiempo total         : ${durationSec}s`);
  console.log('====================================================');

  if (failCount > 0) {
    console.error('\n[ARCHIVOS QUE NO SE PUDIERON SOBREESCRIBIR POR BLOQUEO IIS]:');
    failedFilesList.forEach(f => console.error(` - ${f.file}: ${f.error}`));
    console.error('\n[DESPLIEGUE PARCIAL] Revisa la lista de errores arriba.');
    process.exit(1);
  } else {
    console.log('\n[DESPLIEGUE EXITOSO] 100% de los archivos fueron subidos y verificados con su tamaño exacto.');
    process.exit(0);
  }
})();
