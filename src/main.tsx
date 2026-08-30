import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party browser extension errors (e.g., MetaMask, Web3 provider injections)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    if (
      typeof reason === 'string' &&
      (reason.includes('MetaMask') || reason.includes('ethereum') || reason.includes('web3') || reason.includes('Failed to connect to MetaMask'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (
      typeof message === 'string' &&
      (message.includes('MetaMask') || message.includes('ethereum') || message.includes('web3') || message.includes('Failed to connect to MetaMask'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
