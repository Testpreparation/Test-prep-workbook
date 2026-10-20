/* Optional bottom navigation + scoped notice scroll effects. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');

  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', enabled);
    setupHomeSubjectCardStyles();
    setupHomeSubjectCards();
    syncBottomMenuHomePresentation();
    setupBottomFlashcardHomeLayout();
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
  function normalizeBottomMenuBreadcrumb() {
    if (!root.classList.contains('np-bottom-menu-enabled')) return;
    const subjectScreen = document.getElementById('screen-subject');
    if (!subjectScreen) return;
    subjectScreen.querySelectorAll('[aria-label*="breadcrumb" i], nav, .breadcrumb, .breadcrumbs, [class*="breadcrumb"], [class*="Breadcrumb"]').forEach(container => {
      const nodes = Array.from(container.querySelectorAll('a, button, span, li'));
      nodes.forEach(node => {
        if ((node.textContent || '').trim() === '科目一覧') node.textContent = 'ホーム';
      });
    });
  }

  function styleFlashcardSubjectList() {
    if (!root.classList.contains('np-bottom-menu-enabled')) return;
    const screens = Array.from(document.querySelectorAll('[id*="flashcard"], [class*="flashcard"], [id*="memor"], [class*="memor"]'));
    screens.forEach(screen => {
      screen.querySelectorAll('button, .card, [class*="card"]').forEach(card => {
        if (card.closest('#np-home-subject-grid')) return;
        card.classList.add('np-flashcard-subject-match-home');
      });
    });
  }

  function syncBottomMenuHomePresentation() {
    normalizeBottomMenuBreadcrumb();
    styleFlashcardSubjectList();
  }

  // In bottom-menu mode, present flashcard subjects as home-style cards and
  // provide a matching card-shaped return action at the bottom of the page.
  function setupBottomFlashcardHomeLayout() {
    const enabled = root.classList.contains('np-bottom-menu-enabled');
    const page = document.getElementById('slider-page-2');
    if (!page) return;
    page.classList.toggle('np-bottom-flashcard-home-layout', enabled);
    let back = document.getElementById('np-flashcard-home-return');
    if (!back) {
      back = document.createElement('button');
      back.id = 'np-flashcard-home-return';
      back.type = 'button';
      back.className = 'np-home-subject-card np-flashcard-home-return';
      back.innerHTML = '<span class="np-home-subject-icon" aria-hidden="true">⌂</span><span class="np-home-subject-name">ホームに戻る</span><span class="np-home-subject-status" aria-hidden="true">›</span>';
      back.addEventListener('click', () => {
        if (typeof window.showDashboard === 'function') window.showDashboard();
        else {
          const dashboard = document.getElementById('screen-dashboard');
          if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
          if (dashboard) dashboard.classList.remove('hidden');
        }
      });
      page.appendChild(back);
    }
    back.hidden = !enabled;
  }

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
        { id: 'anatomy', code: 'ANA', name: '解剖学', subtitle: '過去問・小テスト対応' },
        { id: 'biochemistry', code: 'BIO', name: '生化学', subtitle: '過去問・小テスト対応' },
        { id: 'physiology', code: 'PHY', name: '生理学', subtitle: '過去問・小テスト対応' },
        { id: 'public_health', code: 'PH', name: '公衆衛生学', subtitle: '過去問・小テスト対応' },
        { id: 'public_health_nursing', code: 'PHN', name: '公衆衛生看護学概論', subtitle: '過去問・小テスト対応' },
        { id: 'nutrition', code: 'NUT', name: '栄養学', subtitle: '過去問・小テスト対応' },
        { id: 'pharmacology', code: 'PHA', name: '薬理学', subtitle: '過去問・小テスト対応' },
        { id: 'nursing_method_3', code: 'NUR', name: '看護学方法論Ⅲ', subtitle: '過去問・小テスト対応' }
      ];
      subjects.forEach(subject => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'np-home-subject-card np-home-subject-card-neutral';
        card.innerHTML = '<span class="np-home-subject-code" aria-hidden="true">' + subject.code + '</span><span class="np-home-subject-copy"><span class="np-home-subject-name">' + subject.name + '</span><span class="np-home-subject-subtitle">' + subject.subtitle + '</span></span>';
        card.addEventListener('click', () => {
          // Open the selected subject's normal semester/mode flow directly.
          // Showing #screen-subjects here exposes the OFF-mode subject list
          // underneath the bottom-menu home, so skip that intermediate screen.
          if (typeof window.selectSubject === 'function') {
            window.selectSubject(subject.id);
          }
        });
        });
        grid.appendChild(card);
      });
      const flashcards = document.createElement('button');
      flashcards.type = 'button';
      flashcards.className = 'np-home-subject-card np-home-flashcard-card np-tone-mint';
      flashcards.innerHTML = '<span class="np-home-subject-icon" aria-hidden="true">▤</span><span class="np-home-subject-name">暗記カード</span><span class="np-home-subject-status" aria-hidden="true">›</span>';
      flashcards.addEventListener('click', () => {
        if (typeof window.showSubjectScreen === 'function') window.showSubjectScreen();
        window.requestAnimationFrame(() => {
          if (typeof window.switchSubjectPage === 'function') window.switchSubjectPage(1);
          setupBottomFlashcardHomeLayout();
          styleFlashcardSubjectList();
        });
      });
      grid.appendChild(flashcards);
      dashboard.insertBefore(grid, dashboard.firstChild);
    }
    const enabled = root.classList.contains('np-bottom-menu-enabled');
    dashboard.classList.toggle('np-home-subject-mode', enabled);
    grid.hidden = !enabled;

    // Keep the legacy OFF-mode subject list hidden while the bottom-menu home is active.
    // The home cards still open the existing semester/mode flow when selected.
    if (enabled) {
      const subjectList = document.getElementById('screen-subjects');
      if (subjectList && !subjectList.classList.contains('hidden')) {
        subjectList.classList.add('np-bottom-menu-suppressed-subject-list');
      }
    } else {
      document.querySelectorAll('.np-bottom-menu-suppressed-subject-list').forEach(screen => {
        screen.classList.remove('np-bottom-menu-suppressed-subject-list');
      });
    }
  }

  function setupHomeSubjectCardStyles() {
    if (document.getElementById('np-home-subject-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'np-home-subject-card-styles';
    style.textContent = `
      html.np-bottom-menu-enabled .np-flashcard-subject-match-home {
        border-radius: 22px !important;
        box-sizing: border-box;
        box-shadow: none;
      }
      html.np-bottom-menu-enabled #slider-page-2.np-bottom-flashcard-home-layout { gap: 12px; }
      html.np-bottom-menu-enabled #slider-page-2.np-bottom-flashcard-home-layout #fc-step-1-subject-select { width: 100%; }
      html.np-bottom-menu-enabled #slider-page-2.np-bottom-flashcard-home-layout #flashcard-subject-list-container {
        display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; max-height: none; padding: 4px 0 12px;
      }
      html.np-bottom-menu-enabled #flashcard-subject-list-container > * {
        min-width: 0; width: 100%; min-height: 88px; border-radius: 22px !important; box-sizing: border-box;
      }
      html.np-bottom-menu-enabled #flashcard-subject-list-container > *:not(.np-tone-mint) {
        background: rgba(255,255,255,.96) !important; border-color: #e5e7eb !important; color: #334155 !important; box-shadow: 0 2px 8px rgba(15,23,42,.04) !important;
      }
      html.np-bottom-menu-enabled #flashcard-subject-list-container > *:not(.np-tone-mint) .np-home-subject-icon,
      html.np-bottom-menu-enabled #flashcard-subject-list-container > *:not(.np-tone-mint) [class*='icon'] { color: #64748b !important; }
      html.np-bottom-menu-enabled #np-flashcard-home-return { display: flex; grid-column: 1 / -1; width: 100%; margin-top: 4px; }
      html.np-bottom-menu-enabled #np-flashcard-home-return[hidden] { display: none !important; }
      #np-home-subject-grid { display: none; box-sizing: border-box; }
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode > :not(#np-home-subject-grid) { display: none !important; }
      #np-home-subject-grid[hidden] { display: none !important; }
      html.np-bottom-menu-enabled #screen-subjects.np-bottom-menu-suppressed-subject-list { display: none !important; }
      html.np-bottom-menu-enabled #screen-dashboard.np-home-subject-mode { display: block !important; width: 100%; min-width: 0; }
      html.np-bottom-menu-enabled #np-home-subject-grid {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch;
        gap: 14px; width: 100%; max-width: 100%; margin: 0; padding: 4px 0 12px; box-sizing: border-box;
      }
      .np-home-subject-card {
        min-width: 0; width: 100%; min-height: 88px; display: flex; align-items: center; gap: 18px;
        padding: 18px 22px; border-radius: 22px; text-align: left; justify-content: flex-start;
        color: #5f5878; border: 1px solid var(--np-card-border, #f1e7f2); box-sizing: border-box; appearance: none; -webkit-appearance: none;
        box-shadow: 0 5px 16px rgba(133,112,156,.07); transition: transform .18s ease, box-shadow .18s ease;
      }
      .np-home-subject-card:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(133,112,156,.12); }
      /* Ordinary subject cards match the existing bottom-menu-OFF cards. */
      .np-home-subject-card-neutral { background: rgba(255,255,255,.96) !important; border-color: #e5e7eb !important; color: #334155 !important; --np-icon-color: currentColor; --np-text-color: #334155; box-shadow: 0 2px 8px rgba(15,23,42,.04); }
      .np-home-subject-card-neutral { min-height: 112px; gap: 20px; padding: 20px 24px; border-color: #e4ccff !important; color: #8b6bb5 !important; border-radius: 32px; }
      .np-home-subject-code { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 64px; min-width: 64px; height: 40px; padding: 0 10px; border: 1px solid #dfc3ff; border-radius: 13px; color: #8b6bb5; background: rgba(255,255,255,.7); font-size: 14px; font-weight: 700; box-sizing: border-box; }
      .np-home-subject-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; gap: 5px; }
      .np-home-subject-card-neutral .np-home-subject-name { color: #8061a9 !important; font-size: 20px; font-weight: 700; }
      .np-home-subject-subtitle { color: #a79ab9; font-size: 14px; font-weight: 400; line-height: 1.4; }
      .np-home-subject-card-neutral .np-home-subject-icon { color: #64748b !important; filter: grayscale(1); }
      .np-home-subject-card-neutral .np-home-subject-status { color: #94a3b8 !important; }
      .np-home-subject-card-neutral:hover { background: #f8fafc !important; box-shadow: 0 4px 12px rgba(15,23,42,.07); }
      .np-tone-pink { background: linear-gradient(120deg,#fff0f6,#fcebf3); --np-card-border:#f5dce9; --np-icon-color:#e979ad; --np-text-color:#8c5276; }
      .np-tone-amber { background: linear-gradient(120deg,#fff8ec,#fff4e6); --np-card-border:#f4e7d3; --np-icon-color:#e8b65c; --np-text-color:#866641; }
      .np-tone-blue { background: linear-gradient(120deg,#eff5ff,#edf2ff); --np-card-border:#dce7fb; --np-icon-color:#6b9fe8; --np-text-color:#4c668f; }
      .np-tone-mint { background: linear-gradient(120deg,#effbf8,#eaf8f5); --np-card-border:#d7eee8; --np-icon-color:#54b9ad; --np-text-color:#426d70; }
      .np-tone-lavender { background: linear-gradient(120deg,#f8f1ff,#f4edff); --np-card-border:#e9def7; --np-icon-color:#a57ad4; --np-text-color:#70578e; }
      .np-tone-peach { background: linear-gradient(120deg,#fff2eb,#ffede5); --np-card-border:#f7ded2; --np-icon-color:#e9a064; --np-text-color:#8b5a4d; }
      .np-home-subject-icon { display:inline-flex; align-items:center; justify-content:center; flex:0 0 48px; width:48px; height:48px; color:var(--np-icon-color); font-size:38px; font-weight:700; line-height:1; }
      .np-home-subject-name { min-width:0; flex:1; font-size:16px; font-weight:600; line-height:1.45; overflow-wrap:anywhere; color:var(--np-text-color); }
      .np-home-subject-status { flex:0 0 auto; color:var(--np-icon-color); font-size:30px; line-height:1; }
      .np-home-flashcard-card { grid-column:1 / -1; width:100%; }
      @media (min-width:900px) {
        html.np-bottom-menu-enabled #np-home-subject-grid { grid-template-columns:1fr; gap:14px; }
        .np-home-subject-card { padding:18px 22px; }
      }
      @media (max-width:899px) {
        html.np-bottom-menu-enabled #np-home-subject-grid { grid-template-columns:1fr; gap:12px; }
      }
      @media (max-width:480px) {
        .np-home-subject-card { min-height:96px; padding:14px 12px; gap:10px; }
        .np-home-subject-code { flex-basis:56px; min-width:56px; height:40px; font-size:12px; }
        .np-home-subject-card-neutral .np-home-subject-name { font-size:18px; }
        .np-home-subject-subtitle { font-size:13px; }
        .np-home-subject-icon { flex-basis:38px; width:38px; height:38px; font-size:30px; }
        .np-home-subject-name { font-size:14px; }
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