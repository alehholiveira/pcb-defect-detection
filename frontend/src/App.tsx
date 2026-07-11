import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { TabNav } from './components/TabNav';
import { Inferences } from './pages/Inferences';
import { Reports } from './pages/Reports';
import { Metrics } from './pages/Metrics';
import { Models } from './pages/Models';
import { Settings } from './pages/Settings';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const PAGE_TITLES: Record<string, string> = {
  '/inferences': 'nav.inferences',
  '/reports': 'nav.reports',
  '/metrics': 'nav.metrics',
  '/models': 'nav.models',
  '/settings': 'nav.settings',
};

function Layout() {
  const location = useLocation();
  const { t } = useTranslation();
  const titleKey = PAGE_TITLES[location.pathname] || 'nav.inferences';

  return (
    <div className="app-layout">
      <Navbar title={t(titleKey)} />
      <TabNav />
      <main className="app-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/inferences" replace />} />
            <Route path="/inferences" element={<Inferences />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/models" element={<Models />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}
