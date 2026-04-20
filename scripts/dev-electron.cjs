const { spawn, execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const projectRoot = path.join(__dirname, '..');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// Compile TypeScript - ignore errors but compile
try {
  execSync('npx tsc -p tsconfig.main.json --noEmitOnError false', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('TSC compilation failed, but attempting to start Electron anyway...');
}

// Copy generated-client to dist so Prisma can find it at runtime
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('[dev-electron] generated-client source not found:', src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const generatedClientSrc = path.join(
  projectRoot,
  'app',
  'main',
  'repositories',
  'generated-client',
);
const generatedClientDest = path.join(
  projectRoot,
  'dist',
  'main',
  'app',
  'main',
  'repositories',
  'generated-client',
);
console.log('[dev-electron] Copiando generated-client a dist...');
copyDirSync(generatedClientSrc, generatedClientDest);
console.log('[dev-electron] generated-client copiado correctamente.');

const child = spawn(electronPath, ['.'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
