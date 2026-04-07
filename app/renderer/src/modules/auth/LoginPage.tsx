import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : es.errors.unknown);
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
        padding: tokens.spacing[6],
        background:
          'radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 28%), linear-gradient(180deg, #EFF6FF 0%, #F3F4F6 45%, #E5E7EB 100%)',
      }}
    >
      <section
        style={{
          width: 'min(960px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 420px)',
          gap: tokens.spacing[6],
          alignItems: 'stretch',
        }}
      >
        <article
          style={{
            padding: tokens.spacing[8],
            borderRadius: tokens.borderRadius.xl,
            background: 'rgba(255,255,255,0.8)',
            boxShadow: tokens.shadows.xl,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          <p
            style={{
              margin: 0,
              color: tokens.colors.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.bold,
            }}
          >
            {es.app.name}
          </p>
          <h1
            style={{
              margin: `${tokens.spacing[3]} 0 ${tokens.spacing[4]}`,
              fontSize: tokens.typography.sizes['3xl'],
              color: tokens.colors.neutral[900],
              lineHeight: tokens.typography.lineHeight.tight,
            }}
          >
            {es.auth.title}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 560,
              color: tokens.colors.neutral[700],
              fontSize: tokens.typography.sizes.lg,
              lineHeight: tokens.typography.lineHeight.relaxed,
            }}
          >
            {es.auth.subtitle}
          </p>
          <div
            style={{
              marginTop: tokens.spacing[6],
              display: 'grid',
              gap: tokens.spacing[3],
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            {Object.values(es.auth.highlights).map((item) => (
              <div
                key={item}
                style={{
                  padding: tokens.spacing[4],
                  borderRadius: tokens.borderRadius.lg,
                  background: tokens.colors.neutral[50],
                  border: `1px solid ${tokens.colors.neutral[200]}`,
                  color: tokens.colors.neutral[700],
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: tokens.spacing[8],
            borderRadius: tokens.borderRadius.xl,
            background: tokens.colors.white,
            boxShadow: tokens.shadows.lg,
            border: `1px solid ${tokens.colors.neutral[200]}`,
            display: 'grid',
            gap: tokens.spacing[4],
            alignContent: 'start',
          }}
        >
          <div>
            <label style={fieldLabelStyle}>{es.auth.username}</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={es.auth.username}
              style={inputStyle}
              autoComplete="username"
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>{es.auth.password}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={es.auth.password}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div
              style={{
                padding: tokens.spacing[3],
                borderRadius: tokens.borderRadius.md,
                background: '#FEF2F2',
                color: tokens.colors.danger,
                border: '1px solid #FECACA',
              }}
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? es.common.loading : es.auth.loginButton}
          </button>
        </form>
      </section>
    </main>
  );
}

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '48px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  padding: '0 14px',
  fontSize: '16px',
  outline: 'none',
};

const buttonStyle: CSSProperties = {
  minHeight: '52px',
  borderRadius: '8px',
  border: 'none',
  background: '#2563EB',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
};
