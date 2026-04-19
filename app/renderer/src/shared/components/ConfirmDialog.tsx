import { memo } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog = memo(function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps): JSX.Element | null {
  if (!open) return null;

  const getVariantStyles = (): { icon: JSX.Element; buttonBg: string; iconBg: string } => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle size={24} style={{ color: '#f04438' }} />,
          buttonBg: '#f04438',
          iconBg: '#fee4e2',
        };
      case 'info':
        return {
          icon: <HelpCircle size={24} style={{ color: '#2e90fa' }} />,
          buttonBg: '#2e90fa',
          iconBg: '#eff8ff',
        };
      default:
        return {
          icon: <HelpCircle size={24} style={{ color: '#f79009' }} />,
          buttonBg: '#f79009',
          iconBg: '#fffaeb',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 400,
          width: '90%',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div style={{ padding: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: styles.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {styles.icon}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                }}
              >
                {title}
              </h3>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-md)',
              color: 'var(--gray-600)',
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            background: 'var(--gray-50)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          <button
            onClick={onCancel}
            className="tc-btn"
            style={{
              padding: '10px 18px',
              border: '1px solid var(--gray-300)',
              background: '#fff',
              color: 'var(--gray-700)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: styles.buttonBg,
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});
