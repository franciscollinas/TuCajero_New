module.exports = {
  appId: 'com.tucajero.pos',
  productName: 'TuCajero',
  directories: {
    output: 'release-build',
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'package.json',
    '!app/**/*',
    '!config/**/*',
    '!database/**/*',
    '!scripts/**/*',
    '!tools/**/*',
    '!tests/**/*',
    '!node_modules/**/test/**',
    '!node_modules/**/tests/**',
    '!node_modules/**/*.test.*',
    '!node_modules/**/*.md',
    '!node_modules/**/docs/**',
  ],
  extraMetadata: {
    main: 'dist/main/app/main/main.js',
  },
  compression: 'store',
  asar: {
    unpackDir: 'node_modules/sharp',
  },
  electronVersion: '30.0.0',
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    compression: 'lzma',
  },
};
