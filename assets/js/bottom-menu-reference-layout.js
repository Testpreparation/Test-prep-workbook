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
      if (track) track.style.transform = 'translateX(-50%)';
      if (page2) page2.style.display = '';
      const flashcardSubjects = document.getElementById('flashcard-subject-list-container');
      if (flashcardSubjects) flashcardSubjects.scrollTop = 0;
      setActive('home');
    });
  }
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
  const updateSemesterNavVisibility = () => {
    body.classList.toggle('np-semester-selection-open', getEnabled() && isSemesterSelectionOpen());
  };
  const modalObserver = new MutationObserver(updateSemesterNavVisibility);
  modalObserver.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
  updateSemesterNavVisibility();
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