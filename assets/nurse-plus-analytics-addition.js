/* Nurse＋ 追加機能: 学習データ分析
 * 既存機能の処理を置き換えず、既存の保存済みデータのみを読み取ります。
 */
(() => {
  'use strict';
  const STYLE_ID = 'nurse-plus-analytics-addition-style';
  const SCREEN_ID = 'screen-analytics-addition';
  const BUTTON_ID = 'nurse-plus-analytics-button';

  function safeArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }
  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[ch]);
  }
  function dateKey(date) {
    return date.getFullYear() + '/' + String(date.getMonth()+1).padStart(2,'0') + '/' + String(date.getDate()).padStart(2,'0');
  }
  function getRows() {
    const rows = [];
    const availableSubjects = typeof subjects !== 'undefined' && Array.isArray(subjects) ? subjects : (Array.isArray(window.subjects) ? window.subjects : []);
    availableSubjects.filter(s => s && s.visible !== false && s.status !== 'preparing').forEach(subject => {
      let modes = [];
      try {
        modes = typeof window.evoModeDefs === 'function' ? window.evoModeDefs(subject) : [{key:'all',label:'通常'}];
      } catch (_) {
        modes = [{key:'all',label:'通常'}];
      }
      (modes || []).forEach(mode => {
        const accuracy = safeArray('history_accuracy_' + subject.id + '_' + mode.key)
          .map(safeNumber).filter(n => n >= 0 && n <= 100);
        const daily = safeArray('history_accuracy_daily_' + subject.id + '_' + mode.key)
          .filter(x => x && typeof x.date === 'string')
          .map(x => ({date:x.date, accuracy:safeNumber(x.accuracy)}))
          .filter(x => x.accuracy >= 0 && x.accuracy <= 100);
        if (accuracy.length || daily.length) {
          rows.push({
            subject: subject.name || subject.id,
            subjectId: subject.id,
            mode: mode.label || mode.key,
            accuracy,
            daily
          });
        }
      });
    });
    return rows;
  }
  function getStats(rows) {
    const values = rows.flatMap(row => row.accuracy);
    const dailyEntries = rows.flatMap(row => row.daily);
    const attempts = values.length;
    return {
      attempts,
      avg: attempts ? Math.round(values.reduce((a,b)=>a+b,0) / attempts) : null,
      best: attempts ? Math.max(...values) : null,
      dailyEntries
    };
  }
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SCREEN_ID} { animation: npAnalyticsEnter .22s ease-out both; }
      @keyframes npAnalyticsEnter { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
      .np-analytics-card { background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.18);border-radius:16px;padding:14px; }
      .np-analytics-metric { font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.04em;color:#f8fafc; }
      .np-analytics-label { color:#94a3b8;font-size:10px;margin-top:5px; }
      .np-analytics-bars { display:flex;align-items:flex-end;gap:8px;height:130px;padding-top:12px; }
      .np-analytics-bar-col { flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px; }
      .np-analytics-bar { width:min(100%,24px);min-height:3px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#fbbf24,#d97706);transition:height .35s ease; }
      .np-analytics-day { color:#94a3b8;font-size:9px;white-space:nowrap; }
      .np-analytics-row { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin:12px 0; }
      .np-analytics-track { height:6px;border-radius:99px;background:rgba(148,163,184,.16);overflow:hidden;margin-top:5px; }
      .np-analytics-fill { height:100%;border-radius:99px;background:linear-gradient(90deg,#f59e0b,#fcd34d); }
      .np-analytics-back { border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:8px 12px;color:#cbd5e1;font-size:12px; }
      .np-analytics-empty { color:#94a3b8;text-align:center;font-size:12px;padding:22px 8px; }
      @media (prefers-reduced-motion:reduce) { #${SCREEN_ID} { animation:none; } .np-analytics-bar { transition:none; } }
    `;
    document.head.appendChild(style);
  }
  function renderAnalytics() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    const rows = getRows();
    const stats = getStats(rows);
    const streak = Math.max(0, safeNumber(localStorage.getItem('study_streak')));
    const subjectRows = {};
    rows.forEach(row => {
      if (!subjectRows[row.subjectId]) subjectRows[row.subjectId] = {name:row.subject, values:[]};
      subjectRows[row.subjectId].values.push(...row.accuracy);
    });
    const subjects = Object.values(subjectRows).map(item => ({
      name:item.name,
      avg:item.values.length ? Math.round(item.values.reduce((a,b)=>a+b,0)/item.values.length) : null,
      count:item.values.length
    })).filter(x=>x.avg!==null).sort((a,b)=>a.avg-b.avg);

    const days = [];
    const today = new Date();
    for (let i=6;i>=0;i--) {
      const d = new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);
      const key = dateKey(d);
      const entries = stats.dailyEntries.filter(x=>x.date===key);
      days.push({key,label:(d.getMonth()+1)+'/'+d.getDate(),count:entries.length,
        avg:entries.length ? Math.round(entries.reduce((a,b)=>a+b.accuracy,0)/entries.length) : 0});
    }
    const maxCount = Math.max(1,...days.map(d=>d.count));
    const weekTotal = days.reduce((a,d)=>a+d.count,0);
    const noHistory = stats.attempts === 0 && stats.dailyEntries.length === 0;
    screen.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div><div class="text-[10px] text-amber-500 tracking-[.22em] font-semibold">STUDY ANALYTICS</div><h2 class="serif-title text-xl text-slate-100 mt-1">データ分析</h2><p class="text-[11px] text-slate-400 mt-1">この端末に保存された学習履歴を表示します。</p></div>
          <button type="button" class="np-analytics-back" id="np-analytics-back">← ホーム</button>
        </div>
        ${noHistory ? '<div class="np-analytics-card np-analytics-empty">まだ学習履歴がありません。問題を解くと、ここに記録が表示されます。</div>' : ''}
        <div class="grid grid-cols-2 gap-2">
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.attempts}</div><div class="np-analytics-label">記録された演習結果</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.avg===null?'--':stats.avg+'%'}</div><div class="np-analytics-label">平均正答率</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.best===null?'--':stats.best+'%'}</div><div class="np-analytics-label">最高正答率</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${streak}</div><div class="np-analytics-label">連続学習日数（既存記録）</div></div>
        </div>
        <section class="np-analytics-card">
          <div class="flex justify-between items-center gap-2"><h3 class="text-sm font-semibold text-slate-100">直近7日間の学習記録</h3><span class="text-[10px] text-slate-500">合計 ${weekTotal} 件</span></div>
          <p class="text-[10px] text-slate-500 mt-1">日ごとの記録件数。データがない日は0件です。</p>
          <div class="np-analytics-bars">${days.map(d=>`<div class="np-analytics-bar-col" title="${esc(d.key)}：${d.count}件"><div class="text-[9px] text-slate-400">${d.count||''}</div><div class="np-analytics-bar" style="height:${Math.max(3,d.count/maxCount*82)}px;opacity:${d.count?1:.22}"></div><div class="np-analytics-day">${esc(d.label)}</div></div>`).join('')}</div>
        </section>
        <section class="np-analytics-card">
          <h3 class="text-sm font-semibold text-slate-100">科目別の平均正答率</h3>
          <p class="text-[10px] text-slate-500 mt-1">記録がある科目のみ表示。低い科目から並べています。</p>
          ${subjects.length ? subjects.map(s=>`<div class="np-analytics-row"><div><div class="text-xs text-slate-200">${esc(s.name)}</div><div class="np-analytics-track"><div class="np-analytics-fill" style="width:${s.avg}%"></div></div></div><div class="text-xs font-mono ${s.avg<70?'text-rose-400':'text-amber-300'}">${s.avg}%</div></div>`).join('') : '<div class="np-analytics-empty">科目別の正答率データはまだありません。</div>'}
        </section>
        <p class="text-[10px] text-slate-500 leading-5">※ この分析はブラウザ内の保存済み履歴を集計しています。別端末の履歴や、保存されていない学習時間・正誤別の問題数は含みません。</p>
      </div>`;
    document.getElementById('np-analytics-back')?.addEventListener('click', () => {
      document.getElementById(SCREEN_ID)?.classList.add('hidden');
      if (typeof window.showDashboard === 'function') window.showDashboard();
    });
  }
  function openAnalytics() {
    if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.classList.remove('hidden');
    renderAnalytics();
    screen.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function addEffectStyles() {
    if (document.getElementById('nurse-plus-ui-effects-style')) return;
    const style = document.createElement('style');
    style.id = 'nurse-plus-ui-effects-style';
    style.textContent = `
      /* 追加演出は既存デザインに重ねるだけ。既存の採点・画面関数は変更しない。 */
      .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]) {
        transition: transform .14s ease, filter .14s ease, box-shadow .14s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .glass-card button:not(:disabled):active, .glass-card [role="button"]:not([aria-disabled="true"]):active {
        transform: scale(.975);
        filter: brightness(1.08);
      }
      .evo-progress > span, #evo-mission-progress, .np-analytics-fill {
        transition: width .65s cubic-bezier(.22,1,.36,1);
      }
      @keyframes npScreenEnter {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]),
        .evo-progress > span, #evo-mission-progress, .np-analytics-fill {
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installEffects() {
    addEffectStyles();
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. 既存画面の表示時だけ、軽い入場アニメーションを付ける。
    // hideAllScreens等の既存関数は上書きしない。
    const screenObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        const screen = mutation.target;
        if (!screen || !screen.id || !screen.id.startsWith('screen-')) return;
        const isHidden = screen.classList.contains('hidden');
        const wasHidden = String(mutation.oldValue || '').split(/\\s+/).includes('hidden');
        if (isHidden) {
          if (screen.id === 'screen-quiz-result') delete screen.dataset.npCelebrated;
          return;
        }
        // hiddenクラスが外れた瞬間だけ実行し、同じ表示中の再描画では繰り返さない。
        if (!wasHidden) return;
        if (!reduceMotion && typeof screen.animate === 'function' && screen.id !== SCREEN_ID) {
          screen.animate(
            [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }
          );
        }
        if (screen.id === 'screen-quiz-result') celebrateResult(screen);
      });
    });
    document.querySelectorAll('[id^="screen-"]').forEach(screen => {
      screenObserver.observe(screen, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    });

    // 3. 正解・不正解の結果表示に演出を追加。採点結果や判定処理には触れない。
    const feedbackTitle = document.getElementById('quiz-feedback-title');
    const feedbackBox = document.getElementById('quiz-feedback-box');
    if (feedbackTitle && feedbackBox) {
      let previousTitle = feedbackTitle.textContent;
      const feedbackObserver = new MutationObserver(() => {
        const title = (feedbackTitle.textContent || '').trim();
        if (!title || title === previousTitle) return;
        previousTitle = title;
        if (reduceMotion || typeof feedbackBox.animate !== 'function') return;
        const isCorrect = title.includes('正解');
        const frames = isCorrect
          ? [{ opacity: .65, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }]
          : [{ opacity: .7, transform: 'translateX(-4px)' }, { opacity: 1, transform: 'translateX(4px)' }, { opacity: 1, transform: 'translateX(0)' }];
        feedbackBox.animate(frames, { duration: isCorrect ? 260 : 300, easing: 'ease-out' });
      });
      feedbackObserver.observe(feedbackTitle, { childList: true, characterData: true, subtree: true });
    }

    // 5. 完了画面で紙吹雪。満点時は既存コードの演出をそのまま利用し、二重発火を防ぐ。
    function celebrateResult(screen) {
      if (screen.dataset.npCelebrated === '1') return;
      screen.dataset.npCelebrated = '1';
      const scoreEl = document.getElementById('final-score-val');
      const accuracy = scoreEl ? Number(scoreEl.textContent) : NaN;
      if (!Number.isFinite(accuracy) || accuracy >= 100 || typeof window.confetti !== 'function') return;
      window.confetti({
        particleCount: 42,
        spread: 54,
        startVelocity: 25,
        scalar: 0.8,
        origin: { y: 0.68 }
      });
    }
  }

  function install() {
    if (document.getElementById(SCREEN_ID)) return;
    const main = document.querySelector('main.glass-card');
    const dashboard = document.getElementById('screen-dashboard');
    if (!main || !dashboard) return;
    addStyles();

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'w-full mt-2 py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 text-xs font-medium transition';
    button.innerHTML = '<span aria-hidden="true">▥</span>　データ分析';
    button.addEventListener('click', openAnalytics);
    const subjectButton = dashboard.querySelector('button[onclick="showSubjectScreen()"]');
    if (subjectButton) subjectButton.insertAdjacentElement('afterend', button);
    else dashboard.prepend(button);

    const screen = document.createElement('section');
    screen.id = SCREEN_ID;
    screen.className = 'hidden space-y-4';
    screen.setAttribute('aria-label','学習データ分析');
    main.appendChild(screen);

    // 既存の画面切り替え関数は上書きせず、分析画面以外を操作したときだけ閉じる。
    installEffects();
    document.addEventListener('click', event => {
      const screen = document.getElementById(SCREEN_ID);
      if (!screen || screen.classList.contains('hidden')) return;
      if (event.target.closest('#' + SCREEN_ID) || event.target.closest('#' + BUTTON_ID)) return;
      screen.classList.add('hidden');
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();