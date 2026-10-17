/* Nurse+ progress and goal management — isolated addition. */
(() => {
  'use strict';
  if (document.getElementById('np-goal-progress-style')) return;
  const style = document.createElement('style');
  style.id = 'np-goal-progress-style';
  style.textContent = '.np-goal-card{border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.48);border-radius:1rem;padding:1rem;text-align:left}.np-goal-title{font-size:.75rem;font-weight:650;color:#e2e8f0;margin-bottom:.65rem}.np-goal-muted{font-size:.68rem;color:#94a3b8}.np-goal-track{height:8px;border-radius:999px;background:rgba(148,163,184,.16);overflow:hidden}.np-goal-track span{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#f59e0b,#fcd34d);transition:width .8s cubic-bezier(.22,1,.36,1)}.np-goal-track span.is-done{background:linear-gradient(90deg,#34d399,#a7f3d0)}.np-goal-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;margin:12px 0}.np-goal-row .np-goal-track{grid-column:1/-1}.np-goal-input{width:82px;border:1px solid rgba(148,163,184,.25);border-radius:.6rem;background:rgba(15,23,42,.7);padding:.45rem;color:#f8fafc;font-size:.75rem}';
  document.head.appendChild(style);
  const $ = id => document.getElementById(id);
  const safeRead = (key, fallback) => { try { const v=JSON.parse(localStorage.getItem(key)||'null'); return v==null?fallback:v; } catch (_) { return fallback; } };
  const pad = n => String(n).padStart(2,'0');
  const todayKey = () => { const d=new Date(); return d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate()); };
  const goalKey='np_learning_goals_v1';
  const goals=()=>{const g=safeRead(goalKey,{});return {questions:Math.max(1,Math.min(500,Number(g.questions)||10)),accuracy:Math.max(1,Math.min(100,Number(g.accuracy)||80))};};
  function progressRows(){
    const map=new Map();
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key || !key.startsWith('history_accuracy_') || key.startsWith('history_accuracy_daily_')) continue;
      const rows=safeRead(key,[]);
      if(!Array.isArray(rows)||!rows.length) continue;
      const match=key.match(/^history_accuracy_(.+)_(exercise|past|nurse_national_6years|practice|quiz|all)$/);
      if(!match) continue;
      const values=rows.map(Number).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
      if(!values.length) continue;
      const id=match[1], old=map.get(id)||{id,sum:0,count:0};
      old.sum+=values.reduce((s,v)=>s+v,0);old.count+=values.length;map.set(id,old);
    }
    return [...map.values()].map(x=>({id:x.id,accuracy:Math.round(x.sum/x.count)})).sort((a,b)=>a.accuracy-b.accuracy).slice(0,8);
  }
  function todayAccuracy(){
    const vals=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!key.startsWith('history_accuracy_daily_')) continue;
      const rows=safeRead(key,[]);
      if(Array.isArray(rows)) rows.forEach(r=>{if(r&&r.date===todayKey()&&Number.isFinite(Number(r.accuracy))) vals.push(Number(r.accuracy));});
    }
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  function addCard(){
    const home=$('np-analysis-content');
    if(!home||$('np-goal-progress-card')) return;
    const card=document.createElement('section');
    card.id='np-goal-progress-card';card.className='np-goal-card space-y-4';
    card.innerHTML='<div><div class="np-goal-title">学習進捗</div><div class="np-goal-muted">科目ごとの平均正答率を確認できます。</div><div id="np-goal-subjects" class="mt-3"></div></div><div class="border-t border-slate-500/20 pt-4"><div class="np-goal-title">学習目標・達成状況</div><div class="grid grid-cols-2 gap-3"><label class="text-[11px] text-slate-300">1日の問題数目標<input id="np-goal-question-input" class="np-goal-input block mt-1" type="number" min="1" max="500" value="10"></label><label class="text-[11px] text-slate-300">目標正答率（%）<input id="np-goal-accuracy-input" class="np-goal-input block mt-1" type="number" min="1" max="100" value="80"></label></div><button id="np-goal-save" type="button" class="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200">目標を保存</button><div id="np-goal-status" class="mt-3 space-y-3"></div><p class="np-goal-muted mt-2">目標と履歴はこの端末のブラウザに保存されます。</p></div>';
    home.appendChild(card);
    $('np-goal-save').addEventListener('click',()=>{
      const q=Math.max(1,Math.min(500,Math.round(Number($('np-goal-question-input').value)||10)));
      const a=Math.max(1,Math.min(100,Math.round(Number($('np-goal-accuracy-input').value)||80)));
      localStorage.setItem(goalKey,JSON.stringify({questions:q,accuracy:a}));render();
    });
  }
  function render(){
    addCard();const g=goals();
    if($('np-goal-question-input')&&document.activeElement!==$('np-goal-question-input')) $('np-goal-question-input').value=g.questions;
    if($('np-goal-accuracy-input')&&document.activeElement!==$('np-goal-accuracy-input')) $('np-goal-accuracy-input').value=g.accuracy;
    const subjectBox=$('np-goal-subjects');
    if(subjectBox){
      const rows=progressRows();
      subjectBox.innerHTML=rows.length?rows.map(x=>'<div class="np-goal-row"><span class="text-[11px] text-slate-300 truncate" title="'+x.id.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')+'">'+x.id.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span><span class="text-[11px] font-semibold '+(x.accuracy>=g.accuracy?'text-emerald-300':'text-amber-300')+'">'+x.accuracy+'%</span><div class="np-goal-track"><span class="'+(x.accuracy>=g.accuracy?'is-done':'')+'" style="width:'+x.accuracy+'%"></span></div></div>').join(''):'<div class="np-goal-muted">演習履歴がある科目の進捗をここに表示します。</div>';
    }
    const done=Math.max(0,Number(localStorage.getItem('evo_today_done')||0)), acc=todayAccuracy(), box=$('np-goal-status');
    if(box){
      box.innerHTML='<div><div class="flex justify-between text-[11px] text-slate-300 mb-1"><span>今日の問題数</span><span>'+Math.min(done,g.questions)+' / '+g.questions+'問</span></div><div class="np-goal-track"><span class="'+(done>=g.questions?'is-done':'')+'" style="width:'+Math.min(100,done/g.questions*100)+'%"></span></div></div><div><div class="flex justify-between text-[11px] text-slate-300 mb-1"><span>今日の正答率</span><span>'+(acc===null?'記録なし':acc+'% / '+g.accuracy+'%')+'</span></div><div class="np-goal-track"><span class="'+(acc!==null&&acc>=g.accuracy?'is-done':'')+'" style="width:'+(acc===null?0:Math.min(100,acc/g.accuracy*100))+'%"></span></div></div><div class="np-goal-muted">'+(done>=g.questions?'🎉 今日の問題数目標を達成！':'問題数目標まであと'+Math.max(0,g.questions-done)+'問')+(acc!==null&&acc>=g.accuracy?' ・ 正答率目標も達成！':'')+'</div>';
    }
  }
  function install(){
    render();
    if(typeof window.renderDashboard==='function'&&!window.renderDashboard.__npGoalWrapped){
      const original=window.renderDashboard;
      const wrapped=function(){const result=original.apply(this,arguments);render();return result;};
      wrapped.__npGoalWrapped=true;window.renderDashboard=wrapped;
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  new MutationObserver(()=>{if($('screen-dashboard')) render();}).observe(document.body,{childList:true,subtree:true});
})();