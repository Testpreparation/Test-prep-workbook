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

    /* Full light-theme coverage for Tailwind utility colors used throughout the app */
    html[data-np-theme="light"] body [class*="bg-"] { background-image:none; }
    html[data-np-theme="light"] body [class*="bg-slate-"], html[data-np-theme="light"] body [class*="bg-gray-"], html[data-np-theme="light"] body [class*="bg-zinc-"], html[data-np-theme="light"] body [class*="bg-neutral-"], html[data-np-theme="light"] body [class*="bg-stone-"] { background-color:#fffdfd !important; }
    html[data-np-theme="light"] body [class*="bg-emerald-"], html[data-np-theme="light"] body [class*="bg-green-"], html[data-np-theme="light"] body [class*="bg-teal-"] { background-color:#e3f6ed !important; }
    html[data-np-theme="light"] body [class*="bg-cyan-"], html[data-np-theme="light"] body [class*="bg-sky-"], html[data-np-theme="light"] body [class*="bg-blue-"] { background-color:#e7f0ff !important; }
    html[data-np-theme="light"] body [class*="bg-indigo-"], html[data-np-theme="light"] body [class*="bg-violet-"], html[data-np-theme="light"] body [class*="bg-purple-"], html[data-np-theme="light"] body [class*="bg-fuchsia-"] { background-color:#f0eaff !important; }
    html[data-np-theme="light"] body [class*="bg-pink-"], html[data-np-theme="light"] body [class*="bg-rose-"] { background-color:#fff0f5 !important; }
    html[data-np-theme="light"] body [class*="bg-amber-"], html[data-np-theme="light"] body [class*="bg-yellow-"], html[data-np-theme="light"] body [class*="bg-orange-"] { background-color:#fff5df !important; }
    html[data-np-theme="light"] body [class*="text-white"], html[data-np-theme="light"] body [class*="text-slate-50"], html[data-np-theme="light"] body [class*="text-gray-50"], html[data-np-theme="light"] body [class*="text-zinc-50"] { color:#343247 !important; }
    html[data-np-theme="light"] body [class*="text-slate-"], html[data-np-theme="light"] body [class*="text-gray-"], html[data-np-theme="light"] body [class*="text-zinc-"], html[data-np-theme="light"] body [class*="text-neutral-"], html[data-np-theme="light"] body [class*="text-stone-"] { color:#444258 !important; }
    html[data-np-theme="light"] body [class*="text-emerald-"], html[data-np-theme="light"] body [class*="text-green-"], html[data-np-theme="light"] body [class*="text-teal-"] { color:#217653 !important; }
    html[data-np-theme="light"] body [class*="text-cyan-"], html[data-np-theme="light"] body [class*="text-sky-"], html[data-np-theme="light"] body [class*="text-blue-"] { color:#3f5eb6 !important; }
    html[data-np-theme="light"] body [class*="text-indigo-"], html[data-np-theme="light"] body [class*="text-violet-"], html[data-np-theme="light"] body [class*="text-purple-"], html[data-np-theme="light"] body [class*="text-fuchsia-"] { color:#6652a5 !important; }
    html[data-np-theme="light"] body [class*="text-pink-"], html[data-np-theme="light"] body [class*="text-rose-"] { color:#a34d76 !important; }
    html[data-np-theme="light"] body [class*="text-amber-"], html[data-np-theme="light"] body [class*="text-yellow-"], html[data-np-theme="light"] body [class*="text-orange-"] { color:#94621c !important; }
    html[data-np-theme="light"] body [class*="border-"] { border-color:#e5deef !important; }
    html[data-np-theme="light"] body [class*="from-slate-"], html[data-np-theme="light"] body [class*="to-slate-"], html[data-np-theme="light"] body [class*="via-slate-"],
    html[data-np-theme="light"] body [class*="from-gray-"], html[data-np-theme="light"] body [class*="to-gray-"], html[data-np-theme="light"] body [class*="via-gray-"] { --tw-gradient-from:#fffdfd var(--tw-gradient-from-position) !important; --tw-gradient-to:rgb(255 253 253 / 0) var(--tw-gradient-to-position) !important; --tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to) !important; }
    html[data-np-theme="light"] body [class*="shadow-2xl"], html[data-np-theme="light"] body [class*="shadow-xl"], html[data-np-theme="light"] body [class*="shadow-lg"] { --tw-shadow:0 10px 28px rgba(87,72,122,.09) !important; box-shadow:0 10px 28px rgba(87,72,122,.09) !important; }
    html[data-np-theme="light"] body .text-transparent { color:#6652a5 !important; }
    html[data-np-theme="light"] body button:disabled { opacity:.55; }
    html[data-np-theme="light"] body table, html[data-np-theme="light"] body th, html[data-np-theme="light"] body td { border-color:#e5deef !important; }

    /* Dashboard cards: force milk-white surfaces for condition and learning-log panels */
    html[data-np-theme="light"] body .evo-card,
    html[data-np-theme="light"] body .evo-card[class*="bg-"],
    html[data-np-theme="light"] body .evo-card [class*="bg-slate-"],
    html[data-np-theme="light"] body .evo-card [class*="bg-gray-"] {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#39364d !important;
      border-color:#e7def4 !important;
      box-shadow:0 10px 28px rgba(105,84,145,.09) !important;
    }
    html[data-np-theme="light"] body .evo-card,
    html[data-np-theme="light"] body .evo-card * {
      text-shadow:none !important;
    }
    html[data-np-theme="light"] body .evo-card [class*="text-slate-"],
    html[data-np-theme="light"] body .evo-card [class*="text-gray-"],
    html[data-np-theme="light"] body .evo-card [class*="text-zinc-"] {
      color:#625b78 !important;
    }
    html[data-np-theme="light"] body .evo-card [class*="bg-slate-"],
    html[data-np-theme="light"] body .evo-card [class*="bg-gray-"] {
      background-color:#f5f0fb !important;
    }
    html[data-np-theme="light"] body .evo-card [class*="border-slate-"],
    html[data-np-theme="light"] body .evo-card [class*="border-gray-"] {
      border-color:#e7def4 !important;
    }

    /* Subject selection buttons: explicitly replace dark cards and gradient buttons in every subject list */
    html[data-np-theme="light"] #subject-list-container > *, 
    html[data-np-theme="light"] #flashcard-subject-list-container > * {
      background:#fffdfd !important; background-image:none !important; color:#39364d !important;
      border:1px solid #e7def4 !important; box-shadow:0 5px 16px rgba(105,84,145,.08) !important;
      border-radius:16px !important;
    }
    html[data-np-theme="light"] #subject-list-container > *:nth-child(4n+1),
    html[data-np-theme="light"] #flashcard-subject-list-container > *:nth-child(4n+1) { background:#fff0f5 !important; }
    html[data-np-theme="light"] #subject-list-container > *:nth-child(4n+2),
    html[data-np-theme="light"] #flashcard-subject-list-container > *:nth-child(4n+2) { background:#f0eaff !important; }
    html[data-np-theme="light"] #subject-list-container > *:nth-child(4n+3),
    html[data-np-theme="light"] #flashcard-subject-list-container > *:nth-child(4n+3) { background:#eaf5ff !important; }
    html[data-np-theme="light"] #subject-list-container > *:nth-child(4n),
    html[data-np-theme="light"] #flashcard-subject-list-container > *:nth-child(4n) { background:#eaf8f0 !important; }
    html[data-np-theme="light"] #subject-list-container > * *,
    html[data-np-theme="light"] #flashcard-subject-list-container > * * { color:#454057 !important; }
    html[data-np-theme="light"] #semester-spring-btn,
    html[data-np-theme="light"] #semester-autumn-btn {
      background:#fffdfd !important; background-image:none !important; color:#454057 !important;
      border:1px solid #e3d9f3 !important; box-shadow:0 6px 18px rgba(105,84,145,.08) !important;
    }
    html[data-np-theme="light"] #semester-spring-btn:hover,
    html[data-np-theme="light"] #semester-autumn-btn:hover { background:#f4efff !important; border-color:#cfc0f1 !important; }
    /* Any app button with dark/gradient Tailwind classes becomes a soft pastel button in light mode */
    html[data-np-theme="light"] body button[class*="bg-slate-"],
    html[data-np-theme="light"] body button[class*="bg-gray-"],
    html[data-np-theme="light"] body button[class*="bg-zinc-"],
    html[data-np-theme="light"] body button[class*="bg-neutral-"],
    html[data-np-theme="light"] body button[class*="from-slate-"],
    html[data-np-theme="light"] body button[class*="from-gray-"] {
      background:#f0eaff !important; background-image:none !important; color:#49405f !important; border-color:#e0d5f4 !important;
    }
    html[data-np-theme="light"] body button[class*="from-amber-"],
    html[data-np-theme="light"] body button[class*="bg-amber-"] {
      background:#fff0d8 !important; background-image:none !important; color:#795522 !important; border-color:#f1dfbd !important;
    }
    html[data-np-theme="light"] body button[class*="from-emerald-"],
    html[data-np-theme="light"] body button[class*="from-teal-"],
    html[data-np-theme="light"] body button[class*="bg-emerald-"],
    html[data-np-theme="light"] body button[class*="bg-green-"] {
      background:#e3f6ed !important; background-image:none !important; color:#27674f !important; border-color:#ccebdc !important;
    }
    html[data-np-theme="light"] body button:hover { filter:brightness(.985); }
    html[data-np-theme="light"] body button:active { transform:scale(.985); }

    /* Light mode: analytics, subject condition, progress and statistics cards */
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="from-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="via-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="to-"],
    html[data-np-theme="light"] body #screen-dashboard [style*="background"],
    html[data-np-theme="light"] body #screen-dashboard [style*="background-color"],
    html[data-np-theme="light"] body #screen-dashboard [style*="background-image"] {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#454057 !important;
      border-color:#e5deef !important;
      box-shadow:0 8px 24px rgba(100,82,145,.08) !important;
    }
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-slate-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-gray-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-zinc-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-neutral-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-stone-"] {
      background:#fffdfd !important;
    }
    html[data-np-theme="light"] body #screen-dashboard [class*="text-slate-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-gray-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-zinc-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-neutral-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-stone-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-white"] {
      color:#454057 !important;
    }
    html[data-np-theme="light"] body #screen-dashboard [class*="border-"] {
      border-color:#e5deef !important;
    }
    html[data-np-theme="light"] body #screen-dashboard canvas,
    html[data-np-theme="light"] body #screen-dashboard svg {
      color:#6652a5;
    }
    html[data-np-theme="light"] body #screen-dashboard [class*="text-rose-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-pink-"] { color:#b45379 !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="text-emerald-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-green-"] { color:#267653 !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="text-amber-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="text-yellow-"] { color:#94621c !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-indigo-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-violet-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-purple-"] { background-color:#f0eaff !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-blue-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-sky-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-cyan-"] { background-color:#e7f0ff !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-emerald-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-green-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-teal-"] { background-color:#e3f6ed !important; }
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-pink-"],
    html[data-np-theme="light"] body #screen-dashboard [class*="bg-rose-"] { background-color:#fff0f5 !important; }
    @media (max-width:640px) { #np-theme-toggle { top:12px; right:12px; padding:8px 10px; } }
    @media (prefers-reduced-motion: reduce) { body, body * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }
  `;
  function saveMode(mode) {
    try { localStorage.setItem(KEY, mode); } catch (_) {}
    try { sessionStorage.setItem(KEY, mode); } catch (_) {}
    try { document.cookie = KEY + '=' + mode + '; Max-Age=31536000; Path=/; SameSite=Lax'; } catch (_) {}
  }
  function readMode() {
    try {
      const value = localStorage.getItem(KEY);
      if (value === 'light' || value === 'dark') return value;
    } catch (_) {}
    try {
      const value = sessionStorage.getItem(KEY);
      if (value === 'light' || value === 'dark') return value;
    } catch (_) {}
    try {
      const match = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=(light|dark)(?:;|$)'));
      if (match) return match[1];
    } catch (_) {}
    return 'dark';
  }
  function apply(mode, persist = true) {
    const next = mode === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.npTheme = next;
    if (persist) saveMode(next);
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
    apply(readMode(), false);
  }
  // Restore the selected theme at initial load and when iOS restores the page.
  apply(readMode(), false);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true }); else mount();
  window.addEventListener('pageshow', () => apply(readMode(), false));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) apply(readMode(), false);
  });
})();