/* Shows/hides the optional bottom navigation using the existing appearance switch. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');
  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', enabled);
    const control = getToggle();
    if (control) control.checked = enabled;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (_) {}
  }
  function init() {
    let enabled = false;
    try { enabled = localStorage.getItem(KEY) === '1'; } catch (_) {}
    apply(enabled);
    const control = getToggle();
    if (control && control.dataset.bottomMenuBound !== '1') {
      control.dataset.bottomMenuBound = '1';
      control.addEventListener('change', () => apply(control.checked));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('click', event => {
    const button = event.target.closest('#np-bottom-navigation [data-np-bottom-nav]');
    if (!button) return;

    document.querySelectorAll('#np-bottom-navigation [data-np-bottom-nav]').forEach(item => item.removeAttribute('aria-current'));
    button.setAttribute('aria-current', 'page');

    // 設定は新しい設定画面を重複作成せず、既存の設定モーダルを開く。
    if (button.dataset.npBottomNav === 'settings') {
      if (typeof window.openUserSettings === 'function') {
        window.openUserSettings();
      } else {
        console.warn('[Nurse＋] 既存の設定画面を開く関数が見つかりません。');
      }
    }
  });
})();