import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tailadmin.css';
import App from './App';

const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
