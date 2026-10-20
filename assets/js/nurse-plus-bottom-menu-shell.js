/* Nurse＋ bottom navigation shell: visibility preference only. */
(() => {
  const STORAGE_KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const toggle = () => document.getElementById('np-bottom-menu-toggle');
  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', !!enabled);
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (_) {}
    const control = toggle();
    if (control && control.checked !== !!enabled) control.checked = !!enabled;
  }
  function init() {
    let enabled = false;
    try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}
    apply(enabled);
    const control = toggle();
    if (control) {
      control.checked = enabled;
      control.addEventListener('change', () => apply(control.checked));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
