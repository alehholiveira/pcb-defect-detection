import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Cpu, FileText, BarChart3, Box, Settings2 } from 'lucide-react';
import './TabNav.css';

interface TabItem {
  labelKey: string;
  defaultLabel: string;
  path: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { labelKey: 'tabs.inferences', defaultLabel: 'Inferências', path: '/inferences', icon: <Cpu size={18} /> },
  { labelKey: 'tabs.reports', defaultLabel: 'Relatórios', path: '/reports', icon: <FileText size={18} /> },
  { labelKey: 'tabs.metrics', defaultLabel: 'Métricas', path: '/metrics', icon: <BarChart3 size={18} /> },
  { labelKey: 'tabs.models', defaultLabel: 'Modelos', path: '/models', icon: <Box size={18} /> },
  { labelKey: 'tabs.settings', defaultLabel: 'Configurações', path: '/settings', icon: <Settings2 size={18} /> },
];

export function TabNav() {
  const { t } = useTranslation();

  return (
    <nav className="tab-nav" aria-label={t('tabs.navigation', 'Main navigation')}>
      <ul className="tab-nav__list">
        {TABS.map((tab) => (
          <li key={tab.path} className="tab-nav__item">
            <NavLink
              to={tab.path}
              className={({ isActive }) =>
                `tab-nav__link ${isActive ? 'tab-nav__link--active' : ''}`
              }
            >
              <span className="tab-nav__icon">{tab.icon}</span>
              <span className="tab-nav__label">{t(tab.labelKey, tab.defaultLabel)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
