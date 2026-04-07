import type {
  InventoryAlertBuckets,
  InventoryImportRow,
  InventoryProduct,
} from '../../shared/types/inventory.types';

export type InventoryStatus = 'critical' | 'warning' | 'ok' | 'expired';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleDateString('es-CO');
}

export function getDaysUntil(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.ceil(diff / 86400000);
}

export function getInventoryStatus(product: InventoryProduct): InventoryStatus {
  const days = getDaysUntil(product.expiryDate);

  if (days !== null && days < 0) {
    return 'expired';
  }

  if (product.stock <= product.criticalStock) {
    return 'critical';
  }

  if (product.stock <= product.minStock) {
    return 'warning';
  }

  return 'ok';
}

export function getInventoryStatusLabel(status: InventoryStatus): string {
  switch (status) {
    case 'critical':
      return 'Crítico';
    case 'warning':
      return 'Bajo';
    case 'expired':
      return 'Vencido';
    default:
      return 'OK';
  }
}

export function getInventoryStatusColor(status: InventoryStatus): string {
  switch (status) {
    case 'critical':
    case 'expired':
      return '#DC2626';
    case 'warning':
      return '#D97706';
    default:
      return '#16A34A';
  }
}

export function buildInventoryAlertBuckets(products: InventoryProduct[]): InventoryAlertBuckets {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const critical = products.filter((product) => product.stock <= product.criticalStock);
  const warning = products.filter(
    (product) => product.stock > product.criticalStock && product.stock <= product.minStock,
  );
  const ok = products.filter((product) => product.stock > product.minStock);
  const expired = products.filter((product) => {
    if (!product.expiryDate) {
      return false;
    }

    const expiry = new Date(product.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry.getTime() < today.getTime();
  });
  const expiringSoon = products.filter((product) => {
    if (!product.expiryDate) {
      return false;
    }

    const expiry = new Date(product.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 60;
  });

  return { critical, warning, ok, expired, expiringSoon };
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseNumeric(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function parseOptionalText(value: unknown): string | null {
  const text = parseText(value);
  return text ? text : null;
}

function readField(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalizedCandidates = candidates.map((candidate) => normalizeHeader(candidate));

  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    if (normalizedCandidates.includes(normalized)) {
      return row[key];
    }
  }

  return undefined;
}

export function rowToInventoryImport(row: Record<string, unknown>): InventoryImportRow | null {
  const code = parseText(readField(row, ['code', 'codigo', 'código', 'sku']));
  const name = parseText(readField(row, ['name', 'nombre', 'producto']));
  const category = parseText(readField(row, ['category', 'categoria', 'categoría']));

  if (!code || !name || !category) {
    return null;
  }

  return {
    code,
    barcode: parseOptionalText(readField(row, ['barcode', 'codigobarras', 'codbarras'])),
    name,
    description: parseOptionalText(readField(row, ['description', 'descripcion', 'descripción'])),
    category,
    categoryColor: parseOptionalText(readField(row, ['categorycolor', 'colorcategoria', 'color'])),
    price: String(parseNumeric(readField(row, ['price', 'precio']))),
    cost: String(parseNumeric(readField(row, ['cost', 'costo', 'coste']))),
    stock: String(parseNumeric(readField(row, ['stock', 'existencia', 'inventario']))),
    minStock: String(parseNumeric(readField(row, ['minstock', 'stockminimo', 'stockmínimo']))),
    criticalStock: String(
      parseNumeric(readField(row, ['criticalstock', 'stockcritico', 'stockcrítico'])),
    ),
    expiryDate: parseOptionalText(readField(row, ['expirydate', 'fechadevencimiento', 'vencimiento'])),
    location: parseOptionalText(readField(row, ['location', 'ubicacion', 'ubicación'])),
  };
}
