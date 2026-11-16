import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAnalytics } from '@/shared/analytics/cloudflare-analytics.ts';
import { SITE } from '@/shared/config/site.ts';
import { startErrorReporting } from '@/shared/error-reporting/start-error-reporting.ts';
import { App } from './App.tsx';
import '@/styles.css';

startErrorReporting(SITE.errorReporting);
startAnalytics(SITE.analytics);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
