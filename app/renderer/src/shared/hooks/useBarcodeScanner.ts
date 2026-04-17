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
 * Este hook acumula keystrokes globales y, si la secuencia cumple los umbrales de velocidad,
 * dispara `onScan` con el código detectado, previniendo submits erróneos de formularios.
 */
export function useBarcodeScanner({
  onScan,
  maxKeyDelay = 35, // 35ms es un buen umbral para distinguir de escritura humana
  minLength = 4,
  enabled = true,
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef('');
  const lastTimeRef = useRef<number>(0);
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
      // Ignorar teclas modificadoras u otras teclas especiales excepto Enter
      if (event.key.length > 1 && event.key !== 'Enter') return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Si ha pasado mucho tiempo desde la última tecla, reiniciamos el buffer
      // Asumimos que es el inicio de una nueva escritura
      if (elapsed > maxKeyDelay) {
        bufferRef.current = '';
      }

      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          // Es un código de barras completado! Interceptar el Enter para no disparar inputs/forms
          event.preventDefault();
          event.stopPropagation();
          flush();
        } else {
          bufferRef.current = '';
        }
        return;
      }

      bufferRef.current += event.key;

      // Si estamos recibiendo caracteres a velocidad de escáner en fase de captura, 
      // prevenimos que se inyecten "basura" o abran cosas extras.
      // El primer caracter (elapsed > maxKeyDelay) podría pasar al activeElement, 
      // pero a partir del segundo, ya sabemos que es rápido y cortamos la propagación.
      if (bufferRef.current.length > 1 && elapsed <= maxKeyDelay) {
        // En algunos casos querríamos que el código SÍ vaya al input si el usuario 
        // explícitamente se posicionó ahí. Si deseamos bloquearlo:
        const target = event.target as HTMLElement | null;
        if (target && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
           // Solo evitamos propagación si no estamos intencionalmente en un input
           event.preventDefault();
           event.stopPropagation();
        }
        // Nota: Aún si estamos en un input, capturaremos el Enter y evitaremos el Form Submit arriba!
      }
    };

    // Usar la fase de captura (true) para procesar el evento antes que los componentes hijos
    window.addEventListener('keydown', handleKeyDown, true);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxKeyDelay, flush, minLength]);
}
