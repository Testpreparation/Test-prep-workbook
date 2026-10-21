/* Nurse＋初回チュートリアル。既存画面の上に案内を重ね、画面そのものは複製しない。 */
(function () {
  'use strict';
  const SEEN_KEY = 'nurse_plus_tutorial_seen_v1';
  const steps = [
    { title: 'Nurse＋へようこそ', body: 'このチュートリアルでは、学習の始め方と主な機能をご案内します。実際の画面を見ながら確認できます。' },
    { title: '学習ホーム', body: '学習ホームでは科目カードから学習したい科目を選べます。カードの表示や色は、普段の画面そのままです。' },
    { title: '科目と問題モードを選択', body: '科目を選んだら、学期や問題モードを選んで演習を始めます。画面上のホームボタンや戻る操作も利用できます。' },
    { title: '学習記録を確認', body: 'データ分析では、学習記録や科目ごとの状況を確認できます。' },
    { title: 'メニューからいつでも確認', body: 'ハンバーガーメニューの「チュートリアル」から、いつでも最初から見直せます。準備ができたら学習を始めましょう。' }
  ];
  let current = 0, overlay;
  function render() {
    if (!overlay) return;
    const step = steps[current];
    overlay.querySelector('[data-tutorial-title]').textContent = step.title;
    overlay.querySelector('[data-tutorial-body]').textContent = step.body;
    overlay.querySelector('[data-tutorial-count]').textContent = (current + 1) + ' / ' + steps.length;
    overlay.querySelector('[data-tutorial-progress]').style.width = (((current + 1) / steps.length) * 100) + '%';
    overlay.querySelector('[data-tutorial-back]').disabled = current === 0;
    overlay.querySelector('[data-tutorial-next]').textContent = current === steps.length - 1 ? '終了' : '次へ';
  }
  function close(markSeen) {
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('np-tutorial-open');
    if (markSeen) { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {} }
  }
  function open() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'np-first-tutorial';
      overlay.className = 'np-tutorial-overlay hidden';
      overlay.innerHTML = '<section class="np-tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="np-tutorial-title"><div class="np-tutorial-eyebrow">NURSE＋ GUIDE</div><div class="np-tutorial-progress-track"><div data-tutorial-progress class="np-tutorial-progress"></div></div><div class="np-tutorial-meta"><span>チュートリアル</span><span data-tutorial-count></span></div><h2 id="np-tutorial-title" data-tutorial-title></h2><p data-tutorial-body></p><div class="np-tutorial-actions"><button type="button" data-tutorial-back>戻る</button><button type="button" data-tutorial-skip>スキップ</button><button type="button" data-tutorial-next>次へ</button></div></section>';
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
    const menu = document.querySelector('#nav-drawer .mt-6.space-y-2\\.5');
    if (!menu || document.getElementById('np-open-tutorial-menu-item')) return;
    const button = document.createElement('button');
    button.id = 'np-open-tutorial-menu-item'; button.type = 'button';
    button.className = 'w-full text-left px-4 py-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 text-slate-200 text-xs transition flex items-center gap-3';
    button.innerHTML = '<span class="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 font-mono text-violet-300 text-[10px] font-bold">GUIDE</span><span class="font-medium">チュートリアル</span>';
    button.addEventListener('click', () => { if (typeof window.closeNavDrawer === 'function') window.closeNavDrawer(); open(); });
    const settings = menu.querySelector('#drawer-settings-accordion'); menu.insertBefore(button, settings || null);
  }
  function init() {
    addDrawerItem();
    // 一般ユーザーの認証ログイン完了イベントが現行コードで確認できないため、初回アクセス端末で表示。
    let seen = true; try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (_) {}
    if (!seen) window.setTimeout(open, 650);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();