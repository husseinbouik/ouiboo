const i18n = {
  use: () => i18n,
  init: () => Promise.resolve(),
  t: (key) => key,
  language: 'en',
  changeLanguage: () => Promise.resolve(),
};

module.exports = i18n;
module.exports.default = i18n;