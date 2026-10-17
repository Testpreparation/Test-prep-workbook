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
        transition: transform .18s ease, filter .18s ease, box-shadow .18s ease;
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
      @keyframes npConfettiFall {
        to { transform: translate3d(var(--np-drift), 105vh, 0) rotate(var(--np-rotate)); opacity: .15; }
      }
      @keyframes npPopIn { 0% { opacity:0; transform:scale(.88) translateY(8px); } 70% { transform:scale(1.025) translateY(-1px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes npSoftShake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-5px); } 50% { transform:translateX(4px); } 75% { transform:translateX(-2px); } }
      @keyframes npGlowPulse { 0%,100% { box-shadow:0 0 0 rgba(16,185,129,0); } 50% { box-shadow:0 0 0 4px rgba(16,185,129,.14); } }
      @keyframes npCheckDraw { from { stroke-dashoffset:24; } to { stroke-dashoffset:0; } }
      @keyframes npShimmer { from { background-position:150% 0; } to { background-position:-150% 0; } }
      /* 画面・カード・選択肢の触り心地を整える。レイアウトや採点処理は変更しない。 */
      #screen-quiz-play, #screen-quiz-result, #screen-dashboard, #screen-subject, #screen-settings,
      #screen-analytics-addition { transform-origin:top center; }
      .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]) {
        touch-action:manipulation;
      }
      #quiz-options-container > *, #quiz-options-container button, .quiz-option, [data-quiz-option] {
        transition:transform .24s cubic-bezier(.2,.8,.2,1), border-color .24s ease, background-color .24s ease, box-shadow .24s ease, opacity .24s ease;
        -webkit-tap-highlight-color:transparent;
      }
      #quiz-options-container button:active, .quiz-option:active, [data-quiz-option]:active {
        transform:scale(.985);
      }
      .np-motion-card { transition:transform .28s ease, box-shadow .28s ease, border-color .28s ease; }
      .np-motion-card:hover { transform:translateY(-2px); }
      .np-motion-selected { box-shadow:0 0 0 2px rgba(251,191,36,.45), 0 8px 22px rgba(245,158,11,.09) !important; }
      .np-motion-correct { animation:npPopIn .4s cubic-bezier(.2,.8,.2,1) both, npGlowPulse .9s ease-out; }
      .np-motion-incorrect { animation:npSoftShake .38s ease-out; }
      #screen-quiz-result .np-result-highlight { animation:npPopIn .55s cubic-bezier(.2,.8,.2,1) both; }
      .np-motion-reveal { animation:npPopIn .48s cubic-bezier(.2,.8,.2,1) both; }
      .np-motion-progress { transition:width .85s cubic-bezier(.22,1,.36,1), background-color .3s ease !important; }
      .np-motion-modal { animation:npPopIn .36s cubic-bezier(.2,.8,.2,1) both; }
      .np-motion-drawer { animation:npSlideIn .38s cubic-bezier(.22,1,.36,1) both; }
      @keyframes npSlideIn { from { opacity:.6; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
      .np-motion-busy { position:relative; overflow:hidden; }
      .np-motion-busy::after { content:""; position:absolute; inset:0; background:linear-gradient(100deg,transparent 25%,rgba(255,255,255,.12) 50%,transparent 75%); background-size:200% 100%; animation:npShimmer 1.25s linear infinite; pointer-events:none; }
      .np-motion-confetti-piece { position:absolute; top:-14px; animation:npConfettiFall var(--np-duration,2.4s) ease-in forwards; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior:auto !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
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
        const wasHidden = String(mutation.oldValue || '').split(/\s+/).includes('hidden');
        if (isHidden) {
          if (screen.id === 'screen-quiz-result') delete screen.dataset.npCelebrated;
          return;
        }
        // hiddenクラスが外れた瞬間だけ実行し、同じ表示中の再描画では繰り返さない。
        if (!wasHidden) return;
        if (!reduceMotion && typeof screen.animate === 'function' && screen.id !== SCREEN_ID) {
          screen.animate(
            [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 430, easing: 'cubic-bezier(.22,1,.36,1)' }
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
        const isCorrect = title.includes('正解') && !title.includes('不正解');
        const frames = isCorrect
          ? [{ opacity: .65, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }]
          : [{ opacity: .7, transform: 'translateX(-4px)' }, { opacity: 1, transform: 'translateX(4px)' }, { opacity: 1, transform: 'translateX(0)' }];
        feedbackBox.animate(frames, { duration: isCorrect ? 360 : 390, easing: 'ease-out' });
      });
      feedbackObserver.observe(feedbackTitle, { childList: true, characterData: true, subtree: true });
    }

    // 2. ボタン・カード・タブ・モーダル・ドロワーの操作フィードバック。
    // 委譲イベントなので、後から描画される画面にも自動適用する。
    document.addEventListener('pointerdown', event => {
      const target = event.target.closest('button, [role="button"], .glass-card > section, .glass-card .rounded-xl, .glass-card .rounded-2xl');
      if (!target || target.matches(':disabled,[aria-disabled="true"]') || target.closest('#' + SCREEN_ID)) return;
      if (target.matches('button,[role="button"]')) target.style.setProperty('--np-pressing', '1');
    }, {passive:true});
    document.addEventListener('pointerup', event => {
      const target = event.target.closest('button, [role="button"]');
      if (target) target.style.removeProperty('--np-pressing');
    }, {passive:true});
    document.addEventListener('pointercancel', event => {
      const target = event.target.closest('button, [role="button"]');
      if (target) target.style.removeProperty('--np-pressing');
    }, {passive:true});

    document.addEventListener('click', event => {
      const target = event.target.closest('button, [role="button"], [data-quiz-option], .quiz-option');
      if (target && !target.matches(':disabled,[aria-disabled="true"]') && !target.closest('#' + SCREEN_ID)) {
        if (!reduceMotion && typeof target.animate === 'function') {
          target.animate(
            [{ transform:'scale(1)' }, { transform:'scale(.965)' }, { transform:'scale(1)' }],
            { duration:190, easing:'ease-out' }
          );
        }
      }
    }, true);

    // 選択肢の選択状態を視覚化。既存のクリック処理を止めず、クラスだけを追加。
    document.addEventListener('click', event => {
      const option = event.target.closest('#quiz-options-container button, #quiz-options-container [role="button"], #quiz-options-container .quiz-option, #quiz-options-container [data-quiz-option]');
      if (!option) return;
      const container = option.parentElement;
      if (container) container.querySelectorAll('.np-motion-selected').forEach(el => el.classList.remove('np-motion-selected'));
      option.classList.add('np-motion-selected');
      if (!reduceMotion && typeof option.animate === 'function') {
        option.animate([{ transform:'scale(.985)' }, { transform:'scale(1.012)' }, { transform:'scale(1)' }], {duration:280,easing:'ease-out'});
      }
    }, true);

    // 表示される進捗バーを初期幅から目標幅へアニメーション。
    function animateProgressBars(root) {
      (root || document).querySelectorAll('.evo-progress > span, #evo-mission-progress, #fc-dash-progress-bar, .np-analytics-fill, #quiz-timer-bar').forEach(bar => {
        if (bar.dataset.npMotionReady === '1') return;
        const width = bar.style.width;
        if (!width) return;
        bar.dataset.npMotionReady = '1';
        bar.classList.add('np-motion-progress');
        if (!reduceMotion) {
          bar.style.width = '0%';
          requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = width; }));
        }
      });
    }
    animateProgressBars();
    function markMotionCards(root) {
      (root || document).querySelectorAll('.glass-card section, .glass-card [class*="rounded-xl"], .glass-card [class*="rounded-2xl"]').forEach(card => {
        if (card.matches('button,[role="button"]') || card.closest('#' + SCREEN_ID)) return;
        if (card.querySelector('button,[role="button"]') || card.matches('section')) card.classList.add('np-motion-card');
      });
    }
    markMotionCards();
    const cardObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) markMotionCards(node);
      }));
    });
    cardObserver.observe(document.body,{childList:true,subtree:true});
    const progressObserver = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'childList') record.addedNodes.forEach(node => {
          if (node.nodeType === 1) animateProgressBars(node);
        });
        if (record.type === 'attributes' && record.target.matches && record.target.matches('.evo-progress > span, #evo-mission-progress, #fc-dash-progress-bar, .np-analytics-fill, #quiz-timer-bar')) {
          record.target.classList.add('np-motion-progress');
        }
      });
    });
    progressObserver.observe(document.body, {childList:true,subtree:true,attributes:true,attributeFilter:['style']});

    // 正誤のフィードバック・解説領域に段階的な表示演出を付与。
    const explanation = document.getElementById('quiz-feedback-desc');
    if (explanation) {
      const explanationObserver = new MutationObserver(() => {
        if (!reduceMotion && explanation.textContent.trim() && typeof explanation.animate === 'function') {
          explanation.animate([[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:330,easing:'ease-out'});
        }
      });
      explanationObserver.observe(explanation,{childList:true,characterData:true,subtree:true});
    }

    // 結果画面のスコア・主要カードを順番に見せる。
    const resultScreen = document.getElementById('screen-quiz-result');
    if (resultScreen) {
      const resultObserver = new MutationObserver(() => {
        if (resultScreen.classList.contains('hidden')) return;
        const score = document.getElementById('final-score-val');
        if (score && !score.classList.contains('np-result-highlight')) {
          score.classList.add('np-result-highlight');
          if (!reduceMotion && typeof score.animate === 'function') {
            score.animate([{opacity:0,transform:'translateY(8px) scale(.88)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'});
          }
        }
        resultScreen.querySelectorAll('.grid > *, .space-y-4 > section').forEach((card,index) => {
          if (card.dataset.npStaggered === '1') return;
          card.dataset.npStaggered = '1';
          if (!reduceMotion && typeof card.animate === 'function') {
            card.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,delay:Math.min(index*75,450),easing:'ease-out',fill:'both'});
          }
        });
      });
      resultObserver.observe(resultScreen,{attributes:true,attributeFilter:['class','style']});
    }

    // モーダルやナビゲーションドロワーの表示・非表示に動きを追加。
    const modalObserver = new MutationObserver(records => {
      records.forEach(record => {
        const el = record.target;
        if (!el || el.classList.contains('hidden') || reduceMotion || typeof el.animate !== 'function') return;
        if (el.id && (el.id.startsWith('modal-') || el.id === 'nav-drawer')) {
          el.animate(
            el.id === 'nav-drawer'
              ? [{opacity:.55,transform:'translateX(-18px)'},{opacity:1,transform:'translateX(0)'}]
              : [{opacity:0,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
            {duration:360,easing:'cubic-bezier(.22,1,.36,1)'}
          );
        }
      });
    });
    document.querySelectorAll('[id^="modal-"], #nav-drawer').forEach(el => {
      modalObserver.observe(el,{attributes:true,attributeFilter:['class','style']});
    });

    // 5. 完了画面で紙吹雪。外部ライブラリに依存せず、二重発火も防ぐ。
    function celebrateResult(screen) {
      if (screen.dataset.npCelebrated === '1') return;
      screen.dataset.npCelebrated = '1';
      const scoreEl = document.getElementById('final-score-val');
      const accuracy = scoreEl ? Number(scoreEl.textContent) : NaN;
      if (reduceMotion || !Number.isFinite(accuracy)) return;

      // 既存の紙吹雪ライブラリがある場合はそのまま利用する。
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 42,
          spread: 54,
          startVelocity: 25,
          scalar: 0.8,
          origin: { y: 0.68 }
        });
        return;
      }

      // ライブラリがない場合の軽量なCSS紙吹雪。
      const colors = ['#f59e0b', '#fcd34d', '#34d399', '#60a5fa', '#f472b6', '#c084fc'];
      const layer = document.createElement('div');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:99999;';
      for (let i = 0; i < 48; i++) {
        const piece = document.createElement('i');
        const duration = 1.7 + Math.random() * 1.3;
        piece.style.cssText = [
          'position:absolute',
          'top:-14px',
          'left:' + (Math.random() * 100) + '%',
          'width:' + (5 + Math.random() * 5) + 'px',
          'height:' + (7 + Math.random() * 7) + 'px',
          'border-radius:2px',
          'background:' + colors[i % colors.length],
          'opacity:.95',
          '--np-drift:' + ((Math.random() - .5) * 220) + 'px',
          '--np-rotate:' + (Math.random() * 900 - 450) + 'deg',
          'animation:npConfettiFall ' + duration + 's ease-in forwards'
        ].join(';');
        layer.appendChild(piece);
      }
      document.body.appendChild(layer);
      window.setTimeout(() => layer.remove(), 3400);
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