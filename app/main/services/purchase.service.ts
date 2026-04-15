import type { Prisma } from '@prisma/client';

import type {
  Supplier,
  PurchaseOrder,
  CreateSupplierInput,
  CreatePurchaseOrderInput,
  ReceiveItemInput,
  PurchaseSummary,
  PurchaseOrderStatus,
} from '../../renderer/src/shared/types/purchase.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';

function mapSupplier(s: {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
}): Supplier {
  return {
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson ?? undefined,
    phone: s.phone,
    email: s.email,
    address: s.address,
    leadTimeDays: s.leadTimeDays,
    isActive: s.isActive,
    notes: s.notes ?? undefined,
    createdAt: s.createdAt.toISOString(),
  };
}

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: true;
    user: { select: { id: true; fullName: true } };
    items: { include: { product: true } };
  };
}>;

function mapPurchaseOrder(o: PurchaseOrderWithRelations): PurchaseOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    supplierId: o.supplierId,
    supplier: {
      id: o.supplier.id,
      name: o.supplier.name,
      phone: o.supplier.phone,
      email: o.supplier.email,
      address: o.supplier.address,
      contactPerson: o.supplier.contactPerson ?? undefined,
      leadTimeDays: o.supplier.leadTimeDays,
      isActive: o.supplier.isActive,
      createdAt: o.supplier.createdAt.toISOString(),
    },
    status: o.status as PurchaseOrderStatus,
    items: o.items.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      product: { id: i.product.id, name: i.product.name, code: i.product.code },
      quantityOrdered: i.quantityOrdered,
      quantityReceived: i.quantityReceived,
      unitCost: Number(i.unitCost),
      total: Number(i.total),
      received: i.received,
      observations: i.observations ?? undefined,
    })),
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    freight: Number(o.freight),
    total: Number(o.total),
    expectedDate: o.expectedDate?.toISOString(),
    receivedDate: o.receivedDate?.toISOString(),
    observations: o.observations ?? undefined,
    notes: o.notes ?? undefined,
    userId: o.userId,
    user: { id: o.user.id, fullName: o.user.fullName },
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

