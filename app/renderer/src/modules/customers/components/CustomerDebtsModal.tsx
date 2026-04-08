import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import type { Customer, Debt } from '../../../shared/types/customers.types';
import { getCustomerDebts, payCustomerDebt } from '../../../shared/api/customers.api';
import { getActiveCashRegister } from '../../../shared/api/cash.api';
import { useAuth } from '../../../shared/context/AuthContext';
import { formatCurrency } from '../../../shared/utils/formatters';

interface CustomerDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerDebtsModal: React.FC<CustomerDebtsModalProps> = ({ isOpen, onClose, customer }) => {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCashSessionId, setActiveCashSessionId] = useState<number | null>(null);

  const [paymentMode, setPaymentMode] = useState<{ debtId: number, maxAmount: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDebts();
      loadCashSession();
    }
  }, [isOpen]);

  const loadCashSession = async () => {
    if (user) {
      const resp = await getActiveCashRegister(user.id);
      if (resp.success && resp.data) {
        setActiveCashSessionId(resp.data.id);
      }
    }
  };

  const loadDebts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await getCustomerDebts(customer.id);
      if (resp.success) {
        setDebts(resp.data);
      } else {
        setError(resp.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!paymentMode) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > paymentMode.maxAmount) {
      alert("El monto ingresado no es válido o supera el saldo.");
      return;
    }

    setIsPaying(true);
    try {
      const resp = await payCustomerDebt(paymentMode.debtId, amount, paymentMethod, activeCashSessionId || undefined);
      if (resp.success) {
        setPaymentMode(null);
        setPaymentAmount('');
        loadDebts();
      } else {
        alert("Error al pagar la deuda: " + resp.error?.message);
      }
    } catch (err: any) {
      alert("Error inesperado: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen) return null;

  const totalBalance = debts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  return (
    <div className="tc-modal-overlay animate-fadeIn">
      <div className="tc-modal animate-scaleIn" style={{ maxWidth: '750px', width: '100%' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600 shadow-sm border border-amber-100">
              <CreditCard size={26} />
            </div>
            <div>
              <h2 className="tc-modal-title">Gestión de Deudas y Fiados</h2>
              <p className="text-sm text-gray-500">{customer?.fullName} • Control de cartera pendiente</p>
            </div>
          </div>
          <button 
            className="tc-btn tc-btn--ghost min-h-0 p-2 text-gray-400 hover:text-gray-600" 
            onClick={onClose}
            disabled={isPaying}
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-200/50 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <AlertCircle size={120} />
            </div>
            <div className="relative z-10">
              <span className="text-amber-100 text-xs font-bold uppercase tracking-wider">Saldo Total Pendiente</span>
              <div className="text-3xl font-black mt-1 tabular-nums">{formatCurrency(totalBalance)}</div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block">Créditos Activos</span>
              <div className="text-2xl font-bold text-gray-800 tabular-nums">{debts.length}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="tc-notice tc-notice--error mb-6">
            {error}
          </div>
        )}

        <div className="max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="tc-spinner border-amber-500"></div>
              <p className="text-gray-500">Cargando estados de cuenta...</p>
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
              <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-medium">No se encontraron deudas pendientes para este cliente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((debt: any) => (
                <div key={debt.id} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  paymentMode?.debtId === debt.id ? 'border-amber-500 shadow-md ring-4 ring-amber-50' : 'border-gray-100 hover:border-amber-200'
                }`}>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Fecha de Inicio</p>
                          <p className="text-sm font-bold text-gray-700">{new Date(debt.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Pendiente</p>
                        <p className="text-lg font-black text-amber-600 tabular-nums">{formatCurrency(Number(debt.balance))}</p>
                      </div>
                    </div>

                    {paymentMode?.debtId === debt.id ? (
                      <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 mt-4 animate-fadeIn">
                        <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <DollarSign size={14} /> Registrar Abono de Capital
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="tc-field">
                            <label className="tc-label !text-amber-700">Monto del Abono</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={18} />
                              <input
                                type="number"
                                className="tc-input pl-10 !border-amber-200 focus:!border-amber-500 focus:!ring-amber-500/20"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                max={Number(debt.balance)}
                                min={1}
                                step="500"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="tc-field">
                            <label className="tc-label !text-amber-700">Medio de Pago</label>
                            <select 
                              className="tc-input !border-amber-200 focus:!border-amber-500" 
                              value={paymentMethod} 
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="efectivo">Efectivo 💵</option>
                              <option value="nequi">Nequi 💸</option>
                              <option value="daviplata">Daviplata 🔴</option>
                              <option value="tarjeta">Tarjeta 💳</option>
                              <option value="transferencia">Transferencia 🏦</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="tc-btn tc-btn--secondary flex-1" onClick={() => setPaymentMode(null)} disabled={isPaying}>
                            Cancelar
                          </button>
                          <button className="tc-btn tc-btn--primary flex-1 !bg-amber-600 !hover:bg-amber-700 shadow-lg shadow-amber-200" onClick={handlePay} disabled={isPaying || !paymentAmount}>
                            {isPaying ? 'Procesando...' : 'Confirmar Abono'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].slice(0, debt.payments?.length || 0).map((_, i) => (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-success-100 flex items-center justify-center text-[10px] text-success-600 font-bold">
                                {i+1}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 font-semibold italic">
                            {debt.payments?.length ? `${debt.payments.length} abonos realizados` : 'Sin abonos previos'}
                          </p>
                        </div>
                        <button 
                          className="tc-btn tc-btn--primary !bg-amber-500 hover:!bg-amber-600 min-h-0 py-2 px-4 shadow-sm"
                          onClick={() => {
                            setPaymentMode({ debtId: debt.id, maxAmount: Number(debt.balance) });
                            setPaymentAmount(debt.balance.toString());
                          }}
                        >
                          <DollarSign size={16} /> Abonar
                        </button>
                      </div>
                    )}

                    {debt.payments && debt.payments.length > 0 && !paymentMode && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Historial Reciente de Abonos</p>
                        <div className="flex flex-wrap gap-2">
                          {debt.payments.map((p: any) => (
                            <div key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-bold text-gray-600">
                              <span className="text-success-600">{formatCurrency(Number(p.amount))}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="text-gray-400 capitalize">{p.method}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="tc-modal-actions mt-8 border-t border-gray-50 pt-6">
          <button className="tc-btn tc-btn--secondary w-full md:w-auto" onClick={onClose}>
            Regresar al Listado
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtsModal;
