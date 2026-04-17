/**
 * Worker Thread para generación de reportes pesados (XLSX/CSV).
 * Se ejecuta en un hilo separado para no bloquear el proceso principal de Electron.
 *
 * Comunicación:
 *  - Recibe un mensaje { rows, format, filePath, reportType } desde el hilo principal.
 *  - Responde con { success, filePath?, error? } al terminar.
 */
import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

export interface WorkerInput {
  rows: Record<string, string | number | null>[];
  format: 'xlsx' | 'csv';
  filePath: string;
  reportType: string;
}

export interface WorkerOutput {
  success: boolean;
  filePath?: string;
  error?: string;
}

if (!parentPort) {
  throw new Error('Este módulo debe ejecutarse como Worker Thread.');
}

parentPort.on('message', async (input: WorkerInput) => {
  try {
    // Asegurar que el directorio de destino existe
    const dir = path.dirname(input.filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (input.format === 'csv') {
      await generateCsv(input.rows, input.filePath);
    } else {
      await generateXlsx(input.rows, input.filePath, input.reportType);
    }

    const output: WorkerOutput = { success: true, filePath: input.filePath };
    parentPort!.postMessage(output);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido en el worker';
    const output: WorkerOutput = { success: false, error: errorMessage };
    parentPort!.postMessage(output);
  }
});

async function generateCsv(
  rows: Record<string, string | number | null>[],
  filePath: string,
): Promise<void> {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const escapeCsv = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const needsQuotes = /[",\n\r]/.test(str);
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
  ];

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function generateXlsx(
  rows: Record<string, string | number | null>[],
  filePath: string,
  sheetName: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  sheet.columns = headers.map((key) => ({
    header: key,
    key,
    width: Math.max(14, key.length + 2),
  }));

  rows.forEach((row) => sheet.addRow(row as Record<string, string | number | null>));

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  await workbook.xlsx.writeFile(filePath);
}
