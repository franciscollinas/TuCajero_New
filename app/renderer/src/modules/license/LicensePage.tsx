import { useCallback, useEffect, useState, type CSSProperties } from 'react';

import { activateLicense, generateLicense, getLicenseInfo } from '../../shared/api/license.api';
import { useAuth } from '../../shared/context/AuthContext';
import { useRBAC } from '../../shared/hooks/useRBAC';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
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
    return <div style={{ padding: '48px', textAlign: 'center' }}>{es.common.loading}</div>;
  }

  if (!info) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>No se pudo cargar la información de licencia.</div>;
  }

  const isValid = info.validation.valid;
  const daysRemaining = info.validation.daysRemaining;

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.license.title}</p>
            <h1 style={titleStyle}>{es.license.title}</h1>
            <p style={subtleStyle}>{es.license.subtitle}</p>
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

        {/* Estado */}
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.license.statusTitle}</h2>
          <div style={statusGridStyle}>
            <div style={statusBadgeStyle(isValid ? 'valid' : 'invalid')}>
              {isValid ? es.license.valid : info.validation.hasLicense ? es.license.invalid : es.license.noLicense}
            </div>
            {daysRemaining !== undefined && (
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.license.daysRemaining}</span>
                <span style={{ ...infoValueStyle, color: daysRemaining <= 30 ? '#DC2626' : '#16A34A' }}>
                  {daysRemaining}
                </span>
              </div>
            )}
            {info.currentLicense && (
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.license.expiryDate}</span>
                <span style={infoValueStyle}>{formatDate(info.currentLicense.expiryDate)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Fingerprint */}
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.license.fingerprintTitle}</h2>
          <div style={fingerprintRowStyle}>
            <code style={fingerprintCodeStyle}>{info.fingerprint.fingerprint}</code>
            <button type="button" onClick={handleCopyFingerprint} style={secondaryButtonStyle}>
              {es.license.fingerprintCopy}
            </button>
          </div>
          <div style={hwGridStyle}>
            <div style={hwItemStyle}>
              <span style={hwLabelStyle}>CPU</span>
              <span style={hwValueStyle}>{info.fingerprint.cpuInfo}</span>
            </div>
            <div style={hwItemStyle}>
              <span style={hwLabelStyle}>Disco</span>
              <span style={hwValueStyle}>{info.fingerprint.diskSerial}</span>
            </div>
            <div style={hwItemStyle}>
              <span style={hwLabelStyle}>MAC</span>
              <span style={hwValueStyle}>{info.fingerprint.macAddress}</span>
            </div>
            <div style={hwItemStyle}>
              <span style={hwLabelStyle}>Hostname</span>
              <span style={hwValueStyle}>{info.fingerprint.hostname}</span>
            </div>
          </div>
        </section>

        {/* Activar */}
        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.license.activateTitle}</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <textarea
              placeholder={es.license.activatePlaceholder}
              value={licenseInput}
              onChange={(e) => setLicenseInput(e.target.value)}
              style={textareaStyle}
              rows={4}
              disabled={actionInProgress.length > 0}
            />
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={actionInProgress.length > 0 || !licenseInput.trim()}
              style={primaryButtonStyle}
            >
              {actionInProgress === 'activate' ? es.common.loading : es.license.activateButton}
            </button>
          </div>
        </section>

        {/* Generar (solo admin con permiso) */}
        {can('backup:all') && (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>{es.license.generateTitle}</h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '180px 1fr' }}>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>{es.license.generateMonths}</span>
                <input
                  type="number"
                  value={months}
                  min={1}
                  max={60}
                  onChange={(e) => setMonths(Number(e.target.value) || 12)}
                  style={inputStyle}
                  disabled={actionInProgress.length > 0}
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={actionInProgress.length > 0}
                  style={primaryButtonStyle}
                >
                  {actionInProgress === 'generate' ? es.common.loading : es.license.generateButton}
                </button>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

