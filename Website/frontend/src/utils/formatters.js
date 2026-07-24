import { useTranslation } from 'react-i18next';

const localeMap = {
  en: 'en-IN',
  hi: 'en-IN',
  mr: 'en-IN'
};

export const getLocale = (language = 'en') => localeMap[language] || 'en-IN';

export const formatDate = (value, language = 'en', options = {}) => {
  if (!value) return '—';
  const mergedOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  };
  Object.keys(mergedOptions).forEach((key) => {
    if (mergedOptions[key] === undefined) delete mergedOptions[key];
  });
  return new Intl.DateTimeFormat(getLocale(language), mergedOptions).format(new Date(value));
};

export const formatTime = (value, language = 'en', options = {}) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(getLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(new Date(value));
};

export const formatNumber = (value, language = 'en', options = {}) => (
  new Intl.NumberFormat(getLocale(language), options).format(Number(value || 0))
);

export const formatCurrency = (value, language = 'en') => (
  new Intl.NumberFormat(getLocale(language), {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
);

export const useLocalizedFormatters = () => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  return {
    locale: getLocale(language),
    date: (value, options) => formatDate(value, language, options),
    time: (value, options) => formatTime(value, language, options),
    number: (value, options) => formatNumber(value, language, options),
    currency: (value) => formatCurrency(value, language)
  };
};
