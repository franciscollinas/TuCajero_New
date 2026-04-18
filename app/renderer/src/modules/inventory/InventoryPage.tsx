import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  adjustStock as adjustStockApi,
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { InventoryProduct } from '../../shared/types/inventory.types';
import { useInventoryStore } from '../../shared/store/inventory.store';
import { InventoryAlerts } from './InventoryAlerts';
import { StockAdjustModal } from './StockAdjustModal';
import { AddProductModal } from './AddProductModal';
import {
  buildInventoryAlertBuckets,
  formatCurrency,
  formatDate,
  getDaysUntil,
  getInventoryStatus,
  getInventoryStatusLabel,
} from './inventory.utils';

type InventoryFilter = 'all' | 'critical' | 'warning' | 'ok' | 'expired';

export function InventoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const products = useInventoryStore((state) => state.products);
  const replaceFromBackend = useInventoryStore((state) => state.replaceFromBackend);
  const localAdjustStock = useInventoryStore((state) => state.adjustStock);
  const setProducts = useInventoryStore((state) => state.setProducts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      void adjustStockApi(selectedProduct.id, delta, reason, user.id).catch((err) => {
        console.error('Failed to persist stock adjustment to backend:', err);
      });
    } finally {
      setSubmitting(false);
      setSelectedProduct(null);
    }
  };

  const handleUpdateProduct = async (
    id: number,
    data: { price?: number; expiryDate?: string | null; location?: string | null },
  ): Promise<void> => {
    try {
      const response = await updateProduct(id, data);
      if (response.success) {
        const updatedProducts = products.map((p: InventoryProduct) =>
          p.id === id ? response.data : p,
        );
        setProducts(updatedProducts);
        setSelectedProduct((prev) => (prev ? (prev.id === id ? response.data : prev) : null));
      }
    } catch (err) {
      console.error('Error updating product:', err);
    }
  };

  const handleDeleteProduct = async (id: number): Promise<void> => {
    try {
      const response = await deleteProduct(id);
      if (response.success) {
        const updatedProducts = products.filter((p: InventoryProduct) => p.id !== id);
        setProducts(updatedProducts);
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleAddProduct = async (data: {
    code: string;
    barcode: string;
    name: string;
    categoryId: number;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    criticalStock: number;
    taxRate: number;
    suggestedPurchaseQty: number | null;
    expiryDate: string | null;
    location: string;
    unitType: string;
    conversionFactor: number;
  }): Promise<void> => {
    if (!user) {
      return;
    }
    setError(null);
    setAddingProduct(true);
    try {
      const response = await createProduct({
        ...data,
        userId: user.id,
      });

      if (response.success) {
        const productsResponse = await getAllProducts();
        if (productsResponse.success) {
          replaceFromBackend(productsResponse.data);
        }
        setShowAddProduct(false);
      } else {
        const msg = response.error?.message || 'Error desconocido';
        setError(msg);
        console.error('[InventoryPage] Error response:', response.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      console.error('[InventoryPage] Exception:', err);
    } finally {
      setAddingProduct(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p
            style={{
              margin: 0,
              color: 'var(--brand-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Gestión
          </p>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 'var(--text-3xl)',
              color: 'var(--gray-900)',
              fontWeight: 800,
            }}
          >
            {es.inventory.dashboardTitle}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--gray-500)' }}>
            {es.inventory.dashboardSubtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowAddProduct(true)}
              className="tc-btn tc-btn--primary"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar Producto
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="tc-btn tc-btn--secondary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <rect x="3" y="3" width="7" height="9" rx="1" />
            </svg>
            {es.dashboard.title}
          </button>
          <Link to="/inventory/import" className="tc-btn tc-btn--secondary">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {es.inventory.importCSV}
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="tc-grid-4 animate-slideUp" style={{ marginBottom: 'var(--space-6)' }}>
        <article className="tc-metric-card tc-metric-card--success">
          <div className="tc-metric-icon tc-metric-icon--success">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.stockOk}</p>
            <p className="tc-metric-value">{alertBuckets.ok.length}</p>
            <p className="tc-metric-sub">Productos en stock óptimo</p>
          </div>
        </article>

        <article className="tc-metric-card tc-metric-card--warning">
          <div className="tc-metric-icon tc-metric-icon--warning">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
            </svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.warning}</p>
            <p className="tc-metric-value">{alertBuckets.warning.length}</p>
            <p className="tc-metric-sub">Stock bajo mínimo</p>
          </div>
        </article>

        <article className="tc-metric-card tc-metric-card--danger">
          <div className="tc-metric-icon tc-metric-icon--danger">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.critical}</p>
            <p className="tc-metric-value">{alertBuckets.critical.length}</p>
            <p className="tc-metric-sub">Stock crítico o agotado</p>
          </div>
        </article>

        <article className="tc-metric-card tc-metric-card--danger">
          <div className="tc-metric-icon tc-metric-icon--danger">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.expiredNow}</p>
            <p className="tc-metric-value">{expiredCount}</p>
            <p className="tc-metric-sub">Productos vencidos</p>
          </div>
        </article>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 'var(--space-5)',
          alignItems: 'start',
        }}
      >
        {/* Products Table */}
        <div className="tc-section animate-slideUp" style={{ animationDelay: '0.2s' }}>
          <div className="tc-section-header">
            <div>
              <h3 className="tc-section-title">{es.inventory.title}</h3>
              <p className="tc-section-subtitle">{es.inventory.filters}</p>
            </div>
            {syncing && (
              <span className="tc-badge tc-badge--brand" style={{ padding: '6px 12px' }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="animate-pulse"
                  style={{ display: 'inline', marginRight: '4px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {es.inventory.syncing}
              </span>
            )}
          </div>

          {!canManage && (
            <div className="tc-notice tc-notice--info" style={{ marginBottom: 'var(--space-4)' }}>
              {es.inventory.readOnlyNotice}
            </div>
          )}

          {/* Filters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <div className="tc-field">
              <label className="tc-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {es.inventory.searchHint}
              </label>
              <input
                className="tc-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código, nombre o categoría..."
              />
            </div>
            <div className="tc-field">
              <label className="tc-label">Estado</label>
              <select
                className="tc-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value as InventoryFilter)}
              >
                <option value="all">{es.inventory.all}</option>
                <option value="critical">{es.inventory.critical}</option>
                <option value="warning">{es.inventory.warning}</option>
                <option value="ok">{es.inventory.stockOk}</option>
                <option value="expired">{es.inventory.expiredNow}</option>
              </select>
            </div>
            <div className="tc-field">
              <label className="tc-label">Categoría</label>
              <select
                className="tc-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">{es.inventory.all}</option>
                {categories.map((item: string) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>{es.inventory.code}</th>
                  <th>{es.inventory.name}</th>
                  <th>{es.inventory.category}</th>
                  <th style={{ textAlign: 'center' }}>{es.inventory.stock}</th>
                  <th style={{ textAlign: 'center' }}>{es.inventory.minStock}</th>
                  <th>{es.inventory.expiryDate}</th>
                  <th style={{ textAlign: 'right' }}>{es.inventory.price}</th>
                  <th style={{ textAlign: 'center' }}>{es.inventory.semaforo}</th>
                  {canManage && <th style={{ textAlign: 'center' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 9 : 8}
                      style={{
                        textAlign: 'center',
                        padding: '48px 16px',
                        color: 'var(--gray-400)',
                      }}
                    >
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ margin: '0 auto 12px', display: 'block' }}
                      >
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      </svg>
                      {es.common.noResults}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const status = getInventoryStatus(product);
                    const days = getDaysUntil(product.expiryDate);

                    const badgeClass =
                      status === 'critical' || status === 'expired'
                        ? 'tc-badge tc-badge--danger'
                        : status === 'warning'
                          ? 'tc-badge tc-badge--warning'
                          : 'tc-badge tc-badge--success';

                    return (
                      <tr
                        key={product.id}
                        style={{ transition: 'background var(--transition-fast)' }}
                      >
                        <td>
                          <strong style={{ color: 'var(--gray-900)' }}>{product.code}</strong>
                          <div
                            style={{
                              color: 'var(--gray-500)',
                              fontSize: 'var(--text-xs)',
                              marginTop: '4px',
                            }}
                          >
                            {product.barcode ?? '—'}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--gray-900)' }}>{product.name}</strong>
                          {product.location && (
                            <div
                              style={{
                                color: 'var(--gray-500)',
                                fontSize: 'var(--text-xs)',
                                marginTop: '4px',
                              }}
                            >
                              📍 {product.location}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="tc-badge tc-badge--neutral"
                            style={{ padding: '4px 10px' }}
                          >
                            {product.category.name}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color:
                              product.stock <= product.minStock
                                ? 'var(--danger-600)'
                                : 'var(--gray-900)',
                          }}
                        >
                          {product.stock}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--gray-600)' }}>
                          {product.minStock}
                        </td>
                        <td>
                          <div style={{ color: 'var(--gray-700)' }}>
                            {formatDate(product.expiryDate)}
                          </div>
                          {days !== null && (
                            <div
                              style={{
                                color:
                                  days < 0
                                    ? 'var(--danger-600)'
                                    : days <= 30
                                      ? 'var(--warning-600)'
                                      : 'var(--gray-500)',
                                fontSize: 'var(--text-xs)',
                                marginTop: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {days < 0
                                ? `⚠️ Vencido hace ${Math.abs(days)}d`
                                : days <= 30
                                  ? `⏰ En ${days}d`
                                  : `En ${days}d`}
                            </div>
                          )}
                        </td>
                        <td
                          style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gray-900)' }}
                        >
                          {formatCurrency(product.price)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={badgeClass} style={{ padding: '6px 12px' }}>
                            {getInventoryStatusLabel(status)}
                          </span>
                        </td>
                        {canManage && (
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(product)}
                              className="tc-btn tc-btn--secondary"
                              style={{ minHeight: '36px', padding: '0 12px', marginRight: '4px' }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              Ajustar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar producto "${product.name}"?`)) {
                                  handleDeleteProduct(product.id);
                                }
                              }}
                              className="tc-btn tc-btn--danger"
                              style={{ minHeight: '36px', padding: '0 8px' }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Sidebar */}
        <InventoryAlerts products={products} compact={false} showActions={false} />
      </div>

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        open={Boolean(selectedProduct)}
        product={selectedProduct}
        loading={submitting}
        readOnly={!canManage}
        onClose={() => setSelectedProduct(null)}
        onSubmit={handleAdjust}
        onUpdateProduct={handleUpdateProduct}
      />

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddProduct}
        loading={addingProduct}
        error={error}
        onClose={() => {
          setShowAddProduct(false);
          setError(null);
        }}
        onSubmit={handleAddProduct}
      />
    </div>
  );
}
