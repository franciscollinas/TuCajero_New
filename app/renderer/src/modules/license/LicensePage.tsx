import { useCallback, useEffect, useState } from 'react';

import { activateLicense, generateLicense, getLicenseInfo } from '../../shared/api/license.api';
import { useAuth } from '../../shared/context/AuthContext';
import { useRBAC } from '../../shared/hooks/useRBAC';
import { es } from '../../shared/i18n';
import type { LicenseInfo } from '../../shared/types/license.types';

function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ───────────────────────────────────────────── Icon Components ───────────────────────────────────────────── */

function IconCheck(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 10.833L9.167 12.5L12.5 8.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCopy(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.25 10.2917V13.75C15.25 14.5783 14.5783 15.25 13.75 15.25H10.2917C9.46331 15.25 8.79167 14.5783 8.79167 13.75V10.2917C8.79167 9.46331 9.46331 8.79167 10.2917 8.79167H13.75C14.5783 8.79167 15.25 9.46331 15.25 10.2917Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.20833 4.25H4.25C3.42158 4.25 2.75 4.92158 2.75 5.75V13.75C2.75 14.5783 3.42158 15.25 4.25 15.25H12.25C13.0783 15.25 13.75 14.5783 13.75 13.75V8.79167" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconKey(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.9167 4.58337L15.4167 7.08337M3.33334 11.6667V16.6667H8.33334L9.58334 15.4167L12.0833 17.9167L13.3333 16.6667L12.0833 15.4167L14.5833 12.9167L13.3333 11.6667L14.5833 10.4167L15.8333 11.6667L17.0833 10.4167L16.25 9.58337C16.6478 9.18554 16.6478 8.5362 16.25 8.13837L11.6667 3.55504C11.2688 3.1572 10.6195 3.1572 10.2217 3.55504L8.33334 5.44337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 7.5C8.32843 7.5 9 6.82843 9 6C9 5.17157 8.32843 4.5 7.5 4.5C6.67157 4.5 6 5.17157 6 6C6 6.82843 6.67157 7.5 7.5 7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCpu(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 2.5V5M12.5 2.5V5M7.5 15V17.5M12.5 15V17.5M17.5 7.5H15M17.5 12.5H15M2.5 7.5H5M2.5 12.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDisk(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconNetwork(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 17H13M10 13V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMonitor(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 17H14M10 14V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 1.5V4.5M13.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLock(): JSX.Element {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="24" width="32" height="26" rx="6" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" />
      <path d="M20 24V18C20 12.4772 24.4772 8 30 8C35.5228 8 40 12.4772 40 18V24" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="37" r="3" fill="rgba(255,255,255,0.8)" />
      <path d="M28 40V43" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────────────────────────── License Page ───────────────────────────────────────────── */

export function LicensePage(): JSX.Element {
  const { user } = useAuth();
  const { can } = useRBAC();
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [licenseInput, setLicenseInput] = useState('');
  const [months, setMonths] = useState(12);
  const [actionInProgress, setActionInProgress] = useState('');

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setMessage('');
    const response = await getLicenseInfo();
    if (response.success) {
      setInfo(response.data);
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleActivate = async (): Promise<void> => {
    if (!user) return;
    if (!licenseInput.trim()) return;

    setActionInProgress('activate');
    setMessage('');

    const response = await activateLicense(user.id, licenseInput.trim());

    if (response.success && response.data.valid) {
      setMessage(es.license.activateSuccess);
      setMessageType('success');
      setLicenseInput('');
      await loadData();
    } else {
      const reason = response.success
        ? response.data.message
        : response.error.message;
      setMessage(es.license.activateError.replace('{reason}', reason));
      setMessageType('error');
    }

    setActionInProgress('');
  };

  const handleGenerate = async (): Promise<void> => {
    if (!user) return;

    setActionInProgress('generate');
    setMessage('');

    const response = await generateLicense(user.id, months);

    if (response.success) {
      setMessage(es.license.generateSuccess);
      setMessageType('success');
      await loadData();
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }

    setActionInProgress('');
  };

  const handleCopyFingerprint = (): void => {
    if (!info) return;
    void navigator.clipboard.writeText(info.fingerprint.fingerprint);
    setMessage(es.license.fingerprintCopied);
    setMessageType('success');
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

  if (!info) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', borderRadius: 'var(--radius-2xl)', background: 'var(--danger-50)', border: '1px solid var(--danger-100)' }}>
          <IconX />
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--danger-600)', fontWeight: 600 }}>No se pudo cargar la informaci&#243;n de licencia.</p>
        </div>
      </div>
    );
  }

  const isValid = info.validation.valid;
  const daysRemaining = info.validation.daysRemaining ?? 0;
  const statusColor = isValid ? 'var(--success-600)' : daysRemaining <= 30 ? 'var(--danger-600)' : 'var(--gray-600)';
  const statusBg = isValid ? 'var(--success-50)' : daysRemaining <= 30 ? 'var(--danger-50)' : 'var(--gray-50)';
  const statusBorder = isValid ? 'var(--success-200)' : daysRemaining <= 30 ? 'var(--danger-200)' : 'var(--gray-200)';

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-8)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--gray-200)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))', color: '#fff', boxShadow: '0 4px 12px rgba(70, 95, 255, 0.25)' }}>
              <IconKey />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '11px', fontWeight: 700 }}>{es.license.title}</p>
              <h1 className="tc-section-title" style={{ margin: 0, fontSize: 'var(--text-2xl)' }}>{es.license.title}</h1>
            </div>
          </div>
          <p className="tc-section-subtitle" style={{ margin: 'var(--space-2) 0 0', paddingLeft: '56px' }}>{es.license.subtitle}</p>
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

      {/* ── Status Card ── */}
      <section
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-2xl)',
          background: '#fff',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideUp 0.4s ease-out',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isValid ? 'linear-gradient(90deg, var(--success-500), var(--success-600))' : 'linear-gradient(90deg, var(--danger-500), var(--danger-600))' }} />
        <h2 className="tc-section-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-5)' }}>{es.license.statusTitle}</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Large Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-5)',
              borderRadius: 'var(--radius-full)',
              background: statusBg,
              border: `2px solid ${statusBorder}`,
              color: statusColor,
              fontWeight: 700,
              fontSize: 'var(--text-base)',
              boxShadow: `0 0 0 4px ${statusBg}`,
            }}
          >
            {isValid ? <IconCheck /> : <IconX />}
            {isValid ? es.license.valid : info.validation.hasLicense ? es.license.invalid : es.license.noLicense}
          </div>

          {/* Days Remaining */}
          {daysRemaining !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
              <IconCalendar />
              <div>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{es.license.daysRemaining}</span>
                <span style={{ display: 'block', fontSize: 'var(--text-xl)', fontWeight: 800, color: daysRemaining <= 30 ? 'var(--danger-600)' : 'var(--success-600)', lineHeight: 1.2 }}>{daysRemaining}</span>
              </div>
            </div>
          )}
        </div>

        {info.currentLicense && (
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{es.license.expiryDate}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--gray-800)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{formatDate(info.currentLicense.expiryDate)}</span>
          </div>
        )}
      </section>

      {/* ── Fingerprint Section ── */}
      <section
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-2xl)',
          background: '#fff',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          animation: 'slideUp 0.5s ease-out',
        }}
      >
        <h2 className="tc-section-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-5)' }}>{es.license.fingerprintTitle}</h2>

        {/* Code Block */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-5)' }}>
          <code
            style={{
              display: 'block',
              padding: 'var(--space-4) var(--space-5)',
              paddingRight: 'var(--space-14)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--gray-900)',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
              fontSize: 'var(--text-sm)',
              color: 'var(--success-200)',
              wordBreak: 'break-all',
              lineHeight: 1.6,
              letterSpacing: '0.02em',
            }}
          >
            {info.fingerprint.fingerprint}
          </code>
          <button
            type="button"
            onClick={handleCopyFingerprint}
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              right: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            title={es.license.fingerprintCopy}
          >
            <IconCopy />
          </button>
        </div>

        {/* Info Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <InfoCard icon={<IconCpu />} label="CPU" value={info.fingerprint.cpuInfo} />
          <InfoCard icon={<IconDisk />} label="Disco" value={info.fingerprint.diskSerial} />
          <InfoCard icon={<IconNetwork />} label="MAC" value={info.fingerprint.macAddress} />
          <InfoCard icon={<IconMonitor />} label="Hostname" value={info.fingerprint.hostname} />
        </div>
      </section>

      {/* ── Activate License Section ── */}
      <section
        style={{
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-2xl)',
          background: '#fff',
          border: '1px solid var(--gray-200)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          animation: 'slideUp 0.6s ease-out',
        }}
      >
        <h2 className="tc-section-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-5)' }}>{es.license.activateTitle}</h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <textarea
            className="tc-textarea"
            placeholder={es.license.activatePlaceholder}
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            rows={4}
            disabled={actionInProgress.length > 0}
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 'var(--text-sm)',
              resize: 'vertical',
            }}
          />
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void handleActivate()}
            disabled={actionInProgress.length > 0 || !licenseInput.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-6)',
              fontWeight: 600,
              minHeight: '44px',
            }}
          >
            {actionInProgress === 'activate' ? (
              es.common.loading
            ) : (
              <>
                <IconKey />
                {es.license.activateButton}
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Generate License (Admin Only) ── */}
      {can('backup:all') && (
        <section
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-2xl)',
            background: '#fff',
            border: '2px solid var(--brand-100)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'slideUp 0.7s ease-out',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--brand-400), var(--brand-600))' }} />
          <h2 className="tc-section-title" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-5)' }}>{es.license.generateTitle}</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <label className="tc-field" style={{ minWidth: '180px' }}>
              <span className="tc-label">{es.license.generateMonths}</span>
              <input
                type="number"
                className="tc-input"
                value={months}
                min={1}
                max={60}
                onChange={(e) => setMonths(Number(e.target.value) || 12)}
                disabled={actionInProgress.length > 0}
              />
            </label>
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              onClick={() => void handleGenerate()}
              disabled={actionInProgress.length > 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-6)',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              {actionInProgress === 'generate' ? (
                es.common.loading
              ) : (
                <>
                  <IconKey />
                  {es.license.generateButton}
                </>
              )}
            </button>
          </div>
        </section>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── Info Card Sub-Component ───────────────────────────────────────────── */

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): JSX.Element {
  return (
    <div
      style={{
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-100)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', color: 'var(--gray-500)' }}>
        {icon}
        <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ display: 'block', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 'var(--text-xs)', color: 'var(--gray-700)', wordBreak: 'break-all', lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

/* ───────────────────────────────────────────── Lock Screen ───────────────────────────────────────────── */

export function LicenseLockScreen({ onActivated }: { onActivated?: () => void }): JSX.Element {
  const [licenseInput, setLicenseInput] = useState('');
  const [message, setMessage] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async (): Promise<void> => {
      const response = await getLicenseInfo();
      if (response.success) {
        setFingerprint(response.data.fingerprint.fingerprint);
      }
      setLoading(false);
    })();
  }, []);

  const handleActivate = async (): Promise<void> => {
    if (!licenseInput.trim()) return;
    setMessage('');

    const response = await activateLicense(-1, licenseInput.trim());

    if (response.success && response.data.valid) {
      setMessage(es.license.activateSuccess);
      onActivated?.();
    } else {
      const reason = response.success
        ? response.data.message
        : response.error.message;
      setMessage(es.license.activateError.replace('{reason}', reason));
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div className="tc-spinner" style={{ width: '48px', height: '48px', margin: '0 auto var(--space-4)', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>{es.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 50%, #1a1a2e 100%)',
        padding: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 30% 40%, rgba(70, 95, 255, 0.08) 0%, transparent 50%)' }} />
      <div style={{ position: 'absolute', bottom: '-30%', right: '-30%', width: '150%', height: '150%', background: 'radial-gradient(circle at 70% 60%, rgba(18, 183, 106, 0.05) 0%, transparent 50%)' }} />

      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: 'var(--space-10)',
          borderRadius: 'var(--radius-3xl)',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          animation: 'lockScreenSlide 0.6s ease-out',
        }}
      >
        {/* Lock Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '88px',
            height: '88px',
            margin: '0 auto var(--space-6)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E3A5F, #0F172A)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.3)',
          }}
        >
          <IconLock />
        </div>

        <h1 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--gray-900)' }}>{es.license.lockTitle}</h1>
        <p style={{ margin: '0 0 var(--space-1)', color: 'var(--gray-600)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>{es.license.lockMessage}</p>
        <p style={{ margin: '0 0 var(--space-6)', color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>{es.license.lockedNotice}</p>

        {/* Fingerprint Display */}
        <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)', background: 'var(--gray-900)', position: 'relative' }}>
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-400)', fontWeight: 700, marginBottom: 'var(--space-2)', letterSpacing: '0.1em' }}>{es.license.lockFingerprint}</span>
          <code style={{ display: 'block', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 'var(--text-sm)', wordBreak: 'break-all', color: 'var(--success-200)', lineHeight: 1.6, letterSpacing: '0.02em' }}>{fingerprint}</code>
        </div>

        {/* Activation Form */}
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: '0 0 var(--space-3)', fontWeight: 700, color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{es.license.lockEnterLicense}</p>
          <textarea
            className="tc-textarea"
            placeholder={es.license.activatePlaceholder}
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            rows={4}
            style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 'var(--text-sm)' }}
          />
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void handleActivate()}
            disabled={!licenseInput.trim()}
            style={{
              width: '100%',
              minHeight: '52px',
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-3)',
            }}
          >
            <IconKey />
            {es.license.lockActivate}
          </button>
        </div>

        {/* Error Message */}
        {message && (
          <div
            style={{
              marginTop: 'var(--space-5)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-200)',
              color: 'var(--danger-700)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            {message}
          </div>
        )}
      </div>

      <style>{`
        @keyframes lockScreenSlide {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
