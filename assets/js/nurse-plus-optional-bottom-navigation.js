/* Optional bottom navigation + scoped notice scroll effects. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');

  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', enabled);
    setupHomeSubjectCardStyles();
    setupHomeSubjectCards();
    const dashboard = document.getElementById('screen-dashboard');
    if (dashboard) dashboard.classList.toggle('np-home-subject-mode', enabled);
    const homeGrid = document.getElementById('np-home-subject-grid');
    if (homeGrid) homeGrid.hidden = !enabled;
    // The legacy dashboard can be replaced dynamically; restore the card grid after rerenders.
    if (!window.__npHomeSubjectGridObserver && 'MutationObserver' in window) {
      window.__npHomeSubjectGridObserver = new MutationObserver(() => {
        const dashboard = document.getElementById('screen-dashboard');
        if (!dashboard) return;
        if (root.classList.contains('np-bottom-menu-enabled') && !document.getElementById('np-home-subject-grid')) {
          setupHomeSubjectCards();
        }
        const enabled = root.classList.contains('np-bottom-menu-enabled');
        dashboard.classList.toggle('np-home-subject-mode', enabled);
        const grid = document.getElementById('np-home-subject-grid');
        if (grid) grid.hidden = !enabled;
      });
      window.__npHomeSubjectGridObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
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


  // Optional bottom-navigation home: show subject cards only while the setting is enabled.
  function setupHomeSubjectCards() {
    const dashboard = document.getElementById('screen-dashboard');
    if (!dashboard) return;
    let grid = document.getElementById('np-home-subject-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'np-home-subject-grid';
      grid.setAttribute('aria-label', '科目一覧');
      grid.className = 'np-home-subject-grid';
      const subjects = [
        { id: 'anatomy', code: 'ANA', name: '解剖学', icon: '♧', tone: 'pink' },
        { id: 'biochemistry', code: 'BIO', name: '生化学', icon: '⚗', tone: 'amber' },
        { id: 'physiology', code: 'PHY', name: '生理学', icon: '♥', tone: 'blue' },
        { id: 'public_health', code: 'PH', name: '公衆衛生学', icon: '✿', tone: 'mint' },
        { id: 'public_health_nursing', code: 'PHN', name: '公衆衛生看護学概論', icon: '♟', tone: 'lavender' },
        { id: 'nutrition', code: 'NUT', name: '栄養学', icon: '🥣', tone: 'peach' },
        { id: 'pharmacology', code: 'PHA', name: '薬理学', icon: '💊', tone: 'pink' },
        { id: 'nursing_method_3', code: 'NUR', name: '看護学方法論Ⅲ', icon: '♧', tone: 'blue' }
      ];
      subjects.forEach(subject => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'np-home-subject-card np-tone-' + subject.tone;
        card.innerHTML = '<span class="np-home-subject-name">' + subject.name + '</span>';
        card.addEventListener('click', () => {
          if (typeof window.selectSubject === 'function') {
            window.selectSubject(subject.id);
          } else if (typeof window.showSubjectScreen === 'function') {
            window.showSubjectScreen();
          }
        });
        grid.appendChild(card);
      });
      const flashcards = document.createElement('button');
      flashcards.type = 'button';
      flashcards.className = 'np-home-subject-card np-home-flashcard-card';
      flashcards.innerHTML = '<span class="np-home-subject-name">暗記カード</span>';
      flashcards.addEventListener('click', () => {
        if (typeof window.showSubjectScreen === 'function') window.showSubjectScreen();
        window.requestAnimationFrame(() => {
          if (typeof window.switchSubjectPage === 'function') window.switchSubjectPage(1);
        });
      });
      grid.appendChild(flashcards);
      dashboard.insertBefore(grid, dashboard.firstChild);
    }
    const enabled = root.classList.contains('np-bottom-menu-enabled');
    dashboard.classList.toggle('np-home-subject-mode', enabled);
    grid.hidden = !enabled;
  }

  function setupHomeSubjectCardStyles() {
    // Reuse and refresh an existing style element instead of leaving stale/duplicate theme rules active.
    let style = document.getElementById('np-home-subject-card-styles');
    const shouldAppendStyle = !style;
    if (!style) {
      style = document.createElement('style');
      style.id = 'np-home-subject-card-styles';
    }
    style.textContent = `
      #np-home-subject-grid { display: none; }
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode > :not(#np-home-subject-grid) { display: none !important; }
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode .en-title,
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode h2,
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode .evo-card,
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode > div:not(#np-home-subject-grid) { display: none !important; }
      #np-home-subject-grid[hidden] { display: none !important; }
      html.np-bottom-menu-enabled #np-home-subject-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        width: 100%;
        padding: 4px 0 12px;
      }
      .np-home-subject-card {
        appearance: none;
        -webkit-appearance: none;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        min-height: 84px;
        padding: 1rem;
        border: 1px solid var(--np-card-border);
        color: var(--np-text-color) !important;
        border-radius: 1rem;
        box-shadow: 0 3px 10px rgba(125, 105, 145, .07);
        font: inherit;
        text-align: center;
        cursor: pointer;
        transition: transform .2s ease, box-shadow .2s ease;
      }
      .np-home-subject-card:hover:not(:disabled) {
        background: var(--np-card-background) !important;
        border-color: var(--np-card-border) !important;
        color: var(--np-text-color) !important;
        transform: translateY(-2px);
      }
      .np-home-subject-card .np-home-subject-name {
        display: block;
        min-width: 0;
        color: var(--np-text-color) !important;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .np-tone-pink { --np-card-background:linear-gradient(120deg,#fff0f6,#fcebf3); background:var(--np-card-background) !important; --np-card-border:#f5dce9; --np-text-color:#8c5276; }
      .np-tone-amber { --np-card-background:linear-gradient(120deg,#fff8ec,#fff4e6); background:var(--np-card-background) !important; --np-card-border:#f4e7d3; --np-text-color:#866641; }
      .np-tone-blue { --np-card-background:linear-gradient(120deg,#eff5ff,#edf2ff); background:var(--np-card-background) !important; --np-card-border:#dce7fb; --np-text-color:#4c668f; }
      .np-tone-mint { --np-card-background:linear-gradient(120deg,#effbf8,#eaf8f5); background:var(--np-card-background) !important; --np-card-border:#d7eee8; --np-text-color:#426d70; }
      .np-tone-lavender { --np-card-background:linear-gradient(120deg,#f8f1ff,#f4edff); background:var(--np-card-background) !important; --np-card-border:#e9def7; --np-text-color:#70578e; }
      .np-tone-peach { --np-card-background:linear-gradient(120deg,#fff2eb,#ffede5); background:var(--np-card-background) !important; --np-card-border:#f7ded2; --np-text-color:#8b5a4d; }
      /* Keep bottom-menu home cards in the light palette regardless of the active app theme. */
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-pink {
        background: linear-gradient(120deg,#fff0f6,#fcebf3) !important; background-image: linear-gradient(120deg,#fff0f6,#fcebf3) !important;
        border-color: #f5dce9 !important; color: #8c5276 !important; --np-card-background: linear-gradient(120deg,#fff0f6,#fcebf3); --np-card-border:#f5dce9; --np-text-color:#8c5276;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-amber {
        background: linear-gradient(120deg,#fff8ec,#fff4e6) !important; background-image: linear-gradient(120deg,#fff8ec,#fff4e6) !important;
        border-color: #f4e7d3 !important; color: #866641 !important; --np-card-background: linear-gradient(120deg,#fff8ec,#fff4e6); --np-card-border:#f4e7d3; --np-text-color:#866641;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-blue {
        background: linear-gradient(120deg,#eff5ff,#edf2ff) !important; background-image: linear-gradient(120deg,#eff5ff,#edf2ff) !important;
        border-color: #dce7fb !important; color: #4c668f !important; --np-card-background: linear-gradient(120deg,#eff5ff,#edf2ff); --np-card-border:#dce7fb; --np-text-color:#4c668f;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-mint,
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-flashcard-card {
        background: linear-gradient(120deg,#effbf8,#eaf8f5) !important; background-image: linear-gradient(120deg,#effbf8,#eaf8f5) !important;
        border-color: #d7eee8 !important; color: #426d70 !important; --np-card-background: linear-gradient(120deg,#effbf8,#eaf8f5); --np-card-border:#d7eee8; --np-text-color:#426d70;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-lavender {
        background: linear-gradient(120deg,#f8f1ff,#f4edff) !important; background-image: linear-gradient(120deg,#f8f1ff,#f4edff) !important;
        border-color: #e9def7 !important; color: #70578e !important; --np-card-background: linear-gradient(120deg,#f8f1ff,#f4edff); --np-card-border:#e9def7; --np-text-color:#70578e;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card.np-tone-peach {
        background: linear-gradient(120deg,#fff2eb,#ffede5) !important; background-image: linear-gradient(120deg,#fff2eb,#ffede5) !important;
        border-color: #f7ded2 !important; color: #8b5a4d !important; --np-card-background: linear-gradient(120deg,#fff2eb,#ffede5); --np-card-border:#f7ded2; --np-text-color:#8b5a4d;
      }
      html.np-bottom-menu-enabled #np-home-subject-grid .np-home-subject-card .np-home-subject-name {
        color: var(--np-text-color) !important;
      }
      .np-home-flashcard-card {
        grid-column: 1 / -1;
        width: 100%;
        --np-card-background: linear-gradient(120deg,#effbf8,#eaf8f5);
        background: var(--np-card-background) !important;
        border-color: #d7eee8;
        --np-text-color: #426d70;
      }
      @media (max-width: 480px) {
        html.np-bottom-menu-enabled #np-home-subject-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .np-home-subject-card { padding: 1rem; }
        .np-home-subject-icon { display: none; }
      }
      @media (prefers-reduced-motion: reduce) { .np-home-subject-card { transition: none; } }
    `;
    if (shouldAppendStyle) (document.head || document.documentElement).appendChild(style);
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