import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
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
    <section style={wrapperStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>{es.inventory.alertsTitle}</p>
          <h2 style={titleStyle}>{compact ? es.inventory.dashboardTitle : es.inventory.alertsTitle}</h2>
          <p style={subtleStyle}>
            {totalAlerts > 0 ? `${totalAlerts} alertas activas en el inventario` : 'No hay alertas activas por ahora.'}
          </p>
        </div>
        {showActions && (
          <div style={actionsStyle}>
            <Link to="/inventory" style={secondaryLinkStyle}>
              {es.inventory.openInventory}
            </Link>
            <Link to="/inventory/import" style={primaryLinkStyle}>
              {es.inventory.importInventory}
            </Link>
          </div>
        )}
      </header>

      <div style={compact ? compactGridStyle : gridStyle}>
        <AlertGroup title={es.inventory.critical} color="#DC2626" products={buckets.critical} emptyLabel="Sin productos críticos" />
        <AlertGroup title={es.inventory.warning} color="#D97706" products={buckets.warning} emptyLabel="Sin productos en advertencia" />
        <AlertGroup
          title={es.inventory.expiredNow}
          color="#7C2D12"
          products={buckets.expired ?? []}
          emptyLabel="Sin vencidos"
        />
        <AlertGroup
          title={es.inventory.expiredSoon}
          color="#0F766E"
          products={buckets.expiringSoon ?? []}
          emptyLabel="Sin productos próximos a vencer"
        />
      </div>
    </section>
  );
}

function AlertGroup({
  title,
  color,
  products,
  emptyLabel,
}: {
  title: string;
  color: string;
  products: InventoryProduct[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <article style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <p style={{ ...chipStyle, background: `${color}14`, color }}>{title}</p>
          <p style={countStyle}>{products.length} productos</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p style={emptyStyle}>{emptyLabel}</p>
      ) : (
        <ul style={listStyle}>
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
              <li key={product.id} style={itemStyle}>
                <div style={itemTopStyle}>
                  <strong style={itemTitleStyle}>{product.name}</strong>
                  <span style={{ ...badgeStyle, borderColor: `${statusColor}40`, color: statusColor }}>
                    {getInventoryStatusLabel(status)}
                  </span>
                </div>
                <p style={itemMetaStyle}>
                  Stock {product.stock} · Mínimo {product.minStock} · {formatCurrency(product.price)}
                </p>
                <p style={itemMetaStyle}>{formatDate(product.expiryDate)}</p>
              </li>
            );
          })}
          {products.length > 4 && <li style={emptyStyle}>+ {products.length - 4} más</li>}
        </ul>
      )}
    </article>
  );
}

const wrapperStyle: CSSProperties = {
  display: 'grid',
  gap: tokens.spacing[4],
  padding: tokens.spacing[5],
  borderRadius: tokens.borderRadius.xl,
  background: tokens.colors.white,
  boxShadow: tokens.shadows.sm,
  border: `1px solid ${tokens.colors.neutral[200]}`,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: tokens.spacing[4],
  flexWrap: 'wrap',
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
  fontSize: '24px',
  color: '#111827',
};

const subtleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#6B7280',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: tokens.spacing[3],
  flexWrap: 'wrap',
};

const secondaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '44px',
  padding: '0 16px',
  borderRadius: '10px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  textDecoration: 'none',
  fontWeight: 700,
};

const primaryLinkStyle: CSSProperties = {
  ...secondaryLinkStyle,
  background: tokens.colors.primary[600],
  color: '#FFFFFF',
  border: 'none',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: tokens.spacing[4],
};

const compactGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: tokens.spacing[3],
};

const cardStyle: CSSProperties = {
  padding: tokens.spacing[4],
  borderRadius: tokens.borderRadius.lg,
  background: '#F9FAFB',
  border: '1px solid #E5E7EB',
  display: 'grid',
  gap: tokens.spacing[3],
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: tokens.spacing[2],
  alignItems: 'flex-start',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 0,
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
};

const countStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#111827',
  fontSize: '18px',
  fontWeight: 700,
};

const emptyStyle: CSSProperties = {
  margin: 0,
  color: '#6B7280',
};

const listStyle: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: '12px',
};

const itemStyle: CSSProperties = {
  padding: '12px',
  borderRadius: '12px',
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  display: 'grid',
  gap: '4px',
};

const itemTopStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
};

const itemTitleStyle: CSSProperties = {
  color: '#111827',
};

const itemMetaStyle: CSSProperties = {
  margin: 0,
  color: '#6B7280',
  fontSize: '14px',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px',
  borderRadius: '999px',
  border: '1px solid transparent',
  fontSize: '12px',
  fontWeight: 700,
};
