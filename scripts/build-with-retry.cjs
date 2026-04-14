const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanDist() {
  try {
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      // Try to delete with retries since it might be locked
      for (let i = 0; i < 5; i++) {
        try {
          fs.rmSync(distPath, { recursive: true, force: true });
          console.log('dist folder cleaned');
          return;
        } catch (e) {
          console.log(`Attempt ${i + 1} to clean dist failed, waiting...`);
          require('child_process').execSync('timeout /t 2 /nobreak >nul', { stdio: 'inherit' });
        }
      }
    }
  } catch (e) {
    console.warn('Warning: could not clean dist folder:', e.message);
  }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n========== Build attempt ${attempt}/${MAX_RETRIES} ==========`);
    
    try {
      if (attempt > 1) {
        cleanDist();
        console.log(`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
        await sleep(RETRY_DELAY_MS);
      }
      
      execSync('npm run dist', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('\n========== BUILD SUCCESSFUL ==========\n');
      return;
    } catch (error) {
      console.error(`\nBuild attempt ${attempt} failed.`);
      
      if (attempt === MAX_RETRIES) {
        console.error('\n========== ALL BUILD ATTEMPTS FAILED ==========\n');
        process.exit(1);
      }
      
      console.log('Retrying in a few seconds...');
    }
  }
}

main();
