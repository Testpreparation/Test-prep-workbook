/* Nurse＋ first-use tutorial. Adds an isolated overlay; does not alter existing screens. */
(function () {
  'use strict';
  const STORAGE_KEY = 'nurse_plus_tutorial_seen_v1';
  const slides = [
    { title:'Nurse＋へようこそ', lead:'科目を選び、問題を解き、解説で復習する学習アプリです。', screen:'home', points:['まずはホームの科目カードを見てみましょう。','利用できる問題やモードは科目ごとに異なります。'] },
    { title:'ホーム画面の見方', lead:'科目カードを選ぶと、その科目の学習へ進めます。', screen:'subjects', points:['カードに表示されている科目名を確認します。','カードや表示内容は科目によって異なります。'] },
    { title:'星マークの意味', lead:'星は、その科目・モードに問題データがあることを示す目印です。', screen:'star', points:['科目カードの星は、その科目に問題があることを示します。','科目を開いたら、各モードに付いている星を確認してください。星の付いたモードを選ぶと、そのモードの問題を確認できます。'] },
    { title:'科目・モード別に問題を確認', lead:'科目カードの星を確認したあと、科目を開いてモードごとの星を確認します。', screen:'modes', points:['科目カードの星は科目単位、モード画面の星はそのモード単位の目印です。','問題を解きたいモードを選び、問題一覧や開始画面で実際の問題を確認してください。'] },
    { title:'問題を解いてみよう', lead:'問題文と選択肢を読み、回答後は表示される解説を確認しましょう。', screen:'question', points:['選択肢を選んで回答します。','解説を読み、次の問題へ進みます。※表示や操作はモードにより異なります。'] },
    { title:'学習状況を振り返る', lead:'下部メニューやナビゲーションメニューから「データ分析」を開けます。', screen:'analytics', points:['保存された演習履歴や正答率などを確認できます。','表示される記録は、利用状況や端末の保存状態によって異なります。'] },
    { title:'下部メニューの使い方', lead:'下部メニューは「テーマ・外観」でオンにすると表示されます。', screen:'bottom', points:['ホーム：学習ホームへ','データ分析：学習状況を確認','お知らせ：アプリ内のお知らせ','設定：設定項目を開く'] },
    { title:'下部メニューを表示する設定', lead:'設定 → 一般 → テーマ・外観 →「下部メニュー」をオンにします。', screen:'toggle', points:['「下部メニュー」をオンにすると、画面下部に4つのメニューが表示されます。','ホワイト／ダークのテーマ切り替えも、この画面で行えます。'] },
    { title:'設定項目の役割', lead:'設定画面では、カテゴリーを開いて実際の項目を確認できます。', screen:'settings', points:['アカウント：アカウント関連の設定','一般：テーマ・外観、オーディオ、通知設定、アクセシビリティ','プライバシー：プライバシー関連の設定','データ管理：データ管理に関する項目','ヘルプ・サポート／アプリ情報：ヘルプとアプリ情報を確認'] },
    { title:'いつでも見返せます', lead:'操作に迷ったら、ハンバーガーメニューの「チュートリアル」を開いてください。', screen:'menu', points:['設定はいつでも変更できます。','問題がある科目やモードは、実際の画面に表示される内容を確認してください。'] }
  ];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function visual(type) {
    const frame = (content, label='Nurse＋') => '<div class="npt-screen"><div class="npt-screen-head"><span class="npt-logo">＋</span><b>'+label+'</b><span class="npt-dots">•••</span></div>'+content+'</div>';
    if(type==='home'||type==='subjects') return frame('<div class="npt-mini-title">学習ホーム</div><div class="npt-card-grid"><div class="npt-subject">基礎看護学<span>科目</span></div><div class="npt-subject">人体の構造と機能<span>科目</span></div><div class="npt-subject">公衆衛生看護学概論<span>科目</span></div><div class="npt-subject">ほかの科目<span>科目</span></div></div><div class="npt-hint">科目カードを選択</div>');
    if(type==='star') return frame('<div class="npt-mini-title">科目カードの例</div><div class="npt-subject npt-wide">問題データがある科目 <span class="npt-star">★</span><small>星は問題データの目印</small></div><div class="npt-subject npt-wide">別の科目 <span class="npt-star npt-muted">★</span><small>星がない場合はモード画面も確認</small></div>');
    if(type==='modes') return frame('<div class="npt-mini-title">科目のモード（例）</div><div class="npt-mode">練習問題 <span>›</span></div><div class="npt-mode">演習問題 <span>›</span></div><div class="npt-mode">利用できる項目は科目により異なります</div>');
    if(type==='question') return frame('<div class="npt-mini-title">問題画面（イメージ）</div><div class="npt-question">問題文を読んで、正しい選択肢を選びましょう。</div><div class="npt-option">○　選択肢 A</div><div class="npt-option">○　選択肢 B</div><div class="npt-option">○　選択肢 C</div><div class="npt-hint">回答後は解説を確認</div>');
    if(type==='analytics') return frame('<div class="npt-mini-title">データ分析</div><div class="npt-stat-row"><div class="npt-stat">学習履歴</div><div class="npt-stat">正答率</div></div><div class="npt-hint">利用状況に応じた記録を確認</div>');
    if(type==='bottom') return '<div class="npt-screen npt-bottom-example"><div class="npt-mini-title">画面下部のメニュー</div><div class="npt-nav"><span>⌂<small>ホーム</small></span><span>▥<small>データ分析</small></span><span>▤<small>お知らせ</small></span><span>⚙<small>設定</small></span></div></div>';
    if(type==='toggle') return frame('<div class="npt-mini-title">テーマ・外観</div><div class="npt-setting-row">ホワイト／ダーク <span>切り替え</span></div><div class="npt-setting-row npt-highlight">下部メニュー <span>オン／オフ</span></div><div class="npt-hint">設定 → 一般 → テーマ・外観</div>');
    if(type==='settings') return frame('<div class="npt-mini-title">設定</div><div class="npt-setting-row">アカウント <span>›</span></div><div class="npt-setting-row">一般 <span>›</span></div><div class="npt-setting-row indent">テーマ・外観</div><div class="npt-setting-row indent">オーディオ</div><div class="npt-setting-row indent">通知設定</div><div class="npt-setting-row indent">アクセシビリティ</div><div class="npt-setting-row">プライバシー <span>›</span></div><div class="npt-setting-row">データ管理 <span>›</span></div>');
    return frame('<div class="npt-mini-title">ナビゲーションメニュー</div><div class="npt-setting-row">学習ホーム</div><div class="npt-setting-row">データ分析</div><div class="npt-setting-row">個人演習（科目一覧）</div><div class="npt-setting-row npt-highlight">チュートリアル</div>');
  }
  function addMenuEntry() {
    const target = document.getElementById('nav-drawer');
    if (!target || document.getElementById('npt-open-from-menu')) return;
    const entry = document.createElement('button');
    entry.id='npt-open-from-menu'; entry.type='button'; entry.className='w-full text-left px-4 py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-200 text-xs transition flex items-center gap-3';
    entry.innerHTML='<span class="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 font-mono text-violet-300 text-[10px] font-bold">GUIDE</span><span class="font-medium">チュートリアル</span>';
    entry.addEventListener('click', function(){ if(typeof closeNavDrawer==='function') closeNavDrawer(); openTutorial(0); });
    const settings = document.getElementById('drawer-settings-accordion');
    (settings || target.querySelector('.mt-6.space-y-2\.5') || target.firstElementChild)?.appendChild(entry);
  }
  let current=0, returnFocus=null;
  function render() {
    const modal=document.getElementById('npt-tutorial-modal');
    if(!modal) return;
    const s=slides[current];
    modal.querySelector('.npt-count').textContent=(current+1)+' / '+slides.length;
    modal.querySelector('.npt-progress span').style.width=((current+1)/slides.length*100)+'%';
    modal.querySelector('.npt-title').textContent=s.title;
    modal.querySelector('.npt-lead').textContent=s.lead;
    modal.querySelector('.npt-visual').innerHTML=visual(s.screen);
    modal.querySelector('.npt-points').innerHTML=s.points.map(p=>'<li>'+esc(p)+'</li>').join('');
    modal.querySelector('.npt-prev').disabled=current===0;
    modal.querySelector('.npt-next').textContent=current===slides.length-1?'はじめる':'次へ';
    modal.querySelector('.npt-skip').textContent=current===slides.length-1?'閉じる':'スキップ';
  }
  function closeTutorial(markSeen=true) {
    const modal=document.getElementById('npt-tutorial-modal');
    if(!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('npt-tutorial-open');
    if(markSeen) { try { localStorage.setItem(STORAGE_KEY,'1'); } catch(_){} }
    if(returnFocus && typeof returnFocus.focus==='function') returnFocus.focus();
  }
  function openTutorial(index=0) {
    addMenuEntry();
    const modal=document.getElementById('npt-tutorial-modal');
    if(!modal) return;
    returnFocus=document.activeElement;
    current=Math.max(0,Math.min(index,slides.length-1));
    modal.classList.remove('hidden');
    document.body.classList.add('npt-tutorial-open');
    render();
    modal.querySelector('.npt-next').focus();
  }
  function init() {
    if(document.getElementById('npt-tutorial-modal')) return;
    const root=document.createElement('div');
    root.id='npt-tutorial-modal'; root.className='hidden';
    root.innerHTML='<div class="npt-backdrop" data-npt-close></div><section class="npt-dialog" role="dialog" aria-modal="true" aria-labelledby="npt-title"><header class="npt-header"><div><div class="npt-eyebrow">NURSE＋ START GUIDE</div><div class="npt-count" aria-live="polite"></div></div><button class="npt-close" type="button" aria-label="チュートリアルを閉じる">×</button></header><div class="npt-progress"><span></span></div><main class="npt-content"><h2 class="npt-title" id="npt-title"></h2><p class="npt-lead"></p><div class="npt-visual"></div><ul class="npt-points"></ul></main><footer class="npt-footer"><button type="button" class="npt-skip">スキップ</button><div class="npt-actions"><button type="button" class="npt-prev">戻る</button><button type="button" class="npt-next">次へ</button></div></footer></section>';
    document.body.appendChild(root);
    root.querySelector('.npt-close').addEventListener('click',()=>closeTutorial(true));
    root.querySelector('[data-npt-close]').addEventListener('click',()=>closeTutorial(true));
    root.querySelector('.npt-skip').addEventListener('click',()=>closeTutorial(true));
    root.querySelector('.npt-prev').addEventListener('click',()=>{if(current>0){current--;render();}});
    root.querySelector('.npt-next').addEventListener('click',()=>{if(current<slides.length-1){current++;render();}else closeTutorial(true);});
    document.addEventListener('keydown',e=>{if(root.classList.contains('hidden'))return;if(e.key==='Escape')closeTutorial(true);if(e.key==='ArrowRight'&&current<slides.length-1){current++;render();}if(e.key==='ArrowLeft'&&current>0){current--;render();}});
    addMenuEntry();
    try { if(localStorage.getItem(STORAGE_KEY)!=='1') setTimeout(()=>openTutorial(0),650); } catch(_) { setTimeout(()=>openTutorial(0),650); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  window.openNursePlusTutorial=openTutorial;
})();