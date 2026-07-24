import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'];

const getTextMap = (i18n) => {
  const bundle = i18n.getResourceBundle(i18n.resolvedLanguage || i18n.language || 'en', 'translation');
  return bundle?.uiText || {};
};

const preserveSpacing = (original, translated) => {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
};

const localizeNode = (root, textMap, language) => {
  if (!root) return;

  const localizeTextNode = (node) => {
    const value = node.nodeValue || '';
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!node.parentElement?.dataset.i18nOriginalText) {
      node.parentElement.dataset.i18nOriginalText = trimmed;
    }

    const original = node.parentElement.dataset.i18nOriginalText;
    const translated = language === 'en' ? original : textMap[original];
    if (translated) node.nodeValue = preserveSpacing(value, translated);
  };

  const localizeElement = (element) => {
    if (!(element instanceof HTMLElement)) return;
    if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(element.tagName)) return;

    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const originalKey = `i18nOriginal${attribute.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase())}`;
      if (!element.dataset[originalKey]) element.dataset[originalKey] = value;
      const original = element.dataset[originalKey];
      const translated = language === 'en' ? original : textMap[original];
      if (translated) element.setAttribute(attribute, translated);
    });

    element.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) localizeTextNode(child);
    });
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  localizeElement(root);
  while (walker.nextNode()) localizeElement(walker.currentNode);
};

const I18nDomLocalizer = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = document.getElementById('root');
    let scheduled = false;
    const apply = () => localizeNode(root, getTextMap(i18n), i18n.resolvedLanguage || i18n.language || 'en');
    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    };

    apply();
    const observer = new MutationObserver(scheduleApply);
    if (root) observer.observe(root, { childList: true, subtree: true });

    window.addEventListener('societyhubLanguageRefresh', apply);
    return () => {
      observer.disconnect();
      window.removeEventListener('societyhubLanguageRefresh', apply);
    };
  }, [i18n, i18n.language, i18n.resolvedLanguage]);

  return null;
};

export default I18nDomLocalizer;
