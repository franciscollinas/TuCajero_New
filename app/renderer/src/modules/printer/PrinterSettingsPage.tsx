import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getPrinterConfig, testPrinter, updatePrinterConfig } from '../../shared/api/printer.api';
import { es } from '../../shared/i18n';
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
    return <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>{es.common.loading}</div>;
  }

  if (!config) {
    return <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>No se pudo cargar la configuraci&#243;n.</div>;
  }

  const noticeClass = message
    ? `tc-notice tc-notice--${messageType === 'error' ? 'error' : messageType === 'success' ? 'success' : 'info'}`
    : '';

  return (
    <>
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 }}>{es.settings.printer.title}</p>
          <h1 className="tc-section-title">{es.settings.printer.title}</h1>
          <p className="tc-section-subtitle">{es.settings.printer.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>
      </div>

      {message ? (
        <section className={noticeClass}>{message}</section>
      ) : null}

      <section className="tc-section">
        <h2 className="tc-section-title">{es.settings.printer.connection}</h2>

        <div className="tc-grid-form">
          <label className="tc-field">
            <span className="tc-label">{es.settings.printer.type}</span>
            <select
              className="tc-select"
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value as PrinterType })}
            >
              {PRINTER_TYPESS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="tc-field">
            <span className="tc-label">{es.settings.printer.paperWidth}</span>
            <select
              className="tc-select"
              value={config.paperWidth}
              onChange={(e) => setConfig({ ...config, paperWidth: Number(e.target.value) as 80 | 58 })}
            >
              <option value={80}>80mm</option>
              <option value={58}>58mm</option>
            </select>
          </label>

          <label className="tc-field" style={{ gridColumn: '1 / -1' }}>
            <span className="tc-label">{es.settings.printer.connectionString}</span>
            <input
              className="tc-input"
              value={config.connection}
              onChange={(e) => setConfig({ ...config, connection: e.target.value })}
              placeholder={es.settings.printer.connectionPlaceholder}
            />
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
              {es.settings.printer.connectionHelp}
            </p>
          </label>

          <label className="tc-field">
            <span className="tc-label">{es.settings.printer.characterSet}</span>
            <input
              className="tc-input"
              value={config.characterSet ?? 'PC860_LATIN1'}
              onChange={(e) => setConfig({ ...config, characterSet: e.target.value })}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          <button type="button" className="tc-btn tc-btn--primary" onClick={handleSave}>
            {es.settings.printer.save}
          </button>
          <button
            type="button"
            className="tc-btn tc-btn--secondary"
            onClick={handleTest}
            disabled={testing || !config.connection}
          >
            {testing ? es.common.loading : es.settings.printer.test}
          </button>
        </div>
      </section>
    </>
  );
}
