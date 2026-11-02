import { SITE } from '../shared/config/site.ts';
import { ConverterPage } from '../features/converter/ui/ConverterPage.tsx';
import { PageShell } from './layout/PageShell.tsx';

function App() {
  return (
    <PageShell site={SITE} currentPath={window.location.pathname}>
      <ConverterPage />
    </PageShell>
  );
}

export { App };
