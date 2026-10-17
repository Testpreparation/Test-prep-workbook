(function(){
'use strict';
var BID='nurse-plus-wrong-analysis-button', SID='nurse-plus-wrong-analysis-screen';
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function rows(){
 var out=[];
 for(var i=0;i<localStorage.length;i++){
  var k=localStorage.key(i); if(!k||k.indexOf('weak_question_stats_')!==0)continue;
  try{var data=JSON.parse(localStorage.getItem(k)||'{}');Object.keys(data).forEach(function(id){var x=data[id];if(!x||Number(x.wrong||0)<1)return;out.push({wrong:Number(x.wrong||0),correct:Number(x.correct||0),text:String(x.questionText||''),explanation:String(x.explanation||''),subject:String(x.subjectName||x.subjectId||'科目未設定')});});}catch(e){}
 }
 return out.sort(function(a,b){return b.wrong-a.wrong;});
}
var groups=[
 ['解剖・構造',['骨','筋','神経','臓器','動脈','静脈','位置','構造']],
 ['生理・機能',['作用','機能','分泌','血圧','血糖','呼吸','循環','恒常性']],
 ['代謝・生化学',['代謝','酵素','インスリン','グルカゴン','糖','脂質','ATP']],
 ['薬理・薬剤',['薬','副作用','禁忌','作用機序','投与','受容体']],
 ['疾病・病態',['疾患','症状','病態','診断','合併症','病理']],
 ['公衆衛生・統計',['有病率','罹患率','死亡率','統計','予防','保健','疫学']],
 ['看護・援助',['看護','援助','観察','患者','ケア']]
];
function topics(q){var t=q.text+' '+q.explanation, a=[];groups.forEach(function(g){if(g[1].some(function(w){return t.toLowerCase().indexOf(w.toLowerCase())>=0;}))a.push(g[0]);});return a.length?a.slice(0,2):['分類データ不足'];}
function render(){
 var s=document.getElementById(SID);if(!s)return;var r=rows(),saved=r.filter(function(q){return q.text;});
 var total=r.reduce(function(n,q){return n+q.wrong;},0), t={}, sub={};
 saved.forEach(function(q){sub[q.subject]=(sub[q.subject]||0)+q.wrong;topics(q).forEach(function(x){t[x]=(t[x]||0)+q.wrong;});});
 function list(obj,label){return Object.keys(obj).sort(function(a,b){return obj[b]-obj[a];}).slice(0,6).map(function(k){return '<div class="flex justify-between gap-3 py-1 text-sm"><span>'+esc(k)+'</span><span>'+obj[k]+' 回</span></div>';}).join('')||'<p class="text-xs text-slate-400 mt-2">記録が蓄積されると表示されます。</p>';}
 var cards=r.slice(0,12).map(function(q){return '<article class="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><div class="flex justify-between gap-2 text-[11px]"><span class="text-cyan-200">'+esc(q.subject)+'</span><span class="text-rose-200">間違い '+q.wrong+' 回</span></div><p class="mt-2 text-sm leading-6">'+esc(q.text||'過去の記録：問題文は未保存')+'</p>'+(q.explanation?'<p class="mt-2 text-xs text-slate-300">解説：'+esc(q.explanation)+'</p>':'')+'<p class="mt-2 text-[11px] text-slate-400">関連分野：'+esc(topics(q).join('・'))+'</p></article>';}).join('');
 s.innerHTML='<div class="flex items-center justify-between"><div><p class="text-[10px] tracking-widest text-cyan-200">LEARNING INSIGHTS</p><h2 class="text-xl font-semibold text-white mt-1">間違い問題の分析</h2></div><button id="nurse-plus-wrong-analysis-back" class="rounded-lg border border-slate-600 px-3 py-2 text-xs">戻る</button></div><p class="text-xs leading-5 text-slate-300">端末に保存された間違い問題の文面・解説から、復習候補を整理します。</p><div class="grid grid-cols-2 gap-3"><div class="rounded-xl border border-slate-700 p-4"><p class="text-xs text-slate-400">間違い回数</p><p class="mt-2 text-2xl">'+total+'</p></div><div class="rounded-xl border border-slate-700 p-4"><p class="text-xs text-slate-400">文面を保存済み</p><p class="mt-2 text-2xl">'+saved.length+' 問</p></div></div><section class="rounded-xl border border-slate-700 p-4"><h3 class="font-medium">間違いが多い関連分野</h3>'+list(t)+'</section><section class="rounded-xl border border-slate-700 p-4"><h3 class="font-medium">科目別の間違い</h3>'+list(sub)+'</section><section class="space-y-3"><h3 class="font-medium">優先して復習したい問題</h3>'+(cards||'<p class="text-xs text-slate-400">間違い問題がまだ記録されていません。</p>')+'</section><p class="text-[10px] leading-5 text-slate-500">※ 現在は問題文のキーワードに基づく分類です。AIによる意味解析ではありません。今後記録した問題から文面を分析します。過去に文面を保存していない問題は回数のみ表示されます。</p>';
 document.getElementById('nurse-plus-wrong-analysis-back').onclick=function(){s.classList.add('hidden');var d=document.getElementById('screen-dashboard');if(d)d.classList.remove('hidden');};
}
function open(){document.querySelectorAll('main.glass-card > section[id^="screen-"]').forEach(function(x){x.classList.add('hidden');});var s=document.getElementById(SID);if(s){s.classList.remove('hidden');render();}}
function install(){if(document.getElementById(SID))return;var main=document.querySelector('main.glass-card'),dash=document.getElementById('screen-dashboard');if(!main||!dash)return;var b=document.createElement('button');b.id=BID;b.type='button';b.className='w-full mt-2 py-2.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/40 text-cyan-100 text-xs font-medium transition';b.textContent='⌁　間違い問題を分析';b.onclick=open;var anchor=document.getElementById('nurse-plus-analytics-button');if(anchor)anchor.insertAdjacentElement('afterend',b);else dash.appendChild(b);var s=document.createElement('section');s.id=SID;s.className='hidden space-y-4';main.appendChild(s);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();