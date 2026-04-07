import { useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { bulkImportProducts } from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import { useInventoryStore } from '../../shared/store/inventory.store';
import type { InventoryBulkImportResult, InventoryImportRow } from '../../shared/types/inventory.types';
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
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          throw new Error('El archivo no contiene hojas de cálculo.');
        }

        sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
          defval: null,
        });
      } else {
        throw new Error('Formato no soportado. Usa CSV, XLSX o XLS.');
      }

      const mapped = sourceRows
        .map((row) => rowToInventoryImport(row))
        .filter((row): row is InventoryImportRow => Boolean(row));

      const errors = sourceRows
        .map((row, index) => (rowToInventoryImport(row) ? null : `Fila ${index + 1}: faltan campos obligatorios.`))
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
      const localResult = bulkImport(parsed.rows, user.id);
      setResult(localResult);
      void bulkImportProducts(parsed.rows, user.id).catch(() => undefined);
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
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.inventory.bulkImport}</p>
            <h1 style={titleStyle}>{es.inventory.importCSV}</h1>
            <p style={subtleStyle}>{es.inventory.importInstructions}</p>
          </div>
          <div style={headerActionsStyle}>
            <button type="button" onClick={() => navigate('/inventory')} style={secondaryButtonStyle}>
              {es.inventory.backToInventory}
            </button>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(exampleCsv)}`}
              download="inventario-ejemplo.csv"
              style={primaryLinkStyle}
            >
              {es.inventory.downloadExample}
            </a>
          </div>
        </header>

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
          <p style={dropTitleStyle}>Arrastra aquí tu CSV o XLSX</p>
          <p style={dropSubtitleStyle}>{es.inventory.importInstructions}</p>
          <div style={dropActionsStyle}>
            <button type="button" onClick={() => importInputRef.current?.click()} style={primaryButtonStyle}>
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
          <section style={contentGridStyle}>
            <article style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>{es.inventory.importPreview}</p>
                  <h2 style={sectionTitleStyle}>{parsed.fileName}</h2>
                </div>
                <div style={summaryPillStyle}>{totalPreview} filas válidas</div>
              </div>

              {parsed.errors.length > 0 && (
                <div style={errorBoxStyle}>
                  <strong>{es.inventory.importErrors}</strong>
                  <ul style={errorListStyle}>
                    {parsed.errors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={previewWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{es.inventory.code}</th>
                      <th style={thStyle}>{es.inventory.name}</th>
                      <th style={thStyle}>{es.inventory.category}</th>
                      <th style={thStyle}>{es.inventory.stock}</th>
                      <th style={thStyle}>{es.inventory.price}</th>
                      <th style={thStyle}>{es.inventory.expiryDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={emptyCellStyle}>
                          {es.common.noResults}
                        </td>
                      </tr>
                    ) : (
                      previewRows.map((row) => (
                        <tr key={row.code}>
                          <td style={tdStyle}>{row.code}</td>
                          <td style={tdStyle}>{row.name}</td>
                          <td style={tdStyle}>{row.category}</td>
                          <td style={tdStyle}>{row.stock}</td>
                          <td style={tdStyle}>
                            {formatCurrency(typeof row.price === 'string' ? Number(row.price) : row.price)}
                          </td>
                          <td style={tdStyle}>{row.expiryDate ?? 'Sin vencimiento'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <footer style={footerStyle}>
                <button type="button" onClick={() => navigate('/inventory')} style={secondaryButtonStyle}>
                  {es.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void applyImport()}
                  disabled={loading || parsed.rows.length === 0}
                  style={primaryButtonStyle}
                >
                  {loading ? es.common.loading : es.common.confirm}
                </button>
              </footer>
            </article>

            <aside style={summaryPanelStyle}>
              <StatRow label={es.inventory.importCreated} value={result?.created ?? 0} />
              <StatRow label={es.inventory.importUpdated} value={result?.updated ?? 0} />
              <StatRow label={es.inventory.importErrors} value={result?.errors.length ?? 0} />
              <StatRow label="Filas válidas" value={parsed.rows.length} />
              <StatRow label={es.inventory.importSuccess} value={result?.success ?? 0} />
              <p style={subtleStyle}>
                {result ? `${successRatio} filas aplicadas` : 'Aún no has aplicado la importación.'}
              </p>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}

function StatRow({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div style={statRowStyle}>
      <span style={statLabelStyle}>{label}</span>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top right, rgba(124, 58, 237, 0.10), transparent 26%), linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 48%, #E5E7EB 100%)',
};

const shellStyle: CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  display: 'grid',
  gap: tokens.spacing[5],
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: tokens.spacing[4],
  flexWrap: 'wrap',
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.md,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#2563EB',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: '12px',
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '32px',
  lineHeight: 1.1,
  color: '#111827',
};

const subtleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#6B7280',
};

const headerActionsStyle: CSSProperties = {
  display: 'flex',
  gap: tokens.spacing[3],
  flexWrap: 'wrap',
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '0 18px',
  borderRadius: '12px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  padding: '0 18px',
  borderRadius: '12px',
  border: 'none',
  background: tokens.colors.primary[600],
  color: '#FFFFFF',
  textDecoration: 'none',
  fontWeight: 700,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '0 18px',
  borderRadius: '12px',
  border: 'none',
  background: tokens.colors.primary[600],
  color: '#FFFFFF',
  fontWeight: 700,
  cursor: 'pointer',
};

const dropZoneStyle: CSSProperties = {
  padding: '32px',
  borderRadius: '20px',
  border: '2px dashed #BFDBFE',
  background: '#F8FAFC',
  display: 'grid',
  gap: '10px',
  justifyItems: 'center',
  textAlign: 'center',
};

const dropZoneActiveStyle: CSSProperties = {
  borderColor: '#2563EB',
  background: '#EFF6FF',
};

const dropTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '24px',
  color: '#111827',
  fontWeight: 800,
};

const dropSubtitleStyle: CSSProperties = {
  margin: 0,
  color: '#6B7280',
};

const dropActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.7fr)',
  gap: tokens.spacing[5],
  alignItems: 'start',
};

const panelStyle: CSSProperties = {
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.sm,
  border: `1px solid ${tokens.colors.neutral[200]}`,
  display: 'grid',
  gap: tokens.spacing[4],
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: tokens.spacing[3],
  flexWrap: 'wrap',
};

const sectionTitleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '24px',
  color: '#111827',
};

const summaryPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: '999px',
  background: '#EFF6FF',
  color: '#1D4ED8',
  fontSize: '12px',
  fontWeight: 700,
};

const errorBoxStyle: CSSProperties = {
  padding: '14px',
  borderRadius: '14px',
  background: '#FEF2F2',
  border: '1px solid #FECACA',
  color: '#991B1B',
};

const errorListStyle: CSSProperties = {
  margin: '10px 0 0',
  paddingLeft: '18px',
};

const previewWrapStyle: CSSProperties = {
  overflowX: 'auto',
  borderRadius: '16px',
  border: '1px solid #E5E7EB',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#6B7280',
  background: '#F9FAFB',
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid #F3F4F6',
  verticalAlign: 'top',
};

const emptyCellStyle: CSSProperties = {
  padding: '28px 16px',
  color: '#6B7280',
  textAlign: 'center',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  flexWrap: 'wrap',
};

const summaryPanelStyle: CSSProperties = {
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.sm,
  border: `1px solid ${tokens.colors.neutral[200]}`,
  display: 'grid',
  gap: tokens.spacing[3],
};

const statRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'center',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#F9FAFB',
  border: '1px solid #E5E7EB',
};

const statLabelStyle: CSSProperties = {
  color: '#374151',
};

const statValueStyle: CSSProperties = {
  color: '#111827',
  fontSize: '18px',
};
