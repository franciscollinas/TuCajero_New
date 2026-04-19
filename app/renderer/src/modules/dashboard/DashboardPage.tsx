import { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart,
  List,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  getActiveCashRegister,
  openCashRegister,
  closeCashRegister,
} from '../../shared/api/cash.api';

import { getDashboardSummary } from '../../shared/api/sales.api';
import { formatCurrency } from '../../shared/utils/formatters';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { useInventoryStore } from '../../shared/store/inventory.store';
import type { DashboardSummary, SaleRecord } from '../../shared/types/sales.types';

const CHART_COLORS = ['#465fff', '#12b76a', '#f79009', '#f04438', '#7c3aed', '#06b6d4', '#667085'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito',
};

function getProductsSummary(sale: SaleRecord): string {
  const items = sale.items ?? [];
  if (items.length === 0) return '—';
  if (items.length <= 2)
    return items.map((i) => `${i.quantity}x ${i.product?.name ?? 'Producto'}`).join(', ');
  return `${items[0].quantity}x ${items[0].product?.name ?? 'Producto'} +${items.length - 1}`;
}

function getCustomerInfo(sale: SaleRecord): { name: string; phone: string } {
  const customer = sale.customer;
  if (!customer) return { name: 'Consumidor Final', phone: '—' };
  return {
    name: customer.name || 'Consumidor Final',
    phone: customer.phone || '—',
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: {
    payload: { name?: string; ventas?: number; ingresos?: number; value?: number };
    name?: string;
    value?: number;
  }[];
}

const CustomBarTooltip = memo(function CustomBarTooltip(props: ChartTooltipProps) {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3)',
          boxShadow: 'var(--shadow-md)',
          minWidth: '160px',
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-800)',
            marginBottom: '4px',
          }}
        >
          {data.name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginBottom: '2px' }}>
          Ventas: <strong style={{ color: 'var(--brand-600)' }}>{data.ventas ?? 0}</strong>
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
          Ingresos:{' '}
          <strong style={{ color: 'var(--success-600)' }}>
            {formatCurrency(data.ingresos ?? 0)}
          </strong>
        </p>
      </div>
    );
  }
  return null;
});

