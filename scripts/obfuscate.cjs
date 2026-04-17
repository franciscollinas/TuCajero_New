/**
 * scripts/obfuscate.cjs
 *
 * Ofusca el código del proceso principal de Electron (dist/main) usando Terser.
 * Se ejecuta DESPUÉS de `tsc -p tsconfig.main.json` y ANTES de `electron-builder`.
 *
 * Prioridades de ofuscación:
 *  - Renombrado agresivo de variables/funciones (mangling)
 *  - Compresión máxima con eliminación de código muerto
 *  - Protección especial de license.service.js (compression al máximo)
 *
 * Uso: node scripts/obfuscate.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const DIST_MAIN = path.join(__dirname, '..', 'dist', 'main');

// Extensiones a excluir de la ofuscación
const EXCLUDED_EXTENSIONS = new Set(['.map', '.json', '.node', '.db', '.ico', '.png']);

// Configuración base de Terser (aplica a la mayoría de archivos)
const BASE_OPTIONS = {
  compress: {
    dead_code: true,
    drop_console: false,   // Mantener console.log (Winston los gestiona en producción)
    drop_debugger: true,
    passes: 2,
    pure_getters: true,
    unsafe: false,
    unsafe_comps: false,
  },
  mangle: {
    toplevel: false,       // true rompería los require() de CommonJS
    keep_classnames: false,
    keep_fnames: false,
  },
  format: {
    comments: false,       // Eliminar todos los comentarios del output
    semicolons: true,
  },
  sourceMap: false,        // Sin source maps en distribución
};

// Opciones más agresivas para el módulo de licencias (el más crítico)
const LICENSE_OPTIONS = {
  ...BASE_OPTIONS,
  compress: {
    ...BASE_OPTIONS.compress,
    passes: 3,
    drop_console: true,    // En license.service eliminamos los console.log
  },
  mangle: {
    ...BASE_OPTIONS.mangle,
    properties: false,     // NO mangle de propiedades — rompería Prisma/ORM
  },
};

/**
 * Recorre recursivamente un directorio y retorna todos los archivos .js
 * @param {string} dir
 * @returns {string[]}
 */
function getJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsFiles(fullPath));
    } else if (
      entry.isFile() &&
      path.extname(entry.name) === '.js' &&
      !EXCLUDED_EXTENSIONS.has(path.extname(entry.name))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Ofusca un archivo JS en su lugar usando Terser.
 * @param {string} filePath
 */
async function obfuscateFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const isLicenseFile = filePath.includes('license.service');
  const options = isLicenseFile ? LICENSE_OPTIONS : BASE_OPTIONS;

  try {
    const result = await minify(code, options);
    if (result.code) {
      fs.writeFileSync(filePath, result.code, 'utf8');
      const originalSize = Buffer.byteLength(code, 'utf8');
      const newSize = Buffer.byteLength(result.code, 'utf8');
      const reduction = (((originalSize - newSize) / originalSize) * 100).toFixed(1);
      const label = path.relative(DIST_MAIN, filePath).padEnd(60);
      const flag = isLicenseFile ? ' [🔐 CRÍTICO]' : '';
      console.log(`  ✓ ${label} ${reduction}% reducción${flag}`);
    }
  } catch (err) {
    // No relanzamos para no bloquear el resto del proceso
    console.error(`  ✗ ERROR en ${path.relative(DIST_MAIN, filePath)}: ${err.message}`);
  }
}

async function main() {
  console.log('\n🔒 TuCajero — Ofuscación Terser (dist/main)\n');
  console.log(`   Target: ${DIST_MAIN}\n`);

  if (!fs.existsSync(DIST_MAIN)) {
    console.error('❌  dist/main no existe. Ejecuta primero: npm run build:electron');
    process.exit(1);
  }

  const files = getJsFiles(DIST_MAIN);
  console.log(`   Archivos encontrados: ${files.length}\n`);

  let errCount = 0;
  for (const file of files) {
    try {
      await obfuscateFile(file);
    } catch {
      errCount++;
    }
  }

  const status = errCount === 0 ? '✅' : '⚠️';
  console.log(`\n${status}  Ofuscación completada — ${files.length} archivos procesados (${errCount} errores).\n`);

  if (errCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error fatal en obfuscate.cjs:', err);
  process.exit(1);
});
