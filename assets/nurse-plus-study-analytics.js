/* Nurse+ learning analytics additions.
 * Isolated enhancement layer: leaves question, answer, timer, theme and existing storage logic intact.
 * Existing history keys are read; new data is limited to study-day streak dates.
 */
(() => {
  'use strict';
  const STYLE_ID = 'np-study-analytics-style';
  const SCRIPT_ID = 'np-study-analytics';
  if (document.getElementById(SCRIPT_ID)) return;
  const marker = document.createElement('meta');
  marker.id = SCRIPT_ID;
  document.head.appendChild(marker);

  const css = document.createElement('style');
  css.id = STYLE_ID;
  css.textContent = `
    .np-analytics-card{border:1px solid rgba(148,163,184,.16);background:rgba(15,23,42,.48);border-radius:1rem;padding:1rem;text-align:left}
    .np-analytics-title{font-size:.75rem;font-weight:650;color:#e2e8f0;margin-bottom:.75rem}
    .np-analytics-muted{font-size:.68rem;color:#94a3b8}
    .np-analytics-bars{display:flex;align-items:flex-end;gap:6px;height:112px;padding:8px 0 0}
    .np-analytics-bar-wrap{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}
    .np-analytics-bar{width:100%;max-width:24px;min-height:3px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#fbbf24,#b45309);transform-origin:bottom;animation:npBarGrow .85s cubic-bezier(.22,1,.36,1) both}
    .np-analytics-bar-label{font-size:9px;color:#94a3b8;white-space:nowrap}
    .np-analytics-bar-value{font-size:9px;color:#fcd34d}
    .np-analytics-row{display:flex;align-items:center;gap:8px;margin:.55rem 0}
    .np-analytics-track{height:7px;flex:1;border-radius:999px;background:rgba(148,163,184,.15);overflow:hidden}
    .np-analytics-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#f59e0b,#fcd34d);transition:width 900ms cubic-bezier(.22,1,.36,1)}
    .np-analytics-streak{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .np-analytics-streak strong{font-size:1.35rem;color:#fbbf24;font-variant-numeric:tabular-nums}
    #np-result-accuracy-value{display:inline-block;min-width:1.7em}
    @keyframes npBarGrow{from{transform:scaleY(.08);opacity:.45}to{transform:scaleY(1);opacity:1}}
    @media(prefers-reduced-motion:reduce){.np-analytics-bar{animation:none}.np-analytics-fill{transition:none}}
  `;
  document.head.appendChild(css);

  const $ = id => document.getElementById(id);
  const safeJSON = (key, fallback) => {
    try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value; }
    catch (_) { return fallback; }
  };
  const pad = n => String(n).padStart(2,'0');
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const displayDate = key => { const parts=key.split('-'); return parts.length===3 ? `${Number(parts[1])}/${Number(parts[2])}` : key; };

  function getStudyDates() {
    const values = safeJSON('np_study_dates_v1', []);
    return Array.isArray(values) ? [...new Set(values.filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v)))].sort() : [];
  }
  function recordStudyDay() {
    const dates=getStudyDates();
    const today=localDateKey();
    if(!dates.includes(today)) dates.push(today);
    const trimmed=dates.sort().slice(-730);
    localStorage.setItem('np_study_dates_v1',JSON.stringify(trimmed));
    return getStreak(trimmed);
  }
  function getStreak(dates=getStudyDates()) {
    const set=new Set(dates);
    let cursor=new Date();
    if(!set.has(localDateKey(cursor))) cursor.setDate(cursor.getDate()-1);
    let count=0;
    while(set.has(localDateKey(cursor)) && count<730){count++;cursor.setDate(cursor.getDate()-1);}
    return count;
  }

  function getHistorySeries() {
    const aggregate = new Map();
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key || !key.startsWith('history_accuracy_daily_')) continue;
      const rows=safeJSON(key,[]);
      if(!Array.isArray(rows)) continue;
      rows.forEach(row=>{
        if(!row || typeof row.date!=='string' || !Number.isFinite(Number(row.accuracy))) return;
        const match=row.date.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if(!match) return;
        const iso=`${match[1]}-${pad(match[2])}-${pad(match[3])}`;
        const old=aggregate.get(iso)||{sum:0,count:0};
        old.sum+=Number(row.accuracy);old.count++;aggregate.set(iso,old);
      });
    }
    return [...aggregate.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-7).map(([date,v])=>({date,accuracy:Math.round(v.sum/v.count)}));
  }

  function getWeakSubjects() {
    const subjects=new Map();
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key || !key.startsWith('weak_question_stats_')) continue;
      const stats=safeJSON(key,{});
      if(!stats || typeof stats!=='object' || Array.isArray(stats)) continue;
      let wrong=0,correct=0,weak=0,seen=0;
      Object.values(stats).forEach(item=>{
        if(!item || typeof item!=='object') return;
        const w=Math.max(0,Number(item.wrong)||0), c=Math.max(0,Number(item.correct)||0);
        wrong+=w;correct+=c;if(w>c)weak++;seen++;
      });
      if(!seen) continue;
      const suffix=key.replace(/^weak_question_stats_attempt_history_/,'');
      const subjectId=suffix.split('_')[0]||'科目';
      const old=subjects.get(subjectId)||{id:subjectId,wrong:0,correct:0,weak:0,seen:0};
      old.wrong+=wrong;old.correct+=correct;old.weak+=weak;old.seen+=seen;subjects.set(subjectId,old);
    }
    return [...subjects.values()].map(item=>({...item,accuracy:item.correct+item.wrong?Math.round(item.correct/(item.correct+item.wrong)*100):0}))
      .sort((a,b)=>b.weak-a.weak || a.accuracy-b.accuracy).slice(0,5);
  }

  function ensureAnalysisScreen() {
    const home=$('screen-dashboard');
    if(!home) return null;
    const parent=home.parentElement;
    if(!parent) return null;
    let screen=$('np-data-analysis-screen');
    if(!screen){
      screen=document.createElement('section');
      screen.id='np-data-analysis-screen';
      screen.className='hidden space-y-4';
      screen.innerHTML='<div class="flex items-center justify-between gap-3"><div><div class="en-title text-[10px] tracking-[.22em] font-semibold text-amber-500">LEARNING INSIGHTS</div><h2 class="serif-title text-xl text-slate-100 mt-1">データ分析</h2><p class="text-[11px] text-slate-400 mt-1">学習の記録と目標の達成状況</p></div><button type="button" id="np-analysis-back" class="rounded-xl border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-xs text-slate-200">ホームへ戻る</button></div><div id="np-analysis-content" class="space-y-3"></div>';
      home.insertAdjacentElement('afterend',screen);
      const back=$('np-analysis-back');
      if(back) back.addEventListener('click',()=>{screen.classList.add('hidden');home.classList.remove('hidden');});
    }
    const header=home.firstElementChild;
    if(header && !$('np-open-data-analysis')){
      const button=document.createElement('button');
      button.id='np-open-data-analysis';
      button.type='button';
      button.className='w-full mt-2 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-medium transition';
      button.textContent='データ分析';
      button.addEventListener('click',()=>{home.classList.add('hidden');screen.classList.remove('hidden');renderAnalytics();});
      const subjectButton=header.querySelector('button[onclick="showSubjectScreen()"]');
      if(subjectButton) subjectButton.insertAdjacentElement('afterend',button); else header.appendChild(button);
    }
    return screen;
  }

  function addAnalyticsCards() {
    const screen=ensureAnalysisScreen();
    const home=$('np-analysis-content');
    if(!screen || !home || $('np-learning-analytics')) return;
    const block=document.createElement('section');
    block.id='np-learning-analytics';
    block.className='space-y-3';
    block.innerHTML=`
      <div class="np-analytics-card">
        <div class="np-analytics-streak">
          <div><div class="np-analytics-title" style="margin-bottom:.3rem">連続学習記録</div><div class="np-analytics-muted">1日1回、演習を完了すると記録されます</div></div>
          <div style="text-align:right"><strong id="np-streak-count">0</strong><div class="np-analytics-muted">日連続</div></div>
        </div>
      </div>
      <div class="np-analytics-card">
        <div class="np-analytics-title">成績の推移</div>
        <div class="np-analytics-muted">直近7日分の科目別履歴を集計した平均正答率</div>
        <div id="np-accuracy-chart" class="np-analytics-bars"><div class="np-analytics-muted">演習履歴がここに表示されます</div></div>
      </div>
      <div class="np-analytics-card">
        <div class="np-analytics-title">苦手分野の分析</div>
        <div class="np-analytics-muted">間違いが正解より多い問題を集計しています。学習履歴はこの端末内に保存されます。</div>
        <div id="np-weak-analysis" class="mt-3"><div class="np-analytics-muted">演習すると分析が表示されます。</div></div>
      </div>`;
    home.appendChild(block);
  }

  function renderAnalytics() {
    addAnalyticsCards();
    const streak=$('np-streak-count');
    if(streak) streak.textContent=String(getStreak());
    const chart=$('np-accuracy-chart');
    if(chart){
      const rows=getHistorySeries();
      chart.innerHTML=rows.length?rows.map((row,index)=>`
        <div class="np-analytics-bar-wrap" title="${row.date}: ${row.accuracy}%">
          <span class="np-analytics-bar-value">${row.accuracy}%</span>
          <div class="np-analytics-bar" style="height:${Math.max(4,row.accuracy)}%;animation-delay:${index*65}ms"></div>
          <span class="np-analytics-bar-label">${displayDate(row.date)}</span>
        </div>`).join(''):'<div class="np-analytics-muted">演習履歴がここに表示されます</div>';
    }
    const weak=$('np-weak-analysis');
    if(weak){
      const rows=getWeakSubjects();
      weak.innerHTML=rows.length?rows.map(row=>`
        <div class="np-analytics-row">
          <div style="width:92px;min-width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#cbd5e1" title="${row.id}">${row.id}</div>
          <div class="np-analytics-track"><div class="np-analytics-fill" style="width:${row.accuracy}%"></div></div>
          <div style="width:66px;text-align:right;font-size:10px;color:#fbbf24">${row.weak}問・正答${row.accuracy}%</div>
        </div>`).join(''):'<div class="np-analytics-muted">演習すると分析が表示されます。</div>';
    }
  }

  function animateAccuracy() {
    const value=$('final-score-val');
    if(!value) return;
    const target=Math.max(0,Math.min(100,Number(value.textContent)||0));
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){value.textContent=String(target);return;}
    value.id='np-result-accuracy-value';
    const duration=1150;
    const start=performance.now();
    value.textContent='0';
    const step=now=>{
      const t=Math.min(1,(now-start)/duration);
      const eased=1-Math.pow(1-t,3);
      value.textContent=String(Math.round(target*eased));
      if(t<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function installHooks() {
    if(typeof window.showResultScreen==='function' && !window.showResultScreen.__npAnalyticsWrapped){
      const original=window.showResultScreen;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        try { recordStudyDay(); } catch(error){ console.warn('[Nurse+] study streak was not saved',error); }
        requestAnimationFrame(()=>{animateAccuracy();renderAnalytics();});
        return result;
      };
      wrapped.__npAnalyticsWrapped=true;
      window.showResultScreen=wrapped;
    }
    if(typeof window.renderDashboard==='function' && !window.renderDashboard.__npAnalyticsWrapped){
      const original=window.renderDashboard;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        const analysis=$('np-data-analysis-screen');
        const home=$('screen-dashboard');
        if(analysis && home && !home.classList.contains('hidden')) analysis.classList.add('hidden');
        renderAnalytics();
        return result;
      };
      wrapped.__npAnalyticsWrapped=true;
      window.renderDashboard=wrapped;
    }
    renderAnalytics();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installHooks,{once:true});
  else installHooks();
  const observer=new MutationObserver(()=>{if($('screen-dashboard')) addAnalyticsCards();});
  observer.observe(document.body,{childList:true,subtree:true});
})();
