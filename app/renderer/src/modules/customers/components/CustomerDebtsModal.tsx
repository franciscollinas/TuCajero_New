import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import type { Customer, Debt } from '../../../shared/types/customers.types';
import { getCustomerDebts, payCustomerDebt } from '../../../shared/api/customers.api';
import { getActiveCashRegister } from '../../../shared/api/cash.api';
import { useAuth } from '../../../shared/context/AuthContext';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CustomerDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerDebtsModal: React.FC<CustomerDebtsModalProps> = ({ isOpen, onClose, customer }) => {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCashSessionId, setActiveCashSessionId] = useState<number | null>(null);

  const [paymentMode, setPaymentMode] = useState<{ debtId: number; maxAmount: number } | null>(
    null,
  );
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDebts();
      loadCashSession();
    }
  }, [isOpen]);

  const loadCashSession = async () => {
    if (user) {
      const resp = await getActiveCashRegister(user.id);
      if (resp.success && resp.data) {
        setActiveCashSessionId(resp.data.id);
      }
    }
  };

  const loadDebts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await getCustomerDebts(customer.id);
      if (resp.success) {
        setDebts(resp.data);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!paymentMode) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > paymentMode.maxAmount) {
      alert('El monto ingresado no es válido o supera el saldo.');
      return;
    }

    setIsPaying(true);
    try {
      const resp = await payCustomerDebt(
        paymentMode.debtId,
        amount,
        paymentMethod,
        activeCashSessionId || undefined,
      );
      if (resp.success) {
        setPaymentMode(null);
        setPaymentAmount('');
        loadDebts();
      } else {
        alert('Error al pagar la deuda: ' + resp.error?.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      alert('Error inesperado: ' + message);
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen) return null;

  const totalBalance = debts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  return (
    <div className="tc-modal-overlay animate-fadeIn">
      <div className="tc-modal animate-scaleIn" style={{ maxWidth: '750px', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--warning-50)',
                color: 'var(--warning-600)',
                boxShadow: 'var(--shadow-xs)',
                border: '1px solid var(--warning-100)',
              }}
            >
              <CreditCard size={26} />
            </div>
            <div>
              <h2 className="tc-modal-title">Gestión de Deudas y Fiados</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
                {customer?.fullName} • Control de cartera pendiente
              </p>
            </div>
          </div>
          <button
            className="tc-btn tc-btn--ghost"
            onClick={onClose}
            disabled={isPaying}
            style={{ minHeight: '0', padding: 'var(--space-2)', color: 'var(--gray-400)' }}
          >
            <X size={24} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            style={{
              background: 'var(--warning-500)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'var(--space-6)',
              color: '#fff',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', right: '-16px', bottom: '-16px', opacity: 0.1 }}>
              <AlertCircle size={120} />
            </div>
            <div style={{ position: 'relative', zIndex: 10 }}>
              <span
                style={{
                  color: 'var(--warning-100)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Saldo Total Pendiente
              </span>
              <div
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 800,
                  marginTop: 'var(--space-1)',
                }}
              >
                {formatCurrency(totalBalance)}
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--gray-100)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--success-50)',
                color: 'var(--success-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={24} />
            </div>
            <div>
              <span
                style={{
                  color: 'var(--gray-400)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                }}
              >
                Créditos Activos
              </span>
              <div
                style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--gray-800)' }}
              >
                {debts.length}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="tc-notice tc-notice--error mb-6">{error}</div>}

        <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: 'var(--space-2)' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-16) 0',
                gap: 'var(--space-3)',
              }}
            >
              <div
                className="tc-skeleton"
                style={{ width: 40, height: 40, borderRadius: '50%' }}
              ></div>
              <p style={{ color: 'var(--gray-500)' }}>Cargando estados de cuenta...</p>
            </div>
          ) : debts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-12)',
                border: '2px dashed var(--gray-100)',
                borderRadius: 'var(--radius-2xl)',
              }}
            >
              <CreditCard
                style={{ margin: '0 auto var(--space-3)', color: 'var(--gray-300)' }}
                size={48}
              />
              <p style={{ color: 'var(--gray-500)', fontWeight: 500 }}>
                No se encontraron deudas pendientes para este cliente.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  style={{
                    border:
                      paymentMode?.debtId === debt.id
                        ? '2px solid var(--warning-500)'
                        : '1px solid var(--gray-100)',
                    borderRadius: 'var(--radius-2xl)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    boxShadow: paymentMode?.debtId === debt.id ? 'var(--shadow-md)' : 'none',
                  }}
                >
                  <div style={{ padding: 'var(--space-5)' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 'var(--space-4)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--gray-50)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gray-400)',
                          }}
                        >
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              fontWeight: 700,
                              color: 'var(--gray-400)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                            }}
                          >
                            Fecha de Inicio
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 700,
                              color: 'var(--gray-700)',
                            }}
                          >
                            {new Date(debt.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--gray-400)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          Pendiente
                        </p>
                        <p
                          style={{
                            fontSize: 'var(--text-lg)',
                            fontWeight: 800,
                            color: 'var(--warning-600)',
                          }}
                        >
                          {formatCurrency(Number(debt.balance))}
                        </p>
                      </div>
                    </div>

                    {paymentMode?.debtId === debt.id ? (
                      <div
                        style={{
                          background: 'var(--warning-25)',
                          borderRadius: 'var(--radius-xl)',
                          padding: 'var(--space-4)',
                          border: '1px solid var(--warning-100)',
                          marginTop: 'var(--space-4)',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 800,
                            color: 'var(--warning-700)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 'var(--space-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <DollarSign size={14} /> Registrar Abono de Capital
                        </h4>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 'var(--space-4)',
                            marginBottom: 'var(--space-4)',
                          }}
                        >
                          <div className="tc-field">
                            <label className="tc-label" style={{ color: 'var(--warning-700)' }}>
                              Monto del Abono
                            </label>
                            <div style={{ position: 'relative' }}>
                              <DollarSign
                                style={{
                                  position: 'absolute',
                                  left: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: 'var(--warning-400)',
                                }}
                                size={18}
                              />
                              <input
                                type="number"
                                className="tc-input"
                                style={{ paddingLeft: '40px', borderColor: 'var(--warning-200)' }}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                max={Number(debt.balance)}
                                min={1}
                                step="500"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="tc-field">
                            <label className="tc-label" style={{ color: 'var(--warning-700)' }}>
                              Medio de Pago
                            </label>
                            <select
                              className="tc-input"
                              style={{ borderColor: 'var(--warning-200)' }}
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="nequi">Nequi</option>
                              <option value="daviplata">Daviplata</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="transferencia">Transferencia</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            className="tc-btn tc-btn--secondary"
                            style={{ flex: 1 }}
                            onClick={() => setPaymentMode(null)}
                            disabled={isPaying}
                          >
                            Cancelar
                          </button>
                          <button
                            className="tc-btn tc-btn--primary"
                            style={{
                              flex: 1,
                              background: 'var(--warning-600)',
                              borderColor: 'var(--warning-600)',
                            }}
                            onClick={handlePay}
                            disabled={isPaying || !paymentAmount}
                          >
                            {isPaying ? 'Procesando...' : 'Confirmar Abono'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid var(--gray-50)',
                          paddingTop: 'var(--space-4)',
                          marginTop: 'var(--space-2)',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--gray-500)',
                              fontStyle: 'italic',
                            }}
                          >
                            {debt.payments?.length
                              ? `${debt.payments.length} abonos realizados`
                              : 'Sin abonos previos'}
                          </p>
                        </div>
                        <button
                          className="tc-btn tc-btn--primary"
                          style={{
                            background: 'var(--warning-500)',
                            borderColor: 'var(--warning-500)',
                            padding: 'var(--space-2) var(--space-4)',
                            minHeight: '0',
                          }}
                          onClick={() => {
                            setPaymentMode({ debtId: debt.id, maxAmount: Number(debt.balance) });
                            setPaymentAmount(debt.balance.toString());
                          }}
                        >
                          <DollarSign size={16} /> Abonar
                        </button>
                      </div>
                    )}

                    {debt.payments && debt.payments.length > 0 && !paymentMode && (
                      <div style={{ marginTop: 'var(--space-4)' }}>
                        <p
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--gray-300)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Historial Reciente de Abonos
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-2)',
                          }}
                        >
                          {debt.payments.map((p) => (
                            <div
                              key={p.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-1) var(--space-2)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--gray-50)',
                                border: '1px solid var(--gray-100)',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--gray-600)',
                              }}
                            >
                              <span style={{ color: 'var(--success-600)' }}>
                                {formatCurrency(Number(p.amount))}
                              </span>
                              <span style={{ color: 'var(--gray-400)' }}>{p.method}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="tc-modal-actions"
          style={{
            marginTop: 'var(--space-8)',
            borderTop: '1px solid var(--gray-50)',
            paddingTop: 'var(--space-6)',
          }}
        >
          <button className="tc-btn tc-btn--secondary" style={{ width: '100%' }} onClick={onClose}>
            Regresar al Listado
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtsModal;
