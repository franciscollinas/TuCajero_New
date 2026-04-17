import fs from 'fs';
import path from 'path';
import { printer, CharacterSet, PrinterTypes } from 'node-thermal-printer';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  cashierName: string;
  businessName: string;
  businessNIT?: string;
  businessAddress?: string;
  businessPhone?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
    tax: number;
    total: number;
  }[];
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  payments: { method: string; amount: number }[];
  change?: number;
}

export type PrinterType = 'epson' | 'star' | 'tranca' | 'daruma' | 'brother' | 'custom';
export type PrinterInterface = 'usb' | 'tcpip' | 'file' | 'printer' | 'dummy';

export interface PrinterConfig {
  type: PrinterType;
  interface: PrinterInterface;
  /** USB: device file (e.g. '/dev/usb/lp0') | TCP/IP: 'tcp://192.168.1.100:9100' | Windows printer: 'printer:MyPrinterName' */
  connection: string;
  paperWidth: 80 | 58;
  characterSet?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  type: 'epson',
  interface: 'dummy',
  connection: '',
  paperWidth: 80,
  characterSet: 'PC860_PORTUGUESE',
};

function loadPrinterConfig(): PrinterConfig {
  const configPath = path.join(process.resourcesPath ?? process.cwd(), 'printer-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PRINTER_CONFIG };
    }
  }
  return { ...DEFAULT_PRINTER_CONFIG };
}

