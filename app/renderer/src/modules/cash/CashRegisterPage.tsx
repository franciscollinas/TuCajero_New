import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { closeCashRegister, getActiveCashRegister, openCashRegister } from '../../shared/api/cash.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { CashRegister } from '../../shared/types/cash.types';

export function CashRegisterPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCash, setActiveCash] = useState<CashRegister | null>(null);
  const [initialCash, setInitialCash] = useState('');
  const [finalCash, setFinalCash] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadActiveCash = async (): Promise<void> => {
      try {
        const response = await getActiveCashRegister(user.id);

        if (response.success) {
          setActiveCash(response.data);
        } else {
          setMessage(response.error.message);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : es.errors.unknown);
      }
    };

    void loadActiveCash();
  }, [user]);

  const handleOpen = async (): Promise<void> => {
    if (!user) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await openCashRegister(user.id, Number(initialCash));

      if (response.success) {
        setMessage(es.cash.openSuccess);
        setActiveCash(response.data);
        setInitialCash('');
      } else {
        setMessage(response.error.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : es.errors.unknown);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (): Promise<void> => {
    if (!activeCash) {
      return;
    }

    const expectedCash = activeCash.initialCash;
    setLoading(true);
    setMessage('');

    try {
      const response = await closeCashRegister(activeCash.id, Number(finalCash), expectedCash);

      if (response.success) {
        setMessage(es.cash.closeSuccess);
        setActiveCash(null);
        setFinalCash('');
      } else {
        setMessage(response.error.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : es.errors.unknown);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: tokens.spacing[6],
        background:
          'radial-gradient(circle at top right, rgba(124, 58, 237, 0.12), transparent 26%), linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 52%, #E5E7EB 100%)',
      }}
    >
      <section
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'grid',
          gap: tokens.spacing[5],
        }}
      >
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.cashSession.status}</p>
            <h1 style={titleStyle}>{es.cashSession.open}</h1>
            <p style={subtleStyle}>{es.cash.overview}</p>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} style={secondaryButtonStyle}>
            {es.dashboard.title}
          </button>
        </header>

        {message && <div style={noticeStyle}>{message}</div>}

        {!activeCash ? (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>{es.cashSession.open}</h2>
            <p style={subtleStyle}>{es.cash.openingHint}</p>
            <div style={fieldGridStyle}>
              <input
                type="number"
                value={initialCash}
                onChange={(event) => setInitialCash(event.target.value)}
                placeholder={es.cashSession.openAmount}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => void handleOpen()}
                disabled={loading}
                style={buttonStyle}
              >
                {loading ? es.common.loading : es.cashSession.open}
              </button>
            </div>
          </article>
        ) : (
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>{es.cash.title}</h2>
            <div style={summaryGridStyle}>
              <div>
                <p style={eyebrowStyle}>ID</p>
                <p style={metricStyle}>{activeCash.id}</p>
              </div>
              <div>
                <p style={eyebrowStyle}>{es.cashSession.openAmount}</p>
                <p style={metricStyle}>{Number(activeCash.initialCash).toFixed(2)}</p>
              </div>
              <div>
                <p style={eyebrowStyle}>{es.cashSession.status}</p>
                <p style={metricStyle}>{activeCash.status}</p>
              </div>
              <div>
                <p style={eyebrowStyle}>{es.cash.opened}</p>
                <p style={metricStyle}>{new Date(activeCash.openedAt).toLocaleString()}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: tokens.spacing[3], marginTop: tokens.spacing[5] }}>
              <h3 style={sectionTitleStyle}>{es.cashSession.close}</h3>
              <p style={subtleStyle}>{es.cash.closingHint}</p>
              <input
                type="number"
                value={finalCash}
                onChange={(event) => setFinalCash(event.target.value)}
                placeholder={es.cash.finalCash}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => void handleClose()}
                disabled={loading}
                style={dangerButtonStyle}
              >
                {loading ? es.common.loading : es.cashSession.close}
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  padding: '20px',
  borderRadius: '16px',
  background: '#FFFFFF',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06)',
};

const panelStyle: CSSProperties = {
  padding: '24px',
  borderRadius: '16px',
  background: '#FFFFFF',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06)',
  display: 'grid',
  gap: '16px',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '24px',
  color: '#111827',
};

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '12px',
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#2563EB',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: '12px',
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '32px',
  lineHeight: 1.1,
  color: '#111827',
};

const subtleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#6B7280',
};

const noticeStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#ECFDF5',
  color: '#166534',
  border: '1px solid #BBF7D0',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: '48px',
  boxSizing: 'border-box',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  padding: '0 14px',
  fontSize: '16px',
};

const buttonStyle: CSSProperties = {
  minHeight: '48px',
  borderRadius: '8px',
  border: 'none',
  background: '#2563EB',
  color: '#FFFFFF',
  fontWeight: 700,
  padding: '0 18px',
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#DC2626',
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: '52px',
  padding: '0 18px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};

const metricStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: '18px',
  color: '#111827',
};
