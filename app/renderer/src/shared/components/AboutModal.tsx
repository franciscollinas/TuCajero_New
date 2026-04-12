import { useState, memo } from 'react';
import { X, Info, Award, Github, Mail } from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutModal = memo(function AboutModal({
  open,
  onClose,
}: AboutModalProps): JSX.Element | null {
  if (!open) return null;

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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 480,
          width: '90%',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Header gradient */}
        <div
          style={{
            background: 'var(--gradient-primary)',
            padding: 'var(--space-8) var(--space-6) var(--space-6)',
            textAlign: 'center',
            position: 'relative',
            color: '#fff',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            <X size={16} />
          </button>

          {/* Logo / Isotipo */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(255,255,255,0.15)',
              margin: '0 auto var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.25)',
            }}
          >
            <img
              src="/isotipo.png"
              alt="TuCajero"
              style={{ width: 60, height: 60, objectFit: 'contain' }}
            />
          </div>

          <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800 }}>TuCajero</h2>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', opacity: 0.85 }}>
            Sistema Punto de Venta para Pequeños Negocios
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', opacity: 0.7 }}>
            Versión 1.0.0
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-6)' }}>
          {/* Signature */}
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
              border: '1px solid var(--gray-200)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Award size={16} style={{ color: 'var(--brand-500)' }} />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--gray-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Diseñado y Desarrollado por
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: 'var(--gray-800)',
              }}
            >
              Ing. Francisco Llinas Pisciotti
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
              © 2026 — Todos los derechos reservados
            </p>
          </div>

          {/* Info items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-600)',
              }}
            >
              <Info size={16} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
              <span>Electron + React + TypeScript</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-600)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-400)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span>Prisma + SQLite — Base de datos local</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-600)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-400)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Sistema de licencia y respaldo incluido</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--gray-100)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
            Sistema diseñado por el Ingeniero Francisco Llinas Pisciotti — 2026
          </p>
        </div>
      </div>
    </div>
  );
});
