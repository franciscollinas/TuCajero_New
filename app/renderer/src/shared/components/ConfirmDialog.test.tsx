import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('no debe renderizar nada si open es false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Mi Título"
        message="Mi mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByText('Mi Título')).not.toBeInTheDocument();
  });

  it('debe renderizar título y mensaje cuando open es true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar Acción"
        message="¿Estás seguro de continuar?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('Confirmar Acción')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro de continuar?')).toBeInTheDocument();
  });

  it('debe ejecutar onCancel al presionar Cancelar', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Acción"
        message="Mensaje"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />,
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('debe ejecutar onConfirm y onCancel al presionar Confirmar', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Acción"
        message="Mensaje"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).toHaveBeenCalledTimes(1); // Se llama para cerrar el modal
  });
});