/* ─── Lock Screen ─── */

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
    return <div style={{ ...lockShellStyle, justifyContent: 'center', alignItems: 'center' }}>{es.common.loading}</div>;
  }

  return (
    <div style={lockShellStyle}>
      <div style={lockCardStyle}>
        <div style={lockIconStyle}>🔒</div>
        <h1 style={lockTitleStyle}>{es.license.lockTitle}</h1>
        <p style={lockMessageStyle}>{es.license.lockMessage}</p>
        <p style={lockSubtleStyle}>{es.license.lockedNotice}</p>

        <div style={lockFingerprintSectionStyle}>
          <span style={lockFpLabelStyle}>{es.license.lockFingerprint}</span>
          <code style={lockFpCodeStyle}>{fingerprint}</code>
        </div>

        <div style={lockInputSectionStyle}>
          <p style={lockInputLabelStyle}>{es.license.lockEnterLicense}</p>
          <textarea
            placeholder={es.license.activatePlaceholder}
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            style={lockTextareaStyle}
            rows={4}
          />
          <button
            type="button"
            onClick={() => void handleActivate()}
            disabled={!licenseInput.trim()}
            style={lockButtonStyle}
          >
            {es.license.lockActivate}
          </button>
        </div>

        {message && <p style={lockMessageResultStyle}>{message}</p>}
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 24%), linear-gradient(180deg, #FAFAF9 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 900, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '24px', color: '#111827' };
const statusGridStyle: CSSProperties = { display: 'grid', gap: '12px' };
const statusBadgeStyle = (type: 'valid' | 'invalid'): CSSProperties => ({
  display: 'inline-block',
  padding: '8px 16px',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '15px',
  background: type === 'valid' ? '#DCFCE7' : '#FEE2E2',
  color: type === 'valid' ? '#166534' : '#991B1B',
});
const infoItemStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' };
const infoLabelStyle: CSSProperties = { fontWeight: 600, color: '#374151' };
const infoValueStyle: CSSProperties = { color: '#111827', fontSize: '15px' };
const fingerprintRowStyle: CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' };
const fingerprintCodeStyle: CSSProperties = { flex: 1, padding: '12px', borderRadius: '12px', background: '#F3F4F6', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', border: '1px solid #E5E7EB' };
const hwGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' };
const hwItemStyle: CSSProperties = { padding: '12px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #E5E7EB' };
const hwLabelStyle: CSSProperties = { fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600 };
const hwValueStyle: CSSProperties = { display: 'block', marginTop: '4px', fontFamily: 'monospace', fontSize: '13px', color: '#111827', wordBreak: 'break-all' };
const textareaStyle: CSSProperties = { minHeight: '80px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '12px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical' };
const inputStyle: CSSProperties = { minHeight: '46px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '0 14px', fontSize: '15px', width: '100%' };
const fieldStyle: CSSProperties = { display: 'grid', gap: '8px' };
const fieldLabelStyle: CSSProperties = { fontWeight: 700, color: '#111827' };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', border: '1px solid' };
const noticeSuccessStyle: CSSProperties = { background: '#F0FDFA', borderColor: '#99F6E4', color: '#0F766E' };
const noticeErrorStyle: CSSProperties = { background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' };
const primaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };

/* Lock screen */
const lockShellStyle: CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)', padding: '24px' };
const lockCardStyle: CSSProperties = { maxWidth: 520, width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' };
const lockIconStyle: CSSProperties = { fontSize: '56px' };
const lockTitleStyle: CSSProperties = { margin: '16px 0 8px', fontSize: '28px', color: '#DC2626' };
const lockMessageStyle: CSSProperties = { margin: '8px 0', color: '#374151', fontSize: '16px' };
const lockSubtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280', fontSize: '14px' };
const lockFingerprintSectionStyle: CSSProperties = { marginTop: '24px', padding: '16px', borderRadius: '12px', background: '#F3F4F6' };
const lockFpLabelStyle: CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', fontWeight: 600, marginBottom: '8px' };
const lockFpCodeStyle: CSSProperties = { display: 'block', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', color: '#111827' };
const lockInputSectionStyle: CSSProperties = { marginTop: '24px', display: 'grid', gap: '12px' };
const lockInputLabelStyle: CSSProperties = { margin: 0, fontWeight: 700, color: '#111827', textAlign: 'left' };
const lockTextareaStyle: CSSProperties = { minHeight: '80px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '12px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical', textAlign: 'center' };
const lockButtonStyle: CSSProperties = { minHeight: '52px', padding: '0 24px', borderRadius: '12px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontWeight: 700, fontSize: '16px', cursor: 'pointer' };
const lockMessageResultStyle: CSSProperties = { margin: '16px 0 0', padding: '12px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' };
