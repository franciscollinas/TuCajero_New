import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { getPrinterConfig, testPrinter, updatePrinterConfig } from '../../shared/api/printer.api';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { PrinterConfig, PrinterType } from '../../shared/types/printer.types';

const PRINTER_TYPESS: { value: PrinterType; label: string }[] = [
  { value: 'epson', label: 'Epson' },
  { value: 'star', label: 'Star' },
  { value: 'tranca', label: 'Tranca' },
  { value: 'daruma', label: 'Daruma' },
  { value: 'brother', label: 'Brother' },
  { value: 'custom', label: 'Custom' },
];

export function PrinterSettingsPage(): JSX.Element {
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void (async (): Promise<void> => {
      const response = await getPrinterConfig();
      if (response.success) {
        setConfig(response.data);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (): Promise<void> => {
    if (!config) return;
    setMessage('');
    const response = await updatePrinterConfig(config);
    if (response.success) {
      setMessage(es.settings.printer.saved);
      setMessageType('success');
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }
  };

  const handleTest = async (): Promise<void> => {
    if (!config) return;
    setTesting(true);
    setMessage('');
    const response = await testPrinter();
    if (response.success) {
      setMessage(response.data.message);
      setMessageType(response.data.success ? 'success' : 'error');
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }
    setTesting(false);
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>{es.common.loading}</div>;
  }

  if (!config) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>No se pudo cargar la configuración.</div>;
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.settings.printer.title}</p>
            <h1 style={titleStyle}>{es.settings.printer.title}</h1>
            <p style={subtleStyle}>{es.settings.printer.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        {message ? (
          <section style={{
            ...noticeStyle,
            ...(messageType === 'error' ? noticeErrorStyle : {}),
            ...(messageType === 'success' ? noticeSuccessStyle : {}),
          }}>
            {message}
          </section>
        ) : null}

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.settings.printer.connection}</h2>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>{es.settings.printer.type}</span>
              <select
                value={config.type}
                onChange={(e) => setConfig({ ...config, type: e.target.value as PrinterType })}
                style={inputStyle}
              >
                {PRINTER_TYPESS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>{es.settings.printer.paperWidth}</span>
              <select
                value={config.paperWidth}
                onChange={(e) => setConfig({ ...config, paperWidth: Number(e.target.value) as 80 | 58 })}
                style={inputStyle}
              >
                <option value={80}>80mm</option>
                <option value={58}>58mm</option>
              </select>
            </label>

            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <span style={fieldLabelStyle}>{es.settings.printer.connectionString}</span>
              <input
                value={config.connection}
                onChange={(e) => setConfig({ ...config, connection: e.target.value })}
                placeholder={es.settings.printer.connectionPlaceholder}
                style={inputStyle}
              />
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                {es.settings.printer.connectionHelp}
              </p>
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>{es.settings.printer.characterSet}</span>
              <input
                value={config.characterSet ?? 'PC860_LATIN1'}
                onChange={(e) => setConfig({ ...config, characterSet: e.target.value })}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSave} style={primaryButtonStyle}>
              {es.settings.printer.save}
            </button>
            <button type="button" onClick={handleTest} disabled={testing || !config.connection} style={secondaryButtonStyle}>
              {testing ? es.common.loading : es.settings.printer.test}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 24%), linear-gradient(180deg, #FAFAF9 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 700, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '24px', color: '#111827' };
const formGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' };
const fieldStyle: CSSProperties = { display: 'grid', gap: '8px' };
const fieldLabelStyle: CSSProperties = { fontWeight: 700, color: '#111827' };
const inputStyle: CSSProperties = { minHeight: '46px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '0 14px', fontSize: '15px' };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', border: '1px solid' };
const noticeSuccessStyle: CSSProperties = { background: '#F0FDFA', borderColor: '#99F6E4', color: '#0F766E' };
const noticeErrorStyle: CSSProperties = { background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' };
const primaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
