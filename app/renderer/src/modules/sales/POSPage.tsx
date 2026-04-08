import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Trash2,
  CreditCard,
  History,
  Barcode,
  PlusCircle,
  MinusCircle,
  Truck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Banknote,
  Navigation,
  Percent,
  Calculator,
  ArrowRight,
} from 'lucide-react';

import { getAllProducts } from '../../shared/api/inventory.api';
import { getAllCustomers } from '../../shared/api/customers.api';
import { getActiveCashRegister } from '../../shared/api/cash.api';
import { createSale, generateInvoice } from '../../shared/api/sales.api';
import { useAuth } from '../../shared/context/AuthContext';
import { formatCurrency } from '../../shared/utils/formatters';
import type { Product } from '../../shared/types/inventory.types';
import type { Customer } from '../../shared/types/customers.types';
import type { CashRegister } from '../../shared/types/cash.types';
import type { PaymentInput, PaymentMethod, CartItemInput, SalePayment } from '../../shared/types/sales.types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function POSPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCash, setActiveCash] = useState<CashRegister | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [payments, setPayments] = useState<SalePayment[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        const [cashResponse, productsResponse, customersResponse] = await Promise.all([
          getActiveCashRegister(user.id),
          getAllProducts(),
          getAllCustomers(),
        ]);

        if (!cancelled) {
          if (cashResponse.success) setActiveCash(cashResponse.data);
          if (productsResponse.success) {
            setProducts(productsResponse.data.filter(p => p.isActive));
          }
          if (customersResponse.success) setCustomers(customersResponse.data);
        }
      } catch (err) {
        console.error('Error loading POS data:', err);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0),
    [cart],
  );

  const tax = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discount) * (item.product.taxRate ?? 0.19), 0),
    [cart],
  );

  const total = subtotal + tax + deliveryFee - globalDiscount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price, discount: 0 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const addPayment = (method: PaymentMethod) => {
    if (remaining <= 0.1) return;
    if (method === 'credito' && !selectedCustomerId) {
      setMessageType('error');
      setMessage('Seleccione un cliente para realizar una venta a crédito.');
      return;
    }
    setPayments(prev => [...prev, { method, amount: remaining }]);
  };

  const quickPay = async (method: PaymentMethod) => {
    if (remaining <= 0.1 || cart.length === 0) return;
    if (method === 'credito' && !selectedCustomerId) {
      setMessageType('error');
      setMessage('Seleccione un cliente para fiar.');
      return;
    }
    const finalPayments = [...payments, { method, amount: remaining }];
    await processCompleteSale(finalPayments);
  };

  const handleCompleteSale = async () => {
    if (remaining > 0.1) {
      setMessageType('error');
      setMessage(`Falta cubrir un saldo de ${formatCurrency(remaining)}`);
      return;
    }
    await processCompleteSale(payments);
  };

  const processCompleteSale = async (finalPayments: SalePayment[]) => {
    if (!user || !activeCash) return;
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const items: CartItemInput[] = cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount
      }));

      const response = await createSale(activeCash.id, user.id, items, finalPayments, globalDiscount, deliveryFee, selectedCustomerId);
      if (response.success) {
        const invoiceData = {
          invoiceNumber: response.data.saleNumber,
          date: new Date().toISOString(),
          cashierName: user.fullName,
          businessName: 'TuCajero POS',
          items: cart.map(i => {
            const itemTotal = (i.quantity * item.unitPrice) - i.discount;
            const itemTax = itemTotal * (item.product.taxRate ?? 0.19);
            return {
              name: i.product.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.product.taxRate ?? 0.19,
              subtotal: itemTotal,
              tax: itemTax,
              total: itemTotal + itemTax
            };
          }),
          subtotal,
          tax,
          totalTax: tax,
          deliveryFee,
          discount: globalDiscount,
          total,
          payments: finalPayments.map(p => ({ method: p.method, amount: p.amount })),
          change: totalPaid > total ? totalPaid - total : 0
        };

        const invoiceResp = await generateInvoice(response.data.id);
        if (invoiceResp.success && window.api?.openInvoice) {
          await window.api.openInvoice(invoiceResp.data);
        }

        setMessageType('success');
        setMessage(`Venta #${response.data.saleNumber} completada.`);
        setCart([]);
        setPayments([]);
        setDeliveryFee(0);
        setGlobalDiscount(0);
        setSelectedCustomerId(null);
      } else {
        setMessageType('error');
        setMessage(response.error.message);
      }
    } catch (err: any) {
        setMessageType('error');
        setMessage(err.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  if (!activeCash) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: 'var(--space-6)', animation: 'fadeIn 0.5s ease' }}>
        <div className="tc-metric-icon tc-metric-icon--danger" style={{ width: '96px', height: '96px', borderRadius: 'var(--radius-3xl)' }}>
          <AlertCircle size={48} />
        </div>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className="tc-metric-value" style={{ marginBottom: 'var(--space-2)' }}>Caja Cerrada</h2>
          <p style={{ color: 'var(--gray-500)', fontWeight: 500, lineHeight: 1.6 }}>
            Debe iniciar una sesión de caja para poder realizar ventas en este terminal.
          </p>
        </div>
        <button
          onClick={() => navigate('/cash')}
          className="tc-btn tc-btn--primary"
          style={{ padding: '0 var(--space-8)', minHeight: '56px', fontSize: 'var(--text-lg)', boxShadow: 'var(--shadow-xl)' }}
        >
          <ArrowRight size={20} />
          Ir a Control de Caja
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1700px', margin: '0 auto', overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', height: 'calc(100vh - 140px)' }}>
        {/* For larger screens, switch to row layout */}
        <div className="flex flex-col lg:flex-row gap-6 h-full" style={{ height: '100%' }}>

          {/* Left: Inventory */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
            {/* Search Header */}
            <div className="tc-section" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '280px' }}>
                  <Search style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} size={20} />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="tc-input"
                    style={{ paddingLeft: '48px', minHeight: '50px', fontSize: 'var(--text-base)', background: 'var(--gray-50)' }}
                  />
                </div>
                <button onClick={() => navigate('/sales/history')} className="tc-btn tc-btn--secondary">
                  <History size={18} />
                  Historial
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--space-2)', paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="tc-card animate-slideUp group cursor-pointer"
                    style={{ overflow: 'hidden', transition: 'all var(--transition-normal)' }}
                  >
                    <div style={{ aspectRatio: '1', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
                      <Barcode size={48} style={{ color: 'var(--gray-200)', transition: 'color var(--transition-normal)' }} />
                    </div>
                    <div style={{ padding: 'var(--space-4)' }}>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.category?.name || 'Varios'}
                      </p>
                      <h4 style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--brand-600)', fontWeight: 800, fontSize: 'var(--text-base)' }}>
                          {formatCurrency(product.price)}
                        </span>
                        <span className={`tc-badge ${product.stock > 10 ? 'tc-badge--success' : 'tc-badge--danger'}`}>
                          {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Cart & Checkout */}
          <div style={{ width: '100%', minWidth: '400px', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', height: '100%' }}>
            <div className="tc-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '2px solid var(--brand-100)', boxShadow: 'var(--shadow-xl)', padding: 0 }}>

              {/* Customer Picker */}
              <div style={{ padding: 'var(--space-4)', background: 'var(--gray-50)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <User style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} size={16} />
                    <select
                      value={selectedCustomerId || ''}
                      onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                      className="tc-input"
                      style={{ paddingLeft: '40px', minHeight: '44px', fontWeight: 700, fontSize: 'var(--text-sm)', appearance: 'auto' }}
                    >
                      <option value="">Consumidor Final</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName} ({c.phone || 'S/T'})</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => navigate('/customers')} className="tc-btn tc-btn--secondary" style={{ padding: '0 var(--space-3)', minHeight: '44px' }}>
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
                {cart.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {cart.map((item, idx) => (
                      <div key={idx} className="animate-slideUp" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: '#fff', padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-xs)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xl)', background: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--gray-100)', flexShrink: 0 }}>
                          <Barcode size={24} style={{ color: 'var(--gray-300)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product.name}
                          </h5>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '4px' }}>
                            <span style={{ color: 'var(--brand-600)', fontWeight: 800, fontSize: 'var(--text-sm)' }}>
                              {formatCurrency(item.unitPrice)}
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 500 }}>
                              IVA {(item.product.taxRate ?? 0) * 100}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', padding: '4px', border: '1px solid var(--gray-200)' }}>
                          <button
                            onClick={() => updateQty(item.product.id, -1)}
                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', borderRadius: 'var(--radius-md)', transition: 'color var(--transition-fast)' }}
                          >
                            <MinusCircle size={18} />
                          </button>
                          <span style={{ width: '40px', textAlign: 'center', fontWeight: 800, color: 'var(--gray-800)', fontSize: 'var(--text-base)' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.product.id, 1)}
                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', borderRadius: 'var(--radius-md)', transition: 'color var(--transition-fast)' }}
                          >
                            <PlusCircle size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {cart.length === 0 && (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-300)', gap: 'var(--space-4)', opacity: 0.5, padding: 'var(--space-10)' }}>
                    <ShoppingCart size={48} />
                    <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Carrito Vacío</p>
                  </div>
                )}
              </div>

              {/* Bottom Panel */}
              <div style={{ padding: 'var(--space-5)', background: 'var(--gray-50)', borderTop: '1px solid var(--border-light)' }}>
                {/* Fees & Discounts Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ position: 'relative' }}>
                    <Truck style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} size={14} />
                    <input
                      type="number"
                      placeholder="Delivery"
                      value={deliveryFee || ''}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      className="tc-input"
                      style={{ paddingLeft: '36px', minHeight: '44px', fontWeight: 700, fontSize: 'var(--text-sm)' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Percent style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} size={14} />
                    <input
                      type="number"
                      placeholder="Desc. Global"
                      value={globalDiscount || ''}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      className="tc-input"
                      style={{ paddingLeft: '36px', minHeight: '44px', fontWeight: 700, fontSize: 'var(--text-sm)' }}
                    />
                  </div>
                </div>

                {/* Totals display */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Subtotal + IVA
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {formatCurrency(subtotal + tax)}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', color: 'var(--success-600)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Costo Envío
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                        + {formatCurrency(deliveryFee)}
                      </span>
                    </div>
                  )}
                  {globalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', color: 'var(--danger-600)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Descuento Aplicado
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                        - {formatCurrency(globalDiscount)}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 'var(--space-3)', borderTop: '2px solid var(--gray-200)' }}>
                    <span style={{ color: 'var(--gray-400)', fontWeight: 800, fontSize: 'var(--text-xs)', paddingBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Total a Facturar
                    </span>
                    <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Quick Payments */}
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Calculator size={12} /> Pago Rápido
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                    <button
                      onClick={() => quickPay('efectivo')}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', background: '#fff', border: '1px solid var(--success-100)', color: 'var(--success-600)', transition: 'all var(--transition-normal)', fontWeight: 800, fontSize: 'var(--text-xs)', textTransform: 'uppercase', gap: 'var(--space-1)', cursor: 'pointer' }}
                    >
                      <Banknote size={18} />
                      Efectivo
                    </button>
                    <button
                      onClick={() => quickPay('nequi')}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', background: '#fff', border: '1px solid #e9d5ff', color: '#9333ea', transition: 'all var(--transition-normal)', fontWeight: 800, fontSize: 'var(--text-xs)', textTransform: 'uppercase', gap: 'var(--space-1)', cursor: 'pointer' }}
                    >
                      <Smartphone size={18} />
                      Nequi
                    </button>
                    <button
                      onClick={() => quickPay('tarjeta')}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', background: '#fff', border: '1px solid var(--brand-100)', color: 'var(--brand-600)', transition: 'all var(--transition-normal)', fontWeight: 800, fontSize: 'var(--text-xs)', textTransform: 'uppercase', gap: 'var(--space-1)', cursor: 'pointer' }}
                    >
                      <CreditCard size={18} />
                      Tarjeta
                    </button>
                  </div>

                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <button
                      onClick={() => quickPay('credito')}
                      disabled={!selectedCustomerId}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-xl)', transition: 'all var(--transition-normal)', fontWeight: 800, fontSize: 'var(--text-xs)', textTransform: 'uppercase', gap: 'var(--space-2)', background: selectedCustomerId ? 'var(--warning-100)' : 'var(--gray-100)', color: selectedCustomerId ? 'var(--warning-600)' : 'var(--gray-300)', cursor: selectedCustomerId ? 'pointer' : 'not-allowed' }}
                    >
                      <Tag size={14} /> Fiar Saldo
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleCompleteSale}
                    disabled={loading || remaining > 0.1 || cart.length === 0}
                    className="tc-btn tc-btn--primary"
                    style={{ width: '100%', minHeight: '56px', fontSize: 'var(--text-base)', fontWeight: 800, boxShadow: 'var(--shadow-xl)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Procesando</span>
                      </div>
                    ) : remaining > 0.1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>Pendiente {formatCurrency(remaining)}</span>
                        <span style={{ fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>Configurar pagos arriba</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                        <CheckCircle2 size={24} />
                        <span>FINALIZAR VENTA</span>
                      </div>
                    )}
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
