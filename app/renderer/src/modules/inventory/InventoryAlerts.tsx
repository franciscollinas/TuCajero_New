import { Link } from 'react-router-dom';

import { es } from '../../shared/i18n';
import type { InventoryProduct } from '../../shared/types/inventory.types';
import { useInventoryStore } from '../../shared/store/inventory.store';
import {
  buildInventoryAlertBuckets,
  formatCurrency,
  formatDate,
  getDaysUntil,
  getInventoryStatusColor,
  getInventoryStatusLabel,
  type InventoryStatus,
} from './inventory.utils';

interface InventoryAlertsProps {
  products?: InventoryProduct[];
  compact?: boolean;
  showActions?: boolean;
}

export function InventoryAlerts({
  products,
  compact = false,
  showActions = true,
}: InventoryAlertsProps): JSX.Element {
  const storeProducts = useInventoryStore((state) => state.products);
  const buckets = buildInventoryAlertBuckets(products ?? storeProducts);
  const totalAlerts =
    buckets.critical.length +
    buckets.warning.length +
    (buckets.expired?.length ?? 0) +
    (buckets.expiringSoon?.length ?? 0);

  return (
    <section className="tc-section">
      <header className="tc-section-header">
        <div>
          <p className="tc-section-title">{compact ? es.inventory.dashboardTitle : es.inventory.alertsTitle}</p>
          <p style={{ margin: '4px 0 0', color: '#6B7280' }}>
            {totalAlerts > 0 ? `${totalAlerts} alertas activas en el inventario` : 'No hay alertas activas por ahora.'}
          </p>
        </div>
        {showActions && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/inventory" className="tc-btn tc-btn--secondary">
              {es.inventory.openInventory}
            </Link>
            <Link to="/inventory/import" className="tc-btn tc-btn--primary">
              {es.inventory.importInventory}
            </Link>
          </div>
        )}
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: compact ? '12px' : '16px',
      }}>
        <AlertGroup title={es.inventory.critical} color="#DC2626" badgeVariant="danger" products={buckets.critical} emptyLabel="Sin productos críticos" />
        <AlertGroup title={es.inventory.warning} color="#D97706" badgeVariant="warning" products={buckets.warning} emptyLabel="Sin productos en advertencia" />
        <AlertGroup
          title={es.inventory.expiredNow}
          color="#7C2D12"
          badgeVariant="danger"
          products={buckets.expired ?? []}
          emptyLabel="Sin vencidos"
        />
        <AlertGroup
          title={es.inventory.expiredSoon}
          color="#0F766E"
          badgeVariant="brand"
          products={buckets.expiringSoon ?? []}
          emptyLabel="Sin productos próximos a vencer"
        />
      </div>
    </section>
  );
}

function AlertGroup({
  title,
  badgeVariant,
  products,
  emptyLabel,
}: {
  title: string;
  color?: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'brand' | 'neutral';
  products: InventoryProduct[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <article style={{
      padding: '16px',
      borderRadius: '12px',
      background: '#F9FAFB',
      border: '1px solid #E5E7EB',
      display: 'grid',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <div>
          <p className={`tc-badge tc-badge--${badgeVariant}`}>{title}</p>
          <p style={{ margin: '8px 0 0', color: '#111827', fontSize: '18px', fontWeight: 700 }}>{products.length} productos</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p style={{ margin: 0, color: '#6B7280' }}>{emptyLabel}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
          {products.slice(0, 4).map((product) => {
            const days = getDaysUntil(product.expiryDate);
            const status: InventoryStatus =
              product.stock <= product.criticalStock
                ? 'critical'
                : product.stock <= product.minStock
                  ? 'warning'
                  : product.expiryDate && days !== null && days < 0
                    ? 'expired'
                    : 'ok';
            const statusColor = getInventoryStatusColor(status);

            return (
              <li key={product.id} style={{
                padding: '12px',
                borderRadius: '12px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                display: 'grid',
                gap: '4px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <strong style={{ color: '#111827' }}>{product.name}</strong>
                  <span className="tc-badge" style={{ borderColor: `${statusColor}40`, color: statusColor }}>
                    {getInventoryStatusLabel(status)}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                  Stock {product.stock} · Mínimo {product.minStock} · {formatCurrency(product.price)}
                </p>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>{formatDate(product.expiryDate)}</p>
              </li>
            );
          })}
          {products.length > 4 && <li style={{ margin: 0, color: '#6B7280' }}>+ {products.length - 4} más</li>}
        </ul>
      )}
    </article>
  );
}
