/* Step 1: home only. Other bottom-menu tabs are intentionally staged for later PR steps. */
(function(){
  'use strict';
  const KEY='nurse_plus_bottom_menu_enabled';
  const subjects=[
    ['🦴','解剖学','pink'],['⚗️','生化学','gold'],['💙','生理学','blue'],
    ['🦠','公衆衛生学','mint'],['👥','公衆衛生看護学概論','purple'],['🥣','栄養学','peach'],
    ['💊','薬理学','pink'],['♧','看護学方法論Ⅲ','blue']
  ];
  function mount(){
    if(document.getElementById('np-bottom-home-view')) return;
    const view=document.createElement('section');
    view.id='np-bottom-home-view';
    view.setAttribute('aria-label','Nurse＋ホーム');
    view.innerHTML=`
      <div class="np-bh-top">
        <button class="np-bh-icon" type="button" aria-label="メニュー" id="np-bh-menu">☰</button>
        <div></div>
        <button class="np-bh-icon" type="button" aria-label="アカウント" id="np-bh-account">♙</button>
      </div>
      <header class="np-bh-brand"><strong>Nurse＋</strong><span>学びを、少しずつ。</span></header>
      <div class="np-bh-grid" id="np-bh-subject-grid"></div>
      <nav class="np-bh-bottom" aria-label="メインメニュー">
        <button class="np-bh-tab" type="button" aria-current="page" data-tab="home"><span class="np-bh-tab-icon">⌂</span><span>ホーム</span></button>
        <button class="np-bh-tab" type="button" disabled aria-label="データ分析（次の段階で追加）"><span class="np-bh-tab-icon">▥</span><span>データ分析</span></button>
        <button class="np-bh-tab" type="button" disabled aria-label="お知らせ（次の段階で追加）"><span class="np-bh-tab-icon">▤</span><span>お知らせ</span></button>
        <button class="np-bh-tab" type="button" disabled aria-label="設定（次の段階で追加）"><span class="np-bh-tab-icon">⚙</span><span>設定</span></button>
      </nav>`;
    document.body.appendChild(view);
    const grid=view.querySelector('#np-bh-subject-grid');
    subjects.forEach(([icon,name,color])=>{
      const b=document.createElement('button');
      b.type='button'; b.className='np-bh-subject '+color;
      b.innerHTML='<span class="np-bh-symbol" aria-hidden="true">'+icon+'</span><span class="np-bh-name"></span><span class="np-bh-arrow" aria-hidden="true">›</span>';
      b.querySelector('.np-bh-name').textContent=name;
      b.addEventListener('click',()=>openExistingStudy(false));
      grid.appendChild(b);
    });
    const flash=document.createElement('button');
    flash.type='button';flash.className='np-bh-subject mint wide';
    flash.innerHTML='<span class="np-bh-symbol" aria-hidden="true">▤</span><span class="np-bh-name">暗記カード</span><span class="np-bh-arrow" aria-hidden="true">›</span>';
    flash.addEventListener('click',()=>openExistingStudy(true));
    grid.appendChild(flash);
    view.querySelector('#np-bh-menu').addEventListener('click',()=>{
      const drawer=document.getElementById('nav-drawer');
      const opener=document.querySelector('[onclick*="toggleNavDrawer"],[onclick*="openNavDrawer"]');
      if(opener) opener.click(); else if(drawer) drawer.classList.toggle('translate-x-0');
    });
    view.querySelector('#np-bh-account').addEventListener('click',()=>{
      const settings=document.getElementById('np-theme-settings-card');
      if(settings) settings.click();
      else { const account=document.querySelector('[onclick*="openUserSettings"],[onclick*="openSettings"]'); if(account) account.click(); }
    });
  }
  function setEnabled(enabled){
    document.body.classList.toggle('np-bottom-home-enabled',enabled);
    const toggle=document.getElementById('np-bottom-menu-toggle');
    if(toggle && toggle.checked!==enabled) toggle.checked=enabled;
    try{localStorage.setItem(KEY,enabled?'1':'0');}catch(_){}
  }
  function openExistingStudy(flashcard){
    setEnabled(false);
    if(typeof window.showSubjectScreen==='function') window.showSubjectScreen();
    else {
      const dash=document.getElementById('screen-dashboard'), list=document.getElementById('screen-subjects');
      if(dash) dash.classList.add('hidden'); if(list) list.classList.remove('hidden');
    }
    if(flashcard){
      window.setTimeout(()=>{
        const track=document.getElementById('subjects-slider-track');
        if(track) track.style.transform='translateX(-50%)';
      },120);
    }
  }
  function init(){
    mount();
    const toggle=document.getElementById('np-bottom-menu-toggle');
    let saved='0';try{saved=localStorage.getItem(KEY)||'0';}catch(_){}
    if(toggle){
      toggle.checked=saved==='1';
      toggle.addEventListener('change',()=>setEnabled(toggle.checked));
    }
    setEnabled(saved==='1');
    // Theme settings can be opened after initialization; observe late-mounted toggle changes.
    const observer=new MutationObserver(()=>{
      const t=document.getElementById('np-bottom-menu-toggle');
      if(t && !t.dataset.npBottomMenuBound){
        t.dataset.npBottomMenuBound='1';
        t.addEventListener('change',()=>setEnabled(t.checked));
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();