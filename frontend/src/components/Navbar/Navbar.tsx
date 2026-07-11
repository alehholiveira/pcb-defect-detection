import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, HelpCircle, Bell, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        <button
          className="navbar__icon-btn"
          aria-label={t('navbar.help')}
        >
          <HelpCircle size={20} />
        </button>

        <button
          className="navbar__icon-btn"
          aria-label={t('navbar.notifications')}
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
