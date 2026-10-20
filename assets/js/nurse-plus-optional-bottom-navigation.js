/* Optional bottom navigation + scoped notice scroll effects. */
(() => {
  const KEY = 'nurse_plus_bottom_menu_enabled';
  const root = document.documentElement;
  const getToggle = () => document.getElementById('np-bottom-menu-toggle');

  function apply(enabled) {
    root.classList.toggle('np-bottom-menu-enabled', enabled);
    const control = getToggle();
    if (control) control.checked = enabled;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (_) {}
  }

  function init() {
    let enabled = false;
    try { enabled = localStorage.getItem(KEY) === '1'; } catch (_) {}
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
      try { enabled = localStorage.getItem(KEY) === '1'; } catch (_) {}
      if (control.checked !== enabled) control.checked = enabled;
    });
    settingsObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#np-bottom-navigation [data-np-bottom-nav]');
    if (!button) return;

    document.querySelectorAll('#np-bottom-navigation [data-np-bottom-nav]').forEach(item => item.removeAttribute('aria-current'));
    button.setAttribute('aria-current', 'page');

    if (button.dataset.npBottomNav === 'settings') {
      if (typeof window.openUserSettings === 'function') {
        window.openUserSettings();
      } else {
        console.warn('[Nurse＋] 既存の設定画面を開く関数が見つかりません。');
      }
    } else if (button.dataset.npBottomNav === 'notices') {
      if (typeof window.openNoticeModal === 'function') {
        window.openNoticeModal();
        window.requestAnimationFrame(initNoticeEffects);
      } else {
        console.warn('[Nurse＋] 既存のお知らせ画面を開く関数が見つかりません。');
      }
    }
  });

  // Also initialize when the existing top-level notification button opens the modal.
  document.addEventListener('click', event => {
    if (event.target.closest('[onclick*="openNoticeModal"]')) {
      window.requestAnimationFrame(initNoticeEffects);
    }
  });
})();