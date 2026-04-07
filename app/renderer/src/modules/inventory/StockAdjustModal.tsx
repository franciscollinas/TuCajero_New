import { useEffect, useState, type CSSProperties } from 'react';

import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { InventoryProduct } from '../../shared/types/inventory.types';
import {
  formatCurrency,
  formatDate,
  getInventoryStatus,
  getInventoryStatusColor,
  getInventoryStatusLabel,
} from './inventory.utils';

interface StockAdjustModalProps {
  open: boolean;
  product: InventoryProduct | null;
  loading?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit: (payload: { quantity: number; reason: string; mode: 'entrada' | 'salida' }) => Promise<void> | void;
}

export function StockAdjustModal({
  open,
  product,
  loading = false,
  readOnly = false,
  onClose,
  onSubmit,
}: StockAdjustModalProps): JSX.Element | null {
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'entrada' | 'salida'>('entrada');

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity('1');
    setReason('');
    setMode('entrada');
  }, [open, product]);

  if (!open || !product) {
    return null;
  }

  const status = getInventoryStatus(product);
  const statusColor = getInventoryStatusColor(status);

  const handleSubmit = async (): Promise<void> => {
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    await onSubmit({
      quantity: parsedQuantity,
      reason: reason.trim() || 'Ajuste manual de inventario',
      mode,
    });
  };

  return (
    <div style={backdropStyle} role="presentation" onClick={onClose}>
      <section style={modalStyle} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.inventory.adjustStock}</p>
            <h3 style={titleStyle}>{product.name}</h3>
            <p style={subtleStyle}>
              {product.code} · {product.category.name}
            </p>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            {es.common.close}
          </button>
        </header>

        <div style={summaryGridStyle}>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.stock}</p>
            <p style={summaryValueStyle}>{product.stock}</p>
          </article>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.price}</p>
            <p style={summaryValueStyle}>{formatCurrency(product.price)}</p>
          </article>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.expiryDate}</p>
            <p style={summaryValueStyle}>{formatDate(product.expiryDate)}</p>
          </article>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.semaforo}</p>
            <p style={{ ...summaryValueStyle, color: statusColor }}>{getInventoryStatusLabel(status)}</p>
          </article>
        </div>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>{es.inventory.adjustmentType}</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as 'entrada' | 'salida')}
              style={inputStyle}
              disabled={readOnly || loading}
            >
              <option value="entrada">{es.inventory.addEntry}</option>
              <option value="salida">{es.inventory.subtractEntry}</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>{es.inventory.suggestedQty}</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              style={inputStyle}
              disabled={readOnly || loading}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <span style={labelStyle}>{es.inventory.adjustReason}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={es.inventory.adjustReason}
              style={{ ...inputStyle, minHeight: '92px', resize: 'vertical', paddingTop: '12px' }}
              disabled={readOnly || loading}
            />
          </label>
        </div>

        {readOnly && <p style={readOnlyStyle}>{es.inventory.readOnlyNotice}</p>}

        <footer style={footerStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            {es.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || readOnly}
            style={primaryButtonStyle}
          >
            {loading ? es.common.loading : es.inventory.adjustStock}
          </button>
        </footer>
      </section>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: '24px',
  background: 'rgba(15, 23, 42, 0.46)',
  zIndex: 50,
};

const modalStyle: CSSProperties = {
  width: 'min(760px, 100%)',
  borderRadius: '20px',
  background: '#FFFFFF',
  boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)',
  padding: '24px',
  display: 'grid',
  gap: '20px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
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
  margin: '4px 0 0',
  fontSize: '28px',
  color: '#111827',
};

const subtleStyle: CSSProperties = {
  margin: '6px 0 0',
  color: '#6B7280',
};

const closeButtonStyle: CSSProperties = {
  minHeight: '42px',
  padding: '0 14px',
  borderRadius: '999px',
  border: '1px solid #E5E7EB',
  background: '#FFFFFF',
  cursor: 'pointer',
  fontWeight: 700,
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
};

const summaryCardStyle: CSSProperties = {
  border: '1px solid #E5E7EB',
  borderRadius: '16px',
  padding: '14px',
  background: '#F9FAFB',
};

const summaryLabelStyle: CSSProperties = {
  margin: 0,
  color: '#6B7280',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const summaryValueStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#111827',
  fontSize: '18px',
  fontWeight: 700,
};

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: '8px',
};

const labelStyle: CSSProperties = {
  color: '#374151',
  fontWeight: 700,
  fontSize: '14px',
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

const readOnlyStyle: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#FEF3C7',
  color: '#92400E',
  border: '1px solid #FDE68A',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
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

const primaryButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  border: 'none',
  background: tokens.colors.primary[600],
  color: '#FFFFFF',
};
