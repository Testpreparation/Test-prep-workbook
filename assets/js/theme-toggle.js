
(() => {
  const key = 'nurse_plus_theme';
  const root = document.documentElement;
  const toggle = document.getElementById('np-theme-toggle');
  const label = document.getElementById('np-theme-label');
  if (!toggle) return;

  const applyTheme = theme => {
    const isLight = theme !== 'dark';
    root.classList.toggle('np-light-theme', isLight);
    try { localStorage.setItem(key, isLight ? 'light' : 'dark'); } catch (_) {}
    toggle.checked = !isLight;
    toggle.setAttribute('aria-checked', String(!isLight));
    toggle.setAttribute('aria-label', isLight ? 'ダークモードに切り替え' : 'ホワイトモードに切り替え');
    if (label) label.textContent = isLight ? 'ホワイトモード' : 'ダークモード';
  };

  let initial = 'light';
  try { initial = localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; } catch (_) {}
  applyTheme(initial);

  toggle.addEventListener('change', event => {
    event.stopPropagation();
    applyTheme(toggle.checked ? 'dark' : 'light');
  });

  const themeCard = document.getElementById('np-theme-settings-card');
  if (themeCard) {
    themeCard.addEventListener('click', event => {
      if (event.target.closest('#np-theme-toggle')) return;
      openThemeSettingsPage();
    });
    themeCard.addEventListener('keydown', event => {
      if (event.target !== themeCard || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openThemeSettingsPage();
    });
  }
})();
