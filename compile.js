const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Determine directories within D:\Programacion\solanum
const currentDir = __dirname;
const srcDir = currentDir;
const outDir = path.join(currentDir, 'compiled');

const MAX_SIZE_BYTES = 512 * 1024; // 512 KB (524,288 bytes)
const SIZE_TRIGGER_BYTES = 350 * 1024; // 350 KB

console.log('====================================================');
console.log('       SOLANUM SITE OBFUSCATION & BUILD PROCESS     ');
console.log('====================================================');
console.log(`Source Directory: ${srcDir}`);
console.log(`Output Directory: ${outDir}`);
console.log(`Strict File Size Limit: 512 KB (${MAX_SIZE_BYTES} bytes)\n`);

// Reset compiled output directory
if (fs.existsSync(outDir)) {
  console.log('Cleaning existing compiled folder...');
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

const stats = {
  totalFiles: 0,
  imagesOptimized: 0,
  jsObfuscated: 0,
  htmlObfuscated: 0,
  filesCopied: 0,
  maxSizeBytes: 0,
  maxFileName: ''
};

async function processDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip build tooling, compiled folder, and hidden files
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'compiled', 'compiled_test', 'solanum'].includes(entry.name)) continue;
      await processDirectory(srcPath, destPath);
    } else {
      if (['package.json', 'package-lock.json', 'compile.js', 'compile.bat', 'deploy.js', 'deploy.bat', 'ftp_credentials.json', '.gitignore', 'README.md'].includes(entry.name)) {
        continue;
      }
      await processFile(srcPath, destPath);
    }
  }
}

async function processFile(srcPath, destPath) {
  stats.totalFiles++;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const ext = path.extname(srcPath).toLowerCase();

  if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    await processImage(srcPath, destPath);
  } else if (ext === '.js') {
    processJS(srcPath, destPath);
  } else if (ext === '.html') {
    processHTML(srcPath, destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
    stats.filesCopied++;
  }
}

async function processImage(srcPath, destPath) {
  const stat = fs.statSync(srcPath);
  const relName = path.relative(srcDir, srcPath);

  // If image is already smaller than 350KB, copy directly
  if (stat.size < SIZE_TRIGGER_BYTES) {
    fs.copyFileSync(srcPath, destPath);
    stats.filesCopied++;
    return;
  }

  const meta = await sharp(srcPath).metadata();
  const targetWidth = Math.min(meta.width, 1400);

  if (!meta.hasAlpha) {
    await sharp(srcPath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(destPath);
  } else {
    await sharp(srcPath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .png({ quality: 75, palette: true, compressionLevel: 9, effort: 8 })
      .toFile(destPath);
  }

  // Safety fallback check if output is near 512KB
  let outSize = fs.statSync(destPath).size;
  if (outSize >= MAX_SIZE_BYTES - 10240) {
    await sharp(srcPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ quality: 65, palette: true, compressionLevel: 9 })
      .toFile(destPath);
    outSize = fs.statSync(destPath).size;
  }

  console.log(`[IMAGE] ${relName}: ${Math.round(stat.size / 1024)} KB -> ${Math.round(outSize / 1024)} KB`);
  stats.imagesOptimized++;
}

function processJS(srcPath, destPath) {
  const relName = path.relative(srcDir, srcPath);
  const code = fs.readFileSync(srcPath, 'utf8');

  try {
    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.3,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: [],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayThreshold: 0.75,
      unicodeEscapeSequence: false
    });

    const obCode = obfuscated.getObfuscatedCode();
    fs.writeFileSync(destPath, obCode, 'utf8');
    console.log(`[JS]    ${relName}: ${Math.round(code.length / 1024)} KB -> ${Math.round(obCode.length / 1024)} KB (Obfuscated)`);
    stats.jsObfuscated++;
  } catch (err) {
    console.error(`[ERROR] Failed to obfuscate JS file ${relName}:`, err.message);
    fs.copyFileSync(srcPath, destPath);
  }
}

function processHTML(srcPath, destPath) {
  const relName = path.relative(srcDir, srcPath);
  let content = fs.readFileSync(srcPath, 'utf8');
  let inlineScriptsFound = 0;

  content = content.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptCode) => {
    if (!scriptCode || !scriptCode.trim()) return match;
    inlineScriptsFound++;
    try {
      const obfuscated = JavaScriptObfuscator.obfuscate(scriptCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.3,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: [],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false
      });
      return '<script>' + obfuscated.getObfuscatedCode() + '</script>';
    } catch (err) {
      console.error(`[ERROR] Failed to obfuscate inline script in ${relName}:`, err.message);
      return match;
    }
  });

  fs.writeFileSync(destPath, content, 'utf8');
  const outSize = fs.statSync(destPath).size;
  console.log(`[HTML]  ${relName}: ${Math.round(outSize / 1024)} KB (${inlineScriptsFound} inline script(s) obfuscated)`);
  stats.htmlObfuscated++;
}

function verifyOutput(dir) {
  let failed = false;
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (verifyOutput(fullPath)) failed = true;
    } else {
      const sz = fs.statSync(fullPath).size;
      const rel = path.relative(outDir, fullPath);

      if (sz > stats.maxSizeBytes) {
        stats.maxSizeBytes = sz;
        stats.maxFileName = rel;
      }

      if (sz > MAX_SIZE_BYTES) {
        console.error(`\n[CRITICAL ERROR] File ${rel} exceeds 512 KB limit! Size: ${sz} bytes (${Math.round(sz / 1024)} KB)`);
        failed = true;
      }
    }
  }

  return failed;
}

(async () => {
  try {
    console.log('Starting compilation...\n');
    await processDirectory(srcDir, outDir);
    console.log('\n----------------------------------------------------');
    console.log('Verifying all compiled file sizes (< 512 KB limit)...');
    
    const verificationFailed = verifyOutput(outDir);

    console.log('\n====================================================');
    console.log('                  BUILD SUMMARY                     ');
    console.log('====================================================');
    console.log(`Total files compiled     : ${stats.totalFiles}`);
    console.log(`Images optimized (<512KB): ${stats.imagesOptimized}`);
    console.log(`JS files obfuscated      : ${stats.jsObfuscated}`);
    console.log(`HTML files processed     : ${stats.htmlObfuscated}`);
    console.log(`Other files copied       : ${stats.filesCopied}`);
    console.log(`Largest file in output   : ${stats.maxFileName} (${Math.round(stats.maxSizeBytes / 1024)} KB / ${stats.maxSizeBytes} bytes)`);
    console.log('====================================================');

    if (verificationFailed) {
      console.error('\n[BUILD FAILED] One or more files exceed the 512 KB server limit.');
      process.exit(1);
    } else {
      console.log('\n[BUILD SUCCESS] All files obfuscated and guaranteed under 512 KB!');
      process.exit(0);
    }
  } catch (err) {
    console.error('\n[FATAL BUILD ERROR]:', err);
    process.exit(1);
  }
})();
