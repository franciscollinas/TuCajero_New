import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Unlock,
  LayoutDashboard,
  DollarSign,
  Activity,
  Clock,
  AlertCircle,
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Tag,
  Timer,
} from 'lucide-react';

import {
  closeCashRegister,
  getActiveCashRegister,
  openCashRegister,
  getCashSessionSummary,
  getTodaySalesTotal,
  getMonthSalesTotal,
  listCashClosures,
} from '../../shared/api/cash.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { formatCurrency } from '../../shared/utils/formatters';
import type { CashClosureRow, CashRegister } from '../../shared/types/cash.types';

export function CashRegisterPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCash, setActiveCash] = useState<CashRegister | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [initialCash, setInitialCash] = useState('');
  const [finalCash, setFinalCash] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [closures, setClosures] = useState<CashClosureRow[]>([]);
  const [closuresTake, setClosuresTake] = useState(60);
  const [closuresLoading, setClosuresLoading] = useState(false);
  const [closuresError, setClosuresError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const loadActiveCash = async (): Promise<void> => {
      try {
        const response = await getActiveCashRegister(user.id);
        if (!cancelled && response.success && response.data) {
          setActiveCash(response.data);
          const summaryResp = await getCashSessionSummary(response.data.id);
          if (summaryResp.success) {
            setSummary(summaryResp.data);
          }
        }

        if (!cancelled) {
          const todayResp = await getTodaySalesTotal(user.id);
          if (todayResp.success) setTodayTotal(todayResp.data);

          const monthResp = await getMonthSalesTotal(user.id);
          if (monthResp.success) setMonthTotal(monthResp.data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadActiveCash();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const loadClosures = async (take = closuresTake): Promise<void> => {
    setClosuresLoading(true);
    setClosuresError(null);

    try {
      const resp = await listCashClosures(take);
      if (resp.success) {
        setClosures(resp.data);
      } else {
        setClosuresError(resp.error.message);
      }
    } catch (err) {
      setClosuresError(err instanceof Error ? err.message : es.errors.unknown);
    } finally {
      setClosuresLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadClosures(closuresTake);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, closuresTake]);

  const handleOpen = async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    setMessage('');

    try {
      const response = await openCashRegister(user.id, Number(initialCash));
      if (response.success) {
        setActiveCash(response.data);
        setInitialCash('');
        const summaryResp = await getCashSessionSummary(response.data.id);
        if (summaryResp.success) setSummary(summaryResp.data);
        void loadClosures();
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
    if (!activeCash) return;
    setLoading(true);
    setMessage('');

    try {
      const cashPayments = summary?.efectivo || 0;
      const expectedTotal = activeCash.initialCash + cashPayments;

      const response = await closeCashRegister(activeCash.id, Number(finalCash), expectedTotal);
      if (response.success) {
        setActiveCash(null);
        setSummary(null);
        setFinalCash('');
        void loadClosures();
        setMessage('Caja cerrada con éxito. ¡Vuelva pronto!');
      } else {
        setMessage(response.error.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : es.errors.unknown);
    } finally {
      setLoading(false);
    }
  };

  const formatSignedCurrency = (value: number): string => {
    return `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
  };

  return (
    <div
      style={{
        padding: 'var(--space-6)',
        animation: 'fadeIn 0.3s ease',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 800,
                color: 'var(--gray-900)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                letterSpacing: '-0.02em',
              }}
            >
              <span
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--brand-50)',
                  borderRadius: 'var(--radius-xl)',
                  color: 'var(--brand-600)',
                }}
              >
                <Wallet size={28} />
              </span>
              Control de Caja
            </h1>
            <p style={{ color: 'var(--gray-500)', marginTop: 'var(--space-2)', fontWeight: 500 }}>
              Supervisión y auditoría de sesiones para {user?.fullName}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="tc-btn tc-btn--secondary">
            <LayoutDashboard size={20} />
            Tablero Principal
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`tc-notice ${message.includes('éxito') ? 'tc-notice--success' : 'tc-notice--error'}`}
          style={{ marginBottom: 'var(--space-6)', animation: 'slideUp 0.3s ease' }}
        >
          {message}
        </div>
      )}

      {!activeCash ? (
        /* Open Cash Register Form */
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 'var(--space-12) 0',
            animation: 'slideUp 0.3s ease',
          }}
        >
          <div
            className="tc-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: 'var(--space-8)',
              textAlign: 'center',
              borderTop: '4px solid var(--brand-500)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                background: 'var(--brand-50)',
                borderRadius: 'var(--radius-2xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-6)',
                color: 'var(--brand-600)',
                boxShadow: 'var(--shadow-xs)',
                border: '1px solid var(--brand-100)',
              }}
            >
              <Unlock size={40} />
            </div>
            <h2
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: 'var(--gray-800)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Sección de Ventas Cerrada
            </h2>
            <p
              style={{
                color: 'var(--gray-500)',
                marginBottom: 'var(--space-8)',
                maxWidth: '320px',
                margin: '0 auto var(--space-8)',
                lineHeight: 1.6,
              }}
            >
              Para comenzar a facturar, primero debes realizar la apertura de caja con el fondo
              inicial disponible.
            </p>

            <div style={{ marginBottom: 'var(--space-6)', textAlign: 'left' }}>
              <label className="tc-label">Base de Caja (Fondo Inicial)</label>
              <div style={{ position: 'relative' }}>
                <DollarSign
                  style={{
                    position: 'absolute',
                    left: 'var(--space-4)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-400)',
                  }}
                  size={20}
                />
                <input
                  type="number"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  placeholder="0.00"
                  className="tc-input"
                  style={{
                    paddingLeft: '48px',
                    minHeight: '56px',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                  }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpen}
              disabled={loading || !initialCash}
              className="tc-btn tc-btn--primary"
              style={{
                width: '100%',
                minHeight: '56px',
                fontSize: 'var(--text-lg)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <Unlock size={22} />
              {loading ? 'Procesando...' : 'Abrir Caja Ahora'}
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      ) : (
        /* Active Cash Register */
        <div style={{ animation: 'slideUp 0.3s ease' }}>
          {/* Status Cards */}
          <div className="tc-grid-4" style={{ marginBottom: 'var(--space-6)' }}>
            <div
              className="tc-card"
              style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--success-500)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--success-500)',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <TrendingUp size={14} /> Ventas Hoy
              </div>
              <div
                style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--gray-800)' }}
              >
                {formatCurrency(todayTotal)}
              </div>
            </div>

            <div
              className="tc-card"
              style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--brand-500)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--brand-600)',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <TrendingUp size={14} /> Ventas del Mes
              </div>
              <div
                style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--gray-800)' }}
              >
                {formatCurrency(monthTotal)}
              </div>
            </div>

            <div
              className="tc-card"
              style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--warning-500)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--warning-500)',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Activity size={14} /> Estado Actual
              </div>
              <div>
                <span
                  className="tc-badge tc-badge--warning"
                  style={{ padding: 'var(--space-1) var(--space-3)', fontWeight: 700 }}
                >
                  ABIERTO Y OPERANDO
                </span>
              </div>
            </div>

            <div
              className="tc-card"
              style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--brand-500)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--gray-400)',
                  marginBottom: 'var(--space-2)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Clock size={14} /> Apertura
              </div>
              <div
                style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--gray-700)' }}
              >
                {new Date(activeCash.openedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                  marginTop: 'var(--space-1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <Timer size={12} />
                {(() => {
                  const opened = new Date(activeCash.openedAt).getTime();
                  const now = Date.now();
                  const diff = Math.floor((now - opened) / 60000);
                  const hours = Math.floor(diff / 60);
                  const mins = diff % 60;
                  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                })()}
              </div>
            </div>
          </div>

          {/* Sales Summary + Close Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
            {/* Sales Summary */}
            <div className="tc-card" style={{ padding: 'var(--space-6)' }}>
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  color: 'var(--gray-800)',
                  marginBottom: 'var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <TrendingUp size={20} style={{ color: 'var(--brand-600)' }} />
                Resumen de Recaudación
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--space-4)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--success-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--success-100)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--success-600)',
                      marginBottom: 'var(--space-1)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Banknote size={16} /> Efectivo
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      color: 'var(--success-700)',
                    }}
                  >
                    {formatCurrency(summary?.efectivo || 0)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--brand-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--brand-100)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--brand-600)',
                      marginBottom: 'var(--space-1)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <CreditCard size={16} /> Electrónico
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      color: 'var(--brand-700)',
                    }}
                  >
                    {formatCurrency(
                      (summary?.tarjeta || 0) + (summary?.nequi || 0) + (summary?.daviplata || 0),
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--brand-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--brand-100)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--brand-600)',
                      marginBottom: 'var(--space-1)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <ArrowLeftRight size={16} /> Transferencias
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      color: 'var(--brand-700)',
                    }}
                  >
                    {formatCurrency(summary?.transferencia || 0)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--warning-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--warning-100)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--warning-600)',
                      marginBottom: 'var(--space-1)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Tag size={16} /> Créditos (Fiados)
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      color: 'var(--warning-700)',
                    }}
                  >
                    {formatCurrency(summary?.credito || 0)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--gray-600)',
                      marginBottom: 'var(--space-1)',
                      fontWeight: 800,
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                    }}
                  >
                    <DollarSign size={16} /> Base Inicial
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 800,
                      color: 'var(--gray-700)',
                    }}
                  >
                    {formatCurrency(activeCash.initialCash)}
                  </div>
                </div>
              </div>

              {/* Expected Cash */}
              <div
                style={{
                  padding: 'var(--space-5)',
                  background: 'var(--gradient-primary)',
                  borderRadius: 'var(--radius-xl)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-xl)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      opacity: 0.8,
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Efectivo Esperado en Caja
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--text-3xl)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatCurrency(activeCash.initialCash + (summary?.efectivo || 0))}
                  </p>
                </div>
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                >
                  <Banknote size={32} />
                </div>
              </div>
            </div>

            {/* Close Session Form */}
            <div
              className="tc-card"
              style={{ padding: 'var(--space-6)', borderTop: '4px solid var(--danger-500)' }}
            >
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  color: 'var(--gray-800)',
                  marginBottom: 'var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Lock size={20} style={{ color: 'var(--danger-600)' }} />
                Cierre de Jornada
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                <div
                  style={{
                    background: 'var(--warning-50)',
                    border: '1px solid var(--warning-100)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    gap: 'var(--space-3)',
                  }}
                >
                  <AlertCircle
                    size={18}
                    style={{ color: 'var(--warning-600)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--warning-800)',
                      fontWeight: 500,
                      lineHeight: 1.6,
                    }}
                  >
                    Cuenta el dinero físico en el cajón e ingresa el total aquí.
                  </p>
                </div>

                <div>
                  <label className="tc-label">Efectivo Real Conteado</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign
                      style={{
                        position: 'absolute',
                        left: 'var(--space-4)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--gray-400)',
                      }}
                      size={20}
                    />
                    <input
                      type="number"
                      value={finalCash}
                      onChange={(e) => setFinalCash(e.target.value)}
                      placeholder="0.00"
                      className="tc-input"
                      style={{
                        paddingLeft: '48px',
                        minHeight: '56px',
                        fontSize: 'var(--text-xl)',
                        fontWeight: 800,
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading || !finalCash}
                  className="tc-btn tc-btn--primary"
                  style={{
                    width: '100%',
                    minHeight: '56px',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    background: 'var(--gradient-danger)',
                    border: 'none',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <Lock size={20} />
                  {loading ? 'Liquidando...' : 'CERRAR CAJA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Closures */}
      <div style={{ marginTop: 'var(--space-8)', animation: 'slideUp 0.3s ease' }}>
        <div className="tc-card" style={{ padding: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  color: 'var(--gray-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                <Lock size={18} style={{ color: 'var(--gray-600)' }} />
                Cierres de Caja Diarios
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                Historial en orden (mostrando últimos {closuresTake}).
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void loadClosures(closuresTake)}
                className="tc-btn tc-btn--secondary"
                disabled={closuresLoading}
              >
                {closuresLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                type="button"
                onClick={() => setClosuresTake((t) => Math.min(500, t + 60))}
                className="tc-btn tc-btn--primary"
                disabled={closuresLoading || closuresTake >= 500}
                style={{ background: 'var(--gradient-primary)', border: 'none' }}
              >
                Cargar más
              </button>
            </div>
          </div>

          {closuresError ? (
            <div className="tc-notice tc-notice--error">{closuresError}</div>
          ) : closuresLoading && closures.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--gray-500)' }}>
              {es.common.loading}
            </div>
          ) : closures.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--gray-500)' }}>
              Aún no hay cierres de caja registrados.
            </div>
          ) : (
            <div className="tc-table-wrap">
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Base</th>
                    <th>Esperado</th>
                    <th>Contado</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {closures.map((c) => {
                    const closedDate = new Date(c.closedAt);
                    const diff = c.difference;

                    return (
                      <tr key={c.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                            {closedDate.toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2 }}>
                            {closedDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{c.user.fullName}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 2 }}>
                            {c.user.username} &middot; {c.user.role}
                          </div>
                        </td>

                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {formatCurrency(c.initialCash)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {c.expectedCash == null ? '—' : formatCurrency(c.expectedCash)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: 'var(--gray-900)' }}>
                          {c.finalCash == null ? '—' : formatCurrency(c.finalCash)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {diff == null ? (
                            <span className="tc-badge tc-badge--neutral">—</span>
                          ) : diff === 0 ? (
                            <span className="tc-badge tc-badge--success">{formatSignedCurrency(diff)}</span>
                          ) : (
                            <span className="tc-badge tc-badge--danger">{formatSignedCurrency(diff)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
