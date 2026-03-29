import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StorageModeProvider } from './contexts/StorageModeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StorageModeProvider>
      <App />
    </StorageModeProvider>
  </StrictMode>,
);
