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
    <div className="tc-modal-overlay animate-fadeIn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="tc-modal animate-scaleIn" style={{ maxWidth: '580px', width: '100%', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-xl)', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--brand-100)' }}>
              <User size={24} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--gray-900)', margin: 0, lineHeight: 1.2 }}>
                {customer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: 0, fontWeight: 500 }}>
                Completa la información para el directorio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', background: 'transparent', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', transition: 'all var(--transition-fast)', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.color = 'var(--gray-600)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gray-400)'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="tc-notice tc-notice--error" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <X size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form id="customerForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          {/* Nombre Completo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
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

          {/* Documento y Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
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

          {/* Correo Electrónico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
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

          {/* Dirección */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
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

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--gray-100)' }}>
          <button
            className="tc-btn tc-btn--secondary"
            onClick={onClose}
            type="button"
            style={{ fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            className="tc-btn tc-btn--primary"
            type="submit"
            form="customerForm"
            disabled={isLoading}
            style={{ fontWeight: 700, boxShadow: '0 2px 8px rgba(54, 65, 245, 0.3)' }}
          >
            <Save size={18} />
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
