module.exports = {
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key) => key, i18n: { changeLanguage: () => {} } }),
};