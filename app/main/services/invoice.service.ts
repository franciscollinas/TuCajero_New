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
    credito: 'Credito / Fiar',
  };

  return labels[method] ?? method;
}

export async function generateInvoicePDF(sale: SaleRecord): Promise<string> {
  const fileName = `Factura_${sale.saleNumber}.pdf`;
  const filePath = path.join(app.getPath('downloads'), fileName);

  // A4 size in points (595 x 842)
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // ===== HEADER BACKGROUND =====
  doc.rect(0, 0, pageWidth, 120).fill('#1e40af');

  // Company name
  doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('TU CAJERO', margin, 35, { align: 'center', width: contentWidth });
  doc.fontSize(9).font('Helvetica').text('Sistema Punto de Venta', margin, 62, { align: 'center', width: contentWidth });
  doc.fontSize(8).text('NIT: 900.123.456-7', margin, 78, { align: 'center', width: contentWidth });
  doc.text('Calle 123 #45-67, Bogota D.C.', margin, 90, { align: 'center', width: contentWidth });
  doc.text('Tel: (601) 234-5678 | www.tucajero.com', margin, 102, { align: 'center', width: contentWidth });

  // ===== INVOICE INFO BOX =====
  const boxY = 135;
  doc.rect(margin, boxY, contentWidth, 65).fill('#f8fafc').stroke('#e2e8f0');

  // Invoice number
  doc.fillColor('#1e40af').fontSize(14).font('Helvetica-Bold').text(`FACTURA DE VENTA`, margin + 15, boxY + 12);
  doc.fontSize(11).text(sale.saleNumber, margin + 15, boxY + 30);

  // Date
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Fecha de emision:', margin + 200, boxY + 12);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(new Date(sale.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }), margin + 200, boxY + 26);
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), margin + 200, boxY + 40);

  // Cashier
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Cajero:', margin + 380, boxY + 12);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(sale.user.fullName, margin + 380, boxY + 26);

  // Cash session
  if (sale.cashSessionId) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Caja:', margin + 380, boxY + 40);
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(`#${sale.cashSessionId}`, margin + 380, boxY + 54);
  }

  // ===== CUSTOMER INFO =====
  if (sale.customer) {
    const custY = boxY + 80;
    doc.rect(margin, custY, contentWidth, 45).fill('#eff6ff').stroke('#bfdbfe');
    doc.fillColor('#1e40af').fontSize(9).font('Helvetica-Bold').text('CLIENTE', margin + 15, custY + 10);
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(sale.customer.name, margin + 15, custY + 24);
    if (sale.customer.phone) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Tel: ${sale.customer.phone}`, margin + 15, custY + 36);
    }
  }

  // ===== TABLE HEADER =====
  const tableTop = sale.customer ? boxY + 140 : boxY + 95;
  doc.rect(margin, tableTop - 5, contentWidth, 28).fill('#1e40af');

  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('DESCRIPCION', margin + 10, tableTop + 8);
  doc.text('CANT', 300, tableTop + 8, { width: 60, align: 'center' });
  doc.text('P. UNIT', 370, tableTop + 8, { width: 70, align: 'right' });
  doc.text('TOTAL', 450, tableTop + 8, { width: 85, align: 'right' });

  // ===== TABLE ROWS =====
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica');
  let y = tableTop + 35;

  sale.items.forEach((item, index) => {
    // Alternating row colors
    if (index % 2 === 0) {
      doc.rect(margin, y - 12, contentWidth, 22).fill('#f8fafc');
    }

    doc.fillColor('#1e293b').text(item.product.name, margin + 10, y, { width: 270 });
    doc.text(String(item.quantity), 300, y, { width: 60, align: 'center' });
    doc.text(formatCurrency(item.unitPrice), 370, y, { width: 70, align: 'right' });
    doc.text(formatCurrency(item.total), 450, y, { width: 85, align: 'right' });

    y += 22;
  });

  // Table bottom border
  doc.rect(margin, y - 2, contentWidth, 1).fill('#e2e8f0');

  // ===== TOTALS =====
  const totalsY = y + 15;
  const totalsX = 340;
  const totalsWidth = 195;

  // Subtotal
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Subtotal:', totalsX, totalsY);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.subtotal), totalsX + 70, totalsY, { width: totalsWidth - 70, align: 'right' });

  // IVA
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('IVA (19%):', totalsX, totalsY + 16);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.tax), totalsX + 70, totalsY + 16, { width: totalsWidth - 70, align: 'right' });

  // Discount
  if (sale.discount > 0) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Descuento:', totalsX, totalsY + 32);
    doc.fillColor('#dc2626').fontSize(9).font('Helvetica').text(`-${formatCurrency(sale.discount)}`, totalsX + 70, totalsY + 32, { width: totalsWidth - 70, align: 'right' });
  }

  // Delivery
  if (sale.deliveryFee > 0) {
    const deliveryY = sale.discount > 0 ? totalsY + 48 : totalsY + 32;
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Delivery:', totalsX, deliveryY);
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.deliveryFee), totalsX + 70, deliveryY, { width: totalsWidth - 70, align: 'right' });
  }

  // TOTAL BOX
  const totalBoxY = sale.discount > 0 || sale.deliveryFee > 0 ? totalsY + 55 : totalsY + 40;
  doc.rect(totalsX - 10, totalBoxY - 5, totalsWidth + 20, 32).fill('#1e40af').stroke('#1e40af');
  doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('TOTAL:', totalsX, totalBoxY + 5);
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(formatCurrency(sale.total), totalsX + 70, totalBoxY + 4, { width: totalsWidth - 70, align: 'right' });

  // ===== PAYMENTS SECTION =====
  const payY = totalBoxY + 45;
  doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('DETALLE DE PAGOS', margin, payY);
  doc.rect(margin, payY + 14, contentWidth, 1).fill('#e2e8f0');

  let payRowY = payY + 22;
  sale.payments.forEach((payment) => {
    // Payment row background
    doc.rect(margin, payRowY - 8, contentWidth, 22).fill('#f0fdf4');
    doc.rect(margin, payRowY - 8, 4, 22).fill('#16a34a');

    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text(paymentMethodLabel(payment.method), margin + 12, payRowY);
    doc.fillColor('#16a34a').fontSize(10).font('Helvetica-Bold').text(formatCurrency(payment.amount), pageWidth - margin - 100, payRowY, { width: 100, align: 'right' });

    if (payment.reference) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Ref: ${payment.reference}`, margin + 12, payRowY + 12);
    }

    payRowY += 28;
  });

  // Cash received and change
  const cashReceived = (sale as any).cashReceived;
  const change = (sale as any).change;
  if (cashReceived && change > 0) {
    const cashY = payRowY + 5;
    doc.rect(margin, cashY - 5, contentWidth, 35).fill('#fef3c7').stroke('#f59e0b');
    doc.fillColor('#92400e').fontSize(9).font('Helvetica').text('Efectivo recibido:', margin + 15, cashY + 3);
    doc.fillColor('#92400e').fontSize(10).font('Helvetica-Bold').text(formatCurrency(cashReceived), margin + 120, cashY + 3);
    doc.fillColor('#92400e').fontSize(9).font('Helvetica').text('Cambio a devolver:', margin + 15, cashY + 18);
    doc.fillColor('#dc2626').fontSize(12).font('Helvetica-Bold').text(formatCurrency(change), margin + 120, cashY + 16);
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 80;
  doc.rect(margin, footerY, contentWidth, 1).fill('#e2e8f0');

  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Gracias por su compra', margin, footerY + 15, { align: 'center', width: contentWidth });
  doc.fillColor('#94a3b8').fontSize(7).text('Este documento es un comprobante valido de compra', margin, footerY + 28, { align: 'center', width: contentWidth });
  doc.fillColor('#94a3b8').fontSize(7).text(`Documento generado el ${new Date().toLocaleString('es-CO')}`, margin, footerY + 40, { align: 'center', width: contentWidth });

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
