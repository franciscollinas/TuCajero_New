const { spawn, execSync } = require('node:child_process');
const path = require('node:path');

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