function savePrinterConfig(config: PrinterConfig): void {
  const configPath = path.join(process.resourcesPath ?? process.cwd(), 'printer-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function createPrinterInstance(config: PrinterConfig): InstanceType<typeof printer> {
  const charSet = (config.characterSet ?? 'PC860_PORTUGUESE') as CharacterSet;
  const printerTypeMap: Record<PrinterType, PrinterTypes> = {
    epson: PrinterTypes.EPSON,
    star: PrinterTypes.STAR,
    tranca: PrinterTypes.TANCA,
    daruma: PrinterTypes.DARUMA,
    brother: PrinterTypes.BROTHER,
    custom: PrinterTypes.CUSTOM,
  };
  return new printer({
    type: printerTypeMap[config.type],
    interface: config.connection,
    characterSet: charSet,
    options: { timeout: 3000 },
  });
}

/**
 * Ejecuta la impresión con un timeout de seguridad para evitar hardware locks.
 * Si la impresora no responde en timeoutMs, rechaza la promesa con un error descriptivo.
 */
function executeWithTimeout(
  thermalPrinter: InstanceType<typeof printer>,
  timeoutMs = 5000,
): Promise<void> {
  const printPromise = thermalPrinter.execute() as unknown as Promise<void>;
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Timeout: la impresora no respondió en ${timeoutMs}ms. Verifica papel, conexión y estado.`,
          ),
        ),
      timeoutMs,
    ),
  );
  return Promise.race([printPromise, timeoutPromise]);
}

export class PrinterService {
  private readonly invoiceDir: string;

  constructor() {
    this.invoiceDir = path.join(process.resourcesPath ?? process.cwd(), 'tmp-invoices');
    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
  }

  generateInvoiceHTML(invoice: InvoiceData): string {
    const itemsRows = invoice.items
      .map(
        (item) => `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb">${item.name}</td>
        <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right">${this.formatCurrency(item.unitPrice)}</td>
        <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right">${(item.taxRate * 100).toFixed(0)}%</td>
        <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right">${this.formatCurrency(item.total)}</td>
      </tr>`,
      )
      .join('');

    const paymentRows = invoice.payments
      .map(
        (p) => `
      <tr>
        <td style="padding:4px 0;text-transform:capitalize">${p.method}</td>
        <td style="padding:4px 0;text-align:right">${this.formatCurrency(p.amount)}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Factura ${invoice.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111827; }
  .header h1 { font-size: 22px; margin-bottom: 4px; }
  .header p { color: #6b7280; font-size: 12px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 12px; }
  .meta span { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 8px 4px; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  th:last-child, td:last-child { text-align: right; }
  .totals { margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand-total { font-size: 18px; font-weight: 800; border-top: 2px solid #111827; padding-top: 8px; margin-top: 4px; }
  .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${invoice.businessName}</h1>
    <p>${invoice.businessNIT ? `NIT: ${invoice.businessNIT}` : ''}</p>
    <p>${invoice.businessAddress ?? ''} ${invoice.businessPhone ? '· Tel: ' + invoice.businessPhone : ''}</p>
    <p>Factura de venta electrónica</p>
  </div>

  <div class="meta">
    <div><span>Factura:</span> <strong>${invoice.invoiceNumber}</strong></div>
    <div><span>Fecha:</span> <strong>${new Date(invoice.date).toLocaleString('es-CO')}</strong></div>
    <div><span>Cajero:</span> <strong>${invoice.cashierName}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Cant.</th>
        <th>Precio</th>
        <th>IVA</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${this.formatCurrency(invoice.subtotal)}</span></div>
    <div><span>IVA</span><span>${this.formatCurrency(invoice.totalTax)}</span></div>
    ${invoice.discount > 0 ? `<div><span>Descuento</span><span>-${this.formatCurrency(invoice.discount)}</span></div>` : ''}
    <div class="grand-total"><span>Total</span><span>${this.formatCurrency(invoice.total)}</span></div>
  </div>

  ${invoice.payments.length > 0 ? `
  <div style="margin-top:16px">
    <strong>Pagos:</strong>
    <table style="width:260px;margin-left:auto">
      ${paymentRows}
    </table>
    ${invoice.change !== undefined && invoice.change > 0 ? `<p style="text-align:right;margin-top:8px"><strong>Cambio:</strong> ${this.formatCurrency(invoice.change)}</p>` : ''}
  </div>` : ''}

  <div class="footer">
    <p>Gracias por su compra</p>
    <p>${invoice.businessName}</p>
  </div>
</body>
</html>`;
  }

  async saveInvoiceHTML(invoice: InvoiceData): Promise<string> {
    const html = this.generateInvoiceHTML(invoice);
    const fileName = `factura-${invoice.invoiceNumber}-${Date.now()}.html`;
    const filePath = path.join(this.invoiceDir, fileName);
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  generateThermalReceipt(invoice: InvoiceData): string {
    const ESC = '\x1B';
    const GS = '\x1D';

    let receipt = '';
    receipt += ESC + '@';
    receipt += ESC + 'a' + '\x01';
    receipt += ESC + '!' + '\x30';
    receipt += invoice.businessName + '\n';
    receipt += ESC + '!' + '\x00';

    if (invoice.businessNIT) {
      receipt += `NIT: ${invoice.businessNIT}\n`;
    }
    if (invoice.businessAddress) {
      receipt += `${invoice.businessAddress}\n`;
    }

    receipt += '--------------------------------\n';
    receipt += ESC + 'a' + '\x00';
    receipt += `Factura: ${invoice.invoiceNumber}\n`;
    receipt += `Fecha: ${new Date(invoice.date).toLocaleString('es-CO')}\n`;
    receipt += `Cajero: ${invoice.cashierName}\n`;
    receipt += '--------------------------------\n';

    for (const item of invoice.items) {
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x ${this.formatCurrency(item.unitPrice)}`;
      receipt += `  ${this.formatCurrency(item.total)}\n`;
    }

    receipt += '--------------------------------\n';
    receipt += `Subtotal:  ${this.formatCurrency(invoice.subtotal)}\n`;
    receipt += `IVA:       ${this.formatCurrency(invoice.totalTax)}\n`;
    if (invoice.discount > 0) {
      receipt += `Descuento: -${this.formatCurrency(invoice.discount)}\n`;
    }

    receipt += ESC + '!' + '\x30';
    receipt += `TOTAL:     ${this.formatCurrency(invoice.total)}\n`;
    receipt += ESC + '!' + '\x00';
    receipt += '--------------------------------\n';

    for (const payment of invoice.payments) {
      receipt += `${payment.method}: ${this.formatCurrency(payment.amount)}\n`;
    }

    if (invoice.change !== undefined && invoice.change > 0) {
      receipt += `\nCambio: ${this.formatCurrency(invoice.change)}\n`;
    }

    receipt += '--------------------------------\n';
    receipt += ESC + 'a' + '\x01';
    receipt += '\nGracias por su compra\n';
    receipt += `${invoice.businessName}\n`;
    receipt += GS + 'V' + '\x00';

    return receipt;
  }

  /**
   * Imprime un recibo directamente en la impresora térmica configurada.
   * Usa node-thermal-printer para enviar comandos ESC/POS al hardware.
   */
  async printThermalReceipt(invoice: InvoiceData): Promise<PrintResult> {
    const config = loadPrinterConfig();

    if (!config.connection) {
      return {
        success: false,
        message: 'No hay una impresora térmica configurada. Configura la conexión en el panel de impresora.',
      };
    }

    try {
      const thermalPrinter = createPrinterInstance(config);

      // Encabezado centrado y en negrita
      thermalPrinter.alignCenter();
      thermalPrinter.bold(true);
      thermalPrinter.println(invoice.businessName);
      thermalPrinter.bold(false);

      if (invoice.businessNIT) {
        thermalPrinter.println(`NIT: ${invoice.businessNIT}`);
      }
      if (invoice.businessAddress) {
        thermalPrinter.println(invoice.businessAddress);
      }

      thermalPrinter.drawLine();

      // Info de la venta
      thermalPrinter.alignLeft();
      thermalPrinter.println(`Factura: ${invoice.invoiceNumber}`);
      thermalPrinter.println(`Fecha: ${new Date(invoice.date).toLocaleString('es-CO')}`);
      thermalPrinter.println(`Cajero: ${invoice.cashierName}`);

      thermalPrinter.drawLine();

      // Items
      for (const item of invoice.items) {
        thermalPrinter.println(item.name);
        thermalPrinter.println(`  ${item.quantity} x ${this.formatCurrency(item.unitPrice)}  ${this.formatCurrency(item.total)}`);
      }

      thermalPrinter.drawLine();

      // Totales
      thermalPrinter.println(`Subtotal:  ${this.formatCurrency(invoice.subtotal)}`);
      thermalPrinter.println(`IVA:       ${this.formatCurrency(invoice.totalTax)}`);
      if (invoice.discount > 0) {
        thermalPrinter.println(`Descuento: -${this.formatCurrency(invoice.discount)}`);
      }

      thermalPrinter.bold(true);
      thermalPrinter.println(`TOTAL:     ${this.formatCurrency(invoice.total)}`);
      thermalPrinter.bold(false);

      thermalPrinter.drawLine();

      // Pagos
      for (const payment of invoice.payments) {
        thermalPrinter.println(`${payment.method}: ${this.formatCurrency(payment.amount)}`);
      }

      if (invoice.change !== undefined && invoice.change > 0) {
        thermalPrinter.println(`\nCambio: ${this.formatCurrency(invoice.change)}`);
      }

      thermalPrinter.drawLine();
      thermalPrinter.alignCenter();
      thermalPrinter.println('\nGracias por su compra');
      thermalPrinter.println(invoice.businessName);
      thermalPrinter.cut();

      await executeWithTimeout(thermalPrinter, 5000);
      thermalPrinter.clear();

      return { success: true, message: 'Recibo impreso correctamente.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido al imprimir';
      return {
        success: false,
        message: `Error al imprimir: ${message}. Verifica la conexión de la impresora térmica.`,
      };
    }
  }

  /**
   * Obtiene la configuración actual de la impresora.
   */
  getPrinterConfig(): PrinterConfig {
    return loadPrinterConfig();
  }

  /**
   * Guarda la configuración de la impresora.
   */
  updatePrinterConfig(config: Partial<PrinterConfig>): PrinterConfig {
    const current = loadPrinterConfig();
    const updated = { ...current, ...config };
    savePrinterConfig(updated);
    return updated;
  }

  /**
   * Verifica si la impresora está configurada y accesible.
   */
  async testPrinter(): Promise<PrintResult> {
    const config = loadPrinterConfig();

    if (!config.connection) {
      return { success: false, message: 'No hay impresora configurada.' };
    }

    try {
      const thermalPrinter = createPrinterInstance(config);

      thermalPrinter.alignCenter();
      thermalPrinter.println('TuCajero');
      thermalPrinter.println('Prueba de impresora');
      thermalPrinter.println(new Date().toLocaleString('es-CO'));
      thermalPrinter.cut();

      await executeWithTimeout(thermalPrinter, 5000);
      thermalPrinter.clear();

      return { success: true, message: 'Impresora conectada correctamente.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, message: `Error de conexión: ${message}` };
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
