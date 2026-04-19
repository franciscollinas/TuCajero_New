import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import Papa from 'papaparse';
import ExcelJS from 'exceljs';

import { bulkImportProducts, getAllProducts } from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { useInventoryStore } from '../../shared/store/inventory.store';
import type {
  InventoryBulkImportResult,
  InventoryImportRow,
} from '../../shared/types/inventory.types';
import { formatCurrency, rowToInventoryImport } from './inventory.utils';

interface ParsedImportState {
  rows: InventoryImportRow[];
  sourceRows: Record<string, unknown>[];
  errors: string[];
  fileName: string;
}

const exampleCsv = `code,barcode,name,description,category,categoryColor,price,cost,stock,minStock,criticalStock,expiryDate,location
IBU400,7701234567890,Ibuprofeno 400 mg,Caja con 10 tabletas,Analgésicos,#2563EB,12500,8300,26,10,4,2026-08-15,Estante A-1`;

export function InventoryBulkImportPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const bulkImport = useInventoryStore((state) => state.bulkImport);
  const [parsed, setParsed] = useState<ParsedImportState | null>(null);
  const [result, setResult] = useState<InventoryBulkImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const totalPreview = parsed?.rows.length ?? 0;
  const successRatio = result ? `${result.success}/${totalPreview}` : '0';

  const handleFile = async (file: File): Promise<void> => {
    setLoading(true);
    setResult(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let sourceRows: Record<string, unknown>[] = [];

      if (extension === 'csv') {
        const text = await file.text();
        const parsedCsv = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parsedCsv.errors.length > 0) {
          throw new Error(parsedCsv.errors[0].message);
        }

        sourceRows = parsedCsv.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const firstSheet = workbook.worksheets[0];
        if (!firstSheet) {
          throw new Error('El archivo no contiene hojas de cálculo.');
        }

        const headerRow = firstSheet.getRow(1);
        const headers = headerRow.values
          .slice(1)
          .map((header) => (header == null ? '' : String(header).trim()));

        sourceRows = [];
        firstSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;

          const values = row.values.slice(1);
          const obj: Record<string, unknown> = {};

          headers.forEach((header, index) => {
            if (!header) return;
            const value = values[index];
            obj[header] = value == null ? null : value;
          });

          const hasAnyValue = Object.values(obj).some((value) => value !== null && value !== '');
          if (hasAnyValue) sourceRows.push(obj);
        });
      } else {
        throw new Error('Formato no soportado. Usa CSV, XLSX o XLS.');
      }

      const mapped = sourceRows
        .map((row) => rowToInventoryImport(row))
        .filter((row): row is InventoryImportRow => Boolean(row));

      const errors = sourceRows
        .map((row, index) =>
          rowToInventoryImport(row) ? null : `Fila ${index + 1}: faltan campos obligatorios.`,
        )
        .filter((message): message is string => Boolean(message));

      setParsed({
        rows: mapped,
        sourceRows,
        errors,
        fileName: file.name,
      });
    } catch (error) {
      setParsed({
        rows: [],
        sourceRows: [],
        errors: [error instanceof Error ? error.message : es.errors.unknown],
        fileName: file.name,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyImport = async (): Promise<void> => {
    if (!parsed || !user) {
      return;
    }

    setLoading(true);
    try {
      // 1. Await the backend import FIRST to ensure DB integrity
      const backendResult = await bulkImportProducts(parsed.rows, user.id);

      if (backendResult.success) {
        setResult(backendResult.data);
        // 2. Sync the local store with the actual backend data (Single Source of Truth)
        const productsResponse = await getAllProducts();
        if (productsResponse.success) {
          useInventoryStore.getState().replaceFromBackend(productsResponse.data);
        }
      } else {
        // Fallback to local import if backend fails (unlikely)
        const localResult = bulkImport(parsed.rows, user.id);
        setResult(localResult);
      }
    } catch {
      // Fallback
      const localResult = bulkImport(parsed.rows, user.id);
      setResult(localResult);
    } finally {
      setLoading(false);
    }
  };

  const previewRows = useMemo(() => parsed?.rows.slice(0, 8) ?? [], [parsed]);

  const onDrop = async (event: DragEvent<HTMLElement>): Promise<void> => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="tc-page-container">
      <div className="tc-section-header">
        <div>
          <p
            style={{
              margin: 0,
              color: 'var(--brand-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
            }}
          >
            {es.inventory.bulkImport}
          </p>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 'var(--text-2xl)',
              lineHeight: 1.1,
              color: 'var(--gray-900)',
              fontWeight: 700,
            }}
          >
            {es.inventory.importCSV}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--gray-500)' }}>
            {es.inventory.importInstructions}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="tc-btn tc-btn--secondary"
          >
            {es.inventory.backToInventory}
          </button>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(exampleCsv)}`}
            download="inventario-ejemplo.csv"
            className="tc-btn tc-btn--primary"
          >
            {es.inventory.downloadExample}
          </a>
        </div>
      </div>

      <section
        style={{ ...dropZoneStyle, ...(dragActive ? dropZoneActiveStyle : {}) }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void onDrop(event)}
      >
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl)',
            color: 'var(--gray-900)',
            fontWeight: 800,
          }}
        >
          Arrastra aquí tu CSV o XLSX
        </p>
        <p style={{ margin: 0, color: 'var(--gray-500)' }}>{es.inventory.importInstructions}</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="tc-btn tc-btn--primary"
          >
            {es.inventory.importFile}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
            style={{ display: 'none' }}
          />
        </div>
      </section>

      {parsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.7fr)',
            gap: 'var(--space-5)',
            alignItems: 'start',
          }}
        >
          <div className="tc-section" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="tc-section-header" style={{ marginBottom: 0, padding: 0 }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--brand-600)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                  }}
                >
                  {es.inventory.importPreview}
                </p>
                <h2
                  style={{
                    margin: '6px 0 0',
                    fontSize: 'var(--text-xl)',
                    color: 'var(--gray-900)',
                  }}
                >
                  {parsed.fileName}
                </h2>
              </div>
              <span className="tc-badge tc-badge--brand">{totalPreview} filas válidas</span>
            </div>

            {parsed.errors.length > 0 && (
              <div className="tc-notice tc-notice--error">
                <strong>{es.inventory.importErrors}</strong>
                <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-4)' }}>
                  {parsed.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="tc-table-wrap">
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>{es.inventory.code}</th>
                    <th>{es.inventory.name}</th>
                    <th>{es.inventory.category}</th>
                    <th>{es.inventory.stock}</th>
                    <th>{es.inventory.price}</th>
                    <th>{es.inventory.expiryDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 'var(--space-6)',
                          color: 'var(--gray-500)',
                          textAlign: 'center',
                        }}
                      >
                        {es.common.noResults}
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row) => (
                      <tr key={row.code}>
                        <td>{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.category}</td>
                        <td>{row.stock}</td>
                        <td>
                          {formatCurrency(
                            typeof row.price === 'string' ? Number(row.price) : row.price,
                          )}
                        </td>
                        <td>{row.expiryDate ?? 'Sin vencimiento'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="tc-btn tc-btn--secondary"
              >
                {es.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => void applyImport()}
                disabled={loading || parsed.rows.length === 0}
                className="tc-btn tc-btn--primary"
              >
                {loading ? es.common.loading : es.common.confirm}
              </button>
            </footer>
          </div>

          <aside className="tc-section" style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <StatRow label={es.inventory.importCreated} value={result?.created ?? 0} />
            <StatRow label={es.inventory.importUpdated} value={result?.updated ?? 0} />
            <StatRow label={es.inventory.importErrors} value={result?.errors.length ?? 0} />
            <StatRow label="Filas válidas" value={parsed.rows.length} />
            <StatRow label={es.inventory.importSuccess} value={result?.success ?? 0} />
            <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>
              {result ? `${successRatio} filas aplicadas` : 'Aún no has aplicado la importación.'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        alignItems: 'center',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--gray-50)',
        border: '1px solid var(--border-light)',
      }}
    >
      <span style={{ color: 'var(--gray-600)' }}>{label}</span>
      <strong style={{ color: 'var(--gray-900)', fontSize: 'var(--text-lg)' }}>{value}</strong>
    </div>
  );
}

const dropZoneStyle: React.CSSProperties = {
  padding: 'var(--space-8)',
  borderRadius: 'var(--radius-2xl)',
  border: '2px dashed var(--brand-100)',
  background: 'var(--gray-50)',
  display: 'grid',
  gap: 'var(--space-2)',
  justifyItems: 'center',
  textAlign: 'center',
};

const dropZoneActiveStyle: React.CSSProperties = {
  borderColor: 'var(--brand-600)',
  background: 'var(--brand-50)',
};
