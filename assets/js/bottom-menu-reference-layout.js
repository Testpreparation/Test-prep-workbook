(() => {
  'use strict';
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const body = document.body;
  const nav = document.getElementById('np-reference-bottom-nav');
  const toggle = document.getElementById('np-bottom-menu-toggle');
  const getEnabled = () => { try { return localStorage.getItem(KEY) === 'true'; } catch (_) { return false; } };
  const apply = (enabled, navigateHome = false) => {
    body.classList.toggle('np-bottom-menu-enabled', enabled);
    if (toggle) toggle.checked = enabled;
    if (enabled && navigateHome && typeof window.showSubjectScreen === 'function') window.showSubjectScreen();
    if (!enabled) setActive('');
  };
  const setActive = name => {
    if (!nav) return;
    nav.querySelectorAll('button[data-np-nav]').forEach(button => {
      const active = button.dataset.npNav === name;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
  };
  if (toggle) {
    toggle.checked = getEnabled();
    toggle.addEventListener('change', () => {
      try { localStorage.setItem(KEY, String(toggle.checked)); } catch (_) {}
      apply(toggle.checked, toggle.checked);
    });
  }
  apply(getEnabled(), false);
  if (nav) nav.addEventListener('click', event => {
    const button = event.target.closest('button[data-np-nav]');
    if (!button) return;
    const route = button.dataset.npNav;
    setActive(route);
    if (route === 'home') {
      if (typeof window.showSubjectScreen === 'function') window.showSubjectScreen();
    } else if (route === 'analytics') {
      if (typeof window.showDataAnalysis === 'function') window.showDataAnalysis();
    } else if (route === 'notices') {
      if (typeof window.openNoticeModal === 'function') window.openNoticeModal();
    } else if (route === 'settings') {
      const overlay = document.getElementById('user-settings-overlay');
      const modal = document.getElementById('user-settings-modal');
      if (overlay) overlay.classList.remove('hidden');
      if (modal) modal.classList.remove('hidden');
    }
  });
  const updateActiveFromScreen = () => {
    if (!getEnabled()) return;
    const subjects = document.getElementById('screen-subjects');
    const analytics = document.getElementById('screen-data-analysis');
    if (subjects && !subjects.classList.contains('hidden')) setActive('home');
    else if (analytics && !analytics.classList.contains('hidden')) setActive('analytics');
  };
  const observer = new MutationObserver(updateActiveFromScreen);
  document.querySelectorAll('[id^="screen-"]').forEach(el => observer.observe(el,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('click', event => {
    if (event.target.closest('#user-settings-modal button, #np-settings-detail-modal button, #np-theme-settings-modal button')) {
      window.setTimeout(updateActiveFromScreen,80);
    }
  });
})();