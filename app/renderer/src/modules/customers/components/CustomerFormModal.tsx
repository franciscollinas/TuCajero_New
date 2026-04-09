import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Hash } from 'lucide-react';
import type { Customer } from '../../../shared/types/customers.types';
import { createCustomer, updateCustomer } from '../../../shared/api/customers.api';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onSaved: () => void;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, customer, onSaved }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    email: '',
    phone: '',
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.fullName || '',
        document: customer.document || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    } else {
      setFormData({
        fullName: '',
        document: '',
        email: '',
        phone: '',
        address: '',
      });
    }
  }, [customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName) {
      setError('El nombre es obligatorio');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (customer) {
        await updateCustomer(customer.id, formData);
      } else {
        await createCustomer(formData);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tc-modal-overlay animate-fadeIn">
      <div className="tc-modal animate-scaleIn" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
              <User size={26} />
            </div>
            <div>
              <h2 className="tc-modal-title">
                {customer ? 'Editar Perfil de Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <p className="text-sm text-gray-500">Completa la información para el directorio</p>
            </div>
          </div>
          <button
            className="tc-btn tc-btn--ghost min-h-0 p-2 text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="tc-notice tc-notice--error mb-6 flex items-center gap-2">
            <X className="shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form id="customerForm" onSubmit={handleSubmit} className="space-y-5">
          <div className="tc-field">
            <label className="tc-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <User size={15} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
              <span>Nombre Completo <span style={{ color: 'var(--danger-500)' }}>*</span></span>
            </label>
            <input
              type="text"
              className="tc-input"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ej. Juan Pérez"
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="tc-field">
              <label className="tc-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
                <Hash size={15} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                <span>Documento / NIT</span>
              </label>
              <input
                type="text"
                className="tc-input"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="Documento"
              />
            </div>
            <div className="tc-field">
              <label className="tc-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
                <Phone size={15} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                <span>Teléfono</span>
              </label>
              <input
                type="text"
                className="tc-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Teléfono"
              />
            </div>
          </div>

          <div className="tc-field">
            <label className="tc-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <Mail size={15} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              className="tc-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <MapPin size={15} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
              <span>Dirección / Ubicación</span>
            </label>
            <input
              type="text"
              className="tc-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Dirección completa"
            />
          </div>
        </form>

        <div className="tc-modal-actions mt-8 pt-6 border-t border-gray-100">
          <button
            className="tc-btn tc-btn--secondary w-full md:w-auto"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="tc-btn tc-btn--primary w-full md:w-auto shadow-lg shadow-brand-200/50"
            type="submit"
            form="customerForm"
            disabled={isLoading}
          >
            <Save size={18} />
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="tc-spinner border-white border-t-transparent w-4 h-4"></span>
                Procesando...
              </span>
            ) : (
              <>{customer ? 'Actualizar Cliente' : 'Registrar Cliente'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerFormModal;
