import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { getActiveCashRegister } from '../../shared/api/cash.api';
import { cancelSale, generateInvoice, getSalesByCashRegister } from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
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
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.sales.historyTitle}</p>
            <h1 style={titleStyle}>{es.sales.historyTitle}</h1>
            <p style={subtleStyle}>{es.sales.historySubtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/sales" style={primaryLinkStyle}>
              {es.sales.posTitle}
            </Link>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        {message && <div style={noticeStyle}>{message}</div>}

        <section style={panelStyle}>
          {loading ? (
            <p style={subtleStyle}>{es.common.loading}</p>
          ) : sales.length === 0 ? (
            <p style={subtleStyle}>{es.sales.noSalesYet}</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{es.sales.saleNumber}</th>
                    <th style={thStyle}>{es.sales.dateLabel}</th>
                    <th style={thStyle}>{es.sales.itemsCount}</th>
                    <th style={thStyle}>{es.sales.totalLabel}</th>
                    <th style={thStyle}>{es.sales.statusLabel}</th>
                    <th style={thStyle}>{es.sales.actionsLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={tdStyle}>{sale.saleNumber}</td>
                      <td style={tdStyle}>{new Date(sale.createdAt).toLocaleString('es-CO')}</td>
                      <td style={tdStyle}>{sale.items.length}</td>
                      <td style={tdStyle}>{formatCurrency(sale.total)}</td>
                      <td style={tdStyle}>
                        <span style={sale.status === 'COMPLETED' ? successBadgeStyle : dangerBadgeStyle}>
                          {sale.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => setSelectedSale(sale)} style={inlineActionStyle}>
                            Ver
                          </button>
                          <button type="button" onClick={() => void handleInvoice(sale.id)} style={inlineActionStyle}>
                            Factura
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCancelSale(sale)}
                            style={dangerActionStyle}
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
      </section>

      {selectedSale && <SaleDetailsModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </main>
  );
}

function SaleDetailsModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }): JSX.Element {
  return (
    <div style={modalBackdropStyle}>
      <section style={modalStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>{sale.saleNumber}</h2>
            <p style={subtleStyle}>{new Date(sale.createdAt).toLocaleString('es-CO')}</p>
          </div>
          <button type="button" onClick={onClose} style={secondaryLinkStyle}>
            {es.common.close}
          </button>
        </div>

        <div style={detailsGridStyle}>
          <div>
            <strong>{es.auth.title}</strong>
            <p style={subtleStyle}>{sale.user.fullName}</p>
          </div>
          <div>
            <strong>{es.sales.statusLabel}</strong>
            <p style={subtleStyle}>{sale.status}</p>
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{es.inventory.name}</th>
                <th style={thStyle}>{es.sales.itemsCount}</th>
                <th style={thStyle}>{es.inventory.price}</th>
                <th style={thStyle}>{es.sales.totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.product.name}</td>
                  <td style={tdStyle}>{item.quantity}</td>
                  <td style={tdStyle}>{formatCurrency(item.unitPrice)}</td>
                  <td style={tdStyle}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={summaryBoxStyle}>
          <SummaryRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
          <SummaryRow label="IVA" value={formatCurrency(sale.tax)} />
          <SummaryRow label="Total" value={formatCurrency(sale.total)} strong />
        </div>

        <div style={summaryBoxStyle}>
          <strong>{es.sales.paymentsTitle}</strong>
          {sale.payments.map((payment) => (
            <div key={payment.id} style={summaryRowStyle}>
              <span style={{ textTransform: 'capitalize' }}>{payment.method}</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }): JSX.Element {
  return (
    <div style={summaryRowStyle}>
      <span style={strong ? summaryStrongStyle : summaryLabelStyle}>{label}</span>
      <span style={strong ? summaryStrongStyle : summaryLabelStyle}>{value}</span>
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

const pageStyle: CSSProperties = { minHeight: '100vh', padding: tokens.spacing[6], background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 52%, #E5E7EB 100%)' };
const shellStyle: CSSProperties = { maxWidth: 1320, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const primaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700 };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '42px', padding: '0 14px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700, cursor: 'pointer' };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' };
const successBadgeStyle: CSSProperties = { display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: '#DCFCE7', color: '#166534', fontWeight: 700, fontSize: '12px' };
const dangerBadgeStyle: CSSProperties = { display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: '12px' };
const inlineActionStyle: CSSProperties = { border: 'none', background: 'transparent', color: '#2563EB', cursor: 'pointer', fontWeight: 700 };
const dangerActionStyle: CSSProperties = { ...inlineActionStyle, color: '#DC2626' };
const modalBackdropStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', padding: '24px', zIndex: 50 };
const modalStyle: CSSProperties = { width: 'min(920px, 100%)', maxHeight: '88vh', overflowY: 'auto', borderRadius: '18px', background: '#FFFFFF', padding: '24px', display: 'grid', gap: '16px' };
const modalHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '22px', color: '#111827' };
const detailsGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' };
const summaryBoxStyle: CSSProperties = { display: 'grid', gap: '10px', padding: '16px', borderRadius: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB' };
const summaryRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px' };
const summaryLabelStyle: CSSProperties = { color: '#374151' };
const summaryStrongStyle: CSSProperties = { color: '#111827', fontWeight: 800 };
