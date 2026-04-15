import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receiveItems,
  getPurchaseSummary,
} from '../../shared/api/purchase.api';
import { getAllProducts as getProducts } from '../../shared/api/inventory.api';
import { useAuth } from '../../shared/context/AuthContext';
import type { Product } from '../../shared/types/inventory.types';
import type {
  Supplier,
  PurchaseOrder,
  CreateSupplierInput,
  CreatePurchaseOrderInput,
  ReceiveItemInput,
  PurchaseOrderStatus,
  PurchaseSummary,
} from '../../shared/types/purchase.types';

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

function formatCurrencyCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'var(--gray-100)',
  CONFIRMED: 'var(--warning-100)',
  SENT: 'var(--brand-100)',
  RECEIVED: 'var(--success-100)',
  CANCELLED: 'var(--danger-100)',
};
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  SENT: 'Enviado',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
};

export function PurchasePage(): JSX.Element {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<'suppliers' | 'orders'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [sr, or, pr, sur] = await Promise.all([
        getAllSuppliers(),
        getPurchaseOrders(),
        getProducts(),
        getPurchaseSummary(),
      ]);
      if (sr.success) setSuppliers(sr.data);
      if (or.success) setOrders(or.data);
      if (pr.success) setProducts(pr.data);
      if (sur.success) setSummary(sur.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user && isAdmin) void loadData();
  }, [user, isAdmin, loadData]);
  useEffect(() => {
    if (!user || !isAdmin) {
      setMessage('No acceso');
      setMessageType('error');
    }
  }, [user, isAdmin]);

  const handleSaveSupplier = async (data: CreateSupplierInput) => {
    setSaving(true);
    try {
      const res = selectedSupplier
        ? await updateSupplier(selectedSupplier.id, data)
        : await createSupplier(data);
      if (res.success) {
        setMessage(selectedSupplier ? 'Actualizado' : 'Creado');
        setMessageType('success');
        if (selectedSupplier) {
          setSuppliers((prev) => prev.map((s) => (s.id === selectedSupplier.id ? res.data : s)));
        } else {
          setSuppliers((prev) => [...prev, res.data]);
        }
        setShowSupplierModal(false);
        setSelectedSupplier(null);
      } else {
        setMessage(res.error.message);
        setMessageType('error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm('Eliminar?')) return;
    const res = await deleteSupplier(id);
    if (res.success) {
      setMessage('Eliminado');
      setMessageType('success');
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } else {
      setMessage(res.error.message);
      setMessageType('error');
    }
  };

  const handleCreateOrder = async (data: CreatePurchaseOrderInput) => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await createPurchaseOrder(user.id, data);
      if (res.success) {
        setMessage(`Pedido ${res.data.orderNumber} creado`);
        setMessageType('success');
        setOrders((prev) => [res.data, ...prev]);
        setShowOrderModal(false);
        void loadData();
      } else {
        setMessage(res.error.message);
        setMessageType('error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: number, status: PurchaseOrderStatus) => {
    const res = await updatePurchaseOrderStatus(orderId, status);
    if (res.success) {
      setMessage(`Ahora ${STATUS_LABELS[status]}`);
      setMessageType('success');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
    } else {
      setMessage(res.error.message);
      setMessageType('error');
    }
  };

  const handleReceive = async (data: { items: ReceiveItemInput[]; observations: string }) => {
    if (!user || !selectedOrder) return;
    setSaving(true);
    try {
      const res = await receiveItems(selectedOrder.id, user.id, data.items);
      if (res.success) {
        const note = data.observations ? `. Notas: ${data.observations}` : '';
        setMessage('Recibido' + note);
        setMessageType('success');
        setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? res.data : o)));
        setShowReceiveModal(false);
        setSelectedOrder(null);
        void loadData();
      } else {
        setMessage(res.error.message);
        setMessageType('error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user)
    return (
      <div className="tc-page-container">
        <div className="tc-section" style={{ textAlign: 'center', padding: 48 }}>
          <h2>Iniciar sesión</h2>
          <p>Debes iniciar sesión.</p>
        </div>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="tc-page-container">
        <div className="tc-section" style={{ textAlign: 'center', padding: 48 }}>
          <h2>Acceso denegado</h2>
          <p>Solo admins.</p>
          <Link to="/dashboard" className="tc-btn tc-btn--primary" style={{ marginTop: 16 }}>
            Volver
          </Link>
        </div>
      </div>
    );

  return (
    <div className="tc-page-container">
      <section className="tc-section">
        <div className="tc-section-header">
          <div>
            <p
              style={{
                textTransform: 'uppercase',
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 600,
              }}
            >
              Proveedores y Pedidos
            </p>
            <h2 className="tc-section-title">Gestión de Compras</h2>
            <p className="tc-section-subtitle">Administra proveedores y pedidos</p>
          </div>
        </div>
        {message && (
          <div className={`tc-notice tc-notice--${messageType}`} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}
      </section>
      <section className="tc-section">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setTab('suppliers')}
            className={`tc-btn ${tab === 'suppliers' ? 'tc-btn--primary' : 'tc-btn--secondary'}`}
          >
            <UsersIcon /> Proveedores ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`tc-btn ${tab === 'orders' ? 'tc-btn--primary' : 'tc-btn--secondary'}`}
          >
            <PackageIcon /> Pedidos ({orders.length})
          </button>
        </div>
        {summary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="tc-metric-card">
              <div className="tc-metric-icon">
                <DollarIcon />
              </div>
              <div>
                <p className="tc-metric-label">Total Invertido</p>
                <p className="tc-metric-value">{formatCurrencyCOP(summary.totalValue)}</p>
              </div>
            </div>
            <div className="tc-metric-card">
              <div className="tc-metric-icon tc-metric-icon--warning">
                <TruckIcon />
              </div>
              <div>
                <p className="tc-metric-label">Pendientes</p>
                <p className="tc-metric-value">{summary.pendingOrders}</p>
              </div>
            </div>
            <div className="tc-metric-card">
              <div className="tc-metric-icon tc-metric-icon--success">
                <CheckIcon />
              </div>
              <div>
                <p className="tc-metric-label">Recibidos</p>
                <p className="tc-metric-value">{summary.receivedOrders}</p>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Cargando...</div>
        ) : tab === 'suppliers' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplier(null);
                  setShowSupplierModal(true);
                }}
                className="tc-btn tc-btn--primary"
              >
                <PlusIcon /> Nuevo Proveedor
              </button>
            </div>
            {suppliers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <UsersIcon />
                <h3>No hay proveedores</h3>
              </div>
            ) : (
              <div className="tc-table-wrap">
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Contacto</th>
                      <th>Teléfono</th>
                      <th>Email</th>
                      <th>Tiempo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.contactPerson || '-'}</td>
                        <td>{s.phone}</td>
                        <td>{s.email}</td>
                        <td>{s.leadTimeDays} días</td>
                        <td>
                          <span
                            className={`tc-badge ${s.isActive ? 'tc-badge--success' : 'tc-badge--neutral'}`}
                          >
                            {s.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setShowSupplierModal(true);
                              }}
                              className="tc-btn tc-btn--ghost"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s.id)}
                              className="tc-btn tc-btn--ghost"
                              style={{ color: '#dc2626' }}
                            >
                              <XIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setShowOrderModal(true);
                }}
                className="tc-btn tc-btn--primary"
                disabled={suppliers.length === 0}
              >
                <PlusIcon /> Nuevo Pedido
              </button>
            </div>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <PackageIcon />
                <h3>No hay pedidos</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {orders.map((order) => (
                  <div key={order.id} className="tc-card" style={{ padding: 16 }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>#{order.orderNumber}</span>
                        <span
                          className="tc-badge"
                          style={{ marginLeft: 8, background: STATUS_COLORS[order.status] }}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: '#2563eb', fontSize: 20 }}>
                          {formatCurrencyCOP(order.total)}
                        </p>
                        <p style={{ fontSize: 12, color: '#6b7280' }}>{order.supplier?.name}</p>
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}
                    >
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 14,
                            padding: 8,
                            background: '#f3f4f6',
                            borderRadius: 6,
                          }}
                        >
                          <span>{item.product?.name}</span>
                          <span>
                            {item.quantityOrdered} x {formatCurrencyCOP(item.unitCost)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.observations && (
                      <div
                        style={{
                          fontSize: 14,
                          color: '#0891b2',
                          marginBottom: 12,
                          padding: 8,
                          background: '#cffafe',
                          borderRadius: 6,
                        }}
                      >
                        <strong>Notas:</strong> {order.observations}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {order.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                          className="tc-btn tc-btn--primary"
                          style={{ fontSize: 12 }}
                        >
                          Confirmar
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'SENT')}
                          className="tc-btn tc-btn--primary"
                          style={{ fontSize: 12 }}
                        >
                          Enviado
                        </button>
                      )}
                      {(order.status === 'CONFIRMED' || order.status === 'SENT') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowReceiveModal(true);
                          }}
                          className="tc-btn tc-btn--success"
                          style={{ fontSize: 12 }}
                        >
                          <TruckIcon /> Recibir
                        </button>
                      )}
                      {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                          className="tc-btn tc-btn--danger"
                          style={{ fontSize: 12 }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      {showSupplierModal && (
        <SupplierModal
          supplier={selectedSupplier}
          onSave={handleSaveSupplier}
          onClose={() => {
            setShowSupplierModal(false);
            setSelectedSupplier(null);
          }}
          saving={saving}
        />
      )}
      {showOrderModal && (
        <OrderModal
          suppliers={suppliers}
          products={products}
          onSave={handleCreateOrder}
          onClose={() => setShowOrderModal(false)}
          saving={saving}
        />
      )}
      {showReceiveModal && selectedOrder && (
        <ReceiveModal
          order={selectedOrder}
          onSave={handleReceive}
          onClose={() => {
            setShowReceiveModal(false);
            setSelectedOrder(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function SupplierModal({
  supplier,
  onSave,
  onClose,
  saving,
}: {
  supplier: Supplier | null;
  onSave: (data: CreateSupplierInput) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateSupplierInput>({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    leadTimeDays: supplier?.leadTimeDays || 7,
    isActive: supplier?.isActive ?? true,
    notes: supplier?.notes || '',
  });
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div className="tc-modal-overlay" onClick={handleOverlayClick}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div
          style={{
            background: 'linear-gradient(to right,#2563eb,#1d4ed8)',
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ color: '#fff', margin: 0 }}>{supplier ? 'Editar' : 'Nuevo'} Proveedor</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <XIcon />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(form);
          }}
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div className="tc-field">
            <label className="tc-label">Nombre *</label>
            <input
              className="tc-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="tc-field">
            <label className="tc-label">Persona de Contacto</label>
            <input
              className="tc-input"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="tc-field">
              <label className="tc-label">Teléfono *</label>
              <input
                className="tc-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="tc-field">
              <label className="tc-label">Email *</label>
              <input
                className="tc-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="tc-field">
            <label className="tc-label">Dirección</label>
            <input
              className="tc-input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="tc-field">
              <label className="tc-label">Tiempo (días)</label>
              <input
                className="tc-input"
                type="number"
                min={1}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })}
              />
            </div>
            <div className="tc-field">
              <label className="tc-label">Estado</label>
              <select
                className="tc-input"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="tc-field">
            <label className="tc-label">Notas</label>
            <textarea
              className="tc-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
              Cancelar
            </button>
            <button type="submit" className="tc-btn tc-btn--primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderModal({
  suppliers,
  products,
  onSave,
  onClose,
  saving,
}: {
  suppliers: Supplier[];
  products: Product[];
  onSave: (data: CreatePurchaseOrderInput) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [supplierId, setSupplierId] = useState(0);
  const [items, setItems] = useState<
    { productId: number; quantityOrdered: number; unitCost: number }[]
  >([]);
  const [freight, setFreight] = useState(0);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const total = items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0) + freight;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div className="tc-modal-overlay" onClick={handleOverlayClick}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div
          style={{
            background: 'linear-gradient(to right,#2563eb,#1d4ed8)',
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ color: '#fff', margin: 0 }}>Nuevo Pedido</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <XIcon />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (supplierId === 0 || items.length === 0) return;
            onSave({
              supplierId,
              items,
              freight,
              expectedDate: expectedDate || undefined,
              notes: notes || undefined,
            });
          }}
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div className="tc-field">
            <label className="tc-label">Proveedor *</label>
            <select
              className="tc-input"
              value={supplierId}
              onChange={(e) => setSupplierId(Number(e.target.value))}
              required
            >
              <option value={0}>Seleccionar...</option>
              {suppliers
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="tc-label">Productos *</label>
              <button
                type="button"
                onClick={() =>
                  products.length &&
                  setItems([
                    ...items,
                    { productId: products[0].id, quantityOrdered: 1, unitCost: 0 },
                  ])
                }
                className="tc-btn tc-btn--ghost"
                style={{ fontSize: 12 }}
              >
                <PlusIcon /> Agregar
              </button>
            </div>
            {items.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 16 }}>
                Agregar productos
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="tc-input"
                      style={{ flex: 2 }}
                      value={item.productId}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].productId = Number(e.target.value);
                        setItems(n);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="tc-input"
                      type="number"
                      min={1}
                      style={{ flex: 1 }}
                      placeholder="Cant"
                      value={item.quantityOrdered}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].quantityOrdered = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                    <input
                      className="tc-input"
                      type="number"
                      min={0}
                      style={{ flex: 1 }}
                      placeholder="Costo"
                      value={item.unitCost}
                      onChange={(e) => {
                        const n = [...items];
                        n[idx].unitCost = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="tc-btn tc-btn--ghost"
                      style={{ color: '#dc2626' }}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="tc-field">
              <label className="tc-label">Flete</label>
              <input
                className="tc-input"
                type="number"
                min={0}
                value={freight}
                onKeyDown={handleKeyDown}
                onChange={(e) => setFreight(Number(e.target.value))}
              />
            </div>
            <div className="tc-field">
              <label className="tc-label">Fecha Esperada</label>
              <input
                className="tc-input"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="tc-field">
            <label className="tc-label">Notas</label>
            <textarea
              className="tc-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div
            style={{
              background: '#f3f4f6',
              padding: 12,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 600 }}>Total:</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#2563eb' }}>
              {formatCurrencyCOP(total)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
              Cancelar
            </button>
            <button
              type="button"
              className="tc-btn tc-btn--primary"
              disabled={saving || supplierId === 0 || items.length === 0}
              onClick={() => {
                if (supplierId === 0 || items.length === 0) return;
                onSave({
                  supplierId,
                  items,
                  freight,
                  expectedDate: expectedDate || undefined,
                  notes: notes || undefined,
                });
              }}
            >
              {saving ? 'Guardando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReceiveModal({
  order,
  onSave,
  onClose,
  saving,
}: {
  order: PurchaseOrder;
  onSave: (data: { items: ReceiveItemInput[]; observations: string }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<ReceiveItemInput[]>(
    order.items.map((item) => ({
      orderItemId: item.id,
      quantityReceived: item.quantityOrdered,
      received: false,
      observations: '',
    })),
  );
  const [globalObs, setGlobalObs] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div className="tc-modal-overlay" onClick={handleOverlayClick}>
      <div className="tc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div
          style={{
            background: 'linear-gradient(to right,#059669,#047857)',
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ color: '#fff', margin: 0 }}>Recibir Pedido #{order.orderNumber}</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: 14 }}>
              {order.supplier?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <XIcon />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const valid = items.filter((i) => i.received && i.quantityReceived > 0);
            if (valid.length === 0) return alert('Selecciona al menos un producto');
            onSave({ items: valid, observations: globalObs });
          }}
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, idx) => {
              const oi = order.items[idx];
              return (
                <div
                  key={item.orderItemId}
                  style={{
                    padding: 12,
                    background: item.received ? '#d1fae5' : '#f3f4f6',
                    borderRadius: 8,
                    border: `2px solid ${item.received ? '#34d399' : 'transparent'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={item.received}
                        onChange={(e) => {
                          const n = [...items];
                          n[idx].received = e.target.checked;
                          n[idx].quantityReceived = e.target.checked ? oi.quantityOrdered : 0;
                          setItems(n);
                        }}
                        style={{ width: 20, height: 20 }}
                      />
                      <span style={{ fontWeight: 600 }}>{oi.product?.name}</span>
                    </div>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>
                      Pedido: {oi.quantityOrdered}
                    </span>
                  </div>
                  {item.received && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280' }}>Cantidad Recibida</label>
                        <input
                          className="tc-input"
                          type="number"
                          min={0}
                          max={oi.quantityOrdered}
                          value={item.quantityReceived}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            const n = [...items];
                            n[idx].quantityReceived = Number(e.target.value);
                            setItems(n);
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: '#6b7280' }}>Notas</label>
                        <input
                          className="tc-input"
                          placeholder="Faltan X unidades"
                          value={item.observations}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            const n = [...items];
                            n[idx].observations = e.target.value;
                            setItems(n);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="tc-field">
            <label className="tc-label">Observaciones del Pedido</label>
            <textarea
              className="tc-input"
              placeholder="Ej: Faltaron 5 unidades del producto X"
              value={globalObs}
              onChange={(e) => setGlobalObs(e.target.value)}
              rows={2}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="tc-btn tc-btn--secondary">
              Cancelar
            </button>
            <button type="submit" className="tc-btn tc-btn--success" disabled={saving}>
              {saving ? 'Guardando...' : 'Confirmar Recepción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
