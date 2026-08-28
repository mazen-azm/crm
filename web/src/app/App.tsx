import { BrowserRouter } from 'react-router-dom';

import { I18nProvider } from '../shared/i18n';
import { AuthProvider } from './auth-context';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
