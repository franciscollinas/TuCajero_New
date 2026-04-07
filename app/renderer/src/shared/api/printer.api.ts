import type { ApiResponse } from '../types/api.types';
import type { InvoiceData, PrinterConfig, PrintResult } from '../types/printer.types';

export function generateInvoice(invoice: InvoiceData): Promise<ApiResponse<{ filePath: string }>> {
  return window.api.invoke<{ filePath: string }>('printer:generateInvoice', invoice);
}

export function openInvoice(filePath: string): Promise<ApiResponse<{ success: boolean }>> {
  return window.api.invoke<{ success: boolean }>('printer:openInvoice', filePath);
}

export function generateThermalReceipt(invoice: InvoiceData): Promise<ApiResponse<{ content: string }>> {
  return window.api.invoke<{ content: string }>('printer:generateThermal', invoice);
}

/** Print directly to the configured thermal printer hardware */
export function printToHardware(invoice: InvoiceData): Promise<ApiResponse<PrintResult>> {
  return window.api.invoke<PrintResult>('printer:printHardware', invoice);
}

/** Get the current printer configuration */
export function getPrinterConfig(): Promise<ApiResponse<PrinterConfig>> {
  return window.api.invoke<PrinterConfig>('printer:getConfig');
}

/** Update the printer configuration */
export function updatePrinterConfig(config: Partial<PrinterConfig>): Promise<ApiResponse<PrinterConfig>> {
  return window.api.invoke<PrinterConfig>('printer:updateConfig', config);
}

/** Test the printer connection */
export function testPrinter(): Promise<ApiResponse<PrintResult>> {
  return window.api.invoke<PrintResult>('printer:testPrinter');
}
