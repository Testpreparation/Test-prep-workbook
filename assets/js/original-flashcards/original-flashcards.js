/* Nurse+ Original Flashcards: isolated UI; account identity is verified by the LINE-session API. */
(function () {
  'use strict';
  var API = 'https://nurse-line-system.onrender.com/api/user/original-flashcards';
  var state = { decks: {}, deckId: null, ids: [], index: 0, flipped: false, saving: false };
  var screenId = 'np-original-flashcards-screen';
  var entryId = 'np-original-flashcards-entry';
  var $ = function (id) { return document.getElementById(id); };
  var stamp = function () { return Date.now(); };
  var id = function (prefix) { return prefix + '_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : stamp() + Math.random().toString(36).slice(2)); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); };
  var cards = function (deck) { return Object.entries(deck.cards || {}).sort(function (a,b) { return (a[1].order || 0) - (b[1].order || 0); }); };
  function token() {
    if (!localStorage.getItem('nurse_line_user_id')) return '';
    return localStorage.getItem('nurse_line_user_session') || '';
  }
  async function request(method, data) {
    var t = token();
    if (!t) throw new Error('オリジナルカード帳を利用するにはLINEログインが必要です。');
    var res = await fetch(API, { method: method, headers: Object.assign({Authorization:'Bearer ' + t}, data ? {'Content-Type':'application/json'} : {}), body: data ? JSON.stringify(data) : undefined });
    var json = await res.json().catch(function () { return {}; });
    if (res.status === 401) throw new Error('LINEログインの有効期限が切れています。再度ログインしてください。');
    if (!res.ok || json.success === false) throw new Error(json.message || 'カード帳の通信に失敗しました。');
    return json;
  }
  async function load() { var result = await request('GET'); state.decks = result.decks || {}; }
  async function save() {
    if (state.saving) return;
    state.saving = true; status('保存中…');
    try { await request('PUT', {decks:state.decks}); status('保存しました'); }
    finally { state.saving = false; }
  }
  function status(value) { if ($('np-original-status')) $('np-original-status').textContent = value; }
  function initEntry() {
    var step = $('fc-step-1-subject-select'), list = $('flashcard-subject-list-container');
    if (!step || !list || $(entryId)) return;
    var box = document.createElement('section');
    box.id = entryId; box.className = 'mt-5 pt-4 border-t border-slate-200 space-y-3';
    box.innerHTML = '<div class="flex items-center justify-between"><div><div class="text-sm font-bold text-slate-800">オリジナル</div><div class="text-[11px] text-slate-500 mt-1">自分で作成したカード帳</div></div><span class="text-[10px] rounded-full bg-violet-50 text-violet-600 px-2 py-1">自分で作成</span></div><button id="np-original-open" type="button" class="w-full rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center justify-between text-left"><span><b class="block text-sm text-slate-800">＋ オリジナルカード帳を開く</b><small class="block text-[10px] text-slate-500 mt-1">作成・編集・学習・進捗管理</small></span><span class="text-violet-500">›</span></button>';
    list.insertAdjacentElement('afterend', box);
    $('np-original-open').addEventListener('click', open);
  }
  function ensureScreen() {
    if ($(screenId)) return;
    var node = document.createElement('section');
    node.id = screenId; node.className = 'hidden fixed inset-0 z-[120] overflow-y-auto bg-slate-50 text-slate-800';
    node.innerHTML = '<div class="min-h-full max-w-3xl mx-auto px-4 pt-4 pb-8"><header class="sticky top-0 z-10 -mx-4 px-4 py-3 bg-white/95 border-b border-slate-200 flex items-center justify-between"><button id="np-original-back" class="text-sm text-slate-600">‹ 戻る</button><div class="text-center"><small class="block text-[10px] text-violet-500">MY FLASHCARDS</small><b>オリジナルカード帳</b></div><span id="np-original-status" class="text-[10px] text-slate-400">同期準備</span></header><main id="np-original-content" class="py-5 space-y-4"></main></div>';
    document.body.appendChild(node);
    $('np-original-back').addEventListener('click', close);
  }
  async function open() {
    ensureScreen(); $(screenId).classList.remove('hidden'); document.body.style.overflow = 'hidden';
    $('np-original-content').innerHTML = '<p class="py-16 text-center text-sm text-slate-500">カード帳を読み込んでいます…</p>';
    try { await load(); renderList(); } catch (e) { renderError(e.message); }
  }
  function close() { $(screenId).classList.add('hidden'); document.body.style.overflow = ''; state.deckId = null; }
  function renderError(message) {
    $('np-original-content').innerHTML = '<div class="rounded-2xl bg-white border p-5 text-center space-y-3"><p class="text-sm text-slate-700">' + esc(message) + '</p><button id="np-original-retry" class="rounded-xl bg-violet-600 text-white px-5 py-2">再試行</button><a class="block text-xs text-violet-600 underline" href="https://nurse-line-system.onrender.com/auth/line">LINEでログイン</a></div>';
    $('np-original-retry').addEventListener('click', open); status('接続エラー');
  }
  function renderList() {
    var entries = Object.entries(state.decks).sort(function(a,b){return (b[1].updatedAt||0)-(a[1].updatedAt||0);});
    // Create a deck by title first, then enter it to add cards individually; later additions remain available from the deck screen.
    var html = entries.map(function(pair) {
      var key=pair[0], deck=pair[1], list=Object.values(deck.cards||{}), learned=list.filter(function(c){return c.learned;}).length;
      return '<article class="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><button data-open="'+esc(key)+'" class="w-full text-left"><b class="block text-sm">'+esc(deck.title)+'</b><span class="text-[11px] text-slate-500">'+list.length+'枚 · 習得 '+learned+'/'+list.length+'</span></button><div class="flex justify-end gap-3 mt-3 pt-3 border-t"><button data-rename="'+esc(key)+'" class="text-xs text-slate-500">名前変更</button><button data-remove="'+esc(key)+'" class="text-xs text-rose-500">削除</button></div></article>';
    }).join('');
    $('np-original-content').innerHTML = '<div class="flex justify-between items-end"><div><h3 class="text-lg font-bold">自分のカード帳</h3><p class="text-xs text-slate-500 mt-1">LINEアカウントに保存・端末間で同期</p></div><span class="text-xs text-slate-400">'+entries.length+'/100冊</span></div><button id="np-original-create" class="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-5 text-violet-700 font-semibold text-sm">＋ 新しいカード帳を作成</button><div class="grid gap-3">'+(html || '<div class="rounded-2xl bg-white border p-8 text-center text-sm text-slate-500">カード帳はまだありません。最初の1冊を作成しましょう。</div>')+'</div>';
    $('np-original-create').addEventListener('click', createDeck);
    $('np-original-content').querySelectorAll('[data-open]').forEach(function(b){b.addEventListener('click',function(){openDeck(b.dataset.open);});});
    $('np-original-content').querySelectorAll('[data-rename]').forEach(function(b){b.addEventListener('click',function(){renameDeck(b.dataset.rename);});});
    $('np-original-content').querySelectorAll('[data-remove]').forEach(function(b){b.addEventListener('click',function(){removeDeck(b.dataset.remove);});});
  }
  async function createDeck() {
    if (Object.keys(state.decks).length >= 100) return alert('カード帳は100冊まで作成できます。');
    var title=prompt('カード帳の名前を入力してください。'); if(title===null)return;
    if(!title.trim()||title.trim().length>80)return alert('名前は1〜80文字で入力してください。');
    var key=id('deck'); state.decks[key]={title:title.trim(),description:'',color:'#8b9dc3',createdAt:stamp(),updatedAt:stamp(),cards:{}};
    try{await save();openDeck(key);}catch(e){alert(e.message);}
  }
  async function renameDeck(key) {
    var deck=state.decks[key]; if(!deck)return;
    var title=prompt('新しいカード帳名を入力してください。',deck.title);if(title===null)return;
    if(!title.trim()||title.trim().length>80)return alert('名前は1〜80文字で入力してください。');
    deck.title=title.trim();deck.updatedAt=stamp();
    try{await save();renderList();}catch(e){alert(e.message);}
  }
  async function removeDeck(key) {
    var deck=state.decks[key];if(!deck||!confirm('「'+deck.title+'」と中のカードをすべて削除しますか？'))return;
    delete state.decks[key];try{await save();renderList();}catch(e){alert(e.message);}
  }
  function openDeck(key) { if(!state.decks[key])return;state.deckId=key;renderDeck(); }
  function renderDeck() {
    var deck=state.decks[state.deckId];if(!deck)return renderList();
    var list=cards(deck);
    var rows=list.map(function(pair,i){var key=pair[0],c=pair[1];return '<article class="rounded-xl border bg-white p-3 flex gap-3"><span class="text-[10px] text-slate-400">'+(i+1)+'</span><div class="min-w-0 flex-1"><p class="text-sm font-medium whitespace-pre-wrap break-words">'+esc(c.front)+'</p><p class="text-xs text-slate-500 mt-2 whitespace-pre-wrap break-words">'+esc(c.back)+'</p><small class="text-[10px] '+(c.learned?'text-emerald-600':'text-slate-400')+'">'+(c.learned?'✓ 習得済み':'未習得')+'</small></div><div class="flex flex-col gap-2"><button data-edit="'+esc(key)+'" class="text-xs text-violet-600">編集</button><button data-del="'+esc(key)+'" class="text-xs text-rose-500">削除</button></div></article>';}).join('');
    $('np-original-content').innerHTML='<div class="flex justify-between"><button id="np-original-list" class="text-xs text-violet-600">‹ カード帳一覧</button><span class="text-xs text-slate-400">'+list.length+'/500枚</span></div><div class="rounded-2xl bg-white border p-4"><h3 class="text-lg font-bold">'+esc(deck.title)+'</h3><div class="grid grid-cols-2 gap-2 mt-4"><button id="np-original-study" '+(list.length?'':'disabled')+' class="rounded-xl bg-violet-600 text-white py-3 text-sm disabled:bg-slate-200">学習する</button><button id="np-original-add" class="rounded-xl border border-violet-200 text-violet-700 py-3 text-sm">＋ カード追加</button></div></div><h4 class="text-sm font-bold">登録カード</h4><div class="space-y-2">'+(rows||'<p class="text-center text-xs text-slate-400 py-8">カードがありません。追加してください。</p>')+'</div>';
    $('np-original-list').addEventListener('click',renderList);$('np-original-add').addEventListener('click',function(){editCard();});$('np-original-study').addEventListener('click',startStudy);
    $('np-original-content').querySelectorAll('[data-edit]').forEach(function(b){b.addEventListener('click',function(){editCard(b.dataset.edit);});});
    $('np-original-content').querySelectorAll('[data-del]').forEach(function(b){b.addEventListener('click',function(){deleteCard(b.dataset.del);});});
  }
  async function editCard(key) {
    var deck=state.decks[state.deckId];if(!deck)return;
    if(!key&&Object.keys(deck.cards).length>=500)return alert('カード帳は500枚まで登録できます。');
    var old=key?deck.cards[key]:null, front=prompt('表面（問題・用語）',old?old.front:'');if(front===null)return;
    if(!front.trim()||front.length>2000)return alert('表面は1〜2,000文字で入力してください。');
    var back=prompt('裏面（答え・解説）',old?old.back:'');if(back===null)return;
    if(!back.trim()||back.length>2000)return alert('裏面は1〜2,000文字で入力してください。');
    var time=stamp(), cardKey=key||id('card');
    deck.cards[cardKey]={front:front.trim(),back:back.trim(),order:old?old.order:Object.keys(deck.cards).length,learned:old?old.learned===true:false,createdAt:old?old.createdAt:time,updatedAt:time};deck.updatedAt=time;
    try{await save();renderDeck();}catch(e){alert(e.message);}
  }
  async function deleteCard(key) {
    var deck=state.decks[state.deckId];if(!deck||!deck.cards[key]||!confirm('このカードを削除しますか？'))return;
    delete deck.cards[key];cards(deck).forEach(function(pair,i){pair[1].order=i;});deck.updatedAt=stamp();
    try{await save();renderDeck();}catch(e){alert(e.message);}
  }
  function startStudy() {var deck=state.decks[state.deckId];state.ids=cards(deck).map(function(pair){return pair[0];});if(!state.ids.length)return;state.index=0;state.flipped=false;renderStudy();}
  function renderStudy() {
    var deck=state.decks[state.deckId], key=state.ids[state.index], card=deck&&deck.cards[key];if(!card)return renderDeck();
    $('np-original-content').innerHTML='<div class="flex justify-between"><button id="np-original-study-back" class="text-xs text-violet-600">‹ カード帳へ</button><span class="text-xs text-slate-500">'+(state.index+1)+' / '+state.ids.length+'</span></div><div class="rounded-2xl bg-white border p-4"><div class="flex justify-between text-[10px] text-slate-400"><span>'+(state.flipped?'ANSWER':'QUESTION')+'</span><span>タップで裏返す</span></div><button id="np-original-flip" class="w-full min-h-[300px] my-3 rounded-2xl border border-violet-100 bg-violet-50 p-6 flex flex-col items-center justify-center text-center"><span class="text-[10px] text-violet-500 mb-4">'+(state.flipped?'ANSWER':'QUESTION')+'</span><span class="text-lg font-semibold whitespace-pre-wrap break-words">'+esc(state.flipped?card.back:card.front)+'</span><span class="text-[10px] text-slate-400 mt-6">タップして表裏を切替</span></button><div class="grid grid-cols-2 gap-2"><button id="np-original-no" class="rounded-xl border py-3 text-sm">まだ覚えていない</button><button id="np-original-yes" class="rounded-xl bg-emerald-600 py-3 text-sm text-white">覚えた ✓</button></div></div>';
    $('np-original-study-back').addEventListener('click',renderDeck);$('np-original-flip').addEventListener('click',function(){state.flipped=!state.flipped;renderStudy();});$('np-original-no').addEventListener('click',function(){next(false);});$('np-original-yes').addEventListener('click',function(){next(true);});
  }
  async function next(learned) {
    var deck=state.decks[state.deckId], key=state.ids[state.index];deck.cards[key].learned=learned;deck.cards[key].updatedAt=stamp();deck.updatedAt=stamp();
    try{await save();}catch(e){alert(e.message);return;}
    state.index++;state.flipped=false;
    if(state.index>=state.ids.length){var total=state.ids.length,known=state.ids.filter(function(k){return deck.cards[k]&&deck.cards[k].learned;}).length;$('np-original-content').innerHTML='<div class="rounded-2xl bg-white border p-8 text-center space-y-3"><div class="text-4xl">🎉</div><h3 class="text-lg font-bold">学習お疲れさまでした</h3><p class="text-sm text-slate-500">'+total+'枚を確認しました。習得済み：'+known+'枚</p><button id="np-original-finish" class="rounded-xl bg-violet-600 text-white px-6 py-3 text-sm">カード帳に戻る</button></div>';$('np-original-finish').addEventListener('click',renderDeck);return;}
    renderStudy();
  }
  function init() {
    initEntry();
    if(!$(entryId)){var observer=new MutationObserver(function(){initEntry();if($(entryId))observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
