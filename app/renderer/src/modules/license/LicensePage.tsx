import { useCallback, useEffect, useState } from 'react';

import { activateLicense, getLicenseInfo } from '../../shared/api/license.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { LicenseInfo } from '../../shared/types/license.types';

function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function IconCheck(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 10.833L9.167 12.5L12.5 8.333"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconX(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconCopy(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconKey(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 5L16 12L12 12L9 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 9L3 16L10 18L12 15L9 9L5 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LicensePage(): JSX.Element {
  const { user } = useAuth();
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [licenseInput, setLicenseInput] = useState('');
  const [actionInProgress, setActionInProgress] = useState('');
  const [copied, setCopied] = useState(false);

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
    if (!user || !licenseInput.trim()) return;
    setActionInProgress('activate');
    setMessage('');
    const response = await activateLicense(user.id, licenseInput.trim());
    if (response.success && response.data.valid) {
      setMessage(es.license.activateSuccess);
      setMessageType('success');
      setLicenseInput('');
      await loadData();
    } else {
      const reason = response.success ? response.data.message : response.error.message;
      setMessage(es.license.activateError.replace('{reason}', reason));
      setMessageType('error');
    }
    setActionInProgress('');
  };

  const handleCopyFingerprint = (): void => {
    if (!info) return;
    void navigator.clipboard.writeText(info.fingerprint.fingerprint);
    setCopied(true);
    setMessage(es.license.fingerprintCopied);
    setMessageType('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isValid = info?.validation.valid ?? false;
  const daysRemaining = info?.validation.daysRemaining ?? 0;

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="tc-spinner"
            style={{ width: '40px', height: '40px', margin: '0 auto var(--space-4)' }}
          />
          <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-6)' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>

      {/* Logo Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '96px',
            height: '96px',
            borderRadius: 'var(--radius-2xl)',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
            boxShadow: '0 8px 24px rgba(70, 95, 255, 0.35)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <IconKey />
        </div>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#111827' }}>TuCajero</h1>
        <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--gray-500)', fontSize: '16px' }}>
          Sistema de licencias
        </p>
      </div>

      {/* Message Banner */}
      {message ? (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '12px',
            background:
              messageType === 'error'
                ? '#fef2f2'
                : messageType === 'success'
                  ? '#ecfdf5'
                  : '#eff6ff',
            border: `1px solid ${messageType === 'error' ? '#fecaca' : messageType === 'success' ? '#a7f3d0' : '#bfdbfe'}`,
            color:
              messageType === 'error'
                ? '#991b1b'
                : messageType === 'success'
                  ? '#065f46'
                  : '#1e40af',
            fontWeight: 500,
            fontSize: '14px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {message}
        </div>
      ) : null}

      {/* STATUS CARD */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: `2px solid ${isValid ? '#10b981' : daysRemaining > 0 ? '#f59e0b' : '#ef4444'}`,
          animation: 'fadeIn 0.4s ease-out both',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Estado de licencia
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: isValid ? '#ecfdf5' : daysRemaining > 0 ? '#fef3c7' : '#fef2f2',
              border: `1px solid ${isValid ? '#a7f3d0' : daysRemaining > 0 ? '#fcd34d' : '#fecaca'}`,
            }}
          >
            {isValid ? <IconCheck /> : <IconX />}
            <span
              style={{
                fontWeight: 700,
                fontSize: '14px',
                color: isValid ? '#059669' : daysRemaining > 0 ? '#92400e' : '#dc2626',
              }}
            >
              {isValid ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {isValid && info?.currentLicense && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <IconClock />
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: '#6b7280' }}>
                {es.license.daysRemaining}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '24px',
                  fontWeight: 800,
                  color: daysRemaining <= 7 ? '#dc2626' : '#111827',
                  lineHeight: 1.2,
                }}
              >
                {daysRemaining}
              </span>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#6b7280' }}>
                {es.license.expiryDate}
              </span>
              <span
                style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151' }}
              >
                {formatDate(info.currentLicense.expiryDate)}
              </span>
            </div>
          </div>
        )}

        {!isValid && daysRemaining > 0 && (
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid #f3f4f6',
              color: '#92400e',
              fontSize: '13px',
            }}
          >
            Tiempo de gracia: <strong>{daysRemaining} días</strong> restantes para activar la
            licencia.
          </div>
        )}

        {!isValid && daysRemaining <= 0 && (
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid #f3f4f6',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Sistema bloqueado. Contacta al administrador para obtener una licencia.
          </div>
        )}
      </div>

      {/* FINGERPRINT */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          animation: 'fadeIn 0.5s ease-out both',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
            {es.license.fingerprintTitle}
          </span>
          <button
            type="button"
            onClick={handleCopyFingerprint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: copied ? '#10b981' : '#f3f4f6',
              border: 'none',
              color: copied ? '#fff' : '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <IconCopy />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: '#1f2937',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '12px',
            color: '#10b981',
            wordBreak: 'break-all',
            lineHeight: 1.6,
          }}
        >
          {info?.fingerprint.fingerprint}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#6b7280' }}>
          Envía esta fingerprint al administrador para generar tu licencia.
        </p>
      </div>

      {/* ACTIVATE LICENSE */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          animation: 'fadeIn 0.6s ease-out both',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
          {es.license.activateTitle}
        </h2>
        <textarea
          placeholder={es.license.activatePlaceholder}
          value={licenseInput}
          onChange={(e) => setLicenseInput(e.target.value)}
          rows={4}
          disabled={actionInProgress.length > 0}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1.5px solid #d1d5db',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            resize: 'vertical',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => void handleActivate()}
          disabled={actionInProgress.length > 0 || !licenseInput.trim()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: actionInProgress.length > 0 || !licenseInput.trim() ? 'not-allowed' : 'pointer',
            opacity: actionInProgress.length > 0 || !licenseInput.trim() ? 0.6 : 1,
            boxShadow: '0 4px 12px rgba(70, 95, 255, 0.3)',
          }}
        >
          <IconKey />
          {actionInProgress === 'activate' ? 'Activando...' : es.license.activateButton}
        </button>
      </div>
    </div>
  );
}
