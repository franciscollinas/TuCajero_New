import { useState, useEffect, useRef } from 'react';

import { getCategories } from '../../shared/api/inventory.api';
import { es } from '../../shared/i18n';
import type { InventoryCategory } from '../../shared/types/inventory.types';
import { useConfig } from '../../shared/context/ConfigContext';

interface AddProductModalProps {
  open: boolean;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    barcode: string;
    name: string;
    categoryId: number;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    criticalStock: number;
    taxRate: number;
    suggestedPurchaseQty: number | null;
    expiryDate: string | null;
    location: string;
    unitType: string;
    conversionFactor: number;
  }) => Promise<void>;
}

export function AddProductModal({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: AddProductModalProps): JSX.Element | null {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const { config } = useConfig();
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayMouseDown = useRef(false);

  const handleOverlayMouseDown = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      overlayMouseDown.current = true;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (overlayMouseDown.current && e.target === e.currentTarget) {
      overlayMouseDown.current = false;
      onClose();
    } else {
      overlayMouseDown.current = false;
    }
  };

  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    categoryId: 1,
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    criticalStock: 2,
    taxRate: 0,
    suggestedPurchaseQty: null as number | null,
    expiryDate: '' as string | null,
    location: '',
    unitType: 'UNIT',
    conversionFactor: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      void getCategories().then((res) => {
        if (res.success) setCategories(res.data);
      });
      setErrors({});
      setFormData({
        code: '',
        barcode: '',
        name: '',
        categoryId: 0,
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 0,
        criticalStock: 0,
        taxRate: config?.ivaRate || 19,
        suggestedPurchaseQty: null,
        expiryDate: '',
        location: '',
        unitType: 'UND',
        conversionFactor: 1,
      });
    }
  }, [open, config]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'El código es obligatorio';
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
    if (formData.cost < 0) newErrors.cost = 'El costo no puede ser negativo';
    if (formData.stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (): void => {
    if (!validate()) {
      return;
    }
    void onSubmit({
      ...formData,
      expiryDate: formData.expiryDate || null,
      suggestedPurchaseQty: formData.suggestedPurchaseQty || null,
    });
  };

  const fieldError = (field: string): string | undefined => errors[field];

  return (
    <div
      className="tc-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="tc-modal animate-scaleIn"
        style={{ width: 'min(640px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-5)',
          }}
        >
          <h2
            className="tc-modal-title"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-600)"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {es.inventory.addProduct}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="tc-btn tc-btn--ghost"
            style={{ width: 36, height: 36, padding: 0 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div className="tc-field" style={{ gridColumn: '1 / -1' }}>
            <label className="tc-label">{es.inventory.code} *</label>
            <input
              className="tc-input"
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              placeholder="Ej: AMX500"
              style={fieldError('code') ? { borderColor: 'var(--danger-500)' } : undefined}
            />
            {fieldError('code') && (
              <span style={{ color: 'var(--danger-600)', fontSize: 'var(--text-xs)' }}>
                {fieldError('code')}
              </span>
            )}
          </div>

          <div className="tc-field">
            <label className="tc-label">Código de Barras</label>
            <input
              className="tc-input"
              value={formData.barcode}
              onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
              placeholder="Ej: 7701000000001"
            />
          </div>

          <div className="tc-field" style={{ gridColumn: '1 / -1' }}>
            <label className="tc-label">{es.inventory.name} *</label>
            <input
              className="tc-input"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Amoxicilina 500 mg"
              style={fieldError('name') ? { borderColor: 'var(--danger-500)' } : undefined}
            />
            {fieldError('name') && (
              <span style={{ color: 'var(--danger-600)', fontSize: 'var(--text-xs)' }}>
                {fieldError('name')}
              </span>
            )}
          </div>

          <div className="tc-field">
            <label className="tc-label">{es.inventory.category}</label>
            <select
              className="tc-select"
              value={formData.categoryId}
              onChange={(e) => setFormData((p) => ({ ...p, categoryId: Number(e.target.value) }))}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="tc-field">
            <label className="tc-label">Ubicación</label>
            <input
              className="tc-input"
              value={formData.location}
              onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
              placeholder="Ej: Estante A-1"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">{es.inventory.price} *</label>
            <input
              className="tc-input"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData((p) => ({ ...p, price: Number(e.target.value) }))}
              placeholder="0"
              style={fieldError('price') ? { borderColor: 'var(--danger-500)' } : undefined}
            />
            {fieldError('price') && (
              <span style={{ color: 'var(--danger-600)', fontSize: 'var(--text-xs)' }}>
                {fieldError('price')}
              </span>
            )}
          </div>

          <div className="tc-field">
            <label className="tc-label">Costo</label>
            <input
              className="tc-input"
              type="number"
              value={formData.cost || ''}
              onChange={(e) => setFormData((p) => ({ ...p, cost: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">{es.inventory.stock}</label>
            <input
              className="tc-input"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData((p) => ({ ...p, stock: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">{es.inventory.minStock}</label>
            <input
              className="tc-input"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData((p) => ({ ...p, minStock: Number(e.target.value) }))}
              placeholder="5"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">Stock Crítico</label>
            <input
              className="tc-input"
              type="number"
              value={formData.criticalStock}
              onChange={(e) =>
                setFormData((p) => ({ ...p, criticalStock: Number(e.target.value) }))
              }
              placeholder="2"
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">IVA (%)</label>
            <select
              className="tc-select"
              value={formData.taxRate}
              onChange={(e) => setFormData((p) => ({ ...p, taxRate: Number(e.target.value) }))}
            >
              <option value={0}>0% (Exento)</option>
              {config?.ivaRate && config.ivaRate !== 0.05 && config.ivaRate !== 0.19 && (
                <option value={config.ivaRate}>
                  {(config.ivaRate * 100).toFixed(0)}% (Global)
                </option>
              )}
              <option value={0.05}>5%</option>
              <option value={0.19}>19%</option>
            </select>
          </div>

          <div className="tc-field">
            <label className="tc-label">Fecha de Vencimiento</label>
            <input
              className="tc-input"
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value || null }))}
            />
          </div>

          <div className="tc-field">
            <label className="tc-label">Tipo de Unidad</label>
            <select
              className="tc-select"
              value={formData.unitType}
              onChange={(e) => setFormData((p) => ({ ...p, unitType: e.target.value }))}
            >
              <option value="UNIT">Unidad</option>
              <option value="PACKAGE">Paquete</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--danger-50)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--danger-200)',
              color: 'var(--danger-700)',
              fontSize: 'var(--text-sm)',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          className="tc-modal-actions"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--gray-100)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="tc-btn tc-btn--secondary"
            disabled={loading}
          >
            {es.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="tc-btn tc-btn--primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  className="animate-pulse"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {es.inventory.addProduct}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
