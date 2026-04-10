module.exports = {
  appId: 'com.tucajero.pos',
  productName: 'TuCajero',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'package.json',
    '!**/*.map',
    '!node_modules/.cache/**',
  ],
  compression: 'maximum',
  asar: true,
  asarUnpack: [
    '**/*.node',
    '**/node_modules/sharp/**/*',
  ],
  electronVersion: '30.0.0',
  removePackageScripts: true,
  removePackageKeywords: true,
};
