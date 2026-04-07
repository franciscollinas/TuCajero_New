import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { getActiveCashRegister } from '../../shared/api/cash.api';
import { getAllProducts, getProductByBarcode } from '../../shared/api/inventory.api';
import { createSale, generateInvoice } from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { CashRegister } from '../../shared/types/cash.types';
import type { Product } from '../../shared/types/inventory.types';
import type { CartItemInput, PaymentInput, PaymentMethod } from '../../shared/types/sales.types';

interface PosCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function POSPage(): JSX.Element {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [payments, setPayments] = useState<PaymentInput[]>([]);
  const [activeCash, setActiveCash] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [message, setMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect((): (() => void) | void => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadData = async (): Promise<void> => {
      setSyncing(true);

      try {
        const [cashResponse, productsResponse] = await Promise.all([
          getActiveCashRegister(user.id),
          getAllProducts(),
        ]);

        if (cancelled) {
          return;
        }

        if (cashResponse.success) {
          setActiveCash(cashResponse.data);
        }

        if (productsResponse.success) {
          setProducts(productsResponse.data.filter((product) => product.isActive));
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    };

    void loadData();

    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0),
    [cart],
  );
  const tax = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discount) * (item.product.taxRate ?? 0.19), 0),
    [cart],
  );
  const total = subtotal + tax;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = total - totalPaid;

  const addToCart = (product: Product): void => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { product, quantity: 1, unitPrice: product.price, discount: 0 }];
    });
    setMessage('');
  };

  const handleBarcodeSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!barcode.trim()) {
      return;
    }

    const response = await getProductByBarcode(barcode.trim());
    if (!response.success || !response.data) {
      setMessage('Producto no encontrado.');
      return;
    }

    addToCart(response.data);
    setBarcode('');
  };

  const updateQuantity = (productId: number, quantity: number): void => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.product.id !== productId));
      return;
    }

    setCart((current) =>
      current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    );
  };

  const removePayment = (index: number): void => {
    setPayments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCompleteSale = async (): Promise<void> => {
    if (!user || !activeCash) {
      setMessage('No hay una caja abierta para vender.');
      return;
    }

    if (cart.length === 0) {
      setMessage(es.errors.emptyCart);
      return;
    }

    if (remaining > 0.01) {
      setMessage(`Falta pagar ${formatCurrency(remaining)}.`);
      return;
    }

    const items: CartItemInput[] = cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    }));

    setLoading(true);
    setMessage('');

    try {
      const response = await createSale(activeCash.id, user.id, items, payments, 0);
      if (!response.success) {
        setMessage(response.error.message);
        return;
      }

      let invoiceNotice = '';
      const invoiceResponse = await generateInvoice(response.data.id);
      if (invoiceResponse.success) {
        invoiceNotice = ` Factura: ${invoiceResponse.data}`;
      }

      setMessage(`Venta ${response.data.saleNumber} completada.${invoiceNotice}`);
      setCart([]);
      setPayments([]);

      const cashResponse = await getActiveCashRegister(user.id);
      if (cashResponse.success) {
        setActiveCash(cashResponse.data);
      }

      setProducts((current): Product[] =>
        current.map((product) => {
          const soldItem = cart.find((item) => item.product.id === product.id);
          return soldItem ? { ...product, stock: product.stock - soldItem.quantity } : product;
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.sales.title}</p>
            <h1 style={titleStyle}>{es.sales.posTitle}</h1>
            <p style={subtleStyle}>{es.sales.posSubtitle}</p>
          </div>
          <div style={headerLinksStyle}>
            <Link to="/sales/history" style={secondaryLinkStyle}>
              {es.sales.historyTitle}
            </Link>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        {message && <div style={noticeStyle}>{message}</div>}

        <section style={layoutStyle}>
          <article style={catalogPanelStyle}>
            <form onSubmit={(event) => void handleBarcodeSubmit(event)} style={searchFormStyle}>
              <input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder={es.sales.barcodePlaceholder}
                style={inputStyle}
                autoFocus
              />
              <button type="submit" style={primaryButtonStyle}>
                {es.sales.scanAction}
              </button>
            </form>

            <div style={panelTitleRowStyle}>
              <h2 style={sectionTitleStyle}>{es.sales.availableProducts}</h2>
              <span style={syncing ? syncBadgeStyle : badgeStyle}>
                {syncing ? es.inventory.syncing : `${products.length} productos`}
              </span>
            </div>

            <div style={productGridStyle}>
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  style={productCardStyle}
                  disabled={product.stock <= 0}
                >
                  <strong style={{ color: '#111827' }}>{product.name}</strong>
                  <span style={cardMetaStyle}>{product.code}</span>
                  <span style={cardMetaStyle}>{product.category.name}</span>
                  <span style={cardPriceStyle}>{formatCurrency(product.price)}</span>
                  <span style={product.stock <= product.minStock ? warningTextStyle : cardMetaStyle}>
                    Stock: {product.stock}
                  </span>
                </button>
              ))}
            </div>
          </article>

          <aside style={cartPanelStyle}>
            <div style={panelTitleRowStyle}>
              <h2 style={sectionTitleStyle}>{es.sales.cartTitle}</h2>
              <span style={badgeStyle}>{cart.length} items</span>
            </div>

            <div style={cartListStyle}>
              {cart.length === 0 ? (
                <p style={subtleStyle}>{es.sales.emptyCartHint}</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} style={cartItemStyle}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.product.name}</strong>
                      <p style={cartMetaStyle}>{formatCurrency(item.unitPrice)} c/u</p>
                    </div>
                    <div style={qtyControlsStyle}>
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={qtyButtonStyle}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={qtyButtonStyle}>
                        +
                      </button>
                    </div>
                    <div style={{ minWidth: 100, textAlign: 'right' }}>
                      <strong>{formatCurrency(item.quantity * item.unitPrice - item.discount)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={summaryCardStyle}>
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow label="IVA" value={formatCurrency(tax)} />
              <SummaryRow label="Total" value={formatCurrency(total)} strong />
            </div>

            <div style={summaryCardStyle}>
              <div style={panelTitleRowStyle}>
                <strong>{es.sales.paymentsTitle}</strong>
                <button type="button" onClick={() => setShowPaymentModal(true)} style={secondaryButtonStyle} disabled={cart.length === 0}>
                  {es.sales.addPayment}
                </button>
              </div>

              {payments.length === 0 ? (
                <p style={subtleStyle}>{es.sales.noPayments}</p>
              ) : (
                payments.map((payment, index) => (
                  <div key={`${payment.method}-${index}`} style={paymentRowStyle}>
                    <div>
                      <strong style={{ textTransform: 'capitalize' }}>{payment.method}</strong>
                      {payment.reference && <p style={cartMetaStyle}>Ref: {payment.reference}</p>}
                    </div>
                    <div style={paymentAmountStyle}>
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <button type="button" onClick={() => removePayment(index)} style={ghostButtonStyle}>
                        x
                      </button>
                    </div>
                  </div>
                ))
              )}

              <SummaryRow label={es.sales.remaining} value={formatCurrency(remaining)} strong />
            </div>

            <div style={summaryCardStyle}>
              <SummaryRow
                label={es.cashSession.status}
                value={activeCash ? `${activeCash.status} #${activeCash.id}` : 'Sin caja abierta'}
              />
              <SummaryRow
                label={es.sales.expectedCash}
                value={formatCurrency(activeCash?.expectedCash ?? activeCash?.initialCash ?? 0)}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleCompleteSale()}
              style={completeButtonStyle}
              disabled={loading || cart.length === 0 || remaining > 0.01 || !activeCash}
            >
              {loading ? es.common.loading : es.sales.completeSale}
            </button>
          </aside>
        </section>
      </section>

      {showPaymentModal && (
        <PaymentModal
          remaining={remaining}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={(payment) => {
            setPayments((current) => [...current, payment]);
            setShowPaymentModal(false);
          }}
        />
      )}
    </main>
  );
}

