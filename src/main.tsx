import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party browser extension injection noise (MetaMask, Coinbase Wallet, etc.)
if (typeof window !== 'undefined') {
  const isExtensionNoise = (err: any) => {
    if (!err) return false;
    const msg = typeof err === 'string'
      ? err
      : (err.message || (err.reason && err.reason.message) || (err.reason && typeof err.reason === 'string' ? err.reason : '') || String(err));
    return /Failed to connect to MetaMask|MetaMask|chrome-extension:\/\/|moz-extension:\/\/|evmProvider|ethereum/i.test(msg);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionNoise(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isExtensionNoise(event.message || event.error)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

