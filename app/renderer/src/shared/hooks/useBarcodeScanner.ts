import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  /** Callback fired when a barcode is detected */
  onScan: (code: string) => void;
  /** Maximum time (ms) between keystrokes to consider them part of a scan */
  maxKeyDelay?: number;
  /** Minimum number of characters to consider it a scan (not typing) */
  minLength?: number;
  /** Whether the scanner is active */
  enabled?: boolean;
}

/**
 * Hook que detecta escáneres de código de barras que actúan como teclado HID.
 *
 * Los escáneres HID envían caracteres rápidamente y terminan con Enter.
 * Este hook acumula keystrokes globales y, si la secuencia cumple los umbrales,
 * dispara `onScan` con el código detectado.
 */
export function useBarcodeScanner({
  onScan,
  maxKeyDelay = 60,
  minLength = 4,
  enabled = true,
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  // Mantener ref actualizado sin re-registrar el listener
  onScanRef.current = onScan;

  const flush = useCallback((): void => {
    const code = bufferRef.current.trim();
    bufferRef.current = '';

    if (code.length >= minLength) {
      onScanRef.current(code);
    }
  }, [minLength]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ignorar si el foco está en un input/textarea (usuario escribiendo manualmente)
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Enter') {
        // Final del escaneo
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        flush();
        return;
      }

      // Ignorar teclas modificadoras
      if (event.key.length > 1) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      bufferRef.current += event.key;

      // Reiniciar timer — si pasa el delay, descartar buffer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
        timerRef.current = null;
      }, maxKeyDelay);
    };

    window.addEventListener('keydown', handleKeyDown);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, maxKeyDelay, flush]);
}
