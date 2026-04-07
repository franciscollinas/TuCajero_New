import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adjustStock as adjustStockApi, getAllProducts } from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { InventoryProduct } from '../../shared/types/inventory.types';
import { useInventoryStore } from '../../shared/store/inventory.store';
import { InventoryAlerts } from './InventoryAlerts';
import { StockAdjustModal } from './StockAdjustModal';
import {
  buildInventoryAlertBuckets,
  formatCurrency,
  formatDate,
  getDaysUntil,
  getInventoryStatus,
  getInventoryStatusColor,
  getInventoryStatusLabel,
} from './inventory.utils';

type InventoryFilter = 'all' | 'critical' | 'warning' | 'ok' | 'expired';

export function InventoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const products = useInventoryStore((state) => state.products);
  const replaceFromBackend = useInventoryStore((state) => state.replaceFromBackend);
  const localAdjustStock = useInventoryStore((state) => state.adjustStock);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canManage = user?.role !== 'CASHIER';

  useEffect(() => {
    let cancelled = false;

    const syncProducts = async (): Promise<void> => {
      setSyncing(true);

      try {
        const response = await getAllProducts();
        if (!cancelled && response.success && response.data.length > 0) {
          replaceFromBackend(response.data);
        }
      } catch {
        // Si el backend no expone inventario todavía, mantenemos el store local.
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    };

    void syncProducts();

    return (): void => {
      cancelled = true;
    };
  }, [replaceFromBackend]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category.name))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const status = getInventoryStatus(product);
      const matchesSearch =
        !query ||
        product.code.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query) ||
        (product.location?.toLowerCase().includes(query) ?? false);
      const matchesCategory = category === 'all' || product.category.name === category;
      const matchesStatus = filter === 'all' || status === filter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [category, filter, products, search]);

  const alertBuckets = useMemo(() => buildInventoryAlertBuckets(products), [products]);
  const expiredCount = alertBuckets.expired?.length ?? 0;

  const handleAdjust = async ({
    quantity,
    reason,
    mode,
  }: {
    quantity: number;
    reason: string;
    mode: 'entrada' | 'salida';
  }): Promise<void> => {
    if (!selectedProduct || !user) {
      return;
    }

    const delta = mode === 'entrada' ? quantity : -quantity;

    setSubmitting(true);
    try {
      const updated = localAdjustStock(selectedProduct.id, delta, reason, user.id);
      if (updated) {
        setSelectedProduct(updated);
      }

      void adjustStockApi(selectedProduct.id, delta, reason, user.id).catch(() => undefined);
    } finally {
      setSubmitting(false);
      setSelectedProduct(null);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.inventory.title}</p>
            <h1 style={titleStyle}>{es.inventory.dashboardTitle}</h1>
            <p style={subtleStyle}>{es.inventory.dashboardSubtitle}</p>
          </div>
          <div style={headerActionsStyle}>
            <button type="button" onClick={() => navigate('/dashboard')} style={secondaryButtonStyle}>
              {es.dashboard.title}
            </button>
            <Link to="/inventory/import" style={primaryLinkStyle}>
              {es.inventory.importCSV}
            </Link>
          </div>
        </header>

        <section style={statsGridStyle}>
          <StatCard label={es.inventory.stockOk} value={alertBuckets.ok.length} accent="#16A34A" />
          <StatCard label={es.inventory.warning} value={alertBuckets.warning.length} accent="#D97706" />
          <StatCard label={es.inventory.critical} value={alertBuckets.critical.length} accent="#DC2626" />
          <StatCard label={es.inventory.expiredNow} value={expiredCount} accent="#7C2D12" />
        </section>

        <section style={contentGridStyle}>
          <article style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>{es.inventory.filters}</p>
                <h2 style={sectionTitleStyle}>{es.inventory.title}</h2>
              </div>
              {syncing && <span style={syncBadgeStyle}>{es.inventory.syncing}</span>}
            </div>

            {!canManage && <p style={noticeStyle}>{es.inventory.readOnlyNotice}</p>}

            <div style={filtersGridStyle}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={es.inventory.searchHint}
                style={inputStyle}
              />
              <select value={filter} onChange={(event) => setFilter(event.target.value as InventoryFilter)} style={inputStyle}>
                <option value="all">{es.inventory.all}</option>
                <option value="critical">{es.inventory.critical}</option>
                <option value="warning">{es.inventory.warning}</option>
                <option value="ok">{es.inventory.stockOk}</option>
                <option value="expired">{es.inventory.expiredNow}</option>
              </select>
              <select value={category} onChange={(event) => setCategory(event.target.value)} style={inputStyle}>
                <option value="all">{es.inventory.all}</option>
                {categories.map((item: string) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{es.inventory.code}</th>
                    <th style={thStyle}>{es.inventory.name}</th>
                    <th style={thStyle}>{es.inventory.category}</th>
                    <th style={thStyle}>{es.inventory.stock}</th>
                    <th style={thStyle}>{es.inventory.minStock}</th>
                    <th style={thStyle}>{es.inventory.expiryDate}</th>
                    <th style={thStyle}>{es.inventory.price}</th>
                    <th style={thStyle}>{es.inventory.semaforo}</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={emptyCellStyle}>
                        {es.common.noResults}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const status = getInventoryStatus(product);
                      const statusColor = getInventoryStatusColor(status);
                      const days = getDaysUntil(product.expiryDate);

                      return (
                        <tr key={product.id}>
                          <td style={tdStyle}>
                            <strong>{product.code}</strong>
                            <div style={cellSubtleStyle}>{product.barcode ?? 'Sin código de barras'}</div>
                          </td>
                          <td style={tdStyle}>
                            <strong>{product.name}</strong>
                            <div style={cellSubtleStyle}>{product.location ?? 'Sin ubicación'}</div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ ...pillStyle, background: `${product.category.color ?? '#2563EB'}14`, color: product.category.color ?? '#2563EB' }}>
                              {product.category.name}
                            </span>
                          </td>
                          <td style={tdStyle}>{product.stock}</td>
                          <td style={tdStyle}>{product.minStock}</td>
                          <td style={tdStyle}>
                            <div>{formatDate(product.expiryDate)}</div>
                            <div style={cellSubtleStyle}>
                              {days === null ? 'Sin vencimiento' : days < 0 ? 'Vencido' : `En ${days} días`}
                            </div>
                          </td>
                          <td style={tdStyle}>{formatCurrency(product.price)}</td>
                          <td style={tdStyle}>
                            <span style={{ ...pillStyle, background: `${statusColor}14`, color: statusColor }}>
                              {getInventoryStatusLabel(status)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(product)}
                              disabled={!canManage}
                              style={miniButtonStyle}
                            >
                              {es.inventory.adjustStock}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <InventoryAlerts products={products} compact={false} showActions />
        </section>
      </section>

      <StockAdjustModal
        open={Boolean(selectedProduct)}
        product={selectedProduct}
        loading={submitting}
        readOnly={!canManage}
        onClose={() => setSelectedProduct(null)}
        onSubmit={handleAdjust}
      />
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}): JSX.Element {
  return (
    <article style={statCardStyle}>
      <p style={{ ...statLabelStyle, color: accent }}>{label}</p>
      <p style={statValueStyle}>{value}</p>
    </article>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 26%), linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 48%, #E5E7EB 100%)',
};

