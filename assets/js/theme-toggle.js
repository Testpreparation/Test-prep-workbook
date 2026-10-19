
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

  // 設定内の「テーマ・外観」画面を開閉する関数をグローバルに公開する。
  // index.html のオーバーレイ／モーダル構造をそのまま利用する。
  window.openThemeSettingsPage = function() {
    const overlay = document.getElementById('np-theme-settings-overlay');
    const modal = document.getElementById('np-theme-settings-modal');
    if (!overlay || !modal) return;
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  };

  window.closeThemeSettingsPage = function() {
    const overlay = document.getElementById('np-theme-settings-overlay');
    const modal = document.getElementById('np-theme-settings-modal');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  };

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
