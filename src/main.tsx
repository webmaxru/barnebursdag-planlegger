import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAnalytics, track } from './lib/analytics';
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Cookieless analytics — see src/lib/analytics.ts (no consent banner required).
initAnalytics();
window.addEventListener('appinstalled', () => track('pwa_installed'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
