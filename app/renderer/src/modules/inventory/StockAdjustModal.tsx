import { useEffect, useState, type CSSProperties } from 'react';

import { es } from '../../shared/i18n';
import type { InventoryProduct } from '../../shared/types/inventory.types';
import {
  formatCurrency,
  formatDate,
  getInventoryStatus,
  getInventoryStatusColor,
  getInventoryStatusLabel,
} from './inventory.utils';
import { useConfig } from '../../shared/context/ConfigContext';

interface StockAdjustModalProps {
  open: boolean;
  product: InventoryProduct | null;
  loading?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    quantity: number;
    reason: string;
    mode: 'entrada' | 'salida';
  }) => Promise<void> | void;
  onUpdateProduct?: (
    id: number,
    data: {
      price?: number;
      expiryDate?: string | null;
      location?: string | null;
      taxRate?: number;
    },
  ) => Promise<void>;
}

export function StockAdjustModal({
  open,
  product,
  loading = false,
  readOnly = false,
  onClose,
  onSubmit,
  onUpdateProduct,
}: StockAdjustModalProps): JSX.Element | null {
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'entrada' | 'salida'>('entrada');
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [locationValue, setLocationValue] = useState('');
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [isTaxable, setIsTaxable] = useState(false);
  const { config } = useConfig();

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity('1');
    setReason('');
    setMode('entrada');
    setEditingPrice(false);
    setEditingExpiry(false);
    setEditingLocation(false);
    setPriceValue(product?.price?.toString() || '');
    setExpiryValue(product?.expiryDate?.split('T')[0] || '');
    setLocationValue(product?.location || '');
    setIsTaxable(product?.taxRate !== 0);
  }, [open, product]);

  if (!open || !product) {
    return null;
  }

  const status = getInventoryStatus(product);
  const statusColor = getInventoryStatusColor(status);

  const handleToggleTax = async (): Promise<void> => {
    if (!product || !onUpdateProduct || !config) return;

    setUpdatingProduct(true);
    try {
      const newIsTaxable = !isTaxable;
      const newTaxRate = newIsTaxable ? config.ivaRate || 0.19 : 0;

      await onUpdateProduct(product.id, { taxRate: newTaxRate });
      setIsTaxable(newIsTaxable);
    } catch (err) {
      console.error('Error updating tax status:', err);
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleUpdateProduct = async (): Promise<void> => {
    if (!product || !onUpdateProduct) return;

    setUpdatingProduct(true);
    try {
      const updates: { price?: number; expiryDate?: string | null; location?: string | null } = {};

      if (priceValue && Number(priceValue) !== product.price) {
        updates.price = Number(priceValue);
      }

      if (expiryValue !== (product.expiryDate?.split('T')[0] || '')) {
        updates.expiryDate = expiryValue ? expiryValue : null;
      }

      if (locationValue !== (product.location || '')) {
        updates.location = locationValue || null;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateProduct(product.id, updates);
        setEditingPrice(false);
        setEditingExpiry(false);
        setEditingLocation(false);
      }
    } catch (err) {
      console.error('Error updating product:', err);
    } finally {
      setUpdatingProduct(false);
    }
  };

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
      <section
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
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
            {editingPrice ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: '16px',
                    padding: '0 8px',
                    minHeight: '36px',
                    width: '100px',
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={handleUpdateProduct}
                    disabled={updatingProduct}
                    style={{
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#465fff',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPrice(false)}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{ ...summaryValueStyle, cursor: 'pointer' }}
                onClick={() => {
                  setPriceValue(product.price.toString());
                  setEditingPrice(true);
                }}
              >
                {formatCurrency(product.price)}
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9CA3AF' }}>✎</span>
              </p>
            )}
          </article>

          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.tax}</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}
            >
              <p style={{ ...summaryValueStyle, margin: 0 }}>
                {isTaxable
                  ? `${((product.taxRate || config?.ivaRate || 0.19) * 100).toFixed(0)}%`
                  : 'No'}
              </p>
              <button
                type="button"
                onClick={handleToggleTax}
                disabled={updatingProduct}
                style={{
                  ...secondaryButtonStyle,
                  minHeight: '32px',
                  padding: '0 12px',
                  fontSize: '12px',
                  background: isTaxable ? '#465fff' : '#fff',
                  color: isTaxable ? '#fff' : '#111827',
                  border: isTaxable ? 'none' : '1px solid #D1D5DB',
                  transition: 'all 0.2s ease',
                }}
              >
                {isTaxable ? 'Quitar IVA' : 'Poner IVA'}
              </button>
            </div>
          </article>

          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.expiryDate}</p>
            {editingExpiry ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="date"
                  value={expiryValue}
                  onChange={(e) => setExpiryValue(e.target.value)}
                  style={{ ...inputStyle, fontSize: '14px', padding: '0 8px', minHeight: '36px' }}
                  autoFocus
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={handleUpdateProduct}
                    disabled={updatingProduct}
                    style={{
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#465fff',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExpiry(false)}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{ ...summaryValueStyle, cursor: 'pointer' }}
                onClick={() => {
                  setExpiryValue(product.expiryDate?.split('T')[0] || '');
                  setEditingExpiry(true);
                }}
              >
                {formatDate(product.expiryDate)}
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9CA3AF' }}>✎</span>
              </p>
            )}
          </article>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>{es.inventory.semaforo}</p>
            <p style={{ ...summaryValueStyle, color: statusColor }}>
              {getInventoryStatusLabel(status)}
            </p>
          </article>
          <article style={summaryCardStyle}>
            <p style={summaryLabelStyle}>Ubicación</p>
            {editingLocation ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="text"
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: '14px',
                    padding: '0 8px',
                    minHeight: '36px',
                    width: '100px',
                  }}
                  placeholder="Estante A-1"
                  autoFocus
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={handleUpdateProduct}
                    disabled={updatingProduct}
                    style={{
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#465fff',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLocation(false)}
                    style={{
                      ...secondaryButtonStyle,
                      minHeight: '17px',
                      padding: '0 8px',
                      fontSize: '10px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{ ...summaryValueStyle, cursor: 'pointer' }}
                onClick={() => {
                  setLocationValue(product.location || '');
                  setEditingLocation(true);
                }}
              >
                {product.location || 'Sin ubicación'}
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9CA3AF' }}>✎</span>
              </p>
            )}
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
  background: '#465fff',
  color: '#FFFFFF',
};
