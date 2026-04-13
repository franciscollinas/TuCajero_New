import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  User,
  FileText,
  CreditCard,
  Edit2,
  Users,
  Activity,
  Phone,
  MapPin,
} from 'lucide-react';
import { searchCustomers } from '../../shared/api/customers.api';
import type { Customer } from '../../shared/types/customers.types';
import CustomerFormModal from './components/CustomerFormModal';
import CustomerHistoryModal from './components/CustomerHistoryModal';
import CustomerDebtsModal from './components/CustomerDebtsModal';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);

  const loadCustomers = async (query: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await searchCustomers(query);
      if (response.success) {
        setCustomers(response.data);
      } else {
        setError(response.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadCustomers(searchQuery);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleOpenForm = (customer?: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleFormSaved = () => {
    loadCustomers(searchQuery);
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
  };

  const handleOpenDebts = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDebtsOpen(true);
  };

  // Calculate total outstanding debt across all customers
  const totalOutstandingDebt = customers.reduce((sum, c) => {
    if (!c.debts) return sum;
    const customerDebt = c.debts.reduce((dSum, d) => dSum + Number(d.balance), 0);
    return sum + customerDebt;
  }, 0);
  const activeDebtors = customers.filter(
    (c) => c.debts && c.debts.some((d) => d.status !== 'PAID'),
  ).length;

  return (
    <div
      className="animate-fadeIn"
      style={{ padding: 'var(--space-6)', maxWidth: '1536px', margin: '0 auto' }}
    >
      {/* Page Header */}
      <div
        style={{
          marginBottom: 'var(--space-6)',
          animation: 'slideDown 0.4s ease',
          background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-500) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5) var(--space-6)',
          boxShadow: '0 4px 12px rgba(54, 65, 245, 0.2)',
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
                fontSize: 'var(--text-xl)',
                fontWeight: 800,
              }}
            >
              <Users size={28} />
              Directorio de Clientes
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
              }}
            >
              Gestiona tu base de datos y estados de cuenta
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.6)',
                  pointerEvents: 'none',
                }}
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '40px',
                  minHeight: '44px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 'var(--radius-lg)',
                  color: '#fff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  width: '280px',
                  outline: 'none',
                }}
              />
              <style>{`input::placeholder { color: rgba(255,255,255,0.7) !important; }`}</style>
            </div>
            <button
              onClick={() => handleOpenForm()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                color: 'var(--brand-600)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <Plus size={18} />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
          animation: 'slideUp 0.4s ease',
        }}
      >
        <div className="tc-metric-card tc-metric-card--brand" style={{ padding: 'var(--space-5)' }}>
          <div
            className="tc-metric-icon tc-metric-icon--brand"
            style={{ width: '52px', height: '52px' }}
          >
            <Users size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">Clientes Registrados</p>
            <p className="tc-metric-value" style={{ fontSize: 'var(--text-3xl)' }}>
              {customers.length}
            </p>
          </div>
        </div>

        <div
          className="tc-metric-card tc-metric-card--warning"
          style={{ padding: 'var(--space-5)' }}
        >
          <div
            className="tc-metric-icon tc-metric-icon--warning"
            style={{ width: '52px', height: '52px' }}
          >
            <CreditCard size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">Cuentas por Cobrar</p>
            <p className="tc-metric-value" style={{ fontSize: 'var(--text-3xl)' }}>
              {formatCurrency(totalOutstandingDebt)}
            </p>
            <p className="tc-metric-sub">
              {activeDebtors > 0
                ? `${activeDebtors} cliente${activeDebtors !== 1 ? 's' : ''} con deuda`
                : 'Sin deudas pendientes'}
            </p>
          </div>
        </div>

        <div
          className="tc-metric-card tc-metric-card--success"
          style={{ padding: 'var(--space-5)' }}
        >
          <div
            className="tc-metric-icon tc-metric-icon--success"
            style={{ width: '52px', height: '52px' }}
          >
            <Activity size={24} />
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">Actividad Reciente</p>
            <p className="tc-metric-value" style={{ fontSize: 'var(--text-3xl)' }}>
              Alta
            </p>
            <p className="tc-metric-sub">Directorio activo y actualizado</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        className="tc-section animate-slideUp"
        style={{ padding: 0, overflow: 'hidden', animationDelay: '0.1s' }}
      >
        {error ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <div className="tc-notice tc-notice--error">
              <p>
                <strong>Error al cargar datos:</strong> {error}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-16)',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid var(--gray-100)',
                borderTop: '4px solid var(--brand-500)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p
              style={{
                color: 'var(--gray-400)',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Sincronizando directorio...
            </p>
          </div>
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
                  <th>Cliente</th>
                  <th>Información de Contacto</th>
                  <th style={{ textAlign: 'right', paddingRight: 'var(--space-6)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ transition: 'background var(--transition-fast)' }}>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 800,
                          background: 'var(--gray-100)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--gray-500)',
                        }}
                      >
                        #{c.id.toString().padStart(4, '0')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--brand-50)',
                            color: 'var(--brand-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 'var(--text-base)',
                            border: '2px solid var(--brand-100)',
                          }}
                        >
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            style={{
                              fontWeight: 700,
                              color: 'var(--gray-800)',
                              fontSize: 'var(--text-sm)',
                              lineHeight: 1.3,
                            }}
                          >
                            {c.fullName}
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--gray-400)',
                              fontWeight: 600,
                            }}
                          >
                            Doc: {c.document || 'No registrado'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            color: 'var(--gray-700)',
                          }}
                        >
                          <Phone size={12} style={{ color: 'var(--success-500)' }} />
                          {c.phone || 'Sin teléfono'}
                        </span>
                        {c.address && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--gray-400)',
                              fontWeight: 500,
                            }}
                          >
                            <MapPin size={12} />
                            {c.address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 'var(--space-6)' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <button
                          onClick={() => handleOpenForm(c)}
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-lg)',
                            background: '#fff',
                            border: '1px solid var(--gray-200)',
                            color: 'var(--gray-500)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                          title="Editar"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--brand-600)';
                            e.currentTarget.style.borderColor = 'var(--brand-200)';
                            e.currentTarget.style.background = 'var(--brand-50)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--gray-500)';
                            e.currentTarget.style.borderColor = 'var(--gray-200)';
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenHistory(c)}
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-lg)',
                            background: '#fff',
                            border: '1px solid var(--gray-200)',
                            color: 'var(--gray-500)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                          title="Historial"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#7c3aed';
                            e.currentTarget.style.borderColor = '#ddd6fe';
                            e.currentTarget.style.background = '#faf5ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--gray-500)';
                            e.currentTarget.style.borderColor = 'var(--gray-200)';
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDebts(c)}
                          style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-lg)',
                            background: '#fff',
                            border: '1px solid var(--gray-200)',
                            color: 'var(--gray-500)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                          title="Deudas"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--warning-600)';
                            e.currentTarget.style.borderColor = 'var(--warning-200)';
                            e.currentTarget.style.background = 'var(--warning-50)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--gray-500)';
                            e.currentTarget.style.borderColor = 'var(--gray-200)';
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <CreditCard size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 'var(--space-16)', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 'var(--space-4)',
                        }}
                      >
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: 'var(--radius-3xl)',
                            background: 'var(--gray-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <User size={40} style={{ color: 'var(--gray-300)' }} />
                        </div>
                        <div>
                          <p
                            style={{
                              fontWeight: 800,
                              fontSize: 'var(--text-lg)',
                              color: 'var(--gray-400)',
                            }}
                          >
                            Sin resultados
                          </p>
                          <p
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: 'var(--gray-400)',
                              marginTop: '4px',
                            }}
                          >
                            No encontramos ningún cliente que coincida con tu búsqueda.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenForm()}
                          className="tc-btn tc-btn--primary"
                          style={{ marginTop: 'var(--space-2)', fontWeight: 600 }}
                        >
                          <Plus size={16} />
                          Registrar primer cliente
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <CustomerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          customer={selectedCustomer}
          onSaved={handleFormSaved}
        />
      )}

      {isHistoryOpen && selectedCustomer && (
        <CustomerHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          customer={selectedCustomer}
        />
      )}

      {isDebtsOpen && selectedCustomer && (
        <CustomerDebtsModal
          isOpen={isDebtsOpen}
          onClose={() => setIsDebtsOpen(false)}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default CustomersPage;
