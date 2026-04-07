export type PrinterType = 'epson' | 'star' | 'tranca' | 'daruma' | 'brother' | 'custom';

export interface PrinterConfig {
  type: PrinterType;
  interface: string;
  connection: string;
  paperWidth: 80 | 58;
  characterSet?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface InvoicePayment {
  method: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  cashierName: string;
  businessName: string;
  businessNIT?: string;
  businessAddress?: string;
  businessPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  discount: number;
  total: number;
  payments: InvoicePayment[];
  change?: number;
}
