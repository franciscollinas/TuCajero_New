import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { adjustStock as adjustStockApi, getAllProducts } from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
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
    <div className="tc-page-container">
      <section className="tc-section">
        <div className="tc-section-header">
          <div>
            <h2 className="tc-section-title">{es.inventory.dashboardTitle}</h2>
            <p className="tc-section-subtitle">{es.inventory.dashboardSubtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/dashboard')} className="tc-btn tc-btn--secondary">
              {es.dashboard.title}
            </button>
            <Link to="/inventory/import" className="tc-btn tc-btn--primary">
              {es.inventory.importCSV}
            </Link>
          </div>
        </div>

        <div className="tc-grid-4">
          <article className="tc-metric-card">
            <div className="tc-metric-content">
              <p className="tc-metric-label">{es.inventory.stockOk}</p>
              <p className="tc-metric-value">{alertBuckets.ok.length}</p>
            </div>
          </article>
          <article className="tc-metric-card">
            <div className="tc-metric-content">
              <p className="tc-metric-label">{es.inventory.warning}</p>
              <p className="tc-metric-value">{alertBuckets.warning.length}</p>
            </div>
          </article>
          <article className="tc-metric-card">
            <div className="tc-metric-content">
              <p className="tc-metric-label">{es.inventory.critical}</p>
              <p className="tc-metric-value">{alertBuckets.critical.length}</p>
            </div>
          </article>
          <article className="tc-metric-card">
            <div className="tc-metric-content">
              <p className="tc-metric-label">{es.inventory.expiredNow}</p>
              <p className="tc-metric-value">{expiredCount}</p>
            </div>
          </article>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <section className="tc-section">
          <div className="tc-section-header">
            <div>
              <h3 className="tc-section-title">{es.inventory.title}</h3>
              <p className="tc-section-subtitle">{es.inventory.filters}</p>
            </div>
            {syncing && <span className="tc-badge tc-badge--brand">{es.inventory.syncing}</span>}
          </div>

          {!canManage && <div className="tc-notice tc-notice--info">{es.inventory.readOnlyNotice}</div>}

          <div className="tc-grid-form" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="tc-field">
              <label className="tc-label">{es.inventory.searchHint}</label>
              <input
                className="tc-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={es.inventory.searchHint}
              />
            </div>
            <div className="tc-field">
              <label className="tc-label">Estado</label>
              <select className="tc-select" value={filter} onChange={(event) => setFilter(event.target.value as InventoryFilter)}>
                <option value="all">{es.inventory.all}</option>
                <option value="critical">{es.inventory.critical}</option>
                <option value="warning">{es.inventory.warning}</option>
                <option value="ok">{es.inventory.stockOk}</option>
                <option value="expired">{es.inventory.expiredNow}</option>
              </select>
            </div>
            <div className="tc-field">
              <label className="tc-label">Categoría</label>
              <select className="tc-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">{es.inventory.all}</option>
                {categories.map((item: string) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>{es.inventory.code}</th>
                  <th>{es.inventory.name}</th>
                  <th>{es.inventory.category}</th>
                  <th>{es.inventory.stock}</th>
                  <th>{es.inventory.minStock}</th>
                  <th>{es.inventory.expiryDate}</th>
                  <th>{es.inventory.price}</th>
                  <th>{es.inventory.semaforo}</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--gray-500)' }}>
                      {es.common.noResults}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const status = getInventoryStatus(product);
                    void getInventoryStatusColor(status);
                    const days = getDaysUntil(product.expiryDate);

                    const badgeClass = status === 'critical' || status === 'expired'
                      ? 'tc-badge tc-badge--danger'
                      : status === 'warning'
                        ? 'tc-badge tc-badge--warning'
                        : 'tc-badge tc-badge--success';

                    return (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.code}</strong>
                          <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{product.barcode ?? 'Sin código de barras'}</div>
                        </td>
                        <td>
                          <strong>{product.name}</strong>
                          <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{product.location ?? 'Sin ubicación'}</div>
                        </td>
                        <td>
                          <span className="tc-badge tc-badge--neutral">{product.category.name}</span>
                        </td>
                        <td>{product.stock}</td>
                        <td>{product.minStock}</td>
                        <td>
                          <div>{formatDate(product.expiryDate)}</div>
                          <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                            {days === null ? 'Sin vencimiento' : days < 0 ? 'Vencido' : `En ${days} días`}
                          </div>
                        </td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>
                          <span className={badgeClass}>
                            {getInventoryStatusLabel(status)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            disabled={!canManage}
                            className="tc-btn tc-btn--secondary"
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
        </section>

        <InventoryAlerts products={products} compact={false} showActions />
      </div>

      <StockAdjustModal
        open={Boolean(selectedProduct)}
        product={selectedProduct}
        loading={submitting}
        readOnly={!canManage}
        onClose={() => setSelectedProduct(null)}
        onSubmit={handleAdjust}
      />
    </div>
  );
}
