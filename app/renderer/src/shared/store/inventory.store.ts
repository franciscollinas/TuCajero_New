import { create } from 'zustand';

import type {
  InventoryBulkImportResult,
  InventoryCategory,
  InventoryImportRow,
  InventoryMovement,
  InventoryProduct,
  StockMovementType,
} from '../types/inventory.types';

const categoryPalette = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0F766E', '#9333EA'];

function now(): string {
  return new Date().toISOString();
}

function makeCategory(name: string, color?: string | null): InventoryCategory {
  return {
    name,
    color: color ?? categoryPalette[name.length % categoryPalette.length],
  };
}

function createMovement({
  id,
  productId,
  type,
  quantity,
  previousStock,
  newStock,
  reason,
  userId,
}: {
  id: number;
  productId: number;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  userId: number;
}): InventoryMovement {
  return {
    id,
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    reason: reason ?? null,
    userId,
    createdAt: now(),
  };
}

const initialProducts: InventoryProduct[] = [
  {
    id: 1,
    code: 'IBU400',
    barcode: '7701234567890',
    name: 'Ibuprofeno 400 mg',
    description: 'Caja con 10 tabletas',
    category: makeCategory('Analgésicos', '#2563EB'),
    price: 12500,
    cost: 8300,
    stock: 26,
    minStock: 10,
    criticalStock: 4,
    taxRate: 0,
    suggestedPurchaseQty: 20,
    expiryDate: '2026-08-15T00:00:00.000Z',
    location: 'Estante A-1',
    unitType: 'Caja',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [
      createMovement({
        id: 1,
        productId: 1,
        type: 'entrada',
        quantity: 30,
        previousStock: 0,
        newStock: 30,
        reason: 'Stock inicial',
        userId: 1,
      }),
      createMovement({
        id: 2,
        productId: 1,
        type: 'salida',
        quantity: 4,
        previousStock: 30,
        newStock: 26,
        reason: 'Venta registrada',
        userId: 1,
      }),
    ],
  },
  {
    id: 2,
    code: 'ACET500',
    barcode: '7701234567891',
    name: 'Acetaminofén 500 mg',
    description: 'Caja con 20 tabletas',
    category: makeCategory('Analgésicos', '#2563EB'),
    price: 9800,
    cost: 6100,
    stock: 8,
    minStock: 12,
    criticalStock: 5,
    taxRate: 0,
    suggestedPurchaseQty: 24,
    expiryDate: '2026-05-20T00:00:00.000Z',
    location: 'Estante A-2',
    unitType: 'Caja',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [],
  },
  {
    id: 3,
    code: 'VITC',
    barcode: '7701234567892',
    name: 'Vitamina C 1000 mg',
    description: 'Frasco por 30 tabletas',
    category: makeCategory('Vitaminas', '#16A34A'),
    price: 21400,
    cost: 15400,
    stock: 42,
    minStock: 15,
    criticalStock: 6,
    taxRate: 0,
    suggestedPurchaseQty: 18,
    expiryDate: '2027-01-10T00:00:00.000Z',
    location: 'Estante B-1',
    unitType: 'Frasco',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [],
  },
  {
    id: 4,
    code: 'ALC70',
    barcode: '7701234567893',
    name: 'Alcohol 70%',
    description: 'Botella de 500 ml',
    category: makeCategory('Higiene', '#D97706'),
    price: 7600,
    cost: 4300,
    stock: 3,
    minStock: 10,
    criticalStock: 4,
    taxRate: 0,
    suggestedPurchaseQty: 30,
    expiryDate: '2026-03-15T00:00:00.000Z',
    location: 'Estante C-1',
    unitType: 'Botella',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [],
  },
  {
    id: 5,
    code: 'TERM',
    barcode: '7701234567894',
    name: 'Termómetro digital',
    description: 'Dispositivo reutilizable',
    category: makeCategory('Dispositivos', '#7C3AED'),
    price: 28900,
    cost: 20400,
    stock: 2,
    minStock: 8,
    criticalStock: 3,
    taxRate: 0,
    suggestedPurchaseQty: 8,
    expiryDate: null,
    location: 'Mostrador',
    unitType: 'Unidad',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [],
  },
  {
    id: 6,
    code: 'JER10',
    barcode: '7701234567895',
    name: 'Jeringa 10 ml',
    description: 'Paquete por 10 unidades',
    category: makeCategory('Dispositivos', '#7C3AED'),
    price: 14500,
    cost: 9200,
    stock: 14,
    minStock: 12,
    criticalStock: 5,
    taxRate: 0,
    suggestedPurchaseQty: 12,
    expiryDate: '2027-02-03T00:00:00.000Z',
    location: 'Estante D-3',
    unitType: 'Paquete',
    conversionFactor: 1,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    stockMovements: [],
  },
];

interface InventoryState {
  products: InventoryProduct[];
  setProducts: (products: InventoryProduct[]) => void;
  upsertProduct: (product: InventoryProduct) => void;
  adjustStock: (
    productId: number,
    quantity: number,
    reason: string,
    userId: number,
  ) => InventoryProduct | null;
  bulkImport: (rows: InventoryImportRow[], userId: number) => InventoryBulkImportResult;
  replaceFromBackend: (products: InventoryProduct[]) => void;
}

