import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { getActiveCashRegister } from '../../shared/api/cash.api';
import {
  cancelSale,
  generateInvoice,
  getSalesByCashRegister,
  getSalesByDateRange,
  getSalesByUser,
} from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { SaleRecord } from '../../shared/types/sales.types';

// SVG Icons
const EyeIcon = (): JSX.Element => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const FileTextIcon = (): JSX.Element => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const XCircleIcon = (): JSX.Element => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ShoppingCartIcon = (): JSX.Element => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const CalendarIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PackageIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const DollarSignIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UserIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CreditCardIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const XIcon = (): JSX.Element => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronRightIcon = (): JSX.Element => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ============================================================
// HELPERS
// ============================================================

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function SalesHistoryPage(): JSX.Element {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState<'all' | 'today' | 'yesterday'>('all');

  // Claves de fecha para hoy y ayer
  const todayKey = getDateKey(new Date());
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDateKey(d);
  })();

  // Agrupar ventas por fecha (desde inicio del mes)
  const groupedSales = useMemo(() => {
    if (sales.length === 0) return {};

    const groups: Record<string, SaleRecord[]> = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = sales.filter((s) => new Date(s.createdAt) >= startOfMonth);

    monthSales.forEach((sale) => {
      const key = getDateKey(new Date(sale.createdAt));
      if (!groups[key]) groups[key] = [];
      groups[key].push(sale);
    });

    return groups;
  }, [sales]);

  // Fechas ordenadas (más reciente primero)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedSales).sort((a, b) => b.localeCompare(a));
  }, [groupedSales]);

  useEffect((): (() => void) | void => {
    if (!user) return;
    let cancelled = false;

    const loadSales = async (): Promise<void> => {
      setLoading(true);
      // Admin sees ALL sales; cashiers only see their own
      if (user.role === 'ADMIN') {
        // Load all sales from last 90 days for admin
        const now = new Date();
        const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const dateRangeResponse = await getSalesByDateRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
        );
        if (!cancelled) {
          if (dateRangeResponse.success) {
            setSales(dateRangeResponse.data);
          } else {
            setMessage(dateRangeResponse.error.message);
            setSales([]);
          }
        }
      } else {
        const salesResponse = await getSalesByUser(user.id);
        if (!cancelled) {
          if (salesResponse.success) {
            setSales(salesResponse.data);
          } else {
            // Fallback: intentar por caja activa
            const cashResponse = await getActiveCashRegister(user.id);
            if (cashResponse.success && cashResponse.data) {
              const cashSales = await getSalesByCashRegister(cashResponse.data.id);
              if (cashSales.success) setSales(cashSales.data);
              else setMessage(cashSales.error.message);
            } else {
              setMessage(salesResponse.error.message);
              setSales([]);
            }
          }
        }
      }
      if (!cancelled) setLoading(false);
    };

    void loadSales();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const handleCancelSale = async (sale: SaleRecord): Promise<void> => {
    if (!user || sale.status === 'CANCELLED') return;
    const response = await cancelSale(sale.id, user.id);
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }
    setSales((current) =>
      current.map((item) => (item.id === sale.id ? { ...item, status: 'CANCELLED' } : item)),
    );
    setSelectedSale((current) =>
      current?.id === sale.id ? { ...current, status: 'CANCELLED' } : current,
    );
    setMessage(`Venta ${sale.saleNumber} cancelada.`);
  };

  const handleInvoice = async (saleId: number): Promise<void> => {
    const response = await generateInvoice(saleId);
    setMessage(response.success ? `Factura generada: ${response.data}` : response.error.message);
  };

  return (
    <div className="tc-page-container">
      {/* Page Header */}
      <section className="tc-section animate-slideDown">
        <div className="tc-section-header">
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-1)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {es.sales.posTitle}
              </span>
              <ChevronRightIcon />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--brand-600)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {es.sales.historyTitle}
              </span>
            </div>
            <h2
              className="tc-section-title"
              style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-1)' }}
            >
              {es.sales.historyTitle}
            </h2>
            <p className="tc-section-subtitle">{es.sales.historySubtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link to="/sales" className="tc-btn tc-btn--primary">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {es.sales.posTitle}
            </Link>
            <Link to="/dashboard" className="tc-btn tc-btn--secondary">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {es.dashboard.title}
            </Link>
          </div>
        </div>
        {message && (
          <div
            className="tc-notice tc-notice--info"
            style={{ marginTop: 'var(--space-4)', animation: 'slideDown 0.3s ease-out' }}
          >
            {message}
          </div>
        )}
      </section>

      {/* Sales Section */}
      <section className="tc-section animate-slideUp" style={{ maxWidth: '115%' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-12)',
            }}
          >
            <div
              className="tc-skeleton tc-skeleton--circle"
              style={{ width: '48px', height: '48px' }}
            />
            <div className="tc-skeleton tc-skeleton--title" style={{ width: '200px' }} />
            <div className="tc-skeleton tc-skeleton--text" style={{ width: '150px' }} />
          </div>
        ) : sales.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-12)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-2xl)',
                background: 'var(--gradient-card-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-600)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <ShoppingCartIcon />
            </div>
            <h3
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {es.sales.noSalesYet}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', maxWidth: '320px' }}>
              Las ventas realizadas aparecerán aquí.
            </p>
            <Link
              to="/sales"
              className="tc-btn tc-btn--primary"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Nueva Venta
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFilterDay('today')}
                className={`tc-btn ${filterDay === 'today' ? 'tc-btn--primary' : 'tc-btn--secondary'}`}
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setFilterDay('yesterday')}
                className={`tc-btn ${filterDay === 'yesterday' ? 'tc-btn--primary' : 'tc-btn--secondary'}`}
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={() => setFilterDay('all')}
                className={`tc-btn ${filterDay === 'all' ? 'tc-btn--primary' : 'tc-btn--secondary'}`}
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Todo el mes
              </button>
            </div>

            {/* Grupos por fecha */}
            {(() => {
              // Verificar si hay algún grupo visible con el filtro actual
              const hasVisible = sortedDates.some((dateKey) => {
                const today = dateKey === todayKey;
                const yesterday = dateKey === yesterdayKey;
                if (filterDay === 'today' && !today) return false;
                if (filterDay === 'yesterday' && !yesterday) return false;
                return true;
              });

              if (!hasVisible) {
                return (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-8)',
                      color: 'var(--gray-500)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 600,
                        color: 'var(--gray-700)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      {filterDay === 'today' ? 'No hay ventas hoy' : 'No hay ventas ayer'}
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)' }}>
                      {filterDay === 'today'
                        ? 'Las ventas de hoy aparecerán aquí cuando realices la primera venta.'
                        : 'No se registraron ventas en esta fecha. Prueba con "Todo el mes" para ver el historial completo.'}
                    </p>
                  </div>
                );
              }

              return sortedDates.map((dateKey) => {
                const daySales = groupedSales[dateKey];
                const today = dateKey === todayKey;
                const yesterday = dateKey === yesterdayKey;

                if (filterDay === 'today' && !today) return null;
                if (filterDay === 'yesterday' && !yesterday) return null;

                const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);

                return (
                  <div key={dateKey} style={{ animation: 'slideUp 0.3s ease-out' }}>
                    {/* Header del día */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                        background: today
                          ? 'var(--gradient-primary)'
                          : yesterday
                            ? 'var(--gray-100)'
                            : 'var(--gray-50)',
                        border: today ? 'none' : '1px solid var(--border-light)',
                        borderBottom: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CalendarIcon />
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: today ? '#fff' : 'var(--gray-900)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {formatDateLabel(dateKey)}
                          {today && (
                            <span
                              style={{
                                marginLeft: 'var(--space-2)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(255,255,255,0.2)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                              }}
                            >
                              HOY
                            </span>
                          )}
                          {yesterday && (
                            <span
                              style={{
                                marginLeft: 'var(--space-2)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--gray-200)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                color: 'var(--gray-600)',
                              }}
                            >
                              AYER
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: today ? 'rgba(255,255,255,0.8)' : 'var(--gray-500)',
                          }}
                        >
                          {daySales.length} venta{daySales.length !== 1 ? 's' : ''}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: today ? '#fff' : 'var(--brand-600)',
                          }}
                        >
                          {formatCurrency(dayTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Tabla */}
                    <div
                      className="tc-table-wrap"
                      style={{
                        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                        border: '1px solid var(--border-light)',
                        borderTop: 'none',
                      }}
                    >
                      <table className="tc-table" style={{ textAlign: 'center' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'center' }}>{es.sales.saleNumber}</th>
                            <th style={{ textAlign: 'center' }}>Hora</th>
                            <th style={{ textAlign: 'center' }}>{es.sales.itemsCount}</th>
                            <th style={{ textAlign: 'center' }}>{es.sales.totalLabel}</th>
                            <th style={{ textAlign: 'center' }}>{es.sales.statusLabel}</th>
                            <th style={{ textAlign: 'center' }}>{es.sales.actionsLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daySales.map((sale) => (
                            <tr key={sale.id}>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                                  #{sale.saleNumber}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'var(--space-2)',
                                    color: 'var(--gray-600)',
                                  }}
                                >
                                  {new Date(sale.createdAt).toLocaleTimeString('es-CO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--brand-100)',
                                    color: 'var(--brand-600)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                  }}
                                >
                                  {sale.items.length}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                                  {formatCurrency(sale.total)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  className={`tc-badge ${sale.status === 'COMPLETED' ? 'tc-badge--success' : sale.status === 'CANCELLED' ? 'tc-badge--danger' : 'tc-badge--neutral'}`}
                                >
                                  {sale.status === 'COMPLETED'
                                    ? 'Completada'
                                    : sale.status === 'CANCELLED'
                                      ? 'Cancelada'
                                      : sale.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSale(sale)}
                                    className="tc-btn tc-btn--ghost"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-1)',
                                      color: 'var(--brand-600)',
                                      padding: 'var(--space-1) var(--space-2)',
                                      borderRadius: 'var(--radius-md)',
                                      fontSize: 'var(--text-sm)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <EyeIcon /> Ver
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleInvoice(sale.id)}
                                    className="tc-btn tc-btn--ghost"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 'var(--space-1)',
                                      color: 'var(--gray-700)',
                                      padding: 'var(--space-1) var(--space-2)',
                                      borderRadius: 'var(--radius-md)',
                                      fontSize: 'var(--text-sm)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <FileTextIcon /> Factura
                                  </button>
                                  {sale.status !== 'CANCELLED' && (
                                    <button
                                      type="button"
                                      onClick={() => void handleCancelSale(sale)}
                                      className="tc-btn tc-btn--ghost"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                        color: 'var(--danger-600)',
                                        padding: 'var(--space-1) var(--space-2)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <XCircleIcon /> Cancelar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </section>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onGenerateInvoice={handleInvoice}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL DE DETALLE
// ============================================================

function SaleDetailsModal({
  sale,
  onClose,
  onGenerateInvoice,
}: {
  sale: SaleRecord;
  onClose: () => void;
  onGenerateInvoice: (saleId: number) => void;
}): JSX.Element {
  return (
    <div
      className="tc-modal-overlay"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="tc-modal"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100%)',
          padding: 0,
          gap: 0,
          animation: 'scaleIn 0.3s ease-out',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'var(--gradient-primary)',
            padding: 'var(--space-6)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {es.sales.saleNumber}
                  </span>
                  <span
                    className={`tc-badge ${sale.status === 'COMPLETED' ? 'tc-badge--success' : 'tc-badge--danger'}`}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {sale.status === 'COMPLETED'
                      ? 'Completada'
                      : sale.status === 'CANCELLED'
                        ? 'Cancelada'
                        : sale.status}
                  </span>
                </div>
                <h3 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#fff' }}>
                  #{sale.saleNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <XIcon />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <CalendarIcon />
              {new Date(sale.createdAt).toLocaleString('es-CO')}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 'var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          <div className="tc-grid-2">
            <div className="tc-field">
              <label
                className="tc-label"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <UserIcon />
                {es.auth.title}
              </label>
              <p style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {sale.user.fullName}
              </p>
            </div>
            <div className="tc-field">
              <label
                className="tc-label"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <PackageIcon />
                {es.sales.itemsCount}
              </label>
              <p style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {sale.items.length} producto(s)
              </p>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: 'var(--gray-900)',
                marginBottom: 'var(--space-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Productos
            </h4>
            <div className="tc-table-wrap" style={{ borderRadius: 'var(--radius-lg)' }}>
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
                      <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {item.product.name}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              borderRadius: 'var(--radius-xl)',
              background: 'var(--gradient-card-brand)',
              border: '1px solid var(--brand-100)',
              padding: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h4
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: 'var(--gray-900)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <DollarSignIcon />
              Resumen de Pago
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <SummaryRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
              <SummaryRow label="IVA" value={formatCurrency(sale.tax)} />
              <div
                style={{
                  height: '1px',
                  background: 'var(--brand-200)',
                  margin: 'var(--space-1) 0',
                }}
              />
              <SummaryRow label="Total" value={formatCurrency(sale.total)} strong />
            </div>
          </div>

          {sale.payments.length > 0 && (
            <div
              style={{
                borderRadius: 'var(--radius-xl)',
                background: 'var(--gray-50)',
                border: '1px solid var(--border-light)',
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <CreditCardIcon />
                {es.sales.paymentsTitle}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {sale.payments.map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: '#fff',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <span
                      style={{
                        textTransform: 'capitalize',
                        color: 'var(--gray-700)',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <CreditCardIcon />
                      {payment.method}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--gray-50)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
            {es.common.close}
          </button>
          {sale.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => void onGenerateInvoice(sale.id)}
              className="tc-btn tc-btn--primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <FileTextIcon /> Generar Factura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <span
        style={
          strong
            ? { color: 'var(--gray-900)', fontWeight: 800, fontSize: 'var(--text-lg)' }
            : { color: 'var(--gray-600)' }
        }
      >
        {label}
      </span>
      <span
        style={
          strong
            ? { color: 'var(--brand-600)', fontWeight: 800, fontSize: 'var(--text-lg)' }
            : { color: 'var(--gray-800)', fontWeight: 600 }
        }
      >
        {value}
      </span>
    </div>
  );
}
