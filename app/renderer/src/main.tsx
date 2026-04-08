import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tailadmin.css';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Elemento #root no encontrado en el DOM');
} else {
  try {
    const root = createRoot(rootElement);

    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('❌ Error fatal al montar la aplicación:', error);
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; color: #dc2626;">
        <h1>Error al cargar la aplicación</h1>
        <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow: auto;">
          ${error instanceof Error ? error.message : String(error)}
        </pre>
        <p>Revisa la consola del navegador (F12) para más detalles.</p>
      </div>
    `;
  }
}
