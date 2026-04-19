import { Prisma } from '../../../database/generated-client';

import type {
  BulkImportResult,
  BulkImportRow,
  Category,
  ExpiryAlerts,
  Product,
  ProductDetail,
  ProductInput,
  StockAdjustmentResult,
  StockAlerts,
  StockMovement,
  StockMovementType,
} from '../../renderer/src/shared/types/inventory.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { AuditService } from './audit.service';
import { ConfigService } from './config.service';

const auditService = new AuditService();
const configService = new ConfigService();

function mapStockMovement(movement: {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  userId: number;
  createdAt: Date;
}): StockMovement {
  const allowedTypes: readonly StockMovementType[] = ['entrada', 'salida', 'ajuste', 'venta'];
  const type = allowedTypes.includes(movement.type as StockMovementType)
    ? (movement.type as StockMovementType)
    : 'ajuste';

  return {
    id: movement.id,
    productId: movement.productId,
    type,
    quantity: movement.quantity,
    previousStock: movement.previousStock,
    newStock: movement.newStock,
    reason: movement.reason,
    userId: movement.userId,
    createdAt: movement.createdAt.toISOString(),
  };
}

function mapProduct(product: {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number;
  category: { id: number; name: string; color: string | null };
  price: Prisma.Decimal;
  cost: Prisma.Decimal;
  stock: number;
  minStock: number;
  criticalStock: number;
  taxRate: Prisma.Decimal;
  suggestedPurchaseQty: number | null;
  expiryDate: Date | null;
  location: string | null;
  unitType: string;
  conversionFactor: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  return {
    id: product.id,
    code: product.code,
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category,
    price: Number(product.price),
    cost: Number(product.cost),
    stock: product.stock,
    minStock: product.minStock,
    criticalStock: product.criticalStock,
    taxRate: Number(product.taxRate),
    suggestedPurchaseQty: product.suggestedPurchaseQty,
    expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
    location: product.location,
    unitType: product.unitType,
    conversionFactor: Number(product.conversionFactor),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    stockMovements: [],
  };
}

function parseImportNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

async function resolveCategory(input: {
  categoryId?: number;
  categoryName?: string;
}): Promise<number> {
  if (input.categoryId) {
    const existingCat = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!existingCat) {
      // Try to get first available category
      const firstCategory = await prisma.category.findFirst();
      if (firstCategory) return firstCategory.id;
      throw new AppError(
        ErrorCode.VALIDATION,
        'No hay categorías disponibles. Crea una categoría primero.',
      );
    }
    return input.categoryId;
  }

  if (!input.categoryName) {
    throw new AppError(ErrorCode.VALIDATION, 'La categoría es obligatoria.');
  }

  const existing = await prisma.category.findUnique({
    where: { name: input.categoryName },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.category.create({
    data: { name: input.categoryName },
  });

  return created.id;
}

export class InventoryService {
  async getCategories(): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async getAllProducts(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: number;
    orderBySales?: boolean;
  }): Promise<Product[]> {
    const { page, pageSize, search, categoryId, orderBySales } = options || {};

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
        { barcode: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    let products;

    if (orderBySales && !search && !categoryId) {
      // Logic for top selling:
      // 1. Group sales by productId and sort by total quantity
      const salesRanking = await prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 300, // Enough to cover a typical inventory
      });

      const topIds = salesRanking.map((item) => item.productId);

      // 2. Fetch products in those IDs
      const topProducts = await prisma.product.findMany({
        where: {
          ...where,
          id: { in: topIds },
        },
        include: { category: true },
      });

      // 3. Keep sales order
      const sortedTop = topIds
        .map((id) => topProducts.find((p) => p.id === id))
        .filter((p): p is (typeof topProducts)[0] => !!p);

      // 4. Fetch the rest alphabetically
      const others = await prisma.product.findMany({
        where: {
          ...where,
          id: { notIn: topIds },
        },
        include: { category: true },
        orderBy: { name: 'asc' },
      });

      products = [...sortedTop, ...others];

      // Manual pagination
      if (page && pageSize) {
        products = products.slice((page - 1) * pageSize, page * pageSize);
      } else if (pageSize) {
        products = products.slice(0, pageSize);
      }
    } else {
      products = await prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: page && pageSize ? (page - 1) * pageSize : undefined,
        take: pageSize ?? undefined,
      });
    }

    return products.map(mapProduct);
  }

  async getProductById(id: number): Promise<ProductDetail> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Producto no encontrado.');
    }

    return {
      ...mapProduct(product),
      stockMovements: product.stockMovements.map(mapStockMovement),
    };
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: { category: true },
    });

    return product ? mapProduct(product) : null;
  }

  async createProduct(data: ProductInput): Promise<Product> {
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ code: data.code }, ...(data.barcode ? [{ barcode: data.barcode }] : [])],
      },
    });

    if (existingProduct) {
      throw new AppError(
        ErrorCode.DUPLICATE_CODE,
        'Ya existe un producto con ese código o barcode.',
      );
    }

    const product = await prisma.product.create({
      data: {
        code: data.code,
        barcode: data.barcode ?? null,
        name: data.name,
        description: data.description ?? null,
        categoryId: await resolveCategory(data),
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.minStock ?? 5,
        criticalStock: data.criticalStock ?? 2,
        taxRate: data.taxRate ?? (await configService.getIvaRate()),
        suggestedPurchaseQty: data.suggestedPurchaseQty ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        location: data.location ?? null,
        unitType: data.unitType ?? 'UNIT',
        conversionFactor: data.conversionFactor ?? 1,
        isActive: true,
      },
      include: { category: true },
    });

    if (data.stock > 0) {
      await this.registerStockMovement({
        productId: product.id,
        type: 'entrada',
        quantity: data.stock,
        previousStock: 0,
        newStock: data.stock,
        reason: 'Stock inicial',
        userId: data.userId,
      });
    }

    await auditService.log({
      userId: data.userId,
      action: 'product:created',
      entity: 'Product',
      entityId: product.id,
      payload: {
        code: product.code,
        name: product.name,
        stock: product.stock,
      },
    });

    return mapProduct(product);
  }

  async updateProduct(id: number, data: Partial<ProductInput>): Promise<Product> {
    const categoryId =
      data.categoryId || data.categoryName ? await resolveCategory(data) : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        code: data.code,
        barcode: data.barcode ?? undefined,
        name: data.name,
        description: data.description ?? undefined,
        categoryId,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        minStock: data.minStock,
        criticalStock: data.criticalStock,
        taxRate: data.taxRate,
        suggestedPurchaseQty: data.suggestedPurchaseQty ?? undefined,
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate)
          : data.expiryDate === null
            ? null
            : undefined,
        location: data.location ?? undefined,
        unitType: data.unitType,
        conversionFactor: data.conversionFactor,
      },
      include: { category: true },
    });

    return mapProduct(product);
  }

  async deleteProduct(id: number): Promise<Product> {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { category: true },
    });

    return mapProduct(product);
  }

  async adjustStock(
    productId: number,
    quantity: number,
    reason: string,
    userId: number,
  ): Promise<StockAdjustmentResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, 'Producto no encontrado.');
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      throw new AppError(ErrorCode.INSUFFICIENT_STOCK, 'El stock no puede quedar negativo.');
    }

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    await this.registerStockMovement({
      productId,
      type: quantity >= 0 ? 'entrada' : 'salida',
      quantity: Math.abs(quantity),
      previousStock: product.stock,
      newStock,
      reason,
      userId,
    });

    await auditService.log({
      userId,
      action: 'product:stock-adjusted',
      entity: 'Product',
      entityId: productId,
      payload: {
        quantity,
        reason,
        previousStock: product.stock,
        newStock,
      },
    });

    return {
      previousStock: product.stock,
      newStock,
    };
  }

  async registerStockMovement(data: {
    productId: number;
    type: StockMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    userId: number;
  }): Promise<StockMovement> {
    const movement = await prisma.stockMovement.create({
      data,
    });

    return mapStockMovement(movement);
  }

  async getStockAlerts(): Promise<StockAlerts> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
    });

    const mapped = products.map(mapProduct);

    return {
      critical: mapped.filter((product) => product.stock <= product.criticalStock),
      warning: mapped.filter(
        (product) => product.stock > product.criticalStock && product.stock <= product.minStock,
      ),
      ok: mapped.filter((product) => product.stock > product.minStock),
      expired: mapped.filter(
        (product) => product.expiryDate && new Date(product.expiryDate) < new Date(),
      ),
      expiringSoon: mapped.filter((product) => {
        if (!product.expiryDate) {
          return false;
        }

        const today = new Date();
        const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiry = new Date(product.expiryDate);
        return expiry >= today && expiry <= next30Days;
      }),
    };
  }

  async getExpiryAlerts(): Promise<ExpiryAlerts> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        expiryDate: { not: null },
      },
      include: { category: true },
    });

    const mapped = products.map(mapProduct);
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      expired: mapped.filter((product) => product.expiryDate && new Date(product.expiryDate) < now),
      expiringSoon: mapped.filter((product) => {
        if (!product.expiryDate) {
          return false;
        }
        const expiry = new Date(product.expiryDate);
        return expiry >= now && expiry <= next30Days;
      }),
      ok: mapped.filter((product) => {
        if (!product.expiryDate) {
          return false;
        }
        return new Date(product.expiryDate) > next30Days;
      }),
    };
  }

  async bulkImportProducts(products: BulkImportRow[], userId: number): Promise<BulkImportResult> {
    const results: BulkImportResult = { success: 0, created: 0, updated: 0, errors: [] };

    for (const item of products) {
      try {
        let category = await prisma.category.findUnique({
          where: { name: item.category },
        });

        if (!category) {
          category = await prisma.category.create({
            data: { name: item.category },
          });
        }

        const existing = await prisma.product.findUnique({
          where: { code: item.code },
          include: { category: true },
        });

        const parsedData = {
          barcode: item.barcode || null,
          name: item.name,
          description: item.description || null,
          categoryId: category.id,
          price: parseImportNumber(item.price),
          cost: parseImportNumber(item.cost),
          stock: Math.trunc(parseImportNumber(item.stock)),
          minStock: Math.trunc(parseImportNumber(item.minStock, 5)),
          criticalStock: Math.trunc(parseImportNumber(item.criticalStock, 2)),
          taxRate: 0, // Imported products default to 0 IVA (exempt)
          expiryDate: item.expiryDate || null,
          location: item.location || null,
          userId,
        };

        if (existing) {
          await this.updateProduct(existing.id, parsedData);
          results.updated = (results.updated ?? 0) + 1;
        } else {
          await this.createProduct({
            code: item.code,
            ...parsedData,
          });
          results.created = (results.created ?? 0) + 1;
        }

        results.success += 1;
      } catch (error) {
        results.errors.push({
          row: item,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    await auditService.log({
      userId,
      action: 'product:bulk-imported',
      entity: 'Product',
      payload: {
        success: results.success,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
      },
    });

    return results;
  }
}
