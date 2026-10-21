/* Nurse＋チュートリアル：実際の画面要素をプレビューし、初回LINEログイン時のみ自動表示。 */
(function () {
  'use strict';
  const SEEN_KEY = 'nurse_plus_tutorial_seen_v2';
  const PENDING_KEY = 'nurse_plus_tutorial_pending_first_login';
  const steps = [
    { title: 'Nurse＋へようこそ', body: 'このガイドでは、科目の選び方から問題演習、学習記録の確認までをご案内します。下のプレビューには、現在のアプリ画面の要素をそのまま使用します。', selectors: ['#screen-dashboard', '#screen-dashboard-bottom-menu'] },
    { title: '科目を選ぶ', body: 'ホーム／科目一覧から学習したい科目を選びます。科目カードの表示や色、文字はアプリ本来のデザインのままです。', selectors: ['#screen-subjects', '#screen-dashboard', '#screen-dashboard-bottom-menu'] },
    { title: '問題の種類を確認する', body: '科目を選択すると学期や問題モードを選べます。登録されている問題の種類は、実際に表示されるモード名と問題データを確認してください。星印があるカードは、問題データが登録されている目印です。', selectors: ['#screen-semester-select', '[id*="mode-select"]', '#screen-subjects'] },
    { title: '問題を解いて解説を確認する', body: '問題画面で選択肢を選び、回答後に正解と解説を確認します。終了後は画面に表示される結果を確認してください。', selectors: ['#screen-quiz-play', '#screen-quiz-start', '#screen-quiz-result'] },
    { title: '学習記録・暗記カードを使う', body: 'データ分析で学習状況を振り返り、必要に応じて科目カードの暗記カード機能を利用できます。ハンバーガーメニューの「チュートリアル」から、いつでも見直せます。', selectors: ['#screen-data-analysis', '#screen-bottom-menu-flashcard-subjects', '#screen-dashboard'] }
  ];
  let current = 0, overlay;
  function findPreview(step) {
    for (const selector of step.selectors || []) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const found = candidates.find(el => el && !el.closest('#np-first-tutorial'));
      if (found) return found;
    }
    const visibleScreen = Array.from(document.querySelectorAll('[id^="screen-"]')).find(el => !el.closest('#np-first-tutorial') && !el.classList.contains('hidden') && el.getClientRects().length);
    return visibleScreen || document.querySelector('#nav-drawer') || document.body;
  }
  function renderPreview(step) {
    const host = overlay.querySelector('[data-tutorial-preview]');
    host.replaceChildren();
    const source = findPreview(step);
    if (!source || source === document.body) {
      host.textContent = '実際のアプリ画面で操作場所をご確認ください。';
      return;
    }
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('hidden');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    clone.querySelectorAll('script, input, textarea, select, iframe').forEach(el => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'IFRAME') el.remove();
      else { el.disabled = true; el.setAttribute('aria-hidden', 'true'); }
    });
    clone.querySelectorAll('button, a').forEach(el => { el.removeAttribute('onclick'); el.setAttribute('tabindex', '-1'); });
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.maxHeight = '260px';
    clone.style.overflow = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.setAttribute('aria-hidden', 'true');
    host.appendChild(clone);
  }
  function render() {
    if (!overlay) return;
    const step = steps[current];
    overlay.querySelector('[data-tutorial-title]').textContent = step.title;
    overlay.querySelector('[data-tutorial-body]').textContent = step.body;
    overlay.querySelector('[data-tutorial-count]').textContent = (current + 1) + ' / ' + steps.length;
    overlay.querySelector('[data-tutorial-progress]').style.width = (((current + 1) / steps.length) * 100) + '%';
    overlay.querySelector('[data-tutorial-back]').disabled = current === 0;
    overlay.querySelector('[data-tutorial-next]').textContent = current === steps.length - 1 ? '終了' : '次へ';
    renderPreview(step);
  }
  function close(markSeen) {
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('np-tutorial-open');
    if (markSeen) {
      try { localStorage.setItem(SEEN_KEY, '1'); localStorage.removeItem(PENDING_KEY); } catch (_) {}
    }
  }
  function open() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'np-first-tutorial';
      overlay.className = 'np-tutorial-overlay hidden';
      overlay.innerHTML = '<section class="np-tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="np-tutorial-title"><div class="np-tutorial-eyebrow">NURSE＋ GUIDE</div><div class="np-tutorial-progress-track"><div data-tutorial-progress class="np-tutorial-progress"></div></div><div class="np-tutorial-meta"><span>チュートリアル</span><span data-tutorial-count></span></div><h2 id="np-tutorial-title" data-tutorial-title></h2><div class="np-tutorial-preview" data-tutorial-preview aria-label="アプリ画面プレビュー"></div><p data-tutorial-body></p><div class="np-tutorial-actions"><button type="button" data-tutorial-back>戻る</button><button type="button" data-tutorial-skip>スキップ</button><button type="button" data-tutorial-next>次へ</button></div></section>';
      document.body.appendChild(overlay);
      overlay.querySelector('[data-tutorial-back]').addEventListener('click', () => { if (current > 0) current--; render(); });
      overlay.querySelector('[data-tutorial-next]').addEventListener('click', () => { if (current < steps.length - 1) { current++; render(); } else close(true); });
      overlay.querySelector('[data-tutorial-skip]').addEventListener('click', () => close(true));
      overlay.addEventListener('click', event => { if (event.target === overlay) close(true); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) close(true); });
    }
    current = 0; render(); overlay.classList.remove('hidden');
    const next = overlay.querySelector('[data-tutorial-next]'); if (next) next.focus();
  }
  window.openNursePlusTutorial = open;
  function addDrawerItem() {
    const drawer = document.querySelector('#nav-drawer');
    if (!drawer || document.getElementById('np-open-tutorial-menu-item')) return;
    const menu = drawer.querySelector('.mt-6.space-y-2\\.5') || drawer.querySelector('.space-y-2\\.5');
    if (!menu) return;
    const button = document.createElement('button');
    button.id = 'np-open-tutorial-menu-item'; button.type = 'button';
    button.className = 'w-full text-left px-4 py-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 text-slate-200 text-xs transition flex items-center gap-3';
    button.innerHTML = '<span class="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 font-mono text-violet-300 text-[10px] font-bold">GUIDE</span><span class="font-medium">チュートリアル</span>';
    button.addEventListener('click', () => { if (typeof window.closeNavDrawer === 'function') window.closeNavDrawer(); open(); });
    const settings = menu.querySelector('#drawer-settings-accordion'); menu.insertBefore(button, settings || null);
  }
  function init() {
    addDrawerItem();
    // 自動表示は、今回以降の初めてのLINEログインで pending が設定された場合だけ。
    let pending = false, seen = false;
    try { pending = localStorage.getItem(PENDING_KEY) === '1'; seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (_) {}
    if (pending && !seen) window.setTimeout(open, 700);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();