const CustomPieTooltip = memo(function CustomPieTooltip(props: ChartTooltipProps) {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--gray-800)' }}>
          {data.name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
          {formatCurrency(data.value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
});

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const products = useInventoryStore((state) => state.products);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashSession, setCashSession] = useState<CashRegister | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState('');

  const initials = user
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    let cancelled = false;
    const loadCashSession = async (): Promise<void> => {
      if (!user) return;
      try {
        const resp = await getActiveCashRegister(user.id);
        if (!cancelled && resp.success) {
          setCashSession(resp.data);
        }
      } catch {
        // Silent fail - UI will handle null session
      }
    };
    void loadCashSession();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async (): Promise<void> => {
      try {
        const response = await getDashboardSummary();
        if (!cancelled && response.success) {
          setSummary(response.data);
        }
      } catch {
        // Silent fail - dashboard will show loading or empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadSummary();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const handleOpenCash = async (): Promise<void> => {
    if (!user || cashLoading) return;
    const amount = parseFloat(initialCashInput) || 0;
    if (amount <= 0) return;
    setCashLoading(true);
    try {
      const resp = await openCashRegister(user.id, amount);
      if (resp.success) {
        setCashSession(resp.data);
        setInitialCashInput('');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error opening cash register:', err);
    } finally {
      setCashLoading(false);
    }
  };

  const handleCloseCash = async (): Promise<void> => {
    if (!cashSession || cashLoading) return;
    setCashLoading(true);
    try {
      const resp = await closeCashRegister(cashSession.id, 0, 0);
      if (resp.success) {
        setCashSession(null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error closing cash register:', err);
    } finally {
      setCashLoading(false);
    }
  };

  const toggleCashSession = (): void => {
    if (cashSession) {
      handleCloseCash();
    } else {
      handleOpenCash();
    }
  };

  const todayTotal = summary?.today.totalMonto ?? 0;
  const todayCount = summary?.today.totalVendidos ?? 0;

  return (
    <div className="animate-fadeIn">
      {/* Welcome Header */}
      <div
        style={{
          marginBottom: '28px',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--gradient-primary)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60%',
            left: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left: Avatar + Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-xl)',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 800,
                flexShrink: 0,
                backdropFilter: 'blur(10px)',
              }}
            >
              {initials}
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-sm)',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 500,
                }}
              >
                Bienvenido
              </p>
              <h2
                style={{
                  margin: '2px 0 0',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {user?.fullName ?? ''}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Calendar size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-xs)',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                  }}
                >
                  {today}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link
              to="/sales"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '0 var(--space-5)',
                minHeight: '44px',
                borderRadius: 'var(--radius-lg)',
                background: '#fff',
                color: 'var(--brand-600)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ShoppingCart size={18} />
              {es.sales.posTitle}
            </Link>
            <Link
              to="/inventory"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '0 var(--space-5)',
                minHeight: '44px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Package size={18} />
              {es.inventory.title}
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="tc-grid-4" style={{ marginBottom: '28px' }}>
        <div className="tc-metric-card tc-metric-card--brand animate-slideUp">
          <div className="tc-metric-icon tc-metric-icon--brand">
            <TrendingUp size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.dashboard.todaySales}</p>
            <p className="tc-metric-value">{loading ? '...' : formatCurrency(todayTotal)}</p>
            <p className="tc-metric-sub">{todayCount} transacciones hoy</p>
          </div>
        </div>

        <div
          className="tc-metric-card tc-metric-card--danger animate-slideUp"
          style={{ animationDelay: '50ms' }}
        >
          <div className="tc-metric-icon tc-metric-icon--danger">
            <AlertTriangle size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.dashboard.activeAlerts}</p>
            <p className="tc-metric-value">0</p>
            <p className="tc-metric-sub">Sin alertas activas</p>
          </div>
        </div>

        <div
          className="animate-slideUp"
          style={{
            animationDelay: '100ms',
            background: '#fff',
            borderRadius: 'var(--radius-xl)',
            border: `1px solid var(--border-light)`,
            borderTop: cashSession ? '3px solid var(--success-500)' : '3px solid var(--brand-500)',
            padding: 'var(--space-5)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: cashSession ? '0' : 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-lg)',
                  background: cashSession ? 'var(--success-50)' : 'var(--brand-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: cashSession ? 'var(--success-600)' : 'var(--brand-600)',
                }}
              >
                {cashSession ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--gray-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Caja
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-xl)',
                    fontWeight: 800,
                    color: cashSession ? 'var(--success-600)' : 'var(--brand-600)',
                  }}
                >
                  {cashSession ? 'Abierta' : 'Cerrada'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleCashSession}
              disabled={
                cashLoading ||
                (!cashSession && (!initialCashInput || parseFloat(initialCashInput) <= 0))
              }
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                background: cashSession ? 'var(--success-500)' : 'var(--gray-200)',
                cursor: cashLoading ? 'not-allowed' : 'pointer',
                position: 'relative',
                padding: '3px',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transform: cashSession ? 'translateX(24px)' : 'translateX(0)',
                  transition: 'transform 0.3s ease',
                }}
              />
            </button>
          </div>
          {!cashSession && (
            <input
              type="number"
              placeholder="Monto inicial para abrir"
              value={initialCashInput}
              onChange={(e) => setInitialCashInput(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-2)',
              }}
            />
          )}
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-xs)',
              color: cashSession ? 'var(--success-600)' : 'var(--gray-400)',
            }}
          >
            {cashSession ? 'Sesión activa' : 'Sesión inactiva - Click para abrir'}
          </p>
        </div>

        <div
          className="tc-metric-card tc-metric-card--warning animate-slideUp"
          style={{ animationDelay: '150ms' }}
        >
          <div className="tc-metric-icon tc-metric-icon--warning">
            <Package size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.title}</p>
            <p className="tc-metric-value">{products.length}</p>
            <p className="tc-metric-sub">{products.filter((p) => p.isActive).length} activos</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-6)' }}>
        {/* Weekly Sales Bar Chart */}
        <div
          className="tc-section tc-chart-container animate-slideUp"
          style={{ animationDelay: '200ms' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}
          >
            <div>
              <h3
                className="tc-chart-title"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              >
                <BarChart3 size={20} style={{ color: 'var(--brand-500)' }} />
                Ventas Últimos 7 Días
              </h3>
              <p className="tc-chart-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
                Tendencia de ventas e ingresos de la semana
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '3px',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, #465fff, #7c3aed)',
                    display: 'inline-block',
                  }}
                />
                Ingresos
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={summary?.weeklyChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--gray-500)', fontWeight: 600 }}
                axisLine={{ stroke: 'var(--gray-200)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--gray-500)', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                dot={{ fill: '#465fff', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 3, stroke: '#fff', fill: '#465fff' }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#465fff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Categories Pie Chart */}
        <div
          className="tc-section tc-chart-container animate-slideUp"
          style={{ animationDelay: '250ms' }}
        >
          <div style={{ marginBottom: 'var(--space-1)' }}>
            <h3
              className="tc-chart-title"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <PieChart size={20} style={{ color: 'var(--brand-500)' }} />
              Categorías Más Vendidas
            </h3>
            <p className="tc-chart-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
              Distribución de ingresos por categoría
            </p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <RePieChart>
              <Pie
                data={summary?.topCategories ?? []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {(summary?.topCategories ?? []).map((_cat, index: number) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--gray-600)',
                    }}
                  >
                    {value}
                  </span>
                )}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div
        className="tc-section animate-slideUp"
        style={{ animationDelay: '300ms', marginTop: 'var(--space-6)' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
          }}
        >
          <div>
            <h3
              className="tc-section-title"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: '4px',
              }}
            >
              <List size={20} style={{ color: 'var(--brand-500)' }} />
              Últimas Ventas
            </h3>
            <p className="tc-section-subtitle" style={{ margin: 0 }}>
              Registro de las 10 transacciones más recientes
            </p>
          </div>
          <Link
            to="/sales/history"
            className="tc-btn tc-btn--secondary"
            style={{ fontSize: 'var(--text-sm)', padding: '0 var(--space-4)', minHeight: '40px' }}
          >
            <Clock size={16} />
            Ver Historial Completo
          </Link>
        </div>

        <div className="tc-table-wrap">
          <table className="tc-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Productos</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Medio de Pago</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-8)',
                      color: 'var(--gray-400)',
                    }}
                  >
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
                          width: '16px',
                          height: '16px',
                          border: '2px solid var(--gray-200)',
                          borderTop: '2px solid var(--brand-500)',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                      Cargando ventas...
                    </div>
                  </td>
                </tr>
              ) : (summary?.recentSales ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-8)',
                      color: 'var(--gray-400)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <ShoppingCart size={32} />
                      <span style={{ fontWeight: 600 }}>No hay ventas registradas</span>
                      <span style={{ fontSize: 'var(--text-xs)' }}>
                        Las ventas aparecerán aquí cuando se realicen
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                (summary?.recentSales ?? []).map((sale) => {
                  const customer = getCustomerInfo(sale);
                  return (
                    <tr key={sale.id} style={{ transition: 'background var(--transition-fast)' }}>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--brand-600)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          #{sale.saleNumber}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--gray-500)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          {formatDate(sale.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--brand-50)',
                              color: 'var(--brand-600)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {customer.name
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 'var(--text-sm)',
                              color: 'var(--gray-800)',
                            }}
                          >
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                          {customer.phone}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--gray-600)',
                            maxWidth: '200px',
                            display: 'inline-block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={getProductsSummary(sale)}
                        >
                          {getProductsSummary(sale)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 'var(--text-sm)',
                            color: 'var(--gray-900)',
                          }}
                        >
                          {formatCurrency(sale.total)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {sale.payments.map((payment) => (
                            <span
                              key={payment.id}
                              className="tc-badge"
                              style={{
                                background:
                                  payment.method === 'efectivo'
                                    ? 'var(--success-100)'
                                    : payment.method === 'nequi'
                                      ? '#e9d5ff'
                                      : payment.method === 'daviplata'
                                        ? '#fef0c7'
                                        : payment.method === 'tarjeta'
                                          ? 'var(--brand-100)'
                                          : payment.method === 'transferencia'
                                            ? '#cffafe'
                                            : 'var(--warning-100)',
                                color:
                                  payment.method === 'efectivo'
                                    ? 'var(--success-600)'
                                    : payment.method === 'nequi'
                                      ? '#9333ea'
                                      : payment.method === 'daviplata'
                                        ? 'var(--warning-600)'
                                        : payment.method === 'tarjeta'
                                          ? 'var(--brand-600)'
                                          : payment.method === 'transferencia'
                                            ? '#0891b2'
                                            : 'var(--warning-600)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                              }}
                            >
                              {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
