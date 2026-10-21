/* Optional bottom navigation + scoped notice scroll effects. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');

  function apply(enabled) {
    const bottomDashboard = document.getElementById('screen-dashboard-bottom-menu');
    const wasOnBottomMenuHome = !enabled && bottomDashboard && !bottomDashboard.classList.contains('hidden');
    root.classList.toggle('np-bottom-menu-enabled', enabled);
    // Switch the dashboard's dedicated mode immediately when the setting changes,
    // even if the user is already on the home screen.
    const dashboard = document.getElementById('screen-dashboard');
    if (dashboard) {
      dashboard.classList.toggle('np-bottom-menu-home', enabled);
    }
    if (bottomDashboard) {
      bottomDashboard.classList.toggle('hidden', !enabled);
      bottomDashboard.classList.toggle('np-bottom-menu-home', enabled);
    }
    // Turning the optional bottom menu off from its home restores the original dashboard.
    if (wasOnBottomMenuHome && typeof window.showDashboard === 'function') {
      window.showDashboard();
    }
    const control = getToggle();
    if (control) control.checked = enabled;
    try { localStorage.setItem(KEY, String(enabled)); } catch (_) {}
  }

  function init() {
    let enabled = false;
    try { enabled = localStorage.getItem(KEY) === 'true' || localStorage.getItem(KEY) === '1'; } catch (_) {}
    apply(enabled);
    const control = getToggle();
    if (control) control.checked = enabled;
    // 保存済みの下部メニューモードなら、起動直後から専用ホームを表示する。
    if (enabled && typeof window.showDashboard === 'function') {
      window.showDashboard();
    }
  }

  // Notice-only scroll reveal and quick-return header. Defaults stay visible if JS/CSS effects fail.
  function setupNoticeScrollEffects() {
    if (document.getElementById('np-notice-scroll-effects-style')) return;
    const style = document.createElement('style');
    style.id = 'np-notice-scroll-effects-style';
    style.textContent = `
      #modal-notice #notice-list-container > * {
        opacity: 1;
        transform: none;
      }
      #modal-notice #notice-list-container > *.np-notice-reveal-pending {
        opacity: 0;
        transform: translateY(24px);
      }
      #modal-notice #notice-list-container > *.np-notice-revealed {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 480ms ease, transform 480ms cubic-bezier(.2,.75,.25,1);
      }
      /* Bottom-navigation notices close when another destination is selected. */
      #modal-notice.np-bottom-notice-mode .np-notice-retracting-header > button,
      #modal-notice.np-bottom-notice-mode > .glass-card > button[onclick*="closeNoticeModal"] {
        display: none !important;
      }
      #modal-notice .np-notice-retracting-header {
        transition: transform 220ms ease, opacity 220ms ease;
        will-change: transform;
      }
      #modal-notice .np-notice-retracting-header.np-notice-header-hidden {
        transform: translateY(-115%);
        opacity: .96;
      }
      /* In bottom-menu mode, keep the notice dialog fixed while only its list scrolls. */
      #modal-notice.np-bottom-notice-mode {
        overflow: hidden !important;
        align-items: center;
        overscroll-behavior: contain;
      }
      #modal-notice.np-bottom-notice-mode > .glass-card {
        display: flex;
        flex-direction: column;
        max-height: calc(100dvh - 2rem);
        min-height: 0;
        overflow: hidden;
      }
      #modal-notice.np-bottom-notice-mode #notice-list-container {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none !important;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      #modal-notice.np-bottom-notice-mode .np-notice-retracting-header,
      #modal-notice.np-bottom-notice-mode .np-notice-retracting-header.np-notice-header-hidden {
        transform: none !important;
        opacity: 1 !important;
      }
      html.np-bottom-menu-enabled #np-bottom-navigation {
        z-index: 110;
      }
      @media (prefers-reduced-motion: reduce) {
        #modal-notice #notice-list-container > *,
        #modal-notice .np-notice-retracting-header {
          transition: none !important;
          transform: none !important;
          opacity: 1 !important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function initNoticeEffects() {
    const modal = document.getElementById('modal-notice');
    const list = document.getElementById('notice-list-container');
    if (!modal || !list) return;
    setupNoticeScrollEffects();

    const header = modal.querySelector('.glass-card > .flex.justify-between');
    if (header && header.dataset.npNoticeHeaderBound !== '1') {
      header.dataset.npNoticeHeaderBound = '1';
      header.classList.add('np-notice-retracting-header');
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove('np-notice-reveal-pending');
          entry.target.classList.add('np-notice-revealed');
          revealObserver.unobserve(entry.target);
        });
      }, { root: list, threshold: 0.08, rootMargin: '0px 0px -12px 0px' });

      const observeCards = () => {
        Array.from(list.children).forEach((card, index) => {
          if (card.dataset.npNoticeRevealBound === '1') return;
          card.dataset.npNoticeRevealBound = '1';
          card.classList.add('np-notice-reveal-pending');
          // Stagger subtly, without delaying visibility for long lists.
          card.style.transitionDelay = Math.min(index % 4, 3) * 45 + 'ms';
          revealObserver.observe(card);
        });
      };
      observeCards();
      if (list.dataset.npNoticeMutationBound !== '1') {
        list.dataset.npNoticeMutationBound = '1';
        new MutationObserver(observeCards).observe(list, { childList: true });
      }
    }

    if (list.dataset.npNoticeScrollBound !== '1') {
      list.dataset.npNoticeScrollBound = '1';
      let lastTop = list.scrollTop;
      let ticking = false;
      list.addEventListener('scroll', () => {
        if (!header || ticking || modal.classList.contains('np-bottom-notice-mode')) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const nextTop = list.scrollTop;
          const delta = nextTop - lastTop;
          if (nextTop < 12 || delta < -2) {
            header.classList.remove('np-notice-header-hidden');
          } else if (delta > 2 && nextTop > 12) {
            header.classList.add('np-notice-header-hidden');
          }
          lastTop = nextTop;
          ticking = false;
        });
      }, { passive: true });
    }
  }

  // The appearance/settings modal is created dynamically, so bind its toggle
  // at document level instead of relying on the control existing at page load.
  document.addEventListener('change', event => {
    const control = event.target;
    if (!control || control.id !== 'np-bottom-menu-toggle') return;
    apply(Boolean(control.checked));
  });

  // Keep the toggle state synchronized if the existing settings UI is mounted later.
  if ('MutationObserver' in window) {
    const settingsObserver = new MutationObserver(() => {
      const control = getToggle();
      if (!control) return;
      let enabled = false;
      try { enabled = localStorage.getItem(KEY) === 'true' || localStorage.getItem(KEY) === '1'; } catch (_) {}
      if (control.checked !== enabled) control.checked = enabled;
    });
    settingsObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Use capture phase so unrelated delegated handlers cannot swallow bottom-nav taps.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    const button = target && target.closest('#np-bottom-navigation [data-np-bottom-nav]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    const destination = button.dataset.npBottomNav;
    // 設定ドロワーを開いたまま別の下部メニューへ移動しないように閉じる。
    if (destination !== 'settings' && typeof window.closeNavDrawer === 'function') {
      window.closeNavDrawer();
      const drawer = document.getElementById('nav-drawer');
      if (drawer) drawer.classList.remove('np-bottom-settings-centered');
    }
    document.querySelectorAll('#np-bottom-navigation [data-np-bottom-nav]').forEach(item => {
      item.removeAttribute('aria-current');
    });
    button.setAttribute('aria-current', 'page');

    const noticeModal = document.getElementById('modal-notice');
    if (destination !== 'notices' && noticeModal && !noticeModal.classList.contains('hidden')) {
      if (typeof window.closeNoticeModal === 'function') window.closeNoticeModal();
      else noticeModal.classList.add('hidden');
      // The bottom-menu notice opener sets inline display:flex; clear it as well as
      // the hidden class so the legacy close-button version cannot remain over other screens.
      noticeModal.style.display = 'none';
      noticeModal.setAttribute('aria-hidden', 'true');
      noticeModal.classList.remove('np-bottom-notice-mode');
      document.body.classList.remove('overflow-hidden');
    }

    if (destination === 'home') {
      if (typeof window.showDashboard === 'function') {
        window.showDashboard();
      } else {
        const dashboard = document.getElementById('screen-dashboard');
        if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
        if (dashboard) dashboard.classList.remove('hidden');
      }
      // Keep a dedicated hook for future bottom-menu-only layout refinements,
      // without changing the normal dashboard's current markup or appearance.
      const dashboard = document.getElementById('screen-dashboard');
      if (dashboard) {
        dashboard.classList.toggle('np-bottom-menu-home', root.classList.contains('np-bottom-menu-enabled'));
      }
      return;
    }

    if (destination === 'analytics') {
      if (typeof window.showDataAnalysis === 'function') {
        window.showDataAnalysis();
      } else if (window.NursePlusAnalyticsAddition && typeof window.NursePlusAnalyticsAddition.open === 'function') {
        window.NursePlusAnalyticsAddition.open();
      } else {
        const host = document.getElementById('screen-data-analysis');
        const analyticsPanel = document.getElementById('screen-analytics-addition');
        if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
        if (host) host.classList.remove('hidden');
        if (analyticsPanel) analyticsPanel.classList.remove('hidden');
      }
      return;
    }

    if (destination === 'settings') {
      // バーガーメニュー内の既存設定を開き、下部メニューからも同じ設定一覧を表示する。
      const drawer = document.getElementById('nav-drawer');
      const drawerOverlay = document.getElementById('nav-overlay');
      const settingsAccordion = document.getElementById('drawer-settings-accordion');
      const settingsToggle = document.getElementById('drawer-settings-toggle');
      const settingsContent = document.getElementById('drawer-settings-content');
      const settingsChevron = document.getElementById('drawer-settings-chevron');

      if (typeof window.closeUserSettings === 'function') window.closeUserSettings();
      if (drawer) {
        drawer.classList.remove('-translate-x-full');
        drawer.classList.add('np-bottom-settings-centered');
      }
      if (drawerOverlay) {
        drawerOverlay.classList.remove('hidden');
        drawerOverlay.style.zIndex = '100';
      }
      if (drawer) drawer.style.zIndex = '101';

      if (typeof window.prepareDrawerSettingsDropdown === 'function') {
        window.prepareDrawerSettingsDropdown();
      }
      if (settingsAccordion) settingsAccordion.open = true;
      if (settingsToggle) settingsToggle.setAttribute('aria-expanded', 'true');
      if (settingsContent) settingsContent.setAttribute('aria-hidden', 'false');
      if (settingsChevron) settingsChevron.style.transform = 'rotate(180deg)';
      document.body.classList.add('overflow-hidden');
      return;
    }

    if (destination === 'notices') {
      const openedNoticeModal = document.getElementById('modal-notice');
      if (!openedNoticeModal) {
        console.warn('[Nurse＋] お知らせ画面の要素が見つかりません。');
        return;
      }

      // 既存の通知描画処理を利用し、表示・重なり順を明示する。
      if (typeof window.openNoticeModal === 'function') window.openNoticeModal();
      openedNoticeModal.classList.remove('hidden');
      openedNoticeModal.style.display = 'flex';
      openedNoticeModal.style.zIndex = '100';
      openedNoticeModal.setAttribute('aria-hidden', 'false');
      openedNoticeModal.classList.add('np-bottom-notice-mode');
      document.body.classList.add('overflow-hidden');
      window.requestAnimationFrame(initNoticeEffects);
      return;
    }
  }, true);
  // In bottom-menu mode, route any legacy notice trigger through the same
  // close-button-free notice presentation used by the bottom navigation.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    const trigger = target && target.closest('[onclick*="openNoticeModal"]');
    if (!trigger) return;
    if (root.classList.contains('np-bottom-menu-enabled') && !trigger.closest('#np-bottom-navigation')) {
      event.preventDefault();
      event.stopPropagation();
      const modal = document.getElementById('modal-notice');
      if (!modal) return;
      if (typeof window.openNoticeModal === 'function') window.openNoticeModal();
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.style.zIndex = '100';
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('np-bottom-notice-mode');
      document.body.classList.add('overflow-hidden');
      window.requestAnimationFrame(initNoticeEffects);
      return;
    }
    window.requestAnimationFrame(initNoticeEffects);
  }, true);
})();