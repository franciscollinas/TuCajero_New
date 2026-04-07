import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getActiveCashRegister } from '../../shared/api/cash.api';
import { cancelSale, generateInvoice, getSalesByCashRegister } from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { SaleRecord } from '../../shared/types/sales.types';

export function SalesHistoryPage(): JSX.Element {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect((): (() => void) | void => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadSales = async (): Promise<void> => {
      setLoading(true);
      const cashResponse = await getActiveCashRegister(user.id);

      if (!cashResponse.success || !cashResponse.data) {
        if (!cancelled) {
          setSales([]);
          setLoading(false);
        }
        return;
      }

      const salesResponse = await getSalesByCashRegister(cashResponse.data.id);
      if (!cancelled) {
        if (salesResponse.success) {
          setSales(salesResponse.data);
        } else {
          setMessage(salesResponse.error.message);
        }
        setLoading(false);
      }
    };

    void loadSales();

    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const handleCancelSale = async (sale: SaleRecord): Promise<void> => {
    if (!user || sale.status === 'CANCELLED') {
      return;
    }

    const response = await cancelSale(sale.id, user.id);
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setSales((current) => current.map((item) => (item.id === sale.id ? { ...item, status: 'CANCELLED' } : item)));
    setSelectedSale((current) => (current?.id === sale.id ? { ...current, status: 'CANCELLED' } : current));
    setMessage(`Venta ${sale.saleNumber} cancelada.`);
  };

  const handleInvoice = async (saleId: number): Promise<void> => {
    const response = await generateInvoice(saleId);
    setMessage(response.success ? `Factura generada: ${response.data}` : response.error.message);
  };

  return (
    <div className="tc-page-container">
      <section className="tc-section">
        <div className="tc-section-header">
          <div>
            <h2 className="tc-section-title">{es.sales.historyTitle}</h2>
            <p className="tc-section-subtitle">{es.sales.historySubtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link to="/sales" className="tc-btn tc-btn--primary">
              {es.sales.posTitle}
            </Link>
            <Link to="/dashboard" className="tc-btn tc-btn--secondary">
              {es.dashboard.title}
            </Link>
          </div>
        </div>

        {message && <div className="tc-notice tc-notice--info">{message}</div>}
      </section>

      <section className="tc-section">
        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
        ) : sales.length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>{es.sales.noSalesYet}</p>
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>{es.sales.saleNumber}</th>
                  <th>{es.sales.dateLabel}</th>
                  <th>{es.sales.itemsCount}</th>
                  <th>{es.sales.totalLabel}</th>
                  <th>{es.sales.statusLabel}</th>
                  <th>{es.sales.actionsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.saleNumber}</td>
                    <td>{new Date(sale.createdAt).toLocaleString('es-CO')}</td>
                    <td>{sale.items.length}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>
                      <span className={sale.status === 'COMPLETED' ? 'tc-badge tc-badge--success' : 'tc-badge tc-badge--danger'}>
                        {sale.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setSelectedSale(sale)} className="tc-btn tc-btn--ghost">
                          Ver
                        </button>
                        <button type="button" onClick={() => void handleInvoice(sale.id)} className="tc-btn tc-btn--ghost">
                          Factura
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCancelSale(sale)}
                          className="tc-btn tc-btn--danger"
                          disabled={sale.status === 'CANCELLED'}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSale && <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  );
}

function SaleDetailsModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }): JSX.Element {
  return (
    <div className="tc-modal-overlay">
      <div className="tc-modal">
        <div className="tc-section-header">
          <div>
            <h3 className="tc-modal-title">{sale.saleNumber}</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
              {new Date(sale.createdAt).toLocaleString('es-CO')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
            {es.common.close}
          </button>
        </div>

        <div className="tc-grid-2">
          <div className="tc-field">
            <label className="tc-label">{es.auth.title}</label>
            <p style={{ color: 'var(--gray-600)', fontSize: 'var(--text-sm)' }}>{sale.user.fullName}</p>
          </div>
          <div className="tc-field">
            <label className="tc-label">{es.sales.statusLabel}</label>
            <p style={{ color: 'var(--gray-600)', fontSize: 'var(--text-sm)' }}>{sale.status}</p>
          </div>
        </div>

        <div className="tc-table-wrap">
          <table className="tc-table">
            <thead>
              <tr>
                <th>{es.inventory.name}</th>
                <th>{es.sales.itemsCount}</th>
                <th>{es.inventory.price}</th>
                <th>{es.sales.totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)', display: 'grid', gap: 'var(--space-2)' }}>
          <SummaryRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
          <SummaryRow label="IVA" value={formatCurrency(sale.tax)} />
          <SummaryRow label="Total" value={formatCurrency(sale.total)} strong />
        </div>

        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)', display: 'grid', gap: 'var(--space-2)' }}>
          <strong>{es.sales.paymentsTitle}</strong>
          {sale.payments.map((payment) => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <span style={{ textTransform: 'capitalize' }}>{payment.method}</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span style={strong ? { color: 'var(--gray-900)', fontWeight: 800 } : { color: 'var(--gray-600)' }}>{label}</span>
      <span style={strong ? { color: 'var(--gray-900)', fontWeight: 800 } : { color: 'var(--gray-600)' }}>{value}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
