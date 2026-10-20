/* Optional bottom navigation + scoped notice scroll effects. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');

  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', enabled);
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
        if (!header || ticking) return;
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



  // Bottom-menu home starts directly with the existing subject cards, while normal home stays unchanged.
  function renderBottomMenuHome() {
    if (!root.classList.contains('np-bottom-menu-enabled')) return;
    const dashboard = document.getElementById('screen-dashboard');
    const subjectList = document.getElementById('subject-list-container');
    if (!dashboard || !subjectList) return;

    // Use the app's own subject renderer so all visible subjects, status labels and handlers stay in sync.
    if (typeof window.showSubjectScreen === 'function') {
      window.showSubjectScreen();
    }
    const renderedList = document.getElementById('subject-list-container');
    if (!renderedList) return;

    let homeGrid = document.getElementById('np-bottom-home-subject-grid');
    if (!homeGrid) {
      homeGrid = document.createElement('div');
      homeGrid.id = 'np-bottom-home-subject-grid';
      homeGrid.setAttribute('aria-label', '科目一覧');
      homeGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1';
      dashboard.prepend(homeGrid);
    }
    homeGrid.replaceChildren(...Array.from(renderedList.children, card => card.cloneNode(true)));
    dashboard.querySelectorAll(':scope > :not(#np-bottom-home-subject-grid)').forEach(element => {
      element.hidden = true;
    });
    homeGrid.hidden = false;

    // Restore the normal screen state after reusing the existing renderer.
    const subjectsScreen = document.getElementById('screen-subjects');
    if (subjectsScreen) subjectsScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
  }

  function restoreBottomMenuHomeLayout() {
    const dashboard = document.getElementById('screen-dashboard');
    const homeGrid = document.getElementById('np-bottom-home-subject-grid');
    if (!dashboard) return;
    const enabled = root.classList.contains('np-bottom-menu-enabled');
    if (homeGrid) homeGrid.hidden = !enabled;
    dashboard.querySelectorAll(':scope > :not(#np-bottom-home-subject-grid)').forEach(element => {
      element.hidden = enabled;
    });
    if (!enabled) {
      dashboard.querySelectorAll(':scope > [hidden]').forEach(element => {
        element.hidden = false;
      });
    }
  }

  // Use capture phase so unrelated delegated handlers cannot swallow bottom-nav taps.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    const button = target && target.closest('#np-bottom-navigation [data-np-bottom-nav]');
    if (!button) return;

    event.preventDefault();
    const destination = button.dataset.npBottomNav;
    document.querySelectorAll('#np-bottom-navigation [data-np-bottom-nav]').forEach(item => {
      item.removeAttribute('aria-current');
    });
    button.setAttribute('aria-current', 'page');

    const noticeModal = document.getElementById('modal-notice');
    if (destination !== 'notices' && noticeModal && !noticeModal.classList.contains('hidden')) {
      if (typeof window.closeNoticeModal === 'function') window.closeNoticeModal();
      else noticeModal.classList.add('hidden');
      noticeModal.classList.remove('np-bottom-notice-mode');
    }

    if (destination === 'home') {
      if (typeof window.showDashboard === 'function') {
        window.showDashboard();
      } else {
        const dashboard = document.getElementById('screen-dashboard');
        if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
        if (dashboard) dashboard.classList.remove('hidden');
      }
      if (root.classList.contains('np-bottom-menu-enabled')) {
        window.requestAnimationFrame(() => {
          renderBottomMenuHome();
          restoreBottomMenuHomeLayout();
        });
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
      // 下部メニューから既存の設定モーダルを直接開く。ドロワーの表示状態には依存させない。
      const drawer = document.getElementById('nav-drawer');
      const drawerOverlay = document.getElementById('nav-overlay');
      const settingsOverlay = document.getElementById('user-settings-overlay');
      const settingsModal = document.getElementById('user-settings-modal');

      if (drawer) {
        drawer.classList.remove('np-bottom-settings-centered');
        drawer.classList.add('-translate-x-full');
      }
      if (drawerOverlay) drawerOverlay.classList.add('hidden');

      if (settingsOverlay && settingsModal) {
        settingsOverlay.classList.remove('hidden');
        settingsModal.classList.remove('hidden');
        settingsOverlay.setAttribute('aria-hidden', 'false');
        settingsModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
        const firstSummary = settingsModal.querySelector('#settings-accordion > details > summary');
        if (firstSummary) firstSummary.focus({ preventScroll: true });
      } else {
        console.warn('[Nurse＋] 設定モーダルが見つかりません。');
      }
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
  // Also initialize when the existing top-level notification button opens the modal.
  document.addEventListener('click', event => {
    if (event.target.closest('[onclick*="openNoticeModal"]')) {
      window.requestAnimationFrame(initNoticeEffects);
    }
  });
})();