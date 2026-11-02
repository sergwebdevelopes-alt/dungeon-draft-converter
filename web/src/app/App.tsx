import { BrowserRouter } from 'react-router';
import { SITE } from '../shared/config/site.ts';
import { AppRoutes } from './routes.tsx';

function App() {
  return (
    <BrowserRouter>
      <AppRoutes site={SITE} />
    </BrowserRouter>
  );
}

export { App };
