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
        card.className = 'card-item w-full p-4 rounded-xl text-left flex items-center justify-between group np-home-subject-card';
        card.innerHTML = '<div class="flex items-center gap-3"><span class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">' + subject.code + '</span><div><div class="text-sm font-medium text-slate-100 group-hover:text-amber-300 transition np-home-subject-name">' + subject.name + '</div><div class="text-[11px] text-slate-400 font-light mt-0.5 np-home-subject-description">過去問・小テスト対応</div></div></div><div class="flex items-center gap-3"><div class="text-right"><div class="text-[10px] text-slate-500 font-light">平均正答率</div><div class="text-xs font-mono font-semibold text-slate-600">-- %</div></div><span class="text-slate-500 group-hover:text-amber-400 transition text-sm np-home-subject-status" aria-hidden="true">→</span></div>';
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
      flashcards.className = 'card-item w-full p-4 rounded-xl text-left flex items-center justify-between group np-home-subject-card np-home-flashcard-card';
      flashcards.innerHTML = '<div class="flex items-center gap-3"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-mono text-xs font-bold" aria-hidden="true">FC</span><div><div class="text-sm font-medium text-slate-100 group-hover:text-amber-300 transition np-home-subject-name">暗記カード</div><div class="text-[11px] text-slate-400 font-light mt-0.5">暗記カード</div></div></div><span class="text-slate-500 group-hover:text-amber-400 transition text-sm np-home-subject-status" aria-hidden="true">→</span>';
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
    if (document.getElementById('np-home-subject-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'np-home-subject-card-styles';
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
        min-width: 0;
        width: 100%;
        min-height: 0;
        color: inherit;
        border-radius: .75rem;
        box-shadow: none;
        transition: all .2s ease-in-out;
      }
      .np-home-subject-card:hover:not(:disabled) {
        background: rgba(30, 41, 59, .9);
        border-color: rgba(217, 119, 6, .4);
        transform: translateY(-2px);
      }
      .np-home-subject-card .np-home-subject-name { color: #f1f5f9; }
      .np-home-subject-card .np-home-subject-status { font-size: 14px; }
      .np-tone-pink { background: linear-gradient(120deg,#fff0f6,#fcebf3); --np-card-border:#f5dce9; --np-icon-color:#e979ad; --np-text-color:#8c5276; }
      .np-tone-amber { background: linear-gradient(120deg,#fff8ec,#fff4e6); --np-card-border:#f4e7d3; --np-icon-color:#e8b65c; --np-text-color:#866641; }
      .np-tone-blue { background: linear-gradient(120deg,#eff5ff,#edf2ff); --np-card-border:#dce7fb; --np-icon-color:#6b9fe8; --np-text-color:#4c668f; }
      .np-tone-mint { background: linear-gradient(120deg,#effbf8,#eaf8f5); --np-card-border:#d7eee8; --np-icon-color:#54b9ad; --np-text-color:#426d70; }
      .np-tone-lavender { background: linear-gradient(120deg,#f8f1ff,#f4edff); --np-card-border:#e9def7; --np-icon-color:#a57ad4; --np-text-color:#70578e; }
      .np-tone-peach { background: linear-gradient(120deg,#fff2eb,#ffede5); --np-card-border:#f7ded2; --np-icon-color:#e9a064; --np-text-color:#8b5a4d; }
      .np-home-subject-icon { display:none; }
      .np-home-subject-code { display:none; }
      .np-home-subject-content { min-width:0; flex:1; display:flex; flex-direction:column; align-items:flex-start; gap:4px; }
      .np-home-subject-name { min-width: 0; font-size: inherit; font-weight: inherit; line-height: inherit; overflow-wrap: anywhere; }
      .np-home-subject-description { font-size: inherit; line-height: inherit; }
      .np-home-subject-status { flex: 0 0 auto; line-height: 1; }
      .np-home-flashcard-card {
        grid-column: 1 / -1;
        width: 100%;
        background: linear-gradient(120deg,#effbf8,#eaf8f5);
        border-color: #d7eee8;
        --np-icon-color: #54b9ad;
        --np-text-color: #426d70;
      }
      @media (max-width: 480px) {
        html.np-bottom-menu-enabled #np-home-subject-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .np-home-subject-card { padding: 1rem; }
        .np-home-subject-icon { display: none; }
      }
      @media (prefers-reduced-motion: reduce) { .np-home-subject-card { transition: none; } }
    `;
    (document.head || document.documentElement).appendChild(style);
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