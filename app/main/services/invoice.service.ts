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
    efectivo: '💵 Efectivo',
    nequi: '📱 Nequi',
    daviplata: '📲 Daviplata',
    tarjeta: '💳 Tarjeta',
    transferencia: '🏦 Transferencia',
    credito: '📋 Credito / Fiar',
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
  const margin = 35;
  const contentWidth = pageWidth - margin * 2;

  // ===== DECORATIVE BORDER =====
  doc.lineWidth(2);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30).stroke('#e2e8f0');
  doc.lineWidth(0.5);
  doc.rect(18, 18, pageWidth - 36, pageHeight - 36).stroke('#f1f5f9');

  // ===== HEADER BACKGROUND WITH GRADIENT EFFECT =====
  // Simulate gradient with overlapping rectangles
  doc.rect(0, 0, pageWidth, 130).fill('#1e40af');
  doc.rect(0, 100, pageWidth, 30).fill('#2563eb');
  doc.rect(0, 120, pageWidth, 10).fill('#3b82f6');

  // Decorative circles
  doc.circle(550, 40, 80).fill('#1e3a8a').opacity(0.3);
  doc.circle(50, 100, 60).fill('#3b82f6').opacity(0.2);

  // Company name and branding
  doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('TU CAJERO', margin, 30, { align: 'center', width: contentWidth });
  doc.fontSize(10).font('Helvetica').fillColor('#dbeafe').text('Sistema Punto de Venta Profesional', margin, 58, { align: 'center', width: contentWidth });
  
  // Company details line
  doc.fontSize(8).fillColor('#bfdbfe').text('NIT: 900.123.456-7  |  Calle 123 #45-67, Bogota D.C.  |  Tel: (601) 234-5678', margin, 78, { align: 'center', width: contentWidth });
  doc.fillColor('#93c5fd').text('www.tucajero.com  |  soporte@tucajero.com', margin, 92, { align: 'center', width: contentWidth });

  // ===== INVOICE INFO BOX =====
  const boxY = 145;
  doc.fillColor('#ffffff');
  doc.roundedRect(margin, boxY, contentWidth, 70, 8).fill('#f8fafc').stroke('#e2e8f0');

  // Invoice number - left side
  doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold').text('FACTURA DE VENTA', margin + 15, boxY + 15);
  doc.fontSize(12).fillColor('#1e293b').text(sale.saleNumber, margin + 15, boxY + 35);
  doc.fontSize(8).fillColor('#64748b').text('Numero de comprobante', margin + 15, boxY + 52);

  // Date - middle
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('FECHA DE EMISION', margin + 200, boxY + 15);
  doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(new Date(sale.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }), margin + 200, boxY + 30);
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), margin + 200, boxY + 48);

  // Cashier - right
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('CAJERO RESPONSABLE', margin + 380, boxY + 15);
  doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(sale.user.fullName, margin + 380, boxY + 30);
  
  if (sale.cashSessionId) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('CAJA', margin + 380, boxY + 48);
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(`#${sale.cashSessionId}`, margin + 380, boxY + 58);
  }

  // ===== CUSTOMER INFO =====
  let currentY = boxY + 85;
  if (sale.customer) {
    doc.roundedRect(margin, currentY, contentWidth, 50, 6).fill('#eff6ff').stroke('#bfdbfe');
    doc.fillColor('#1e40af').fontSize(9).font('Helvetica-Bold').text('👤 CLIENTE', margin + 15, currentY + 12);
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(sale.customer.name, margin + 15, currentY + 28);
    if (sale.customer.phone) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`📞 ${sale.customer.phone}`, margin + 15, currentY + 42);
    }
    currentY += 65;
  }

  // ===== TABLE HEADER =====
  doc.roundedRect(margin, currentY, contentWidth, 32, 6).fill('#1e40af');

  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('DESCRIPCION DEL PRODUCTO', margin + 12, currentY + 11);
  doc.text('CANT', 310, currentY + 11, { width: 50, align: 'center' });
  doc.text('P. UNIT', 370, currentY + 11, { width: 70, align: 'right' });
  doc.text('TOTAL', 450, currentY + 11, { width: 85, align: 'right' });

  // ===== TABLE ROWS =====
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica');
  let y = currentY + 38;

  sale.items.forEach((item, index) => {
    // Alternating row colors
    if (index % 2 === 0) {
      doc.rect(margin, y - 12, contentWidth, 24).fill('#f8fafc');
    }

    // Product line
    doc.fillColor('#1e293b').text(item.product.name, margin + 12, y, { width: 280 });
    doc.text(String(item.quantity), 310, y, { width: 50, align: 'center' });
    doc.text(formatCurrency(item.unitPrice), 370, y, { width: 70, align: 'right' });
    doc.fillColor('#1e40af').font('Helvetica-Bold').text(formatCurrency(item.total), 450, y, { width: 85, align: 'right' });
    doc.font('Helvetica');

    y += 24;
  });

  // Table bottom line
  doc.roundedRect(margin, y - 2, contentWidth, 3, 1.5).fill('#e2e8f0');

  // ===== TOTALS SECTION =====
  const totalsY = y + 18;
  const totalsX = 330;
  const totalsWidth = 205;

  // Totals background
  doc.roundedRect(totalsX - 15, totalsY - 8, totalsWidth + 30, 110, 8).fill('#f8fafc').stroke('#e2e8f0');

  // Subtotal
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Subtotal:', totalsX, totalsY);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.subtotal), totalsX + 80, totalsY, { width: totalsWidth - 80, align: 'right' });

  // IVA
  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('IVA (19%):', totalsX, totalsY + 20);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.tax), totalsX + 80, totalsY + 20, { width: totalsWidth - 80, align: 'right' });

  // Discount
  if (sale.discount > 0) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Descuento:', totalsX, totalsY + 40);
    doc.fillColor('#dc2626').fontSize(9).font('Helvetica').text(`-${formatCurrency(sale.discount)}`, totalsX + 80, totalsY + 40, { width: totalsWidth - 80, align: 'right' });
  }

  // Delivery
  if (sale.deliveryFee > 0) {
    const deliveryY = sale.discount > 0 ? totalsY + 60 : totalsY + 40;
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Costo Delivery:', totalsX, deliveryY);
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(formatCurrency(sale.deliveryFee), totalsX + 80, deliveryY, { width: totalsWidth - 80, align: 'right' });
  }

  // TOTAL BOX - prominent
  const totalBoxY = (sale.discount > 0 || sale.deliveryFee > 0) ? totalsY + 75 : totalsY + 55;
  doc.roundedRect(totalsX - 15, totalBoxY - 5, totalsWidth + 30, 36, 8).fill('#1e40af');
  doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('TOTAL A PAGAR:', totalsX, totalBoxY + 5);
  doc.fontSize(15).text(formatCurrency(sale.total), totalsX + 80, totalBoxY + 3, { width: totalsWidth - 80, align: 'right' });

  // ===== PAYMENTS SECTION =====
  const payY = totalBoxY + 50;
  doc.fillColor('#1e40af').fontSize(11).font('Helvetica-Bold').text('💳 DETALLE DE PAGOS', margin, payY);
  doc.rect(margin, payY + 16, contentWidth, 1).fill('#e2e8f0');

  let payRowY = payY + 26;
  sale.payments.forEach((payment) => {
    // Payment row with colored left border
    doc.rect(margin, payRowY - 8, 5, 24).fill('#10b981');
    doc.rect(margin + 5, payRowY - 8, contentWidth - 5, 24).fill('#f0fdf4').stroke('#bbf7d0');

    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text(paymentMethodLabel(payment.method), margin + 15, payRowY + 2);
    doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(formatCurrency(payment.amount), pageWidth - margin - 110, payRowY, { width: 110, align: 'right' });

    if (payment.reference) {
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(`Ref: ${payment.reference}`, margin + 15, payRowY + 14);
    }

    payRowY += 30;
  });

  // Cash received and change section
  const cashReceived = (sale as any).cashReceived;
  const change = (sale as any).change;
  if (cashReceived && change > 0) {
    const cashY = payRowY + 8;
    doc.roundedRect(margin, cashY - 5, contentWidth, 45, 8).fill('#fef3c7').stroke('#f59e0b');
    
    doc.fillColor('#92400e').fontSize(9).font('Helvetica').text('💵 Efectivo recibido:', margin + 15, cashY + 5);
    doc.fillColor('#92400e').fontSize(12).font('Helvetica-Bold').text(formatCurrency(cashReceived), margin + 130, cashY + 3);
    
    doc.fillColor('#92400e').fontSize(9).font('Helvetica').text('🔄 Cambio a devolver:', margin + 15, cashY + 24);
    doc.fillColor('#dc2626').fontSize(14).font('Helvetica-Bold').text(formatCurrency(change), margin + 130, cashY + 20);
  }

  // ===== QR CODE PLACEHOLDER (decorative) =====
  const qrY = payRowY + (cashReceived && change > 0 ? 60 : 20);
  doc.roundedRect(margin, qrY, 80, 80, 6).fill('#ffffff').stroke('#e2e8f0');
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Codigo QR', margin + 18, qrY + 38, { align: 'center', width: 44 });
  doc.text('de validacion', margin + 15, qrY + 48, { align: 'center', width: 50 });

  // ===== FOOTER =====
  const footerY = pageHeight - 70;
  doc.rect(margin, footerY, contentWidth, 1).fill('#e2e8f0');

  doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('¡Gracias por su compra!', margin, footerY + 18, { align: 'center', width: contentWidth });
  doc.fillColor('#94a3b8').fontSize(7).text('Este documento es un comprobante valido de compra • Documento generado automaticamente por TuCajero POS', margin, footerY + 32, { align: 'center', width: contentWidth });
  doc.fillColor('#cbd5e1').fontSize(6).text(`Generado el ${new Date().toLocaleString('es-CO')} • ID: ${Date.now()}`, margin, footerY + 44, { align: 'center', width: contentWidth });

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
