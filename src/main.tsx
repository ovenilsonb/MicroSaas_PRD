import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StorageModeProvider } from './contexts/StorageModeContext';
import { runStorageMigrations } from './lib/storageVersion';

// Run storage migrations before app boot to migrate any legacy data
runStorageMigrations();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StorageModeProvider>
      <App />
    </StorageModeProvider>
  </StrictMode>,
);
