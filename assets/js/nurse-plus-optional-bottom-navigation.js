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
        { id: 'physiology', code: 'PHY', name: '生理学', subtitle: '過去問・小テスト対応', accuracy: '20%' },
        { id: 'biochemistry', code: 'BIO', name: '生化学', subtitle: '選択式・記述式対応', accuracy: '85%' },
        { id: 'anatomy', code: 'ANA', name: '解剖学', subtitle: '練習問題・応用問題対応', accuracy: '40%' },
        { id: 'public_health_nursing', code: 'PHN', name: '公衆衛生看護学概論', subtitle: '練習問題・演習問題対応', accuracy: '-- %' },
        { id: 'public_health', code: 'PUB', name: '公衆衛生学', subtitle: '過去問・演習問題・模擬国試対応', accuracy: '20%' },
        { id: 'nutrition', code: 'NUT', name: '栄養学', subtitle: '過去問演習・問題数選択可', accuracy: '-- %' },
        { id: 'pathology', code: 'PAT', name: '病理学', subtitle: '過去問演習・問題数選択可', accuracy: '-- %' },
        { id: 'pharmacology', code: 'PHA', name: '薬理学', subtitle: '過去問・演習問題対応', accuracy: '-- %' },
        { id: 'nursing_method_3', code: 'NUR', name: '看護学方法論Ⅲ', subtitle: '練習問題・応用問題対応', accuracy: '-- %' }
      ];
      subjects.forEach(subject => {
        const card = document.createElement('button');
        card.type = 'button';
        // Reuse the regular subject-list card surface, displaying only the subject name and arrow.
        card.className = 'card-item np-home-subject-card';
        card.innerHTML =
          '<span class="np-home-subject-name">' + subject.name + '</span>' +
          '<span class="np-subject-arrow" aria-hidden="true">→</span>';
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
      const mintPalette = { background: 'linear-gradient(120deg,#effbf8,#eaf8f5)', border: '#d7eee8', text: '#426d70' };
      flashcards.style.setProperty('background', mintPalette.background, 'important');
      flashcards.style.setProperty('background-image', mintPalette.background, 'important');
      flashcards.style.setProperty('border-color', mintPalette.border, 'important');
      flashcards.style.setProperty('color', mintPalette.text, 'important');
      flashcards.style.setProperty('--np-card-background', mintPalette.background);
      flashcards.style.setProperty('--np-card-border', mintPalette.border);
      flashcards.style.setProperty('--np-text-color', mintPalette.text);
      const flashcardName = flashcards.querySelector('.np-home-subject-name');
      if (flashcardName) flashcardName.style.setProperty('color', mintPalette.text, 'important');
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
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
        width: 100%;
        padding: 4px 0 12px;
      }
      /* Subject rows use the existing .card-item theme styles without a separate palette. */
      .np-home-subject-card:not(.np-home-flashcard-card) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        width: 100%;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .np-home-subject-card:not(.np-home-flashcard-card) .np-home-subject-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .np-home-subject-card:not(.np-home-flashcard-card) .np-subject-arrow {
        flex: 0 0 auto;
        margin-left: 12px;
      }
      /* Do not define a separate pastel palette for subject cards. */
      .np-home-flashcard-card {
        grid-column: 1 / -1;
        width: 100%;
        --np-card-background: linear-gradient(120deg,#effbf8,#eaf8f5);
        background: var(--np-card-background) !important;
        border-color: #d7eee8;
        --np-text-color: #426d70;
      }
      @media (max-width: 480px) {
        html.np-bottom-menu-enabled #np-home-subject-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
        .np-home-subject-card:not(.np-home-flashcard-card) { padding: 12px; }
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