import React, { useState, useEffect } from 'react';
import { Plus, Search, User, FileText, CreditCard, Edit2, Users, Activity } from 'lucide-react';
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
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
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

  const stats = [
    { label: 'Total Clientes', value: customers.length, icon: User, color: 'brand' },
    { 
      label: 'Deudores Activos', 
      value: customers.filter(c => true).length, // Mock filter or just count for now
      icon: CreditCard, 
      color: 'amber' 
    },
    { label: 'Nuevos (Mes)', value: 0, icon: Plus, color: 'emerald' }
  ];

  return (
    <div className="tc-fade-in p-6">
      {/* Header section with standardized breadcrumbs and primary actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-slideUp">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-500">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            Administración / Directorio
          </div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Directorio de Clientes</h1>
          <p className="text-sm text-gray-400 font-medium">Gestiona tu base de datos y estados de cuenta premium</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" 
              size={18} 
            />
            <input
              type="text"
              className="tc-input pl-10 w-full md:w-72 !bg-gray-50/50 border-gray-100 hover:border-brand-200 transition-all"
              placeholder="Buscar por nombre o documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className="tc-btn tc-btn--primary shadow-lg shadow-brand-500/20 active:scale-95 transition-transform" 
            onClick={() => handleOpenForm()}
          >
            <Plus size={20} />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
        <div className="tc-card p-5 border-l-4 border-brand-500 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clientes Registrados</p>
            <p className="text-3xl font-black text-gray-800">{customers.length}</p>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Users size={24} />
          </div>
        </div>
        
        <div className="tc-card p-5 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cuentas por Cobrar</p>
            <p className="text-3xl font-black text-gray-800">Fiados</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="tc-card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Actividad Reciente</p>
            <p className="text-3xl font-black text-gray-800">Alta</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="tc-section animate-slideUp overflow-hidden !p-0">
        {error ? (
          <div className="p-8">
            <div className="tc-notice tc-notice--error">
              <p><strong>Error al cargar datos:</strong> {error}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-brand-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold tracking-tight uppercase text-[10px]">Sincronizando directorio...</p>
          </div>
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th className="w-20 text-center">ID</th>
                  <th>Cliente</th>
                  <th>Información de Contacto</th>
                  <th className="text-right px-8">Acciones de Gestión</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="text-center">
                      <span className="font-mono text-[10px] font-black bg-gray-100 px-2 py-1 rounded-md text-gray-500">
                        #{c.id.toString().padStart(4, '0')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-sm border border-brand-100 shadow-sm group-hover:scale-110 transition-transform">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 leading-tight">{c.fullName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            Doc: {c.document || 'No registrado'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {c.phone || 'Sin teléfono'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                          {c.address || 'Sin dirección registrada'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-8">
                      <div className="flex justify-end gap-2">
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-md transition-all active:scale-95"
                          onClick={() => handleOpenForm(c)}
                          title="Editar perfil"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all active:scale-95"
                          onClick={() => handleOpenHistory(c)}
                          title="Historial de compras"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:shadow-md transition-all active:scale-95"
                          onClick={() => handleOpenDebts(c)}
                          title="Cuentas por cobrar (Fiados)"
                        >
                          <CreditCard size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4 text-gray-300">
                        <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-dashed border-gray-100 flex items-center justify-center">
                          <User size={40} />
                        </div>
                        <div className="max-w-xs">
                          <p className="text-lg font-black text-gray-400">Sin resultados</p>
                          <p className="text-xs font-medium text-gray-400">No encontramos ningún cliente que coincida con tu búsqueda.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals are kept with their internal premium styling logic */}
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

export default CustomersPage;
