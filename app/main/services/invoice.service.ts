import { app } from 'electron';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import type { SaleRecord } from '../../renderer/src/shared/types/sales.types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    nequi: 'Nequi',
    daviplata: 'Daviplata',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };

  return labels[method] ?? method;
}

export async function generateInvoicePDF(sale: SaleRecord): Promise<string> {
  const fileName = `Factura_${sale.saleNumber}.pdf`;
  const filePath = path.join(app.getPath('downloads'), fileName);
  const doc = new PDFDocument({ margin: 48 });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  doc.fontSize(20).text('TU CAJERO', { align: 'center' });
  doc.fontSize(10).text('NIT: 900.123.456-7', { align: 'center' });
  doc.text('Calle 123 #45-67, Bogota', { align: 'center' });
  doc.text('Tel: (601) 234-5678', { align: 'center' });
  doc.moveDown();

  doc.fontSize(16).text(`FACTURA ${sale.saleNumber}`, { align: 'center' });
  doc.fontSize(10).text(`Fecha: ${new Date(sale.createdAt).toLocaleString('es-CO')}`, { align: 'center' });
  doc.text(`Cajero: ${sale.user.fullName}`, { align: 'center' });
  doc.moveDown();

  doc.moveTo(48, doc.y).lineTo(548, doc.y).stroke();
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Producto', 48, tableTop);
  doc.text('Cant.', 290, tableTop, { width: 50, align: 'right' });
  doc.text('P.Unit', 350, tableTop, { width: 80, align: 'right' });
  doc.text('Total', 450, tableTop, { width: 90, align: 'right' });
  doc.font('Helvetica');

  let y = tableTop + 20;
  sale.items.forEach((item) => {
    doc.text(item.product.name, 48, y, { width: 220 });
    doc.text(String(item.quantity), 290, y, { width: 50, align: 'right' });
    doc.text(formatCurrency(item.unitPrice), 350, y, { width: 80, align: 'right' });
    doc.text(formatCurrency(item.total), 450, y, { width: 90, align: 'right' });
    y += 20;
  });

  doc.y = y + 12;
  doc.moveTo(48, doc.y).lineTo(548, doc.y).stroke();
  doc.moveDown();

  const totalsX = 360;
  doc.text('Subtotal:', totalsX, doc.y);
  doc.text(formatCurrency(sale.subtotal), totalsX + 100, doc.y, { width: 90, align: 'right' });
  doc.moveDown(0.4);

  doc.text('IVA:', totalsX, doc.y);
  doc.text(formatCurrency(sale.tax), totalsX + 100, doc.y, { width: 90, align: 'right' });
  doc.moveDown(0.4);

  if (sale.discount > 0) {
    doc.text('Descuento:', totalsX, doc.y);
    doc.text(`-${formatCurrency(sale.discount)}`, totalsX + 100, doc.y, { width: 90, align: 'right' });
    doc.moveDown(0.4);
  }

  doc.font('Helvetica-Bold');
  doc.text('TOTAL:', totalsX, doc.y);
  doc.text(formatCurrency(sale.total), totalsX + 100, doc.y, { width: 90, align: 'right' });
  doc.font('Helvetica');

  doc.moveDown(1.5);
  doc.text('PAGOS:', 48, doc.y);
  doc.moveDown(0.4);

  sale.payments.forEach((payment) => {
    doc.text(`${paymentMethodLabel(payment.method)}: ${formatCurrency(payment.amount)}`, 68, doc.y);
    if (payment.reference) {
      doc.text(`Ref: ${payment.reference}`, 68, doc.y);
    }
    doc.moveDown(0.3);
  });

  doc.moveDown(2);
  doc.fontSize(8).text('Gracias por su compra', { align: 'center' });
  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
