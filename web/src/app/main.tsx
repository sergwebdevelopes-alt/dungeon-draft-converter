import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAnalytics } from '../shared/analytics/cloudflare-analytics.ts';
import { SITE } from '../shared/config/site.ts';
import { App } from './App.tsx';
import '../styles.css';

startAnalytics(SITE.analytics);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