function PaymentModal({
  remaining,
  onClose,
  onConfirm,
}: {
  remaining: number;
  onClose: () => void;
  onConfirm: (payment: PaymentInput) => void;
}): JSX.Element {
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [amount, setAmount] = useState(Math.max(remaining, 0).toFixed(0));
  const [reference, setReference] = useState('');

  const submit = (): void => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    onConfirm({
      method,
      amount: parsedAmount,
      reference: method === 'efectivo' ? undefined : reference || undefined,
    });
  };

  return (
    <div style={modalBackdropStyle}>
      <section style={modalStyle}>
        <h2 style={sectionTitleStyle}>{es.sales.addPayment}</h2>
        <p style={subtleStyle}>{es.sales.remaining}: {formatCurrency(remaining)}</p>
        <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} style={inputStyle}>
          <option value="efectivo">Efectivo</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" style={inputStyle} />
        {method !== 'efectivo' && (
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder={es.sales.paymentReference}
            style={inputStyle}
          />
        )}
        <div style={modalActionsStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            {es.common.cancel}
          </button>
          <button type="button" onClick={submit} style={primaryButtonStyle}>
            {es.common.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }): JSX.Element {
  return (
    <div style={summaryRowStyle}>
      <span style={strong ? summaryStrongStyle : summaryLabelStyle}>{label}</span>
      <span style={strong ? summaryStrongStyle : summaryValueStyle}>{value}</span>
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

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 28%), linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 55%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 1480, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const headerLinksStyle: CSSProperties = { display: 'flex', gap: '12px', flexWrap: 'wrap' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' };
const layoutStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 0.9fr)', gap: tokens.spacing[5], alignItems: 'start' };
const catalogPanelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '18px' };
const cartPanelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px', position: 'sticky', top: 24 };
const searchFormStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px' };
const inputStyle: CSSProperties = { width: '100%', minHeight: '48px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', padding: '0 14px', fontSize: '16px' };
const primaryButtonStyle: CSSProperties = { minHeight: '48px', padding: '0 18px', borderRadius: '12px', border: 'none', background: '#16A34A', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '42px', padding: '0 14px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };
const panelTitleRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '22px', color: '#111827' };
const badgeStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', borderRadius: '999px', background: '#F3F4F6', color: '#374151', fontSize: '12px', fontWeight: 700 };
const syncBadgeStyle: CSSProperties = { ...badgeStyle, background: '#ECFDF5', color: '#15803D' };
const productGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' };
const productCardStyle: CSSProperties = { display: 'grid', gap: '6px', textAlign: 'left', padding: '16px', borderRadius: '14px', border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer' };
const cardMetaStyle: CSSProperties = { color: '#6B7280', fontSize: '13px' };
const cardPriceStyle: CSSProperties = { color: '#111827', fontWeight: 700 };
const warningTextStyle: CSSProperties = { color: '#B45309', fontSize: '13px', fontWeight: 700 };
const cartListStyle: CSSProperties = { display: 'grid', gap: '12px', maxHeight: 340, overflowY: 'auto' };
const cartItemStyle: CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #E5E7EB' };
const cartMetaStyle: CSSProperties = { margin: '4px 0 0', color: '#6B7280', fontSize: '13px' };
const qtyControlsStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' };
const qtyButtonStyle: CSSProperties = { width: 30, height: 30, borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFFFFF', cursor: 'pointer' };
const summaryCardStyle: CSSProperties = { display: 'grid', gap: '10px', padding: '16px', borderRadius: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB' };
const summaryRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px' };
const summaryLabelStyle: CSSProperties = { color: '#6B7280' };
const summaryValueStyle: CSSProperties = { color: '#111827' };
const summaryStrongStyle: CSSProperties = { color: '#111827', fontWeight: 800 };
const paymentRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #E5E7EB' };
const paymentAmountStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' };
const ghostButtonStyle: CSSProperties = { border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontWeight: 700 };
const completeButtonStyle: CSSProperties = { minHeight: '52px', borderRadius: '14px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' };
const modalBackdropStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', padding: '24px', zIndex: 50 };
const modalStyle: CSSProperties = { width: 'min(420px, 100%)', borderRadius: '18px', background: '#FFFFFF', padding: '24px', display: 'grid', gap: '14px', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)' };
const modalActionsStyle: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '12px' };