const shellStyle: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  display: 'grid',
  gap: tokens.spacing[5],
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: tokens.spacing[4],
  flexWrap: 'wrap',
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.md,
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

const headerActionsStyle: CSSProperties = {
  display: 'flex',
  gap: tokens.spacing[3],
  flexWrap: 'wrap',
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '0 18px',
  borderRadius: '12px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  padding: '0 18px',
  borderRadius: '12px',
  border: 'none',
  background: tokens.colors.primary[600],
  color: '#FFFFFF',
  textDecoration: 'none',
  fontWeight: 700,
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: tokens.spacing[4],
};

const statCardStyle: CSSProperties = {
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.sm,
  border: `1px solid ${tokens.colors.neutral[200]}`,
};

const statLabelStyle: CSSProperties = {
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '12px',
  fontWeight: 700,
};

const statValueStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: '28px',
  fontWeight: 800,
  color: '#111827',
};

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)',
  gap: tokens.spacing[5],
  alignItems: 'start',
};

const panelStyle: CSSProperties = {
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.sm,
  border: `1px solid ${tokens.colors.neutral[200]}`,
  display: 'grid',
  gap: tokens.spacing[4],
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: tokens.spacing[3],
  alignItems: 'center',
  flexWrap: 'wrap',
};

const sectionTitleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '24px',
  color: '#111827',
};

const syncBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: '999px',
  background: '#EFF6FF',
  color: '#1D4ED8',
  fontSize: '12px',
  fontWeight: 700,
};

const noticeStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#FEF3C7',
  color: '#92400E',
  border: '1px solid #FDE68A',
};

const filtersGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr repeat(2, minmax(0, 1fr))',
  gap: '12px',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: '48px',
  boxSizing: 'border-box',
  borderRadius: '12px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  padding: '0 14px',
  fontSize: '16px',
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  borderRadius: '16px',
  border: '1px solid #E5E7EB',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#FFFFFF',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#6B7280',
  background: '#F9FAFB',
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid #F3F4F6',
  verticalAlign: 'top',
};

const emptyCellStyle: CSSProperties = {
  padding: '32px 16px',
  textAlign: 'center',
  color: '#6B7280',
};

const cellSubtleStyle: CSSProperties = {
  color: '#6B7280',
  fontSize: '13px',
  marginTop: '4px',
};

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
};

const miniButtonStyle: CSSProperties = {
  minHeight: '40px',
  padding: '0 14px',
  borderRadius: '10px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};
