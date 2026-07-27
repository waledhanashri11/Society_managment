import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

const options = [
  { value: 'en', key: 'language.english' },
  { value: 'hi', key: 'language.hindi' },
  { value: 'mr', key: 'language.marathi' }
];

const LanguageSelector = ({ compact = false, showIcon = true, variant = 'default', className = '' }) => {
  const { t, i18n } = useTranslation();

  const handleChange = async (event) => {
    await changeLanguage(event.target.value);
  };

  const currentLang = i18n.resolvedLanguage || i18n.language || 'en';

  if (variant === 'dark') {
    return (
      <div className={`landing-language-dropdown ${className}`}>
        {showIcon && <Languages size={15} className="text-blue-400 flex-shrink-0" />}
        <select
          value={currentLang}
          onChange={handleChange}
          aria-label={t('language.select')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.key)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <label className={`language-selector ${compact ? 'compact' : ''} ${className}`}>
      {!compact && <span>{t('language.label')}</span>}
      {showIcon && <Languages size={15} />}
      <select value={currentLang} onChange={handleChange} aria-label={t('language.select')}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{t(option.key)}</option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSelector;
