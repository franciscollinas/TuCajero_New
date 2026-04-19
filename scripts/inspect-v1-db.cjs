/**
 * inspect-v1-db.cjs
 * Inspecciona la base de datos V1 y muestra todas sus tablas y columnas.
 * Uso: node scripts/inspect-v1-db.cjs [ruta-opcional-al-db]
 */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Intentar cargar better-sqlite3
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('ERROR: No se pudo cargar better-sqlite3. Asegúrate de estar en el directorio del proyecto.');
  process.exit(1);
}

// Rutas candidatas para la BD V1
const candidatePaths = [
  process.argv[2], // ruta pasada como argumento
  path.join(os.homedir(), 'AppData', 'Roaming', 'tucajero', 'tucajero.db'),
  path.join(os.homedir(), 'AppData', 'Local', 'TuCajero', 'database', 'pos.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'TuCajero', 'database', 'pos.db'),
  path.join(os.homedir(), 'Documents', 'Proyectos', 'TuCajeroPOS', 'tucajero', 'tucajero.db'),
  'C:\\Users\\UserMaster\\AppData\\Local\\TuCajero\\database\\pos.db',
  'C:\\Users\\UserMaster\\Documents\\Proyectos\\TuCajeroPOS\\tucajero\\tucajero.db',
].filter(Boolean);

let dbPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  console.error('No se encontró la BD V1 en ninguna de estas rutas:');
  candidatePaths.forEach((p) => console.error('  -', p));
  console.error('\nUso: node scripts/inspect-v1-db.cjs "C:\\ruta\\a\\tu\\bd.db"');
  process.exit(1);
}

console.log('\n========================================');
console.log('BD V1 encontrada en:', dbPath);
const stats = fs.statSync(dbPath);
console.log(`Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
console.log('========================================\n');

try {
  const db = new Database(dbPath, { readonly: true });

  // Obtener todas las tablas
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();

  if (tables.length === 0) {
    console.log('⚠️  La base de datos NO tiene tablas definidas por el usuario.');
    console.log('   Puede estar vacía o ser una BD de sistema.');
    db.close();
    process.exit(0);
  }

  console.log(`Tablas encontradas (${tables.length}):\n`);

  for (const { name } of tables) {
    // Obtener columnas
    const columns = db.prepare(`PRAGMA table_info("${name}")`).all();
    // Contar registros
    let count = 0;
    try {
      const row = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get();
      count = row.c;
    } catch {
      count = -1;
    }

    console.log(`📋 ${name}  (${count} registros)`);
    for (const col of columns) {
      console.log(`   • ${col.name}  [${col.type || 'TEXT'}]${col.pk ? ' PK' : ''}${col.notnull ? ' NOT NULL' : ''}`);
    }

    // Mostrar primeras 3 filas como muestra
    if (count > 0) {
      try {
        const rows = db.prepare(`SELECT * FROM "${name}" LIMIT 3`).all();
        console.log('   Muestra:');
        rows.forEach((r, i) => console.log(`   [${i + 1}]`, JSON.stringify(r)));
      } catch {
        // ignore
      }
    }
    console.log();
  }

  db.close();
} catch (err) {
  console.error('Error al abrir la BD:', err.message);
  process.exit(1);
}