async function buildOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });
  const nextNumber = lastOrder ? Number(lastOrder.orderNumber.split('-')[2]) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export class PurchaseService {
  async getAllSuppliers(): Promise<Supplier[]> {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    return suppliers.map(mapSupplier);
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    return supplier ? mapSupplier(supplier) : null;
  }

  async createSupplier(data: CreateSupplierInput): Promise<Supplier> {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        leadTimeDays: data.leadTimeDays ?? 7,
        isActive: data.isActive ?? true,
        notes: data.notes,
      },
    });
    return mapSupplier(supplier);
  }

  async updateSupplier(id: number, data: Partial<CreateSupplierInput>): Promise<Supplier> {
    const updateData: Prisma.SupplierUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });
    return mapSupplier(supplier);
  }

  async deleteSupplier(id: number): Promise<{ success: true }> {
    const orders = await prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (orders > 0) {
      throw new AppError(
        ErrorCode.VALIDATION,
        'No se puede eliminar proveedor con pedidos asociados.',
      );
    }
    await prisma.supplier.delete({ where: { id } });
    return { success: true };
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(mapPurchaseOrder);
  }

  async getPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
    return order ? mapPurchaseOrder(order) : null;
  }

  async createPurchaseOrder(
    userId: number,
    data: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrder> {
    const orderNumber = await buildOrderNumber();
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0,
    );

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        userId,
        status: 'DRAFT',
        subtotal,
        freight: data.freight ?? 0,
        total: subtotal + (data.freight ?? 0),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitCost: item.unitCost,
            total: item.quantityOrdered * item.unitCost,
            received: false,
          })),
        },
      },
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });

    return mapPurchaseOrder(order);
  }

  async updatePurchaseOrderStatus(id: number, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    const updateData: Prisma.PurchaseOrderUpdateInput = { status };
    if (status === 'RECEIVED') {
      updateData.receivedDate = new Date();
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });

    return mapPurchaseOrder(order);
  }

  async receiveItems(
    orderId: number,
    userId: number,
    items: ReceiveItemInput[],
  ): Promise<PurchaseOrder> {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pedido no encontrado.');
    }

    if (order.status === 'CANCELLED' || order.status === 'RECEIVED') {
      throw new AppError(ErrorCode.VALIDATION, 'No se puede recibir este pedido.');
    }

    for (const item of items) {
      const orderItem = order.items.find((i) => i.id === item.orderItemId);
      if (!orderItem) continue;

      const newQuantityReceived = item.received
        ? item.quantityReceived
        : orderItem.quantityReceived;
      const received = item.received && item.quantityReceived > 0;

      await prisma.purchaseOrderItem.update({
        where: { id: item.orderItemId },
        data: {
          quantityReceived: newQuantityReceived,
          received,
          observations: item.observations,
        },
      });

      if (received && item.quantityReceived > 0) {
        const product = await prisma.product.findUnique({
          where: { id: orderItem.productId },
        });

        await prisma.product.update({
          where: { id: orderItem.productId },
          data: {
            stock: { increment: item.quantityReceived },
          },
        });

        await prisma.stockMovement.create({
          data: {
            productId: orderItem.productId,
            type: 'PURCHASE',
            quantity: item.quantityReceived,
            previousStock: product?.stock ?? 0,
            newStock: (product?.stock ?? 0) + item.quantityReceived,
            reason: `Recibido pedido ${order.orderNumber}`,
            userId,
          },
        });
      }
    }

    const updatedOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });

    if (updatedOrder) {
      const allReceived = updatedOrder.items.every((i) => i.received);
      if (allReceived) {
        await prisma.purchaseOrder.update({
          where: { id: orderId },
          data: { status: 'RECEIVED', receivedDate: new Date() },
        });
      }
    }

    return (await this.getPurchaseOrderById(orderId))!;
  }

  async updatePurchaseOrder(
    id: number,
    data: Partial<CreatePurchaseOrderInput>,
  ): Promise<PurchaseOrder> {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pedido no encontrado.');
    }
    if (existing.status !== 'DRAFT') {
      throw new AppError(ErrorCode.VALIDATION, 'Solo se pueden editar pedidos en borrador.');
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (data.supplierId !== undefined) updateData.supplier = { connect: { id: data.supplierId } };
    if (data.freight !== undefined) updateData.freight = data.freight;
    if (data.expectedDate !== undefined) updateData.expectedDate = new Date(data.expectedDate);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        user: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });

    return mapPurchaseOrder(updatedOrder);
  }

  async deletePurchaseOrder(id: number): Promise<{ success: true }> {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Pedido no encontrado.');
    }
    if (order.status !== 'DRAFT') {
      throw new AppError(ErrorCode.VALIDATION, 'Solo se pueden eliminar pedidos en borrador.');
    }
    await prisma.purchaseOrder.delete({ where: { id } });
    return { success: true };
  }

  async getPurchaseSummary(): Promise<PurchaseSummary> {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
    });

    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const pendingOrders = orders.filter(
      (o) => o.status === 'DRAFT' || o.status === 'CONFIRMED' || o.status === 'SENT',
    ).length;
    const receivedOrders = orders.filter((o) => o.status === 'RECEIVED').length;

    const supplierMap = new Map<
      number,
      { supplierId: number; supplierName: string; orderCount: number; totalValue: number }
    >();
    for (const order of orders) {
      const existing = supplierMap.get(order.supplierId);
      if (existing) {
        existing.orderCount++;
        existing.totalValue += Number(order.total);
      } else {
        supplierMap.set(order.supplierId, {
          supplierId: order.supplierId,
          supplierName: order.supplier.name,
          orderCount: 1,
          totalValue: Number(order.total),
        });
      }
    }

    return {
      totalOrders,
      totalValue,
      pendingOrders,
      receivedOrders,
      ordersBySupplier: Array.from(supplierMap.values()),
    };
  }
}
