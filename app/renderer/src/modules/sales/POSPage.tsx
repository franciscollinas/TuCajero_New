import { useEffect, useMemo, useState, useCallback, useRef, memo, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Trash2,
  CreditCard,
  History,
  PlusCircle,
  Truck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Banknote,
  Navigation,
  Percent,
  ArrowRight,
  ScanLine,
  X,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

import { getAllProducts } from '../../shared/api/inventory.api';
import { getAllCustomers } from '../../shared/api/customers.api';
import { getActiveCashRegister } from '../../shared/api/cash.api';
import { createSale, generateInvoice } from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { useConfig } from '../../shared/context/ConfigContext';
import { useBarcodeScanner } from '../../shared/hooks/useBarcodeScanner';
import { formatCurrency } from '../../shared/utils/formatters';
import type { Product } from '../../shared/types/inventory.types';
import type { Customer } from '../../shared/types/customers.types';
import type { CashRegister } from '../../shared/types/cash.types';
import type { PaymentInput, PaymentMethod, CartItemInput } from '../../shared/types/sales.types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

/**
 * Memoized product card to prevent unnecessary re-renders.
 * Only re-renders when product or addToCart changes.
 */
const ProductCard = memo(function ProductCard({
  product,
  addToCart,
}: {
  product: Product;
  addToCart: (product: Product) => void;
}): JSX.Element {
  return (
    <div
      onClick={() => addToCart(product)}
      className="tc-card animate-slideUp group cursor-pointer"
      style={{
        overflow: 'hidden',
        transition: 'all var(--transition-normal)',
        cursor: 'pointer',
        border: '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand-300)';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div style={{ padding: 'var(--space-4)' }}>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.category?.name || 'Varios'}
        </p>
        <h4
          style={{
            fontWeight: 700,
            color: 'var(--gray-800)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.name}
        </h4>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--brand-600)',
              fontWeight: 800,
              fontSize: 'var(--text-base)',
            }}
          >
            {formatCurrency(product.price)}
          </span>
          <span
            className={`tc-badge ${product.stock > 10 ? 'tc-badge--success' : 'tc-badge--danger'}`}
          >
            Stock: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );
});

export function POSPage(): JSX.Element {
  const { user } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCash, setActiveCash] = useState<CashRegister | null>(null);
  const [cashLoadError, setCashLoadError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSearching, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [payments, setPayments] = useState<PaymentInput[]>([]);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [showCashInput, setShowCashInput] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  // MIXTO payment flow
  const [mixtoStep, setMixtoStep] = useState<1 | 2 | null>(null);
  const [mixtoCashAmount, setMixtoCashAmount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const addToCart = useCallback(
    (product: Product): void => {
      setCart((prev) => {
        const idx = prev.findIndex((item) => item.product.id === product.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [...prev, { product, quantity: 1, unitPrice: product.price, discount: 0 }];
      });
    },
    [setCart],
  );

  const removeFromCart = (id: number): void => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const clearCart = (): void => {
    setCart([]);
    setPayments([]);
    setDeliveryFee(0);
    setGlobalDiscount(0);
    setSelectedCustomerId(null);
    setCashReceived(0);
    setShowCashInput(false);
    setSelectedMethod(null);
  };

  // Barcode scanner integration
  useBarcodeScanner({
    onScan: useCallback(
      (code: string): void => {
        const found = products.find((p) => p.code === code || p.barcode === code);
        if (found && found.isActive) {
          addToCart(found);
          setMessageType('success');
          setMessage(`Producto "${found.name}" agregado al carrito.`);
          setTimeout(() => setMessage(''), 2000);
        } else {
          setMessageType('error');
          setMessage(`Producto con codigo "${code}" no encontrado.`);
          setTimeout(() => setMessage(''), 3000);
        }
      },
      [products, addToCart],
    ),
    enabled: true,
    minLength: 4,
    maxKeyDelay: 60,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async (): Promise<void> => {
      try {
        setCashLoadError(null);
        const [cashResponse, productsResponse, customersResponse] = await Promise.all([
          getActiveCashRegister(user.id),
          getAllProducts({ orderBySales: true }),
          getAllCustomers(),
        ]);

        if (!cancelled) {
          if (cashResponse.success) {
            setActiveCash(cashResponse.data);
            setCashLoadError(null);
          } else {
            setActiveCash(null);
            setCashLoadError(
              cashResponse.error?.message || 'No se pudo cargar el estado de la caja',
            );
          }
          if (productsResponse.success) {
            setProducts(productsResponse.data.filter((p) => p.isActive));
          }
          if (customersResponse.success) setCustomers(customersResponse.data);
        }
      } catch {
        if (!cancelled) setCashLoadError('Error de conexión al cargar datos');
      }
    };

    void loadData();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const refreshProducts = async (): Promise<void> => {
    if (!user) return;
    try {
      const productsResponse = await getAllProducts({ orderBySales: true });
      if (productsResponse.success) {
        setProducts(productsResponse.data.filter((p) => p.isActive));
      }
    } catch {
      // Silent fail — products will refresh on next navigation
    }
  };

  // Debounce search term to avoid excessive re-renders/filters
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchTerm);
      });
    }, 300);
    return (): void => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return products.slice(0, 40); // Limit initial view for performance
    const lowerSearch = debouncedSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.code.toLowerCase().includes(lowerSearch) ||
          p.barcode?.toLowerCase().includes(lowerSearch),
      )
      .slice(0, 40); // Limit results to avoid DOM bloat
  }, [products, debouncedSearch]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0),
    [cart],
  );

  const tax = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const rate =
          item.product.taxRate !== undefined && item.product.taxRate !== null
            ? item.product.taxRate
            : (config?.ivaRate ?? 0);
        return sum + (item.quantity * item.unitPrice - item.discount) * rate;
      }, 0),
    [cart, config?.ivaRate],
  );

  const calculatedDiscount = useMemo(
    () => (discountType === 'percentage' ? (subtotal * globalDiscount) / 100 : globalDiscount),
    [subtotal, globalDiscount, discountType],
  );

  const total = subtotal + tax + deliveryFee - calculatedDiscount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const addPayment = (method: PaymentMethod): void => {
    if (remaining <= 0.1) return;
    if (method === 'credito' && !selectedCustomerId) {
      setMessageType('error');
      setMessage('Seleccione un cliente para realizar una venta a credito.');
      return;
    }

    // Para crédito: procesar venta a crédito directamente (sin agregar payment)
    if (method === 'credito') {
      void processCreditSale();
      return;
    }

    // For cash payments, ask how much the customer is paying with
    if (method === 'efectivo') {
      setSelectedMethod(method);
      setShowCashInput(true);
      return;
    }

    // For other methods, add payment directly
    setPayments((prev) => [...prev, { method, amount: remaining }]);
    setShowPaymentMethods(false);
  };

  // MIXTO Step 1: Validate cash amount entered
  const confirmMixtoCash = (): void => {
    if (mixtoCashAmount <= 0) {
      setMessageType('error');
      setMessage('Ingrese un monto mayor a $0');
      return;
    }
    if (mixtoCashAmount >= total) {
      setMessageType('error');
      setMessage('Para pagar todo, use "Efectivo" directamente');
      return;
    }
    setMixtoStep(2);
  };

  // MIXTO Step 2: Add second payment method
  const addMixtoSecondPayment = (method: PaymentMethod): void => {
    const finalPayments: PaymentInput[] = [
      { method: 'efectivo', amount: mixtoCashAmount },
      { method, amount: total - mixtoCashAmount },
    ];
    setMixtoStep(null);
    setMixtoCashAmount(0);
    setPayments(finalPayments);
    setShowPaymentMethods(false);
    void processCompleteSale(finalPayments, false);
  };

  const confirmCashPayment = async (): Promise<void> => {
    if (!selectedMethod || cashReceived < remaining) {
      setMessageType('error');
      setMessage(`El monto recibido debe ser al menos ${formatCurrency(remaining)}`);
      return;
    }

    const change = cashReceived - remaining;
    const cashAmount = Math.min(cashReceived, remaining);
    setPayments((prev) => [...prev, { method: selectedMethod, amount: cashAmount }]);
    setShowCashInput(false);
    setCashReceived(0);
    setSelectedMethod(null);

    if (change > 0) {
      setMessageType('success');
      setMessage(`Cambio a devolver: ${formatCurrency(change)}`);
      setShowPaymentMethods(false);
    } else {
      setShowPaymentMethods(true);
    }
  };

  const handleCompleteSale = async (): Promise<void> => {
    if (remaining > 0.1) {
      setMessageType('error');
      setMessage(`Falta cubrir un saldo de ${formatCurrency(remaining)}`);
      return;
    }
    await processCompleteSale(payments, false);
  };

  // Procesar venta a crédito (sin pagos, se crea deuda)
  const processCreditSale = async (): Promise<void> => {
    if (!user || !activeCash) return;
    if (cart.length === 0) return;
    if (!selectedCustomerId) {
      setMessageType('error');
      setMessage('Seleccione un cliente para realizar una venta a credito.');
      return;
    }

    setLoading(true);
    try {
      const items: CartItemInput[] = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      }));

      // Venta a crédito: sin pagos reales, solo se crea la deuda
      const response = await createSale(
        activeCash.id,
        user.id,
        items,
        [],
        globalDiscount,
        deliveryFee,
        selectedCustomerId,
        true,
      );
      if (response.success) {
        setMessageType('success');
        setMessage(
          `Venta a credito #${response.data.saleNumber} registrada - Cuenta por cobrar: ${formatCurrency(total)}`,
        );
        setCart([]);
        setPayments([]);
        setDeliveryFee(0);
        setGlobalDiscount(0);
        setSelectedCustomerId(null);
        setCashReceived(0);
        setShowCashInput(false);
        setShowPaymentMethods(false);
        void refreshProducts();
      } else {
        setMessageType('error');
        setMessage(response.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar';
      setMessageType('error');
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const processCompleteSale = async (
    finalPayments: PaymentInput[],
    isCreditSale = false,
  ): Promise<void> => {
    if (!user || !activeCash) return;
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const items: CartItemInput[] = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      }));

      // Calculate total cash received from cash payments
      const cashPayment = finalPayments.find((p) => p.method === 'efectivo');
      const actualCashReceived = cashPayment ? cashPayment.amount : 0;
      const change = actualCashReceived > total ? actualCashReceived - total : 0;

      const response = await createSale(
        activeCash.id,
        user.id,
        items,
        finalPayments,
        globalDiscount,
        deliveryFee,
        selectedCustomerId,
        isCreditSale,
      );
      if (response.success) {
        // NO generar factura para ventas a crédito hasta que se paguen
        if (!isCreditSale) {
          const invoiceResp = await generateInvoice(response.data.id);
          if (invoiceResp.success) {
            const winApi = window.api as Record<string, unknown>;
            if (typeof winApi.openInvoice === 'function') {
              await (winApi.openInvoice as (path: string) => Promise<void>)(invoiceResp.data);
            }
          }
        }

        setMessageType('success');
        const changeMsg = change > 0 ? ` (Cambio: ${formatCurrency(change)})` : '';
        const creditMsg = isCreditSale ? ' - Cuenta por cobrar creada' : '';
        setMessage(`Venta #${response.data.saleNumber} completada${changeMsg}${creditMsg}`);
        setCart([]);
        setPayments([]);
        setDeliveryFee(0);
        setGlobalDiscount(0);
        setSelectedCustomerId(null);
        setCashReceived(0);
        setShowCashInput(false);
        void refreshProducts();
      } else {
        setMessageType('error');
        setMessage(response.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar';
      setMessageType('error');
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCashState = async (): Promise<void> => {
    if (!user) return;
    try {
      setCashLoadError(null);
      const cashResponse = await getActiveCashRegister(user.id);
      if (cashResponse.success) {
        setActiveCash(cashResponse.data);
        setCashLoadError(null);
      } else {
        setActiveCash(null);
        setCashLoadError(cashResponse.error?.message || 'No se detectó una caja abierta');
      }
    } catch {
      setCashLoadError('Error de conexión al verificar la caja');
    }
  };

  if (!activeCash) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh',
          gap: 'var(--space-6)',
          animation: 'fadeIn 0.5s ease',
        }}
      >
        <div
          className="tc-metric-icon tc-metric-icon--danger"
          style={{ width: '96px', height: '96px', borderRadius: 'var(--radius-3xl)' }}
        >
          <AlertCircle size={48} />
        </div>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className="tc-metric-value" style={{ marginBottom: 'var(--space-2)' }}>
            Caja Cerrada
          </h2>
          <p
            style={{
              color: 'var(--gray-500)',
              fontWeight: 500,
              lineHeight: 1.6,
              marginBottom: cashLoadError ? 'var(--space-3)' : 0,
            }}
          >
            Debe iniciar una sesion de caja para poder realizar ventas en este terminal.
          </p>
          {cashLoadError && (
            <div
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#dc2626',
                fontSize: 'var(--text-sm)',
              }}
            >
              {cashLoadError}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={refreshCashState}
            className="tc-btn tc-btn--secondary"
            style={{ padding: '0 var(--space-6)', minHeight: '48px', fontSize: 'var(--text-base)' }}
          >
            <RefreshCw size={18} style={{ marginRight: 'var(--space-2)' }} />
            Refrescar Estado
          </button>
          <button
            onClick={() => navigate('/cash')}
            className="tc-btn tc-btn--primary"
            style={{
              padding: '0 var(--space-8)',
              minHeight: '56px',
              fontSize: 'var(--text-lg)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <ArrowRight size={20} />
            Ir a Control de Caja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 'var(--space-6)',
        maxWidth: '1700px',
        margin: '0 auto',
        overflow: 'hidden',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* Message Notice */}
      {message && (
        <div
          className={`tc-notice tc-notice--${messageType === 'success' ? 'success' : messageType === 'error' ? 'error' : 'info'}`}
          style={{
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'slideDown 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {messageType === 'success' ? (
              <CheckCircle2 size={18} />
            ) : messageType === 'error' ? (
              <AlertCircle size={18} />
            ) : (
              <ScanLine size={18} />
            )}
            <span style={{ fontWeight: 600 }}>{message}</span>
          </div>
          <button
            onClick={() => setMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.6,
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        className="tc-pos-grid"
        style={{
          height: 'calc(100vh - 140px)',
          minHeight: 0,
        }}
      >
        {/* Left Column: Header + Products */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Page Header */}
          <div
            style={{
              animation: 'slideDown 0.4s ease',
              background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4) var(--space-5)',
              boxShadow: '0 4px 12px rgba(54, 65, 245, 0.2)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-4)',
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    color: '#fff',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 800,
                  }}
                >
                  <Navigation size={24} />
                  Punto de Venta
                </h1>
                <p
                  style={{
                    margin: '2px 0 0',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                  }}
                >
                  Caja #{activeCash.id} &middot;{' '}
                  {activeCash.openedAt ? new Date(activeCash.openedAt).toLocaleDateString() : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                {true && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      animation: 'pulse 2s infinite',
                    }}
                  >
                    <ScanLine size={12} />
                    Escaner Activo
                  </span>
                )}
                <button
                  onClick={() => navigate('/sales/history')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <History size={16} />
                  Historial
                </button>
              </div>
            </div>
          </div>

          {/* Search Header */}
          <div
            style={{
              padding: 'var(--space-4)',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--brand-100)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  className={isSearching ? 'tc-animate-spin' : ''}
                  style={{
                    position: 'absolute',
                    left: 'var(--space-4)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--brand-500)',
                    pointerEvents: 'none',
                  }}
                  size={20}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto por nombre o código (F1)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="tc-input"
                  style={{
                    paddingLeft: '48px',
                    paddingRight: '48px',
                    minHeight: '50px',
                    fontSize: 'var(--text-base)',
                    background: 'var(--gray-50)',
                  }}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: 'var(--space-2)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--gray-400)',
                      cursor: 'pointer',
                      padding: 'var(--space-2)',
                    }}
                    title="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--space-2)', minHeight: 0 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Cart + Payment Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div
            className="tc-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              border: '2px solid var(--brand-100)',
              boxShadow: 'var(--shadow-xl)',
              padding: 0,
              animation: 'slideInRight 0.4s ease',
            }}
          >
            {/* Cart Header */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)',
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(54, 65, 245, 0.2)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 'var(--text-lg)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <ShoppingCart size={22} />
                Carrito de Venta
              </h3>
              {cart.length > 0 && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              )}
            </div>

            {/* Customer Picker */}
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                borderBottom: '2px solid var(--brand-100)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <User
                    style={{
                      position: 'absolute',
                      left: 'var(--space-3)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)',
                      pointerEvents: 'none',
                    }}
                    size={16}
                  />
                  <select
                    value={selectedCustomerId || ''}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                    className="tc-input"
                    style={{
                      paddingLeft: '40px',
                      minHeight: '44px',
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      appearance: 'auto',
                    }}
                  >
                    <option value="">Consumidor Final</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone || 'S/T'})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => navigate('/customers')}
                  className="tc-btn tc-btn--secondary"
                  style={{ padding: '0 var(--space-3)', minHeight: '44px' }}
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-4)',
                background: 'var(--gray-50)',
                minHeight: 0,
              }}
            >
              {cart.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {cart.map((item, idx) => (
                    <div
                      key={item.product.id}
                      className="animate-slideUp"
                      style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        alignItems: 'center',
                        background: '#fff',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-xl)',
                        borderLeft: '4px solid var(--brand-500)',
                        borderRight: '1px solid var(--gray-200)',
                        borderTop: '1px solid var(--gray-200)',
                        borderBottom: '1px solid var(--gray-200)',
                        boxShadow: 'var(--shadow-xs)',
                        animationDelay: `${idx * 50}ms`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5
                          style={{
                            fontWeight: 700,
                            color: 'var(--gray-800)',
                            fontSize: 'var(--text-sm)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginBottom: '4px',
                          }}
                        >
                          {item.product.name}
                        </h5>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          <span
                            style={{
                              color: 'var(--brand-600)',
                              fontWeight: 800,
                              fontSize: 'var(--text-sm)',
                            }}
                          >
                            {formatCurrency(item.unitPrice)}
                          </span>
                          <span
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--gray-400)',
                              fontWeight: 500,
                            }}
                          >
                            x{item.quantity}
                          </span>
                          {item.discount > 0 && (
                            <span
                              className="tc-badge tc-badge--warning"
                              style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}
                            >
                              -{formatCurrency(item.discount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: 'var(--gray-900)',
                            fontSize: 'var(--text-base)',
                          }}
                        >
                          {formatCurrency(item.quantity * item.unitPrice - item.discount)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--danger-400)',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-10)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-2xl)',
                      background: 'var(--brand-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingCart size={32} style={{ color: 'var(--brand-400)' }} />
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--brand-700)',
                    }}
                  >
                    Carrito Vacío
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--brand-500)',
                      textAlign: 'center',
                    }}
                  >
                    Haga clic en un producto para agregarlo
                  </p>
                </div>
              )}
            </div>

            {/* Payment Panel */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'linear-gradient(180deg, #fff 0%, #f8f9ff 100%)',
                borderTop: '2px solid var(--brand-200)',
              }}
            >
              {/* Payment Summary */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--gray-50) 0%, #f0f4ff 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-3)',
                  marginBottom: 'var(--space-3)',
                  border: '2px solid var(--brand-100)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                      Subtotal
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        color: 'var(--gray-800)',
                      }}
                    >
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {(config?.ivaRate ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                        IVA ({(config?.ivaRate ?? 0.19) * 100}%)
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--gray-800)',
                        }}
                      >
                        {formatCurrency(tax)}
                      </span>
                    </div>
                  )}
                  {globalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                        Descuento ({discountType === 'percentage' ? `${globalDiscount}%` : 'FIJO'})
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--success-600)',
                        }}
                      >
                        -{formatCurrency(calculatedDiscount)}
                      </span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                        Delivery
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--gray-800)',
                        }}
                      >
                        {formatCurrency(deliveryFee)}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      borderTop: '2px solid var(--brand-200)',
                      marginTop: 'var(--space-2)',
                      paddingTop: 'var(--space-2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'linear-gradient(135deg, var(--brand-50) 0%, #e8edff 100%)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      margin: '0 calc(-1 * var(--space-3))',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 800,
                        color: 'var(--brand-700)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Total a Pagar
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xl)',
                        fontWeight: 900,
                        color: 'var(--brand-600)',
                      }}
                    >
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery & Discount Inputs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Truck
                    style={{
                      position: 'absolute',
                      left: 'var(--space-2)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--gray-400)',
                      pointerEvents: 'none',
                    }}
                    size={12}
                  />
                  <input
                    type="number"
                    placeholder="Delivery"
                    value={deliveryFee || ''}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="tc-input"
                    style={{
                      paddingLeft: '28px',
                      minHeight: '34px',
                      fontSize: 'var(--text-xs)',
                      background: '#fff',
                    }}
                  />
                </div>
                <div style={{ position: 'relative', display: 'flex', gap: 'var(--space-1)' }}>
                  {discountType === 'percentage' ? (
                    <Percent
                      style={{
                        position: 'absolute',
                        left: 'var(--space-2)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--gray-400)',
                        pointerEvents: 'none',
                      }}
                      size={12}
                    />
                  ) : (
                    <DollarSign
                      style={{
                        position: 'absolute',
                        left: 'var(--space-2)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--gray-400)',
                        pointerEvents: 'none',
                      }}
                      size={12}
                    />
                  )}
                  <input
                    type="number"
                    placeholder={discountType === 'percentage' ? '%' : '$'}
                    value={globalDiscount || ''}
                    onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                    className="tc-input"
                    style={{
                      paddingLeft: '28px',
                      minHeight: '34px',
                      fontSize: 'var(--text-xs)',
                      background: '#fff',
                      width: '70px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')
                    }
                    style={{
                      minHeight: '34px',
                      padding: '0 var(--space-2)',
                      border: '1px solid var(--gray-300)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--gray-100)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                    }}
                  >
                    {discountType === 'percentage' ? '%' : '$'}
                  </button>
                </div>
              </div>

              {/* Payment Method Toggle Button */}
              <button
                onClick={() => setShowPaymentMethods(!showPaymentMethods)}
                disabled={cart.length === 0}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-lg)',
                  background: showPaymentMethods
                    ? 'var(--brand-50)'
                    : 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: cart.length === 0 ? 0.5 : 1,
                  transition: 'all var(--transition-fast)',
                  boxShadow: '0 2px 8px rgba(54, 65, 245, 0.3)',
                  marginBottom: showPaymentMethods ? 'var(--space-3)' : 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CreditCard size={18} />
                  <span>Seleccionar Metodo de Pago</span>
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                  }}
                >
                  {showPaymentMethods ? '▲' : '▼'}
                </div>
              </button>

              {/* Payment Methods Card (Collapsible) */}
              {showPaymentMethods && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--brand-200)',
                    marginBottom: 'var(--space-3)',
                    animation: 'slideDown 0.2s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--brand-600)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 'var(--space-2)',
                      textAlign: 'center',
                    }}
                  >
                    Elija un metodo
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <button
                      onClick={() => {
                        addPayment('efectivo');
                        setShowPaymentMethods(false);
                      }}
                      disabled={cart.length === 0}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid var(--success-200)',
                        color: 'var(--success-600)',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Banknote size={18} style={{ marginBottom: '2px' }} />
                      EFECTIVO
                    </button>
                    <button
                      onClick={() => {
                        addPayment('nequi');
                        setShowPaymentMethods(false);
                      }}
                      disabled={cart.length === 0}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid #e9d5ff',
                        color: '#9333ea',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Smartphone size={18} style={{ marginBottom: '2px' }} />
                      NEQUI
                    </button>
                    <button
                      onClick={() => {
                        addPayment('daviplata');
                        setShowPaymentMethods(false);
                      }}
                      disabled={cart.length === 0}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid #fecaca',
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CreditCard size={18} style={{ marginBottom: '2px' }} />
                      DAVIPLATA
                    </button>
                    <button
                      onClick={() => {
                        addPayment('transferencia');
                        setShowPaymentMethods(false);
                      }}
                      disabled={cart.length === 0}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid var(--brand-200)',
                        color: 'var(--brand-600)',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Navigation size={18} style={{ marginBottom: '2px' }} />
                      TRANSF.
                    </button>
                    <button
                      onClick={() => {
                        if (cart.length > 0) {
                          setMixtoStep(1);
                          setMixtoCashAmount(0);
                          setShowPaymentMethods(false);
                        }
                      }}
                      disabled={cart.length === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid var(--warning-200)',
                        color: 'var(--warning-600)',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CreditCard size={16} />
                      MIXTO
                    </button>
                    <button
                      onClick={() => {
                        addPayment('credito');
                        setShowPaymentMethods(false);
                      }}
                      disabled={cart.length === 0 || !selectedCustomerId}
                      style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        background: selectedCustomerId ? '#fff' : '#f9fafb',
                        border: `2px solid ${selectedCustomerId ? '#f59e0b' : '#e5e7eb'}`,
                        color: selectedCustomerId ? '#d97706' : '#9ca3af',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor:
                          cart.length === 0 || !selectedCustomerId ? 'not-allowed' : 'pointer',
                        opacity: cart.length === 0 || !selectedCustomerId ? 0.5 : 1,
                        boxShadow: selectedCustomerId ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      <Tag size={16} />
                      CREDITO / FIAR {selectedCustomerId ? '' : '(Seleccione cliente)'}
                    </button>
                  </div>
                </div>
              )}

              {/* Cash Input Section */}
              {showCashInput && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'linear-gradient(135deg, var(--success-50) 0%, #d1fae5 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--success-200)',
                    marginBottom: 'var(--space-3)',
                    animation: 'slideDown 0.2s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: 'var(--success-700)',
                      marginBottom: 'var(--space-3)',
                      textAlign: 'center',
                    }}
                  >
                    ¿Con cuanto paga el cliente?
                  </p>

                  {/* Total to pay */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-2)',
                      padding: 'var(--space-2)',
                      background: '#fff',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                      Total a pagar:
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--gray-800)',
                      }}
                    >
                      {formatCurrency(remaining)}
                    </span>
                  </div>

                  {/* Cash received input */}
                  <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
                    <Banknote
                      style={{
                        position: 'absolute',
                        left: 'var(--space-3)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--success-600)',
                      }}
                      size={20}
                    />
                    <input
                      type="number"
                      placeholder="Monto recibido..."
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmCashPayment();
                      }}
                      className="tc-input"
                      style={{
                        paddingLeft: '44px',
                        minHeight: '52px',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        background: '#fff',
                        border: '2px solid var(--success-300)',
                        textAlign: 'right',
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Change display */}
                  {cashReceived > 0 && (
                    <div
                      style={{
                        padding: 'var(--space-3)',
                        background:
                          cashReceived >= remaining ? 'var(--success-100)' : 'var(--warning-100)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-3)',
                        textAlign: 'center',
                      }}
                    >
                      {cashReceived >= remaining ? (
                        <div>
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--success-600)',
                              fontWeight: 600,
                              marginBottom: '2px',
                            }}
                          >
                            Cambio a devolver:
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--text-2xl)',
                              fontWeight: 900,
                              color: 'var(--success-700)',
                            }}
                          >
                            {formatCurrency(cashReceived - remaining)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--warning-600)',
                              fontWeight: 600,
                              marginBottom: '2px',
                            }}
                          >
                            Falta:
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--text-2xl)',
                              fontWeight: 900,
                              color: 'var(--warning-700)',
                            }}
                          >
                            {formatCurrency(remaining - cashReceived)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={confirmCashPayment}
                    disabled={cashReceived < remaining}
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background:
                        cashReceived >= remaining ? 'var(--gradient-success)' : 'var(--gray-300)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      cursor: cashReceived >= remaining ? 'pointer' : 'not-allowed',
                      opacity: cashReceived >= remaining ? 1 : 0.6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {cashReceived >= remaining ? 'Confirmar Pago' : 'Monto insuficiente'}
                  </button>

                  {/* Cancel button */}
                  <button
                    onClick={() => {
                      setShowCashInput(false);
                      setCashReceived(0);
                      setSelectedMethod(null);
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2)',
                      marginTop: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: '1px solid var(--gray-200)',
                      color: 'var(--gray-600)',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* MIXTO Step 1: Cash Amount Input */}
              {mixtoStep === 1 && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid #f59e0b',
                    marginBottom: 'var(--space-3)',
                    animation: 'slideDown 0.2s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: '#92400e',
                      marginBottom: 'var(--space-3)',
                      textAlign: 'center',
                    }}
                  >
                    ¿Cuánto paga en efectivo?
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-2)',
                      padding: 'var(--space-2)',
                      background: '#fff',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                      Total a pagar:
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                        color: 'var(--gray-800)',
                      }}
                    >
                      {formatCurrency(total)}
                    </span>
                  </div>

                  <input
                    type="number"
                    value={mixtoCashAmount || ''}
                    onChange={(e) => setMixtoCashAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="Monto en efectivo"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      textAlign: 'center',
                      border: '2px solid #f59e0b',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-3)',
                      outline: 'none',
                    }}
                  />

                  <button
                    onClick={confirmMixtoCash}
                    disabled={mixtoCashAmount <= 0 || mixtoCashAmount >= total}
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background:
                        mixtoCashAmount > 0 && mixtoCashAmount < total
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'var(--gray-300)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      cursor:
                        mixtoCashAmount > 0 && mixtoCashAmount < total ? 'pointer' : 'not-allowed',
                      textTransform: 'uppercase',
                    }}
                  >
                    Confirmar monto en efectivo
                  </button>

                  <button
                    onClick={() => {
                      setMixtoStep(null);
                      setMixtoCashAmount(0);
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2)',
                      marginTop: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: '1px solid #d97706',
                      color: '#92400e',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* MIXTO Step 2: Select Second Payment Method */}
              {mixtoStep === 2 && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid #f59e0b',
                    marginBottom: 'var(--space-3)',
                    animation: 'slideDown 0.2s ease',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: '#92400e',
                      marginBottom: 'var(--space-3)',
                      textAlign: 'center',
                    }}
                  >
                    Efectivo: {formatCurrency(mixtoCashAmount)} — Seleccione segundo método
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-3)',
                      padding: 'var(--space-2)',
                      background: '#fff',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
                      Resta por pagar:
                    </span>
                    <span style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: '#dc2626' }}>
                      {formatCurrency(total - mixtoCashAmount)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <button
                      onClick={() => addMixtoSecondPayment('nequi')}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid #9333ea',
                        color: '#9333ea',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: 'pointer',
                      }}
                    >
                      NEQUI
                    </button>
                    <button
                      onClick={() => addMixtoSecondPayment('daviplata')}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: '#fff',
                        border: '2px solid #dc2626',
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: 'pointer',
                      }}
                    >
                      DAVIPLATA
                    </button>
                  </div>

                  <button
                    onClick={() => addMixtoSecondPayment('transferencia')}
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      marginTop: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      background: '#fff',
                      border: '2px solid var(--brand-500)',
                      color: 'var(--brand-600)',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    TRANSFERENCIA
                  </button>

                  <button
                    onClick={() => {
                      setMixtoStep(null);
                      setMixtoCashAmount(0);
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2)',
                      marginTop: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: '1px solid #d97706',
                      color: '#92400e',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Registered Payments Display */}
              {payments.length > 0 && (
                <div
                  style={{
                    marginBottom: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    background: 'linear-gradient(135deg, var(--success-50) 0%, #d1fae5 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--success-200)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 700,
                      color: 'var(--success-700)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    ✓ Pagos registrados: {formatCurrency(totalPaid)} / {formatCurrency(total)}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {payments.map((p, idx) => (
                      <span
                        key={idx}
                        className="tc-badge tc-badge--success"
                        style={{ fontSize: 'var(--text-xs)' }}
                      >
                        {p.method} {formatCurrency(p.amount)}
                      </span>
                    ))}
                  </div>
                  {remaining > 0.1 && (
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--warning-600)',
                        fontWeight: 700,
                        marginTop: 'var(--space-1)',
                      }}
                    >
                      Falta: {formatCurrency(remaining)}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <button
                  onClick={handleCompleteSale}
                  disabled={loading || remaining > 0.1 || cart.length === 0}
                  className="tc-btn tc-btn--success"
                  style={{
                    width: '100%',
                    minHeight: '52px',
                    fontSize: 'var(--text-base)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: remaining > 0.1 ? 'none' : '0 4px 12px rgba(18, 183, 106, 0.4)',
                    background:
                      remaining > 0.1
                        ? 'var(--gray-300)'
                        : 'linear-gradient(135deg, var(--success-600) 0%, var(--success-500) 100%)',
                    opacity: remaining > 0.1 || cart.length === 0 ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      <span>Procesando...</span>
                    </div>
                  ) : remaining > 0.1 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <span>Seleccione pago arriba</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <CheckCircle2 size={20} />
                      <span>Confirmar Venta</span>
                    </div>
                  )}
                </button>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}
                >
                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'transparent',
                      border: '1px solid var(--gray-200)',
                      color: 'var(--gray-600)',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: cart.length === 0 ? 0.5 : 1,
                    }}
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                  <button
                    disabled={cart.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-lg)',
                      background: 'transparent',
                      border: '1px solid var(--gray-200)',
                      color: 'var(--gray-600)',
                      fontWeight: 600,
                      fontSize: 'var(--text-xs)',
                      cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: cart.length === 0 ? 0.5 : 1,
                    }}
                  >
                    <Tag size={14} />
                    Cotizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
