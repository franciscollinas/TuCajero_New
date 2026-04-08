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

/* ───────────────────────────────────────────── Icon Components ───────────────────────────────────────────── */

function IconPrinter(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.66667 9.5V5.5C7.66667 4.57953 8.41286 3.83333 9.33333 3.83333H12.6667C13.5871 3.83333 14.3333 4.57953 14.3333 5.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4.58333" y="9.5" width="12.8333" height="8.8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.66667 14.6667H14.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14.3333" cy="6.83333" r="0.833333" fill="currentColor" />
    </svg>
  );
}

function IconSettings(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.8333 10C15.8333 10.5833 15.75 11.15 15.5917 11.6833L17.3417 13.0583C17.5333 13.2083 17.6 13.475 17.475 13.6917L15.8083 16.575C15.6833 16.7917 15.4167 16.8833 15.2 16.7917L13.1083 15.9417C12.5333 16.3667 11.8917 16.7 11.2 16.925L10.8833 19.1583C10.85 19.4083 10.6333 19.5833 10.3833 19.5833H7.10833C6.85833 19.5833 6.64167 19.4083 6.60833 19.1583L6.29167 16.925C5.6 16.7 4.95833 16.3667 4.38333 15.9417L2.29167 16.7917C2.075 16.8833 1.80833 16.7917 1.68333 16.575L0.0166667 13.6917C-0.108333 13.475 -0.0416667 13.2083 0.15 13.0583L1.9 11.6833C1.74167 11.15 1.65833 10.5833 1.65833 10C1.65833 9.41667 1.74167 8.85 1.9 8.31667L0.15 6.94167C-0.0416667 6.79167 -0.108333 6.525 0.0166667 6.30833L1.68333 3.425C1.80833 3.20833 2.075 3.11667 2.29167 3.20833L4.38333 4.05833C4.95833 3.63333 5.6 3.3 6.29167 3.075L6.60833 0.841667C6.64167 0.591667 6.85833 0.416667 7.10833 0.416667H10.3833C10.6333 0.416667 10.85 0.591667 10.8833 0.841667L11.2 3.075C11.8917 3.3 12.5333 3.63333 13.1083 4.05833L15.2 3.20833C15.4167 3.11667 15.6833 3.20833 15.8083 3.425L17.475 6.30833C17.6 6.525 17.5333 6.79167 17.3417 6.94167L15.5917 8.31667C15.75 8.85 15.8333 9.41667 15.8333 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSave(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.25 15.25H2.75C2.33579 15.25 2 14.9142 2 14.5V3.5C2 3.08579 2.33579 2.75 2.75 2.75H11.0825C11.2807 2.75 11.4708 2.82902 11.611 2.96924L15.0308 6.38902C15.171 6.52924 15.25 6.71928 15.25 6.91751V14.5C15.25 14.9142 14.9142 15.25 14.5 15.25H15.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.25 15.25V10.75C12.25 10.3358 11.9142 10 11.5 10H6.5C6.08579 10 5.75 10.3358 5.75 10.75V15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.75 7.75H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTest(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.25 9C15.25 12.4518 12.4518 15.25 9 15.25C5.54822 15.25 2.75 12.4518 2.75 9C2.75 5.54822 5.54822 2.75 9 2.75C12.4518 2.75 15.25 5.54822 15.25 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6V9L11.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconType(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 4.5V3H13.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 3V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 15H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconWidth(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.75 9H15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.25 6.5L2.75 9L5.25 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.75 6.5L15.25 9L12.75 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconConnection(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 11.5L9 9M11.5 6.5L9 9M9 9L6.5 6.5M9 9L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.75 2.75L5 5M15.25 15.25L13 13M2.75 15.25L5 13M15.25 2.75L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCharset(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 12.75L9 5.25L13.5 12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.625 10.875H12.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.75 15H15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconHome(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.25 15.25V9.75C14.25 9.33579 13.9142 9 13.5 9H4.5C4.08579 9 3.75 9.33579 3.75 9.75V15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.25 9.75L9 3L15.75 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────────────────────────────────────────── Printer Settings Page ───────────────────────────────────────────── */

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="tc-spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', borderRadius: 'var(--radius-2xl)', background: 'var(--danger-50)', border: '1px solid var(--danger-100)' }}>
          <p style={{ color: 'var(--danger-600)', fontWeight: 600 }}>No se pudo cargar la configuraci&#243;n.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))', color: '#fff', boxShadow: '0 4px 12px rgba(70, 95, 255, 0.25)' }}>
              <IconPrinter />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '11px', fontWeight: 700 }}>{es.settings.printer.title}</p>
              <h1 className="tc-section-title" style={{ margin: 0, fontSize: 'var(--text-2xl)' }}>{es.settings.printer.title}</h1>
              <p className="tc-section-subtitle" style={{ margin: 'var(--space-1) 0 0' }}>{es.settings.printer.subtitle}</p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="tc-btn tc-btn--secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            <IconHome />
            {es.dashboard.title}
          </Link>
        </div>
      </div>

      {/* ── Message Banner ── */}
      {message ? (
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            marginBottom: 'var(--space-6)',
            borderRadius: 'var(--radius-xl)',
            background: messageType === 'error' ? 'var(--danger-50)' : messageType === 'success' ? 'var(--success-50)' : 'var(--brand-50)',
            border: `1px solid ${messageType === 'error' ? 'var(--danger-200)' : messageType === 'success' ? 'var(--success-200)' : 'var(--brand-100)'}`,
            color: messageType === 'error' ? 'var(--danger-700)' : messageType === 'success' ? 'var(--success-700)' : 'var(--brand-700)',
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {message}
        </div>
      ) : null}

      {/* ── Form Card ── */}
      <section
        style={{
          marginBottom: 'var(--space-6)',
          borderRadius: 'var(--radius-2xl)',
          background: '#fff',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--gray-100)',
            background: 'linear-gradient(135deg, var(--gray-50), #fff)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ color: 'var(--brand-600)' }}>
            <IconSettings />
          </div>
          <h2 className="tc-section-title" style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{es.settings.printer.connection}</h2>
        </div>

        {/* Card Body */}
        <div style={{ padding: 'var(--space-6)' }}>
          <div className="tc-grid-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
            {/* Printer Type */}
            <label className="tc-field">
              <span className="tc-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--gray-400)' }}><IconType /></span>
                {es.settings.printer.type}
              </span>
              <select
                className="tc-select"
                value={config.type}
                onChange={(e) => setConfig({ ...config, type: e.target.value as PrinterType })}
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px',
                }}
              >
                {PRINTER_TYPESS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            {/* Paper Width */}
            <label className="tc-field">
              <span className="tc-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--gray-400)' }}><IconWidth /></span>
                {es.settings.printer.paperWidth}
              </span>
              <select
                className="tc-select"
                value={config.paperWidth}
                onChange={(e) => setConfig({ ...config, paperWidth: Number(e.target.value) as 80 | 58 })}
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px',
                }}
              >
                <option value={80}>80mm</option>
                <option value={58}>58mm</option>
              </select>
            </label>

            {/* Connection String */}
            <label className="tc-field" style={{ gridColumn: '1 / -1' }}>
              <span className="tc-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--gray-400)' }}><IconConnection /></span>
                {es.settings.printer.connectionString}
              </span>
              <input
                className="tc-input"
                value={config.connection}
                onChange={(e) => setConfig({ ...config, connection: e.target.value })}
                placeholder={es.settings.printer.connectionPlaceholder}
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 'var(--text-sm)',
                }}
              />
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                {es.settings.printer.connectionHelp}
              </p>
            </label>

            {/* Character Set */}
            <label className="tc-field">
              <span className="tc-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--gray-400)' }}><IconCharset /></span>
                {es.settings.printer.characterSet}
              </span>
              <input
                className="tc-input"
                value={config.characterSet ?? 'PC860_LATIN1'}
                onChange={(e) => setConfig({ ...config, characterSet: e.target.value })}
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 'var(--text-sm)',
                }}
              />
            </label>
          </div>

          {/* ── Action Buttons ── */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-6)',
                fontWeight: 600,
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
            >
              <IconSave />
              {es.settings.printer.save}
            </button>
            <button
              type="button"
              className="tc-btn tc-btn--secondary"
              onClick={handleTest}
              disabled={testing || !config.connection}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-6)',
                fontWeight: 600,
                minHeight: '44px',
                transition: 'all 0.2s ease',
                opacity: testing || !config.connection ? 0.6 : 1,
              }}
            >
              {testing ? (
                <>
                  <div className="tc-spinner" style={{ width: '18px', height: '18px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {es.common.loading}
                </>
              ) : (
                <>
                  <IconTest />
                  {es.settings.printer.test}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
