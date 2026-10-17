/* Nurse＋ theme switcher: isolated theme overrides only. */
(() => {
  'use strict';
  const KEY = 'nurseplus-theme-mode';
  const css = `
    :root { color-scheme: dark; --np-transition: 420ms cubic-bezier(.2,.75,.25,1); }
    html[data-np-theme="light"] { color-scheme: light; }
    body, body * { transition-property: background-color,border-color,color,box-shadow; transition-duration: var(--np-transition); }
    #np-theme-toggle { position:fixed; top:16px; right:16px; z-index:60; display:flex; align-items:center; gap:8px; padding:10px 13px; border-radius:14px; border:1px solid rgba(148,163,184,.24); background:rgba(15,23,42,.88); color:#e2e8f0; box-shadow:0 8px 24px rgba(0,0,0,.16); backdrop-filter:blur(14px); font-size:12px; font-weight:600; }
    #np-theme-toggle:active { transform:scale(.94); }
    #np-theme-toggle .np-theme-icon { font-size:17px; line-height:1; }
    #np-theme-setting { width:100%; margin-top:12px; padding:12px 14px; border-radius:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid rgba(148,163,184,.25); background:rgba(51,65,85,.32); color:inherit; text-align:left; font-size:12px; }
    #np-theme-setting .np-theme-choice { padding:5px 8px; border-radius:9px; background:rgba(99,102,241,.2); }
    html[data-np-theme="light"] body { background:#f8f7fb !important; color:#252b3a !important; }
    html[data-np-theme="light"] body [class*="bg-slate-950"], html[data-np-theme="light"] body [class*="bg-slate-900"] { background-color:#fffdfd !important; }
    html[data-np-theme="light"] body [class*="bg-slate-800"] { background-color:#f2eff8 !important; }
    html[data-np-theme="light"] body [class*="bg-slate-700"] { background-color:#eae6f4 !important; }
    html[data-np-theme="light"] body [class*="bg-slate-600"] { background-color:#ddd8ee !important; }
    html[data-np-theme="light"] body [class*="text-slate-100"], html[data-np-theme="light"] body [class*="text-slate-200"], html[data-np-theme="light"] body [class*="text-slate-300"] { color:#34364a !important; }
    html[data-np-theme="light"] body [class*="text-slate-400"], html[data-np-theme="light"] body [class*="text-slate-500"] { color:#74748b !important; }
    html[data-np-theme="light"] body [class*="border-slate-800"], html[data-np-theme="light"] body [class*="border-slate-700"], html[data-np-theme="light"] body [class*="border-slate-600"] { border-color:#e3deef !important; }
    html[data-np-theme="light"] body [class*="text-amber-"] { color:#6555a6 !important; }
    html[data-np-theme="light"] body [class*="border-amber-"] { border-color:#d8c9f6 !important; }
    html[data-np-theme="light"] body [class*="bg-amber-"] { background-color:#eee7ff !important; }
    html[data-np-theme="light"] body [class*="bg-indigo-"], html[data-np-theme="light"] body [class*="bg-blue-"] { background-color:#dfe8ff !important; }
    html[data-np-theme="light"] body [class*="text-indigo-"], html[data-np-theme="light"] body [class*="text-blue-"] { color:#4b5fc4 !important; }
    html[data-np-theme="light"] body [class*="border-indigo-"], html[data-np-theme="light"] body [class*="border-blue-"] { border-color:#cbd6ff !important; }
    html[data-np-theme="light"] body .glass-card { background:rgba(255,253,255,.92) !important; border-color:#e8e2f1 !important; box-shadow:0 12px 34px rgba(78,67,112,.08) !important; }
    html[data-np-theme="light"] body input, html[data-np-theme="light"] body textarea, html[data-np-theme="light"] body select { background-color:#fff !important; color:#292b3e !important; border-color:#ddd6ed !important; }
    html[data-np-theme="light"] #nav-drawer { background:rgba(255,253,255,.97) !important; color:#34364a !important; border-color:#e5deef !important; }
    html[data-np-theme="light"] #nav-overlay { background:rgba(54,46,78,.24) !important; }
    html[data-np-theme="light"] #np-theme-toggle { background:rgba(255,253,255,.95); color:#37344e; border-color:#e3d9f5; box-shadow:0 8px 24px rgba(78,67,112,.12); }
    html[data-np-theme="light"] #np-theme-setting { background:#f5f0ff; border-color:#e3d7fb; color:#34364a; }
    html[data-np-theme="light"] .bg-black\/70, html[data-np-theme="light"] .bg-black\/80 { background-color:rgba(48,39,68,.45) !important; }
    @media (max-width:640px) { #np-theme-toggle { top:12px; right:12px; padding:8px 10px; } }
    @media (prefers-reduced-motion: reduce) { body, body * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
  `;
  function apply(mode) {
    const next = mode === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.npTheme = next;
    try { localStorage.setItem(KEY, next); } catch (_) {}
    const icon = document.querySelector('#np-theme-toggle .np-theme-icon');
    const label = document.querySelector('#np-theme-toggle .np-theme-label');
    if (icon) icon.textContent = next === 'dark' ? '☀' : '☾';
    if (label) label.textContent = next === 'dark' ? 'ホワイト' : 'ダーク';
    const choice = document.querySelector('#np-theme-setting .np-theme-choice');
    if (choice) choice.textContent = next === 'dark' ? '🌙 ダーク' : '☀️ ホワイト';
  }
  function mount() {
    if (!document.getElementById('np-theme-style')) {
      const style = document.createElement('style'); style.id = 'np-theme-style'; style.textContent = css; document.head.appendChild(style);
    }
    if (!document.getElementById('np-theme-toggle')) {
      const button = document.createElement('button');
      button.id = 'np-theme-toggle'; button.type = 'button'; button.setAttribute('aria-label','テーマを切り替える');
      button.innerHTML = '<span class="np-theme-icon" aria-hidden="true">☀</span><span class="np-theme-label">ホワイト</span>';
      button.addEventListener('click', () => apply(document.documentElement.dataset.npTheme === 'dark' ? 'light' : 'dark'));
      document.body.appendChild(button);
    }
    const drawer = document.getElementById('nav-drawer');
    if (drawer && !document.getElementById('np-theme-setting')) {
      const setting = document.createElement('button');
      setting.id = 'np-theme-setting'; setting.type = 'button';
      setting.innerHTML = '<span><strong>テーマ設定</strong><br><small style="opacity:.7">表示モードを切り替え</small></span><span class="np-theme-choice">🌙 ダーク</span>';
      setting.addEventListener('click', () => apply(document.documentElement.dataset.npTheme === 'dark' ? 'light' : 'dark'));
      const menu = drawer.querySelector('.mt-6.space-y-2\.5') || drawer.querySelector('.mt-6');
      if (menu) menu.appendChild(setting); else drawer.appendChild(setting);
    }
    let saved = 'dark';
    try { saved = localStorage.getItem(KEY) || 'dark'; } catch (_) {}
    apply(saved);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true }); else mount();
})();