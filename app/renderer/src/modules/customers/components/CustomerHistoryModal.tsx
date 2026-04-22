import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import type { Customer } from '../../../shared/types/customers.types';
import { getCustomerHistory } from '../../../shared/api/customers.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

interface SerializedHistorySale {
  id: number;
  saleNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discount: number;
    total: number;
    productName?: string;
    product?: { name: string };
  }>;
  payments: Array<{
    id: number;
    method: string;
    amount: number;
  }>;
  debt?: { balance: number; amount: number; status: string } | null;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [sales, setSales] = useState<SerializedHistorySale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadHistory = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await getCustomerHistory(customer.id);
      if (resp.success) {
        setSales(resp.data);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tc-modal-overlay animate-fadeIn">
      <div
        className="tc-modal tc-modal--lg animate-scaleIn"
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="tc-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="tc-modal-icon">
              <FileText size={26} />
            </div>
            <div>
              <h2 className="tc-modal-title">Historial de Compras</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
                <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                  {customer?.fullName}
                </span>{' '}
                • Registro cronológico de consumos
              </p>
            </div>
          </div>
          <button
            className="tc-btn tc-btn--ghost"
            style={{ minHeight: 0, padding: 'var(--space-2)', color: 'var(--gray-400)' }}
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="tc-modal-content">
          {error && (
            <div
              className="tc-notice tc-notice--error"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <X size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-20)',
                gap: 'var(--space-4)',
              }}
            >
              <div className="tc-spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
              <p
                style={{
                  color: 'var(--gray-500)',
                  fontWeight: 500,
                  animation: 'pulse 2s infinite',
                }}
              >
                Sincronizando transacciones...
              </p>
            </div>
          ) : sales.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-16)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--gray-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                  border: '2px dashed var(--gray-200)',
                }}
              >
                <Package size={40} style={{ color: 'var(--gray-300)' }} />
              </div>
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--gray-800)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Sin historial registrado
              </h3>
              <p style={{ color: 'var(--gray-500)', maxWidth: 320 }}>
                Este cliente aún no ha realizado compras en el sistema.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--space-5)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all 0.3s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--space-5)',
                      paddingBottom: 'var(--space-4)',
                      borderBottom: '1px solid var(--gray-50)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <div
                        style={{
                          background: 'var(--gray-50)',
                          padding: '10px',
                          borderRadius: 'var(--radius-lg)',
                        }}
                      >
                        <Calendar size={20} style={{ color: 'var(--gray-400)' }} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--gray-400)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 2,
                          }}
                        >
                          Fecha y Hora
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: 'var(--gray-700)',
                          }}
                        >
                          {new Date(sale.createdAt).toLocaleString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 1,
                          height: 40,
                          background: 'var(--gray-100)',
                          margin: '0 var(--space-1)',
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--gray-400)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 2,
                          }}
                        >
                          Identificador
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            background: 'var(--brand-50)',
                            color: 'var(--brand-700)',
                          }}
                        >
                          #{sale.saleNumber || sale.id.toString().slice(-8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--gray-400)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: 2,
                        }}
                      >
                        Monto Total
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--text-xl)',
                          fontWeight: 700,
                          color: 'var(--success-600)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {formatCurrency(Number(sale.total))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 'var(--space-6)',
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--gray-400)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 'var(--space-3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <Package size={14} /> Detalle de Artículos
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                          background: 'rgba(244, 245, 247, 0.5)',
                          borderRadius: 'var(--radius-xl)',
                          padding: 'var(--space-3)',
                          border: '1px solid var(--gray-50)',
                        }}
                      >
                        {sale.items.map((item, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 'var(--text-sm)',
                            }}
                          >
                            <span style={{ color: 'var(--gray-600)', fontWeight: 500 }}>
                              <span
                                style={{
                                  color: 'var(--brand-600)',
                                  fontWeight: 700,
                                  marginRight: 4,
                                }}
                              >
                                {item.quantity}x
                              </span>{' '}
                              {item.productName || item.product?.name}
                            </span>
                            <span
                              style={{
                                color: 'var(--gray-900)',
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(Number(item.subtotal))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
                    >
                      {sale.payments && sale.payments.length > 0 && (
                        <div>
                          <h4
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--gray-400)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              marginBottom: 'var(--space-3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <DollarSign size={14} /> Distribución de Pago
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {sale.payments.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 'var(--radius-lg)',
                                  border: '1px solid',
                                  fontSize: 'var(--text-xs)',
                                  fontWeight: 700,
                                  ...(p.method === 'credito'
                                    ? {
                                        background: 'var(--warning-50)',
                                        borderColor: 'var(--warning-100)',
                                        color: 'var(--warning-700)',
                                      }
                                    : {
                                        background: 'var(--success-50)',
                                        borderColor: 'var(--success-100)',
                                        color: 'var(--success-700)',
                                      }),
                                }}
                              >
                                {p.method.charAt(0).toUpperCase() + p.method.slice(1)}:{' '}
                                {formatCurrency(Number(p.amount))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sale.debt && (
                        <div
                          style={{
                            background: 'var(--warning-50)',
                            border: '1px solid var(--warning-100)',
                            borderRadius: 'var(--radius-xl)',
                            padding: 'var(--space-4)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                          }}
                        >
                          <DollarSign
                            style={{ color: 'var(--warning-500)', flexShrink: 0, marginTop: 2 }}
                            size={18}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'var(--warning-700)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: 4,
                              }}
                            >
                              Saldo Pendiente
                            </div>
                            <div
                              style={{
                                fontSize: 'var(--text-sm)',
                                color: 'var(--warning-600)',
                                fontWeight: 500,
                                lineHeight: 1.4,
                              }}
                            >
                              Se generó un crédito por {formatCurrency(Number(sale.debt.amount))}.
                              Saldo actual:{' '}
                              <span style={{ fontWeight: 700 }}>
                                {formatCurrency(Number(sale.debt.balance))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
            paddingTop: 'var(--space-6)',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <button className="tc-btn tc-btn--secondary" style={{ width: '100%' }} onClick={onClose}>
            Finalizar Revisión
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
