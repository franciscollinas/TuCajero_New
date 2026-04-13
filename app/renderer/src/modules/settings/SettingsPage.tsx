import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getConfig, updateConfig } from '../../shared/api/config.api';
import { useAuth } from '../../shared/context/AuthContext';
import { useConfig } from '../../shared/context/ConfigContext';
import { es } from '../../shared/i18n';
import type { BusinessConfig } from '../../shared/types/config.types';

export function SettingsPage(): JSX.Element {
  const { user } = useAuth();
  const { refresh: refreshGlobalConfig } = useConfig();
  const [config, setConfig] = useState<BusinessConfig>({
    businessName: '',
    address: '',
    email: '',
    phone: '',
    nit: '',
    logo: '',
    ivaRate: 0.19,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    const response = await getConfig();
    if (response.success) {
      setConfig(response.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (): Promise<void> => {
    if (!user) return;
    setSaving(true);
    setMessage('');

    const response = await updateConfig(user.id, config);
    if (response.success) {
      setMessage('✅ Configuración guardada correctamente.');
      setMessageType('success');
      setConfig(response.data);
      void refreshGlobalConfig();
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }
    setSaving(false);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage('❌ El archivo no debe superar los 2MB.');
      setMessageType('error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('❌ Solo se permiten archivos de imagen.');
      setMessageType('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (): void => {
      const base64 = reader.result as string;
      setConfig((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (): void => {
    setConfig((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const noticeClass = message
    ? `tc-notice tc-notice--${messageType === 'error' ? 'error' : 'success'}`
    : '';

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <p
          style={{
            margin: 0,
            color: 'var(--brand-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {es.settings?.title ?? 'Configuración'}
        </p>
        <h1
          style={{
            margin: '6px 0 0',
            fontSize: 'var(--text-3xl)',
            color: 'var(--gray-900)',
            fontWeight: 800,
          }}
        >
          {es.settings?.business?.title ?? 'Datos del Negocio'}
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--gray-500)' }}>
          {es.settings?.business?.subtitle ?? 'Información que aparece en facturas y recibos'}
        </p>
      </div>

      {message && (
        <section className={noticeClass} style={{ marginBottom: 'var(--space-5)' }}>
          {message}
        </section>
      )}

      {loading ? (
        <div
          className="tc-section"
          style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--gray-400)' }}
        >
          {es.common.loading}
        </div>
      ) : (
        <div className="tc-section animate-slideUp" style={{ animationDelay: '0.1s' }}>
          {/* Logo Section */}
          <div
            style={{
              marginBottom: 'var(--space-8)',
              paddingBottom: 'var(--space-6)',
              borderBottom: '1px solid var(--gray-100)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-600)"
                strokeWidth="2.5"
                style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Logo del Negocio
            </h2>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-6)',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              {/* Logo Preview */}
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 'var(--radius-2xl)',
                  border: '2px dashed var(--gray-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: config.logo ? '#fff' : 'var(--gray-50)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {config.logo ? (
                  <img
                    src={config.logo}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ display: 'block', margin: '0 auto 8px' }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span style={{ fontSize: 'var(--text-xs)' }}>Sin logo</span>
                  </div>
                )}
              </div>

              {/* Logo Actions */}
              <div style={{ display: 'grid', gap: 'var(--space-3)', flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tc-btn tc-btn--primary"
                  style={{ minHeight: '44px' }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Subir Logo
                </button>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                  PNG, JPG, SVG o WebP — Máx. 2MB
                </p>
                {config.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="tc-btn tc-btn--danger"
                    style={{ minHeight: '40px', marginTop: 'var(--space-2)' }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                    Eliminar Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Business Info Form */}
          <div>
            <h2
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-600)"
                strokeWidth="2.5"
                style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Información del Negocio
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 'var(--space-5)',
              }}
            >
              <div className="tc-field">
                <label className="tc-label">Nombre del Negocio</label>
                <input
                  className="tc-input"
                  value={config.businessName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Ej: Farmacia San José"
                />
              </div>

              <div className="tc-field">
                <label className="tc-label">NIT</label>
                <input
                  className="tc-input"
                  value={config.nit}
                  onChange={(e) => setConfig((prev) => ({ ...prev, nit: e.target.value }))}
                  placeholder="Ej: 900.123.456-7"
                />
              </div>

              <div className="tc-field" style={{ gridColumn: '1 / -1' }}>
                <label className="tc-label">Dirección</label>
                <input
                  className="tc-input"
                  value={config.address}
                  onChange={(e) => setConfig((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Ej: Calle 123 #45-67, Bogotá"
                />
              </div>

              <div className="tc-field">
                <label className="tc-label">Email</label>
                <input
                  className="tc-input"
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Ej: contacto@tu-negocio.com"
                />
              </div>

              <div className="tc-field">
                <label className="tc-label">Teléfono</label>
                <input
                  className="tc-input"
                  value={config.phone}
                  onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ej: (601) 234-5678"
                />
              </div>

              <div className="tc-field">
                <label className="tc-label">Tasa IVA (% — ej. 19 para 19%)</label>
                <input
                  className="tc-input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={(config.ivaRate ?? 0.19) * 100}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    setConfig((prev) => ({ ...prev, ivaRate: Number.isFinite(pct) ? pct / 100 : 0.19 }));
                  }}
                  placeholder="Ej: 19"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-5)',
                borderTop: '1px solid var(--gray-100)',
              }}
            >
              <button
                type="button"
                onClick={() => void handleSave()}
                className="tc-btn tc-btn--primary"
                disabled={saving}
                style={{ minHeight: '48px', minWidth: '180px' }}
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-pulse"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {es.common.save}
                  </>
                )}
              </button>
              <Link
                to="/dashboard"
                className="tc-btn tc-btn--secondary"
                style={{ minHeight: '48px' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                {es.dashboard.title}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
