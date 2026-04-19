/**
 * migrate-from-v1.cjs (VERSIÓN DETECTIVE)
 * ─────────────────────────────────────────────────────────────────────────────
 * Detectamos que la BD V1 usa nombres en inglés y minúsculas:
 * category, product, customer, sale, saleitem, payment, cashsession
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('node:path');
const fs   = require('node:fs');
const os   = require('node:os');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('ERROR: no se pudo cargar better-sqlite3.');
  process.exit(1);
}

const V1_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'tucajero', 'tucajero.db');
const V2_PATH = path.join(__dirname, '..', 'database', 'tucajero.db');

function log(msg) { console.log(msg); }
function ok(msg)  { console.log('  ✅ ' + msg); }
function warn(msg){ console.log('  ⚠️  ' + msg); }
function err(msg) { console.log('  ❌ ' + msg); }

log('\n======================================================================');
log('  SISTEMA DE MIGRACIÓN FLEXIBLE');
log('======================================================================\n');

if (!fs.existsSync(V1_PATH)) {
  err(`No se encontró la BD en: ${V1_PATH}`);
  process.exit(1);
}

const v1 = new Database(V1_PATH, { readonly: true });
const v2 = new Database(V2_PATH);

v2.pragma('journal_mode = WAL');
v2.pragma('foreign_keys = OFF');

const now = new Date().toISOString();
let globalCount = 0;

// Helper para encontrar tablas (inglés o español, mayus o minus)
function findTable(db, ...names) {
    const list = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(t => t.name.toLowerCase());
    for (const n of names) {
        if (list.includes(n.toLowerCase())) {
            return db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().find(t => t.name.toLowerCase() === n.toLowerCase()).name;
        }
    }
    return null;
}

// 1. Categorías
const tCat = findTable(v1, 'category', 'categorias', 'categoria');
if (tCat) {
    const rows = v1.prepare(`SELECT * FROM "${tCat}"`).all();
    console.log(`Detectadas ${rows.length} categorías en "${tCat}"`);
    const stmt = v2.prepare(`INSERT OR IGNORE INTO Category (id, name, color, createdAt, updatedAt) VALUES (@id, @name, @color, @now, @now)`);
    v2.transaction(() => {
        for (const r of rows) {
            stmt.run({ id: r.id, name: r.name || r.nombre || 'Sin nombre', color: r.color || '#3498db', now });
        }
    })();
    globalCount += rows.length;
}

// 2. Clientes
const tCli = findTable(v1, 'customer', 'clientes', 'cliente');
if (tCli) {
    const rows = v1.prepare(`SELECT * FROM "${tCli}"`).all();
    console.log(`Detectados ${rows.length} clientes en "${tCli}"`);
    const stmt = v2.prepare(`INSERT OR IGNORE INTO Customer (id, document, name, email, phone, address, isActive, createdAt, updatedAt) VALUES (@id, @doc, @name, @email, @phone, @address, @isActive, @now, @now)`);
    v2.transaction(() => {
        for (const r of rows) {
            stmt.run({ id: r.id, doc: r.document || r.documento, name: r.name || r.nombre, email: r.email, phone: r.phone || r.telefono, address: r.address || r.direccion, isActive: 1, now });
        }
    })();
    globalCount += rows.length;
}

// 3. Productos
const tProd = findTable(v1, 'product', 'productos', 'producto');
if (tProd) {
    const rows = v1.prepare(`SELECT * FROM "${tProd}"`).all();
    console.log(`Detectados ${rows.length} productos en "${tProd}"`);
    const stmt = v2.prepare(`INSERT OR IGNORE INTO Product (id, code, name, price, cost, stock, minStock, isActive, categoryId, taxRate, createdAt, updatedAt) VALUES (@id, @code, @name, @price, @cost, @stock, @minStock, @isActive, @categoryId, @taxRate, @now, @now)`);
    v2.transaction(() => {
        for (const r of rows) {
            stmt.run({ id: r.id, code: r.code || r.codigo || `V1-${r.id}`, name: r.name || r.nombre, price: r.price || r.precio || 0, cost: r.cost || r.costo || 0, stock: r.stock || 0, minStock: r.minStock || r.stock_minimo || 5, isActive: 1, categoryId: r.categoryId || r.categoria_id || 1, taxRate: 0.19, now });
        }
    })();
    globalCount += rows.length;
}

// 4. Ventas
const tSale = findTable(v1, 'sale', 'ventas', 'venta');
const tItem = findTable(v1, 'saleitem', 'venta_items', 'venta_item');
if (tSale) {
    const rows = v1.prepare(`SELECT * FROM "${tSale}"`).all();
    console.log(`Detectadas ${rows.length} ventas en "${tSale}"`);
    const stmtV = v2.prepare(`INSERT OR IGNORE INTO Sale (id, receiptNumber, userId, subtotal, taxAmount, total, status, customerId, createdAt) VALUES (@id, @num, 1, @sub, @tax, @total, 'COMPLETED', @custId, @created)`);
    v2.transaction(() => {
        for (const r of rows) {
            stmtV.run({ id: r.id, num: r.saleNumber || r.receiptNumber || `F-${r.id}`, sub: r.subtotal || r.total, tax: r.tax || 0, total: r.total, custId: r.customerId || r.cliente_id, created: r.createdAt || r.fecha || now });
        }
    })();
    globalCount += rows.length;

    if (tItem) {
        const items = v1.prepare(`SELECT * FROM "${tItem}"`).all();
        console.log(`Detectados ${items.length} items de venta en "${tItem}"`);
        const stmtI = v2.prepare(`INSERT OR IGNORE INTO SaleItem (saleId, productId, quantity, unitPrice, taxRate, subtotal, total, unitType) VALUES (@saleId, @prodId, @qty, @price, 0, @sub, @total, 'UNIT')`);
        v2.transaction(() => {
            for (const i of items) {
                const sub = (i.quantity || i.cantidad) * (i.unitPrice || i.precio);
                stmtI.run({ saleId: i.saleId || i.venta_id, prodId: i.productId || i.producto_id, qty: i.quantity || i.cantidad, price: i.unitPrice || i.precio, sub, total: sub });
            }
        })();
    }
}

v2.pragma('foreign_keys = ON');
v1.close(); v2.close();
log(`\n======================================================================`);
log(`  IMPORTACIÓN COMPLETADA: ${globalCount} registros.`);
log(`======================================================================\n`);
