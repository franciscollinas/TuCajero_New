import { app } from 'electron';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import type { SaleRecord } from '../../renderer/src/shared/types/sales.types';
import type { BusinessConfig } from './config.service';

// ============================================================
// UTILIDADES
// ============================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ============================================================
// GENERADOR DE FACTURA PDF
// ============================================================

export async function generateInvoicePDF(sale: SaleRecord, config?: BusinessConfig): Promise<string> {
  const fileName = `Factura_${sale.saleNumber}.pdf`;
  const filePath = path.join(app.getPath('downloads'), fileName);

  // Calcular tasa de IVA efectiva desde los items
  const effectiveTaxRate = sale.subtotal > 0 ? sale.tax / sale.subtotal : 0;
  const taxRatePercent = (effectiveTaxRate * 100).toFixed(0);

  // Crear documento A4 sin margenes (nosotros manejamos los margenes manualmente)
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Dimensiones
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Columnas de la tabla
  const COL_PROD_X = MARGIN;
  const COL_PROD_W = 200;
  const COL_QTY_X = MARGIN + 210;
  const COL_QTY_W = 50;
  const COL_PRICE_X = MARGIN + 270;
  const COL_PRICE_W = 100;
  const COL_TOTAL_X = MARGIN + 380;
  const COL_TOTAL_W = 115;

  // Posiciones para totales
  const TOT_LABEL_RIGHT = COL_TOTAL_X - 10;
  const TOT_LABEL_LEFT = TOT_LABEL_RIGHT - 120;
  const TOT_VALUE_LEFT = COL_TOTAL_X;
  const TOT_VALUE_RIGHT = COL_TOTAL_X + COL_TOTAL_W;

  // Color oscuro para encabezados de tabla (similar al ejemplo)
  const DARK_HEADER = '#2c3e50';

  let y = 40; // cursor vertical inicial

  // ============================================================
  // 1. HEADER CENTRADO — datos del negocio (config) o genérico
  // ============================================================
  const businessName = config?.businessName || 'TU CAJERO';
  const businessAddress = config?.address || '';
  const businessPhone = config?.phone || '';
  const businessNit = config?.nit || '';

  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text(businessName.toUpperCase(), MARGIN, y, { align: 'center', width: CONTENT_W });
  y += 20;
  if (businessAddress) {
    doc.fontSize(9).font('Helvetica').fillColor('#333333').text(businessAddress, MARGIN, y, { align: 'center', width: CONTENT_W });
    y += 14;
  }
  if (businessPhone) {
    doc.fontSize(9).font('Helvetica').fillColor('#333333').text(`Tel: ${businessPhone}`, MARGIN, y, { align: 'center', width: CONTENT_W });
    y += 14;
  }
  if (businessNit) {
    doc.fontSize(9).font('Helvetica').fillColor('#333333').text(`NIT: ${businessNit}`, MARGIN, y, { align: 'center', width: CONTENT_W });
    y += 14;
  }

  // ============================================================
  // 2. LINEA DE INFORMACION DE LA FACTURA
  // ============================================================
  y += 30;
  const dateStr = new Date(sale.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  const methodsStr = sale.payments.map(p => paymentMethodLabel(p.method)).join(', ');

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text(
    `${sale.saleNumber} - ${dateStr} ${timeStr} - Metodo: ${methodsStr}`,
    MARGIN, y, { width: CONTENT_W }
  );

  // ============================================================
  // 3. LINEA SEPARADORA GRUESA
  // ============================================================
  y += 16;
  doc.rect(MARGIN, y, CONTENT_W, 2).fill(DARK_HEADER);

  // ============================================================
  // 4. CLIENTE (si aplica)
  // ============================================================
  if (sale.customer) {
    y += 18;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text(
      `Cliente: ${sale.customer.name}${sale.customer.phone ? ' | Tel: ' + sale.customer.phone : ''}`,
      MARGIN, y
    );
  }

  // ============================================================
  // 5. ENCABEZADO DE TABLA (fondo oscuro, texto blanco)
  // ============================================================
  y += 20;
  doc.rect(MARGIN, y, CONTENT_W, 22).fill(DARK_HEADER);

  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('Producto', COL_PROD_X, y + 7, { width: COL_PROD_W });
  doc.text('Cant.', COL_QTY_X, y + 7, { width: COL_QTY_W, align: 'center' });
  doc.text('Precio unit.', COL_PRICE_X, y + 7, { width: COL_PRICE_W, align: 'right' });
  doc.text('Subtotal', COL_TOTAL_X, y + 7, { width: COL_TOTAL_W, align: 'right' });

  // ============================================================
  // 6. FILAS DE PRODUCTOS (filas alternadas)
  // ============================================================
  y += 22;
  sale.items.forEach((item, index) => {
    // Fila alternada con fondo gris claro
    if (index % 2 === 1) {
      doc.rect(MARGIN, y, CONTENT_W, 20).fill('#f5f5f5');
    }

    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    doc.text(item.product.name, COL_PROD_X, y + 5, { width: COL_PROD_W });
    doc.text(String(item.quantity), COL_QTY_X, y + 5, { width: COL_QTY_W, align: 'center' });
    doc.text(formatCurrency(item.unitPrice), COL_PRICE_X, y + 5, { width: COL_PRICE_W, align: 'right' });
    doc.text(formatCurrency(item.total), COL_TOTAL_X, y + 5, { width: COL_TOTAL_W, align: 'right' });

    y += 20;
  });

  // Linea inferior de la tabla
  doc.rect(MARGIN, y, CONTENT_W, 1).fill(DARK_HEADER);

  // ============================================================
  // 7. TOTALES (alineados con la columna TOTAL de la tabla)
  // ============================================================
  y += 15;

  // Subtotal
  doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Subtotal:', TOT_LABEL_LEFT, y, { width: TOT_LABEL_RIGHT - TOT_LABEL_LEFT, align: 'right' });
  doc.fillColor('#000000').fontSize(9).text(formatCurrency(sale.subtotal), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });

  // IVA
  if (sale.tax > 0) {
    y += 16;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`IVA (${taxRatePercent}%):`, TOT_LABEL_LEFT, y, { width: TOT_LABEL_RIGHT - TOT_LABEL_LEFT, align: 'right' });
    doc.fillColor('#000000').fontSize(9).text(formatCurrency(sale.tax), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
  }

  // Descuento
  if (sale.discount > 0) {
    y += 16;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Descuento:', TOT_LABEL_LEFT, y, { width: TOT_LABEL_RIGHT - TOT_LABEL_LEFT, align: 'right' });
    doc.fillColor('#e74c3c').fontSize(9).text('-' + formatCurrency(sale.discount), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
  }

  // Delivery
  if (sale.deliveryFee > 0) {
    y += 16;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Delivery:', TOT_LABEL_LEFT, y, { width: TOT_LABEL_RIGHT - TOT_LABEL_LEFT, align: 'right' });
    doc.fillColor('#000000').fontSize(9).text(formatCurrency(sale.deliveryFee), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
  }

  // TOTAL (linea arriba y abajo)
  y += 16;
  doc.rect(MARGIN, y, CONTENT_W, 1).fill(DARK_HEADER);
  y += 10;
  doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text('TOTAL:', TOT_LABEL_LEFT, y, { width: TOT_LABEL_RIGHT - TOT_LABEL_LEFT, align: 'right' });
  doc.fontSize(12).text(formatCurrency(sale.total), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
  y += 18;
  doc.rect(MARGIN, y, CONTENT_W, 1).fill(DARK_HEADER);

  // ============================================================
  // 8. DETALLE DE PAGOS (si hay mas de uno)
  // ============================================================
  if (sale.payments.length > 1) {
    y += 20;
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text('Detalle de pagos:', MARGIN, y);
    y += 14;
    sale.payments.forEach((payment) => {
      doc.fillColor('#333333').fontSize(9).font('Helvetica').text(paymentMethodLabel(payment.method) + ':', MARGIN, y);
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text(formatCurrency(payment.amount), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
      y += 14;
    });
  }

  // Efectivo recibido y cambio
  const cashReceived = sale.cashReceived;
  const change = sale.change;
  if (cashReceived && change && change > 0) {
    y += 8;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Efectivo recibido:', MARGIN, y);
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text(formatCurrency(cashReceived), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
    y += 14;
    doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Cambio:', MARGIN, y);
    doc.fillColor('#e74c3c').fontSize(10).font('Helvetica-Bold').text(formatCurrency(change), TOT_VALUE_LEFT, y, { width: TOT_VALUE_RIGHT - TOT_VALUE_LEFT, align: 'right' });
    y += 18;
  }

  // ============================================================
  // 9. FOOTER
  // ============================================================
  const footerY = PAGE_H - 60;
  doc.rect(MARGIN, footerY, CONTENT_W, 1).fill(DARK_HEADER);
  y = footerY + 18;
  doc.fillColor('#27ae60').fontSize(10).font('Helvetica-Bold').text('Gracias por su compra!', MARGIN, y, { align: 'center', width: CONTENT_W });
  y += 14;
  doc.fillColor('#666666').fontSize(7).font('Helvetica').text('Comprobante generado automaticamente por TuCajero POS', MARGIN, y, { align: 'center', width: CONTENT_W });

  // Finalizar documento
  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
