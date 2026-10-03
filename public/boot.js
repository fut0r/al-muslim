// Runs before the app bundle so the very first paint already uses the saved
// theme, language and direction (no flash of the wrong colours).
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('al-muslim:settings') || '{}') || {};
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var mode =
      saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'amoled'
        ? saved.theme
        : prefersDark
          ? 'dark'
          : 'light';
    var language =
      saved.language === 'ar' || saved.language === 'en'
        ? saved.language
        : (navigator.language || '').toLowerCase().indexOf('ar') === 0
          ? 'ar'
          : 'en';
    var root = document.documentElement;
    root.setAttribute('data-mode', mode);
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
  } catch (error) {
    // Storage unavailable: the defaults in index.html apply.
  }
})();
