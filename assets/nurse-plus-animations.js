/* Nurse+ animation-only enhancements.
 * This file intentionally contains no analytics, theme, scoring, storage, or navigation logic.
 * Honors the user's reduced-motion preference.
 */
(() => {
  'use strict';
  if (document.getElementById('nurse-plus-animations-style')) return;
  const style = document.createElement('style');
  style.id = 'nurse-plus-animations-style';
  style.textContent = `
    .glass-card button:not(:disabled),
    .glass-card [role="button"]:not([aria-disabled="true"]),
    #nav-drawer button:not(:disabled),
    [id^="modal-"] button:not(:disabled) {
      transition: transform .36s cubic-bezier(.22,1,.36,1), filter .32s ease, box-shadow .36s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .glass-card button:not(:disabled):active,
    .glass-card [role="button"]:not([aria-disabled="true"]):active,
    #nav-drawer button:not(:disabled):active,
    [id^="modal-"] button:not(:disabled):active {
      transform: scale(.96) translateY(1px);
      filter: brightness(1.04);
    }
    .glass-card button:focus-visible,
    .glass-card [role="button"]:focus-visible,
    #nav-drawer button:focus-visible,
    [id^="modal-"] button:focus-visible {
      outline: 2px solid rgba(56,189,248,.85);
      outline-offset: 3px;
    }
    @media (hover:hover) and (pointer:fine) {
      .glass-card button:not(:disabled):hover,
      .glass-card [role="button"]:not([aria-disabled="true"]):hover,
      #nav-drawer button:not(:disabled):hover,
      [id^="modal-"] button:not(:disabled):hover {
        transform: translateY(-2px);
        filter: brightness(1.045);
        box-shadow: 0 7px 18px rgba(15,23,42,.12);
      }
    }
    .evo-progress > span, #evo-mission-progress {
      transition: width 1.2s cubic-bezier(.22,1,.36,1);
    }
    #quiz-options-container > *, #quiz-options-container button, .quiz-option, [data-quiz-option] {
      transition: transform .4s cubic-bezier(.22,1,.36,1), border-color .38s ease, background-color .38s ease, box-shadow .4s ease, opacity .38s ease;
      -webkit-tap-highlight-color: transparent;
    }
    #quiz-options-container button:active, .quiz-option:active, [data-quiz-option]:active { transform: scale(.985); }
    .np-animation-correct { animation: npAnimationPop .62s cubic-bezier(.22,1,.36,1) both; }
    .np-animation-incorrect { animation: npAnimationShake .58s ease-out; }
    @keyframes npAnimationPop { from { opacity:.65; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
    @keyframes npAnimationShake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
    @media (prefers-reduced-motion: reduce) {
      .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]),
      #nav-drawer button:not(:disabled), [id^="modal-"] button:not(:disabled),
      #quiz-options-container > *, #quiz-options-container button, .quiz-option, [data-quiz-option],
      .evo-progress > span, #evo-mission-progress {
        transition-duration: .01ms !important;
        animation-duration: .01ms !important;
      }
    }
  `;
  document.head.appendChild(style);

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // Delegate events so newly rendered buttons and options receive the same feedback.
  let pressedTarget = null;
  const pressAnimations = new WeakMap();
  function releasePressedTarget() {
    const target = pressedTarget;
    pressedTarget = null;
    if (!target) return;
    const previous = pressAnimations.get(target);
    if (previous) previous.cancel();
    if (typeof target.animate !== 'function') return;
    pressAnimations.set(target, target.animate(
      [
        { transform:'scale(.945) translateY(1px)' },
        { transform:'scale(1.035) translateY(-1px)', offset:.62 },
        { transform:'scale(1) translateY(0)' }
      ],
      { duration:430, easing:'cubic-bezier(.22,1,.36,1)' }
    ));
  }
  document.addEventListener('pointerdown', event => {
    const target = event.target.closest('button, [role="button"]');
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    pressedTarget = target;
    const previous = pressAnimations.get(target);
    if (previous) previous.cancel();
    if (typeof target.animate === 'function') {
      pressAnimations.set(target, target.animate(
        [{ transform:'scale(1) translateY(0)' }, { transform:'scale(.945) translateY(1px)' }],
        { duration:155, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards' }
      ));
    }
  }, {passive:true});
  document.addEventListener('pointerup', releasePressedTarget, {passive:true});
  document.addEventListener('pointercancel', releasePressedTarget, {passive:true});
  window.addEventListener('blur', releasePressedTarget);

  document.addEventListener('click', event => {
    const target = event.target.closest('button, [role="button"], [data-quiz-option], .quiz-option');
    if (event.detail !== 0 || !target || target.matches(':disabled,[aria-disabled="true"]')) return;
    if (typeof target.animate === 'function') target.animate(
      [{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],
      {duration:380,easing:'cubic-bezier(.22,1,.36,1)'}
    );
  });

  document.addEventListener('click', event => {
    const option = event.target.closest('#quiz-options-container button, .quiz-option, [data-quiz-option]');
    if (!option || option.matches(':disabled,[aria-disabled="true"]')) return;
    const container = option.closest('#quiz-options-container');
    if (container) container.querySelectorAll('.np-animation-selected').forEach(el => el.classList.remove('np-animation-selected'));
    option.classList.add('np-animation-selected');
    if (typeof option.animate === 'function') option.animate(
      [{transform:'scale(.985)'},{transform:'scale(1.012)'},{transform:'scale(1)'}],
      {duration:420,easing:'cubic-bezier(.22,1,.36,1)'}
    );
  }, true);

  // Animate screen/panel entrances when existing code changes visibility.
  const observer = new MutationObserver(records => {
    const seen = new Set();
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      const candidates = [node, ...node.querySelectorAll('[id^="screen-"], main > section')];
      candidates.forEach(screen => {
        if (!(screen instanceof HTMLElement) || seen.has(screen)) return;
        seen.add(screen);
        const wasHidden = screen.classList.contains('hidden') || screen.hidden;
        if (wasHidden) return;
        if (!screen.matches('[id^="screen-"], main > section')) return;
        if (typeof screen.animate === 'function') screen.animate(
          [{opacity:0,transform:'translateY(14px) scale(.992)',filter:'blur(1.5px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],
          {duration:720,easing:'cubic-bezier(.22,1,.36,1)'}
        );
        Array.from(screen.children).filter(el => el.matches('section, article, .glass-card, .card-item, .space-y-4 > div, .grid > *')).forEach((panel,index) => {
          if (typeof panel.animate !== 'function') return;
          panel.animate(
            [{opacity:0,transform:'translateY(18px) scale(.985)',filter:'blur(1px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],
            {duration:560,delay:Math.min(index*85,510),easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}
          );
        });
      });
    }));
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
})();
