import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setIsLocked(false);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : es.errors.unknown;
      setError(msg);
      setIsLocked(msg.includes('bloqueada') || msg.includes('bloqueado'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at 20% 50%, rgba(70, 95, 255, 0.08), transparent 50%), linear-gradient(180deg, #f9fafb 0%, #f1f5f9 100%)',
      }}
    >
      <div
        style={{
          width: 'min(440px, 100%)',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid #e4e7ec',
          boxShadow: '0 1px 3px rgba(16,24,40,0.06), 0 8px 24px rgba(16,24,40,0.08)',
          padding: '40px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #465fff, #3641f5)',
              color: '#fff',
              display: 'inline-grid',
              placeItems: 'center',
              fontSize: '24px',
              fontWeight: 800,
              marginBottom: '16px',
            }}
          >
            TC
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#101828' }}>
            {es.app.name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#667085' }}>
            {es.app.tagline}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="tc-field">
            <label className="tc-label">{es.auth.username}</label>
            <input
              className="tc-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={es.auth.username}
              autoComplete="username"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">{es.auth.password}</label>
            <input
              className="tc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={es.auth.password}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="tc-notice tc-notice--error"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: isLocked ? '14px 16px' : '12px 16px',
                background: isLocked ? '#fef2f2' : undefined,
                border: isLocked ? '1px solid #fca5a5' : undefined,
                borderRadius: '12px',
              }}
            >
              {isLocked && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              )}
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="tc-btn tc-btn--primary" style={{ minHeight: '48px', fontSize: '15px' }} disabled={loading}>
            {loading ? es.common.loading : es.auth.loginButton}
          </button>
        </form>

        {/* Highlights */}
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.values(es.auth.highlights).map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#f9fafb',
                border: '1px solid #e4e7ec',
                fontSize: '13px',
                color: '#475467',
                fontWeight: 500,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#465fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5L6 12 2.5 8.5" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
