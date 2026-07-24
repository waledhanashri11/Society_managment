import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

const options = [
  { value: 'en', key: 'language.english' },
  { value: 'hi', key: 'language.hindi' },
  { value: 'mr', key: 'language.marathi' }
];

const LanguageSelector = ({ compact = false }) => {
  const { t, i18n } = useTranslation();

  const handleChange = async (event) => {
    await changeLanguage(event.target.value);
  };

  return (
    <label className={`language-selector ${compact ? 'compact' : ''}`}>
      {!compact && <span>{t('language.label')}</span>}
      <Languages size={15} />
      <select value={i18n.resolvedLanguage || i18n.language || 'en'} onChange={handleChange} aria-label={t('language.select')}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{t(option.key)}</option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSelector;