function cloneProduct(product: InventoryProduct): InventoryProduct {
  return {
    ...product,
    category: { ...product.category },
    stockMovements: (product.stockMovements ?? []).map((movement: InventoryMovement) => ({ ...movement })),
  };
}

function normalizeExpiryDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildProductFromRow(
  row: InventoryImportRow,
  existing?: InventoryProduct,
): InventoryProduct {
  const timestamp = now();
  return {
    id: existing?.id ?? Date.now() + Math.floor(Math.random() * 1000),
    code: row.code,
    barcode: row.barcode ?? null,
    name: row.name,
    description: row.description ?? existing?.description ?? null,
    category: makeCategory(row.category, row.categoryColor ?? existing?.category.color ?? null),
    price: parseNumber(row.price),
    cost: parseNumber(row.cost),
    stock: parseNumber(row.stock),
    minStock: parseNumber(row.minStock ?? existing?.minStock?.toString()),
    criticalStock: parseNumber(row.criticalStock ?? existing?.criticalStock?.toString()),
    taxRate: existing?.taxRate ?? 0,
    suggestedPurchaseQty: existing?.suggestedPurchaseQty ?? null,
    expiryDate: normalizeExpiryDate(row.expiryDate),
    location: row.location ?? existing?.location ?? null,
    unitType: existing?.unitType ?? 'Unidad',
    conversionFactor: existing?.conversionFactor ?? 1,
    isActive: true,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    stockMovements: existing?.stockMovements ? [...existing.stockMovements] : [],
  };
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: initialProducts.map(cloneProduct),
  setProducts: (products): void => set({ products: products.map(cloneProduct) }),
  replaceFromBackend: (products): void => set({ products: products.map(cloneProduct) }),
  upsertProduct: (product): void =>
    set((state) => {
      const next = state.products.filter((item) => item.id !== product.id);
      return {
        products: [...next, cloneProduct(product)].sort((a, b) => a.name.localeCompare(b.name)),
      };
    }),
  adjustStock: (productId, quantity, reason, userId): InventoryProduct | null => {
    const currentProduct = get().products.find((product) => product.id === productId);

    if (!currentProduct) {
      return null;
    }

    const newStock = currentProduct.stock + quantity;

    if (newStock < 0) {
      throw new Error('El stock no puede ser negativo.');
    }

    const movement: InventoryMovement = createMovement({
      id: Date.now(),
      productId,
      type: quantity >= 0 ? 'entrada' : 'salida',
      quantity: Math.abs(quantity),
      previousStock: currentProduct.stock,
      newStock,
      reason,
      userId,
    });

    const updatedProduct: InventoryProduct = {
      ...currentProduct,
      stock: newStock,
      updatedAt: now(),
      stockMovements: [movement, ...(currentProduct.stockMovements ?? [])].slice(0, 10),
    };

    set((state) => ({
      products: state.products.map((product) => (product.id === productId ? updatedProduct : product)),
    }));

    return updatedProduct;
  },
  bulkImport: (rows, userId): InventoryBulkImportResult => {
    const state = get();
    const nextProducts = [...state.products];
    const result: InventoryBulkImportResult & { created: number; updated: number } = {
      success: 0,
      created: 0,
      updated: 0,
      errors: [],
    };

    rows.forEach((row, index) => {
      try {
        if (!row.code || !row.name || !row.category) {
          throw new Error('Fila incompleta. Revisa código, nombre y categoría.');
        }

        const existing = nextProducts.find((product) => product.code === row.code);
        const product = buildProductFromRow(row, existing);

        const movement: InventoryMovement = createMovement({
          id: Date.now() + index,
          productId: product.id,
          type: existing ? 'ajuste' : 'entrada',
          quantity: parseNumber(row.stock),
          previousStock: existing?.stock ?? 0,
          newStock: parseNumber(row.stock),
          reason: existing ? 'Actualización por importación' : 'Stock inicial por importación',
          userId,
        });

        product.stockMovements = [movement, ...(product.stockMovements ?? [])].slice(0, 10);

        if (existing) {
          const updated = {
            ...existing,
            ...product,
            id: existing.id,
            createdAt: existing.createdAt,
          };

          nextProducts.splice(nextProducts.findIndex((item) => item.id === existing.id), 1, updated);
          result.updated = (result.updated ?? 0) + 1;
        } else {
          nextProducts.push(product);
          result.created = (result.created ?? 0) + 1;
        }

        result.success += 1;
      } catch (error) {
        result.errors.push({
          row: index + 1,
          code: row.code,
          error: error instanceof Error ? error.message : 'Error desconocido al importar.',
          message: error instanceof Error ? error.message : 'Error desconocido al importar.',
        });
      }
    });

    set({ products: nextProducts.sort((a, b) => a.name.localeCompare(b.name)) });
    return result;
  },
}));
