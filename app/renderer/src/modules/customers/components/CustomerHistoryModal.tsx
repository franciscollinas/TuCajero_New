import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import type { Customer } from '../../../shared/types/customers.types';
import { getCustomerHistory } from '../../../shared/api/customers.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

interface SerializedHistorySale {
  id: number;
  saleNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discount: number;
    total: number;
    productName?: string;
    product?: { name: string };
  }>;
  payments: Array<{
    id: number;
    method: string;
    amount: number;
  }>;
  debt?: { balance: number; amount: number; status: string } | null;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [sales, setSales] = useState<SerializedHistorySale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadHistory = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await getCustomerHistory(customer.id);
      if (resp.success) {
        setSales(resp.data);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tc-modal-overlay animate-fadeIn">
      <div
        className="tc-modal animate-scaleIn"
        style={{
          maxWidth: '900px',
          width: '100%',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
              <FileText size={26} />
            </div>
            <div>
              <h2 className="tc-modal-title">Historial de Compras</h2>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{customer?.fullName}</span> • Registro
                cronológico de consumos
              </p>
            </div>
          </div>
          <button
            className="tc-btn tc-btn--ghost min-h-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {error && (
            <div className="tc-notice tc-notice--error mb-6 flex items-center gap-2">
              <X className="shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="tc-spinner w-10 h-10 border-4"></div>
              <p className="text-gray-500 animate-pulse font-medium">
                Sincronizando transacciones...
              </p>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200">
                <Package size={40} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Sin historial registrado</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                Este cliente aún no ha realizado compras en el sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-50 p-2.5 rounded-lg group-hover:bg-brand-50 transition-colors">
                        <Calendar size={20} className="text-gray-400 group-hover:text-brand-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Fecha y Hora
                        </div>
                        <div className="text-sm font-semibold text-gray-700">
                          {new Date(sale.createdAt).toLocaleString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="h-10 w-px bg-gray-100 mx-1"></div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Identificador
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700">
                          #{sale.saleNumber || sale.id.toString().slice(-8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Monto Total
                      </div>
                      <div className="text-xl font-bold text-success-600 tracking-tight">
                        {formatCurrency(Number(sale.total))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Package size={14} /> Detalle de Artículos
                      </h4>
                      <div className="space-y-2 bg-gray-50/50 rounded-xl p-3 border border-gray-50">
                        {sale.items.map((item, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">
                              <span className="text-brand-600 font-bold mr-1">
                                {item.quantity}x
                              </span>{' '}
                              {item.productName || item.product?.name}
                            </span>
                            <span className="text-gray-900 font-bold tabular-nums">
                              {formatCurrency(Number(item.subtotal))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {sale.payments && sale.payments.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <DollarSign size={14} /> Distribución de Pago
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {sale.payments.map((p) => (
                              <div
                                key={p.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                                  p.method === 'credito'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}
                              >
                                {p.method.charAt(0).toUpperCase() + p.method.slice(1)}:{' '}
                                {formatCurrency(Number(p.amount))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sale.debt && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                          <DollarSign className="text-amber-500 shrink-0 mt-0.5" size={18} />
                          <div>
                            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                              Saldo Pendiente
                            </div>
                            <div className="text-sm text-amber-600 font-medium leading-tight">
                              Se generó un crédito por {formatCurrency(Number(sale.debt.amount))}.
                              Saldo actual:{' '}
                              <span className="font-bold">
                                {formatCurrency(Number(sale.debt.balance))}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tc-modal-actions mt-8 pt-6 border-t border-gray-100">
          <button className="tc-btn tc-btn--secondary w-full md:w-auto" onClick={onClose}>
            Finalizar Revisión
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
