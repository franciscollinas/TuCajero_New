import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { getActiveCashRegister } from '../../shared/api/cash.api';
import { getAllProducts, getProductByBarcode } from '../../shared/api/inventory.api';
import { createSale } from '../../shared/api/sales.api';
import { generateInvoice as printInvoice, openInvoice, printToHardware } from '../../shared/api/printer.api';
import { useAuth } from '../../shared/context/AuthContext';
import { useBarcodeScanner } from '../../shared/hooks/useBarcodeScanner';
import { es } from '../../shared/i18n';
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
  const [lastInvoicePath, setLastInvoicePath] = useState<string | null>(null);
  const [printResult, setPrintResult] = useState<string | null>(null);
  const [lastInvoiceData, setLastInvoiceData] = useState<Parameters<typeof printToHardware>[0] | null>(null);

  const handleBarcodeScan = async (code: string): Promise<void> => {
    if (!code.trim()) return;
    const response = await getProductByBarcode(code.trim());
    if (response.success && response.data) {
      addToCart(response.data);
      setMessage(es.alerts.scanDetected.replace('{code}', code));
    } else {
      setMessage('Producto no encontrado para código: ' + code);
    }
  };

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !!user && !showPaymentModal,
  });

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

      const invoiceData = {
        invoiceNumber: response.data.saleNumber,
        date: new Date().toISOString(),
        cashierName: user.fullName,
        businessName: 'TuCajero - Farmacia',
        items: cart.map((item) => {
          const itemSubtotal = item.quantity * item.unitPrice - item.discount;
          const itemTax = itemSubtotal * (item.product.taxRate ?? 0.19);
          return {
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.product.taxRate ?? 0.19,
            subtotal: itemSubtotal,
            tax: itemTax,
            total: itemSubtotal + itemTax,
          };
        }),
        subtotal,
        totalTax: tax,
        discount: 0,
        total,
        payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
        change: totalPaid > total ? totalPaid - total : undefined,
      };

      setLastInvoiceData(invoiceData);

      let invoiceNotice = '';
      const invoiceResponse = await printInvoice(invoiceData);
      if (invoiceResponse.success) {
        setLastInvoicePath(invoiceResponse.data.filePath);
        await openInvoice(invoiceResponse.data.filePath);
        invoiceNotice = ` Factura generada y abierta.`;
      }

      setMessage(`Venta ${response.data.saleNumber} completada.${invoiceNotice}`);
      setCart([]);
      setPayments([]);
      setPrintResult(null);

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
    <div className="tc-page-container">
      <div className="tc-section-header">
        <div>
          <p style={{ margin: 0, color: 'var(--success-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 'var(--text-xs)', fontWeight: 700 }}>{es.sales.title}</p>
          <h1 style={{ margin: '6px 0 0', fontSize: 'var(--text-2xl)', color: 'var(--gray-900)', fontWeight: 700 }}>{es.sales.posTitle}</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--gray-500)' }}>{es.sales.posSubtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/sales/history" className="tc-btn tc-btn--secondary">
            {es.sales.historyTitle}
          </Link>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>
      </div>

      {message && <div className="tc-notice tc-notice--info">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 0.9fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <div className="tc-section" style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <form onSubmit={(event) => void handleBarcodeSubmit(event)} className="tc-grid-form" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <input
              className="tc-input"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder={es.sales.barcodePlaceholder}
              autoFocus
            />
            <button type="submit" className="tc-btn tc-btn--success">
              {es.sales.scanAction}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 className="tc-section-title">{es.sales.availableProducts}</h2>
            <span className={`tc-badge ${syncing ? 'tc-badge--success' : 'tc-badge--neutral'}`}>
              {syncing ? es.inventory.syncing : `${products.length} productos`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-3)' }}>
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                style={{ display: 'grid', gap: 'var(--space-2)', textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', background: 'var(--gray-50)', cursor: product.stock <= 0 ? 'not-allowed' : 'pointer', opacity: product.stock <= 0 ? 0.5 : 1 }}
              >
                <strong style={{ color: 'var(--gray-900)' }}>{product.name}</strong>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>{product.code}</span>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>{product.category.name}</span>
                <span style={{ color: 'var(--gray-900)', fontWeight: 700 }}>{formatCurrency(product.price)}</span>
                <span style={product.stock <= product.minStock ? { color: 'var(--warning-500)', fontSize: 'var(--text-xs)', fontWeight: 700 } : { color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>
                  Stock: {product.stock}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="tc-section" style={{ display: 'grid', gap: 'var(--space-4)', position: 'sticky', top: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 className="tc-section-title">{es.sales.cartTitle}</h2>
            <span className="tc-badge tc-badge--neutral">{cart.length} items</span>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)', maxHeight: 340, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <p style={{ color: 'var(--gray-500)' }}>{es.sales.emptyCartHint}</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{item.product.name}</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>{formatCurrency(item.unitPrice)} c/u</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: '#fff', cursor: 'pointer' }}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', background: '#fff', cursor: 'pointer' }}>
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

          <div style={{ display: 'grid', gap: 'var(--space-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
            <SummaryRow label="IVA" value={formatCurrency(tax)} />
            <SummaryRow label="Total" value={formatCurrency(total)} strong />
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{es.sales.paymentsTitle}</strong>
              <button type="button" onClick={() => setShowPaymentModal(true)} className="tc-btn tc-btn--secondary" disabled={cart.length === 0}>
                {es.sales.addPayment}
              </button>
            </div>

            {payments.length === 0 ? (
              <p style={{ color: 'var(--gray-500)' }}>{es.sales.noPayments}</p>
            ) : (
              payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{payment.method}</strong>
                    {payment.reference && <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: 'var(--text-xs)' }}>Ref: {payment.reference}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <button type="button" onClick={() => removePayment(index)} className="tc-btn tc-btn--ghost" style={{ color: 'var(--danger-600)' }}>
                      x
                    </button>
                  </div>
                </div>
              ))
            )}

            <SummaryRow label={es.sales.remaining} value={formatCurrency(remaining)} strong />
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--border-light)' }}>
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
            className="tc-btn tc-btn--primary"
            style={{ minHeight: '52px', fontWeight: 800 }}
            disabled={loading || cart.length === 0 || remaining > 0.01 || !activeCash}
          >
            {loading ? es.common.loading : es.sales.completeSale}
          </button>

          {lastInvoicePath && (
            <button
              type="button"
              onClick={() => void openInvoice(lastInvoicePath)}
              className="tc-btn tc-btn--secondary"
              style={{ color: '#0F766E' }}
            >
              {es.printer.openInvoice}
            </button>
          )}

          {lastInvoiceData && (
            <button
              type="button"
              onClick={async () => {
                setPrintResult('Imprimiendo...');
                const response = await printToHardware(lastInvoiceData);
                if (response.success) {
                  setPrintResult(response.data.message);
                } else {
                  setPrintResult(response.error.message);
                }
              }}
              className="tc-btn tc-btn--secondary"
              style={{ borderColor: '#0F766E', background: '#F0FDFA', color: '#0F766E' }}
            >
              {es.printer.printHardware}
            </button>
          )}

          {printResult && (
            <div className="tc-notice tc-notice--info">{printResult}</div>
          )}
        </aside>
      </div>

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
    </div>
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
    <div className="tc-modal-overlay">
      <section className="tc-modal">
        <h2 className="tc-modal-title">{es.sales.addPayment}</h2>
        <p style={{ color: 'var(--gray-500)' }}>{es.sales.remaining}: {formatCurrency(remaining)}</p>
        <select className="tc-select" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
          <option value="efectivo">Efectivo</option>
          <option value="nequi">Nequi</option>
          <option value="daviplata">Daviplata</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <input className="tc-input" value={amount} onChange={(event) => setAmount(event.target.value)} type="number" />
        {method !== 'efectivo' && (
          <input
            className="tc-input"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder={es.sales.paymentReference}
          />
        )}
        <div className="tc-modal-actions">
          <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
            {es.common.cancel}
          </button>
          <button type="button" onClick={submit} className="tc-btn tc-btn--primary">
            {es.common.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
      <span style={strong ? { color: 'var(--gray-900)', fontWeight: 800 } : { color: 'var(--gray-500)' }}>{label}</span>
      <span style={strong ? { color: 'var(--gray-900)', fontWeight: 800 } : { color: 'var(--gray-700)' }}>{value}</span>
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
