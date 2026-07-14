import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Bell, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import logo from '../../assets/logo.png';
import './Navbar.css';

interface NavbarProps {
  title?: string;
}

const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (BR)' },
  { code: 'en', label: 'English' },
];

export function Navbar({ title }: NavbarProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const { unreadCount, markAllAsRead } = useNotifications();
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    if (!notifOpen) {
      markAllAsRead();
    }
    setNotifOpen(!notifOpen);
  };

  return (
    <header className="navbar">
      <div className="navbar__left">
        <img src={logo} alt={t('navbar.logoAlt')} className="navbar__logo" />
        {title && <h1 className="navbar__title">{title}</h1>}
      </div>

      <div className="navbar__right">
        <div className="navbar__lang" ref={dropdownRef}>
          <button
            className="navbar__icon-btn"
            onClick={() => setLangOpen(!langOpen)}
            aria-label={t('navbar.language')}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            <Globe size={20} />
          </button>
          {langOpen && (
            <ul className="navbar__lang-dropdown" role="listbox" aria-label={t('navbar.selectLanguage')}>
              {LANGUAGES.map((lang) => (
                <li
                  key={lang.code}
                  role="option"
                  aria-selected={language === lang.code}
                  className={`navbar__lang-option ${language === lang.code ? 'navbar__lang-option--active' : ''}`}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                >
                  <span>{lang.label}</span>
                  {language === lang.code && <Check size={16} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="navbar__notif" ref={notifRef}>
          <button
            className="navbar__icon-btn navbar__icon-btn--notif"
            onClick={handleToggleNotifications}
            aria-label={t('navbar.notifications')}
            aria-expanded={notifOpen}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="navbar__badge">{unreadCount}</span>
            )}
          </button>
          {notifOpen && (
            <NotificationDropdown />
          )}
        </div>
      </div>
    </header>
  );
}
