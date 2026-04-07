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
    return <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>{es.common.loading}</div>;
  }

  if (!info) {
    return <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>No se pudo cargar la informaci&#243;n de licencia.</div>;
  }

  const isValid = info.validation.valid;
  const daysRemaining = info.validation.daysRemaining;

  const noticeClass = message
    ? `tc-notice tc-notice--${messageType === 'error' ? 'error' : messageType === 'success' ? 'success' : 'info'}`
    : '';

  return (
    <>
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 }}>{es.license.title}</p>
          <h1 className="tc-section-title">{es.license.title}</h1>
          <p className="tc-section-subtitle">{es.license.subtitle}</p>
        </div>
      </div>

      {message ? (
        <section className={noticeClass}>{message}</section>
      ) : null}

      {/* Estado */}
      <section className="tc-section">
        <h2 className="tc-section-title">{es.license.statusTitle}</h2>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <span className={`tc-badge ${isValid ? 'tc-badge--success' : 'tc-badge--danger'}`} style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}>
            {isValid ? es.license.valid : info.validation.hasLicense ? es.license.invalid : es.license.noLicense}
          </span>
          {daysRemaining !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.license.daysRemaining}</span>
              <span style={{ color: daysRemaining <= 30 ? 'var(--danger-600)' : 'var(--success-600)', fontSize: 'var(--text-sm)' }}>
                {daysRemaining}
              </span>
            </div>
          )}
          {info.currentLicense && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.license.expiryDate}</span>
              <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{formatDate(info.currentLicense.expiryDate)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Fingerprint */}
      <section className="tc-section">
        <h2 className="tc-section-title">{es.license.fingerprintTitle}</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-100)', fontFamily: 'monospace', fontSize: 'var(--text-sm)', wordBreak: 'break-all', border: '1px solid var(--border-light)' }}>{info.fingerprint.fingerprint}</code>
          <button type="button" className="tc-btn tc-btn--secondary" onClick={handleCopyFingerprint}>
            {es.license.fingerprintCopy}
          </button>
        </div>
        <div className="tc-grid-4" style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600 }}>CPU</span>
            <span style={{ display: 'block', marginTop: 'var(--space-1)', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--gray-800)', wordBreak: 'break-all' }}>{info.fingerprint.cpuInfo}</span>
          </div>
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600 }}>Disco</span>
            <span style={{ display: 'block', marginTop: 'var(--space-1)', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--gray-800)', wordBreak: 'break-all' }}>{info.fingerprint.diskSerial}</span>
          </div>
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600 }}>MAC</span>
            <span style={{ display: 'block', marginTop: 'var(--space-1)', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--gray-800)', wordBreak: 'break-all' }}>{info.fingerprint.macAddress}</span>
          </div>
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600 }}>Hostname</span>
            <span style={{ display: 'block', marginTop: 'var(--space-1)', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--gray-800)', wordBreak: 'break-all' }}>{info.fingerprint.hostname}</span>
          </div>
        </div>
      </section>

      {/* Activar */}
      <section className="tc-section">
        <h2 className="tc-section-title">{es.license.activateTitle}</h2>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <textarea
            className="tc-textarea"
            placeholder={es.license.activatePlaceholder}
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            rows={4}
            disabled={actionInProgress.length > 0}
          />
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void handleActivate()}
            disabled={actionInProgress.length > 0 || !licenseInput.trim()}
          >
            {actionInProgress === 'activate' ? es.common.loading : es.license.activateButton}
          </button>
        </div>
      </section>

      {/* Generar (solo admin con permiso) */}
      {can('backup:all') && (
        <section className="tc-section">
          <h2 className="tc-section-title">{es.license.generateTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--space-3)' }}>
            <label className="tc-field">
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
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="tc-btn tc-btn--primary"
                onClick={() => void handleGenerate()}
                disabled={actionInProgress.length > 0}
              >
                {actionInProgress === 'generate' ? es.common.loading : es.license.generateButton}
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* &#9472;&#9472;&#9472; Lock Screen &#9472;&#9472;&#9472; */

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

    // Guest user (id = -1) — the service will reject, but we try with first admin
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
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)', padding: 'var(--space-6)' }}>{es.common.loading}</div>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)', padding: 'var(--space-6)' }}>
      <div style={{ maxWidth: 520, width: '100%', padding: 'var(--space-10)', borderRadius: 'var(--radius-2xl)', background: '#FFFFFF', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: '56px' }}>&#128274;</div>
        <h1 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: 'var(--text-2xl)', color: 'var(--danger-600)' }}>{es.license.lockTitle}</h1>
        <p style={{ margin: 'var(--space-2) 0', color: 'var(--gray-700)', fontSize: 'var(--text-base)' }}>{es.license.lockMessage}</p>
        <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>{es.license.lockedNotice}</p>

        <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-100)' }}>
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{es.license.lockFingerprint}</span>
          <code style={{ display: 'block', fontFamily: 'monospace', fontSize: 'var(--text-sm)', wordBreak: 'break-all', color: 'var(--gray-800)' }}>{fingerprint}</code>
        </div>

        <div style={{ marginTop: 'var(--space-6)', display: 'grid', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--gray-800)', textAlign: 'left' }}>{es.license.lockEnterLicense}</p>
          <textarea
            className="tc-textarea"
            placeholder={es.license.activatePlaceholder}
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            rows={4}
            style={{ textAlign: 'center' }}
          />
          <button
            type="button"
            className="tc-btn tc-btn--danger"
            style={{ minHeight: '52px', fontSize: 'var(--text-base)' }}
            onClick={() => void handleActivate()}
            disabled={!licenseInput.trim()}
          >
            {es.license.lockActivate}
          </button>
        </div>

        {message && <p style={{ margin: 'var(--space-4) 0 0', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--danger-50)', border: '1px solid var(--danger-100)', color: 'var(--danger-600)' }}>{message}</p>}
      </div>
    </div>
  );
}
