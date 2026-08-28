import { BrowserRouter } from 'react-router-dom';

import { I18nProvider } from '../shared/i18n';
import { AuthProvider } from './auth-context';
import { ThemeProvider } from './theme-context';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        {/* Above the routes on purpose: the palette is decided before the
            first paint on any route, so sign-in does not flash an unthemed
            background on its way to the desk. The theme CONTROL is a
            different question and belongs to the shell, which sign-in is
            not inside. */}
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
