import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { closeCashRegister, getActiveCashRegister, openCashRegister } from '../../shared/api/cash.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
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
    <div className="tc-section" style={{ maxWidth: 960, margin: '0 auto' }}>
      <header className="tc-section-header">
        <div>
          <p className="tc-section-title">{es.cashSession.open}</p>
          <p className="tc-section-subtitle">{es.cash.overview}</p>
        </div>
        <button type="button" onClick={() => navigate('/dashboard')} className="tc-btn tc-btn--secondary">
          {es.dashboard.title}
        </button>
      </header>

      {message && <div className="tc-notice tc-notice--success">{message}</div>}

      {!activeCash ? (
        <div>
          <h2 className="tc-section-title">{es.cashSession.open}</h2>
          <p className="tc-section-subtitle">{es.cash.openingHint}</p>
          <div className="tc-grid-form">
            <div className="tc-field">
              <label className="tc-label" htmlFor="initialCash">{es.cashSession.openAmount}</label>
              <input
                id="initialCash"
                type="number"
                value={initialCash}
                onChange={(event) => setInitialCash(event.target.value)}
                placeholder={es.cashSession.openAmount}
                className="tc-input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => void handleOpen()}
                disabled={loading}
                className="tc-btn tc-btn--primary"
              >
                {loading ? es.common.loading : es.cashSession.open}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="tc-section-title">{es.cash.title}</h2>
          <div className="tc-grid-4">
            <div>
              <p className="tc-metric-label">ID</p>
              <p className="tc-metric-value">{activeCash.id}</p>
            </div>
            <div>
              <p className="tc-metric-label">{es.cashSession.openAmount}</p>
              <p className="tc-metric-value">{Number(activeCash.initialCash).toFixed(2)}</p>
            </div>
            <div>
              <p className="tc-metric-label">{es.cashSession.status}</p>
              <p className="tc-metric-value">{activeCash.status}</p>
            </div>
            <div>
              <p className="tc-metric-label">{es.cash.opened}</p>
              <p className="tc-metric-value">{new Date(activeCash.openedAt).toLocaleString()}</p>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <h3 className="tc-section-title">{es.cashSession.close}</h3>
            <p className="tc-section-subtitle">{es.cash.closingHint}</p>
            <div className="tc-grid-form">
              <div className="tc-field">
                <label className="tc-label" htmlFor="finalCash">{es.cash.finalCash}</label>
                <input
                  id="finalCash"
                  type="number"
                  value={finalCash}
                  onChange={(event) => setFinalCash(event.target.value)}
                  placeholder={es.cash.finalCash}
                  className="tc-input"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => void handleClose()}
                  disabled={loading}
                  className="tc-btn tc-btn--danger"
                >
                  {loading ? es.common.loading : es.cashSession.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
