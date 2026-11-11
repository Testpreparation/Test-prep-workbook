/* Nurse＋ UI/UX animations — isolated enhancement layer.
 * Keeps quiz, scoring, navigation, storage, theme, and LINE logic untouched.
 */
(() => {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.nursePlusAnimations === 'ready') return;
  document.documentElement.dataset.nursePlusAnimations = 'ready';

  const style = document.createElement('style');
  style.id = 'nurse-plus-animation-styles';
  style.textContent = `
    @keyframes npFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes npSoftPop { 0% { transform: scale(.985); } 65% { transform: scale(1.012); } 100% { transform: scale(1); } }
    @keyframes npProgressShine { from { background-position: 100% 0; } to { background-position: -100% 0; } }
    .np-anim-enter { animation: npFadeUp .28s ease-out both; }
    .np-anim-card { animation: npFadeUp .32s ease-out both; }
    .np-anim-press { transition: transform .14s ease, filter .14s ease, box-shadow .14s ease; }
    .np-anim-press:active { transform: scale(.975); filter: brightness(.97); }
    .np-anim-focus:focus-visible { outline: 3px solid rgba(167,139,250,.7); outline-offset: 3px; }
    @media (hover: hover) {
      .np-anim-press:hover { filter: brightness(1.035); }
    }
    @media (prefers-reduced-motion: reduce) {
      .np-anim-enter, .np-anim-card, .np-anim-press { animation: none !important; transition: none !important; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const interactiveSelector = 'button, [role="button"], input[type="button"], input[type="submit"], .option, .answer-option';
  const apply = (root) => {
    if (!(root instanceof Element)) return;
    if (root.matches(interactiveSelector)) {
      root.classList.add('np-anim-press', 'np-anim-focus');
    }
    root.querySelectorAll(interactiveSelector).forEach((el) => el.classList.add('np-anim-press', 'np-anim-focus'));
  };

  const animateNewContent = (root) => {
    if (!(root instanceof Element)) return;
    const candidates = root.matches('main, section, [role="tabpanel"], .card, .panel')
      ? [root]
      : Array.from(root.querySelectorAll('main, section, [role="tabpanel"], .card, .panel')).slice(0, 12);
    candidates.forEach((el, index) => {
      if (el.dataset.npAnimated === '1') return;
      el.dataset.npAnimated = '1';
      el.classList.add('np-anim-enter');
      el.style.animationDelay = Math.min(index * 25, 150) + 'ms';
      el.addEventListener('animationend', () => {
        el.classList.remove('np-anim-enter');
        el.style.removeProperty('animation-delay');
      }, { once: true });
    });
  };

  const init = () => {
    apply(document.body);
    animateNewContent(document.body);
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest(interactiveSelector) : null;
      if (target) {
        target.classList.remove('np-anim-card');
        void target.offsetWidth;
        target.classList.add('np-anim-card');
        window.setTimeout(() => target.classList.remove('np-anim-card'), 360);
      }
    }, true);

    // Only decorate content inserted by the existing app; do not alter its event handlers.
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          apply(node);
          animateNewContent(node);
        }
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
