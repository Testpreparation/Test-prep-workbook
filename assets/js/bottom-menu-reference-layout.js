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
  // リロード直後に空白にならないよう、下部メニューONなら科目一覧を初期表示する。
  const initializeBottomMenuHome = () => {
    if (!getEnabled()) return;
    const noticesPage = document.getElementById('np-bottom-menu-notices-page');
    if (noticesPage) noticesPage.classList.add('hidden');
    body.classList.remove('np-bottom-menu-notices-view', 'np-bottom-menu-analysis-view');
    let attempts = 0;
    const showHomeWhenReady = () => {
      if (!getEnabled()) return;
      const subjects = document.getElementById('screen-subjects');
      const subjectList = document.getElementById('subject-list-container');
      const showSubjectScreen = window.showSubjectScreen;
      if (typeof showSubjectScreen === 'function') {
        showSubjectScreen();
        if (subjects) subjects.classList.remove('hidden');
        setActive('home');
        // 初期化処理が後から画面を切り替えるケースに備え、短時間だけ再確認する。
        if (attempts < 12 && (!subjectList || subjectList.children.length === 0)) {
          attempts += 1;
          window.setTimeout(showHomeWhenReady, 250);
        }
        return;
      }
      if (attempts < 20) {
        attempts += 1;
        window.setTimeout(showHomeWhenReady, 250);
      }
    };
    showHomeWhenReady();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBottomMenuHome, { once: true });
  } else {
    window.setTimeout(initializeBottomMenuHome, 0);
  }
  // Reference-style full-width flashcard card after the subject grid.
  const subjectList = document.getElementById('subject-list-container');
  if (subjectList && !document.getElementById('np-bottom-flashcard-card')) {
    const flashcardCard = document.createElement('button');
    flashcardCard.type = 'button';
    flashcardCard.id = 'np-bottom-flashcard-card';
    flashcardCard.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="5" width="19" height="22" rx="3" transform="rotate(-8 4 5)"></rect><rect x="9" y="7" width="19" height="22" rx="3"></rect><path d="M14 14h9M14 18h9M14 22h6"></path></svg><span class="np-bottom-flashcard-title">暗記カード</span><svg class="np-bottom-flashcard-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>';
    subjectList.insertAdjacentElement('afterend', flashcardCard);
    flashcardCard.addEventListener('click', () => {
      const track = document.getElementById('subjects-slider-track');
      const page2 = document.getElementById('slider-page-2');
      const page1 = document.getElementById('slider-page-1');
      const dots = document.getElementById('subject-page-dots');
      if (track) track.style.transform = 'translateX(-50%)';
      if (page2) page2.style.display = '';
      if (page1) page1.setAttribute('aria-hidden', 'true');
      if (page2) page2.setAttribute('aria-hidden', 'false');
      if (dots && getEnabled()) dots.classList.add('np-bottom-menu-hide-subject-dots');
      const flashcardSubjects = document.getElementById('flashcard-subject-list-container');
      if (flashcardSubjects) flashcardSubjects.scrollTop = 0;
      setActive('home');
    });
  }
  if (nav) nav.addEventListener('click', event => {
    const button = event.target.closest('button[data-np-nav]');
    if (!button) return;
    const route = button.dataset.npNav;
    // 別ページへ移動したら専用お知らせページを必ず閉じる。
    const noticesPage = document.getElementById('np-bottom-menu-notices-page');
    if (route !== 'notices' && noticesPage) noticesPage.classList.add('hidden');
    if (route !== 'notices') body.classList.remove('np-bottom-menu-notices-view');
    if (route !== 'analytics') body.classList.remove('np-bottom-menu-analysis-view');
    setActive(route);
    if (route === 'home') {
      if (typeof window.showSubjectScreen === 'function') window.showSubjectScreen();
    } else if (route === 'analytics') {
      document.body.classList.add('np-bottom-menu-analysis-view');
      document.body.classList.remove('np-bottom-menu-notices-view');
      if (typeof window.showDataAnalysis === 'function') window.showDataAnalysis();
      window.setTimeout(() => {
        const screen = document.getElementById('screen-data-analysis');
        if (screen) {
          screen.querySelectorAll('button').forEach(button => {
            if (/戻る|ホーム/.test(button.innerText || '') && button.getClientRects().length) button.classList.add('np-analysis-hide-home-button');
          });
        }
      }, 100);
    } else if (route === 'notices') {
      document.body.classList.remove('np-bottom-menu-analysis-view');
      document.body.classList.add('np-bottom-menu-notices-view');
      document.querySelectorAll('[id^="screen-"]').forEach(el => el.classList.add('hidden'));
      const page = document.getElementById('np-bottom-menu-notices-page');
      if (page) {
        page.classList.remove('hidden');
        const source = document.querySelector('#notice-modal .notice-list, #notice-modal .modal-body, #notice-modal .p-4, #notice-modal');
        const target = document.getElementById('np-bottom-menu-notices-content');
        if (source && target && !target.dataset.loaded) {
          target.innerHTML = source.innerHTML;
          target.dataset.loaded = 'true';
        }
      }
    } else if (route === 'settings') {
      const overlay = document.getElementById('user-settings-overlay');
      const modal = document.getElementById('user-settings-modal');
      if (overlay) overlay.classList.remove('hidden');
      if (modal) modal.classList.remove('hidden');
    }
  });
  // 学期選択モーダルが表示されている間は、下部ナビゲーションを隠す。
  const isSemesterSelectionOpen = () => {
    const candidates = document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, [id*="modal"], [class*="modal"]');
    return Array.from(candidates).some(el => {
      if (!el || el.offsetParent === null || el.getClientRects().length === 0) return false;
      const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ');
      const hasSemesterChoice = /学期/.test(text) && /(春|秋|学期選択|学期を選択)/.test(text);
      return hasSemesterChoice && el.querySelectorAll('button,[role="button"]').length > 0;
    });
  };
  const isStudyFlowOpen = () => {
    // 学期選択から問題演習・結果・終了画面まで、学習フロー中は下部メニューを隠す。
    const visibleDialog = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, [id*="modal"], [class*="modal"]'))
      .some(el => el && el.offsetParent !== null && el.getClientRects().length > 0 &&
        /学期/.test((el.innerText || el.textContent || '').replace(/\\s+/g, ' ')) &&
        el.querySelectorAll('button,[role="button"]').length > 0);
    if (visibleDialog) return true;
    const candidates = document.querySelectorAll('[id*="quiz"], [id*="exercise"], [id*="question"], [id*="result"], [id*="semester"], [class*="quiz"], [class*="exercise"], [class*="question"], [class*="result"], [class*="semester"]');
    return Array.from(candidates).some(el => {
      if (!el || el.offsetParent === null || el.getClientRects().length === 0) return false;
      const idClass = ((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
      const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ');
      const isStudyContainer = /(quiz|exercise|question|result|semester|exam|test|practice)/.test(idClass) ||
        /^(学期選択|問題演習|演習問題|解答結果|結果画面|演習終了)/.test(text);
      return isStudyContainer && !el.classList.contains('hidden');
    });
  };
  const updateSemesterNavVisibility = () => {
    const inStudyFlow = getEnabled() && isStudyFlowOpen();
    body.classList.toggle('np-semester-selection-open', inStudyFlow);
    body.classList.toggle('np-study-flow-open', inStudyFlow);
  };
  const modalObserver = new MutationObserver(updateSemesterNavVisibility);
  modalObserver.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
  updateSemesterNavVisibility();
  const updateActiveFromScreen = () => {
    if (!getEnabled()) return;
    const subjects = document.getElementById('screen-subjects');
    const analytics = document.getElementById('screen-data-analysis');
    const notices = document.getElementById('np-bottom-menu-notices-page');
    if (notices && !notices.classList.contains('hidden')) setActive('notices');
    else if (subjects && !subjects.classList.contains('hidden')) { setActive('home'); body.classList.remove('np-bottom-menu-analysis-view','np-bottom-menu-notices-view'); }
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