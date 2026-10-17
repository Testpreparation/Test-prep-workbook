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

    /* Light mode: cover every study screen, including timer, subject mode and quiz play */
    html[data-np-theme="light"] body #screen-subjects [class*="bg-"],
    html[data-np-theme="light"] body #screen-semester-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-physiology-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-anatomy-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-publichealth-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-phn-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-pathology-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-pathology-round-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-pharmacology-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-nursing-method-3-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-nutrition-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-nursing-mode-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-biochemistry-format-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-time-select > div,
    html[data-np-theme="light"] body #screen-round-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-count-select [class*="bg-"],
    html[data-np-theme="light"] body #screen-quiz-start [class*="bg-"],
    html[data-np-theme="light"] body #screen-quiz-play [class*="bg-"],
    html[data-np-theme="light"] body #screen-quiz-result [class*="bg-"] {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#454057 !important;
      border-color:#e5deef !important;
      box-shadow:0 8px 24px rgba(100,82,145,.07) !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play .quiz-opt-btn {
      position:relative !important;
      z-index:2 !important;
      pointer-events:auto !important;
      touch-action:manipulation !important;
      cursor:pointer !important;
      color:#49405f !important;
      background:#f0eaff !important;
      border:1px solid #dfd3f3 !important;
      -webkit-tap-highlight-color:rgba(139,112,194,.18);
    }
    html[data-np-theme="light"] body #screen-quiz-play .quiz-opt-btn:disabled {
      cursor:default !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-question-text,
    html[data-np-theme="light"] body #screen-quiz-play #quiz-question-number,
    html[data-np-theme="light"] body #screen-quiz-play #quiz-score-live,
    html[data-np-theme="light"] body #screen-quiz-play label {
      color:#454057 !important;
    }
    html[data-np-theme="light"] body #screen-time-select input[type="range"] {
      accent-color:#b79ae8 !important;
      cursor:pointer !important;
      touch-action:pan-y !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play button,
    html[data-np-theme="light"] body #screen-time-select button,
    html[data-np-theme="light"] body #screen-subjects button,
    html[data-np-theme="light"] body [id$="-mode-select"] button {
      pointer-events:auto !important;
      touch-action:manipulation !important;
    }

    /* Keep the post-answer feedback and bottom navigation button visible */
    #screen-quiz-play #quiz-feedback-box.block {
      display:block !important;
      visibility:visible !important;
      opacity:1 !important;
      position:relative !important;
      overflow:visible !important;
    }
    #screen-quiz-play #quiz-feedback-box #quiz-next-btn {
      display:block !important;
      visibility:visible !important;
      opacity:1 !important;
      min-height:44px !important;
      width:100% !important;
      margin-top:12px !important;
      position:relative !important;
      z-index:5 !important;
      pointer-events:auto !important;
      touch-action:manipulation !important;
      cursor:pointer !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-feedback-box.block {
      background:#fffdfd !important;
      color:#454057 !important;
      border:1px solid #e5deef !important;
      border-radius:16px !important;
      box-shadow:0 8px 24px rgba(100,82,145,.07) !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-feedback-desc {
      color:#5d586d !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-next-btn {
      background:#eee7fb !important;
      color:#51446f !important;
      border:1px solid #dcd0f1 !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-next-btn:active {
      transform:scale(.985);
      background:#e4d8f7 !important;
    }

    /* Light mode: make every subject/mode selection button match the pastel theme */
    html[data-np-theme="light"] body [id*="mode-select"] button,
    html[data-np-theme="light"] body #screen-round-select button,
    html[data-np-theme="light"] body #screen-semester-select button,
    html[data-np-theme="light"] body [id*="format-select"] button,
    html[data-np-theme="light"] body [id*="count-select"] button {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#514b63 !important;
      border-color:#e4dcef !important;
      box-shadow:0 5px 16px rgba(100,82,145,.06) !important;
    }
    html[data-np-theme="light"] body [id*="mode-select"] button.card-item,
    html[data-np-theme="light"] body #screen-round-select button.card-item,
    html[data-np-theme="light"] body #screen-semester-select button.card-item,
    html[data-np-theme="light"] body [id*="format-select"] button.card-item,
    html[data-np-theme="light"] body [id*="count-select"] button.card-item {
      background:#fffdfd !important;
      color:#514b63 !important;
      border:1px solid #e4dcef !important;
    }
    html[data-np-theme="light"] body [id*="mode-select"] button:hover,
    html[data-np-theme="light"] body #screen-round-select button:hover,
    html[data-np-theme="light"] body #screen-semester-select button:hover,
    html[data-np-theme="light"] body [id*="format-select"] button:hover,
    html[data-np-theme="light"] body [id*="count-select"] button:hover {
      background:#f2ecff !important;
      border-color:#d7c8f2 !important;
    }
    html[data-np-theme="light"] body [id*="mode-select"] button [class*="text-slate-"],
    html[data-np-theme="light"] body #screen-round-select button [class*="text-slate-"],
    html[data-np-theme="light"] body #screen-semester-select button [class*="text-slate-"],
    html[data-np-theme="light"] body [id*="format-select"] button [class*="text-slate-"],
    html[data-np-theme="light"] body [id*="count-select"] button [class*="text-slate-"] {
      color:#625b72 !important;
    }
    html[data-np-theme="light"] body [id*="mode-select"] button [class*="text-white"],
    html[data-np-theme="light"] body #screen-round-select button [class*="text-white"],
    html[data-np-theme="light"] body #screen-semester-select button [class*="text-white"],
    html[data-np-theme="light"] body [id*="format-select"] button [class*="text-white"],
    html[data-np-theme="light"] body [id*="count-select"] button [class*="text-white"] {
      color:#514b63 !important;
    }


    /* Restore quiz interactions and controls; do not let theme styles hide them */
    #screen-quiz-play #quiz-options-container,
    #screen-quiz-play #quiz-options-container button,
    #screen-quiz-play #quiz-submit-multi-btn,
    #screen-quiz-play #quiz-keyboard-input-container,
    #screen-quiz-play #quiz-feedback-box,
    #screen-quiz-play #quiz-next-btn {
      pointer-events:auto !important;
      touch-action:manipulation !important;
    }
    #screen-quiz-play #quiz-options-container button.quiz-opt-btn {
      display:flex !important;
      visibility:visible !important;
      opacity:1 !important;
      position:relative !important;
      z-index:2 !important;
      min-height:44px !important;
      cursor:pointer !important;
    }
    #screen-quiz-play #quiz-submit-multi-btn:not(.hidden),
    #screen-quiz-play #quiz-keyboard-input-container:not(.hidden) button,
    #screen-quiz-play #quiz-feedback-box:not(.hidden),
    #screen-quiz-play #quiz-next-btn {
      visibility:visible !important;
      opacity:1 !important;
    }
    #screen-quiz-play #quiz-submit-multi-btn:not(.hidden),
    #screen-quiz-play #quiz-keyboard-input-container:not(.hidden) button,
    #screen-quiz-play #quiz-next-btn {
      display:block !important;
      min-height:44px !important;
      width:100% !important;
      position:relative !important;
      z-index:5 !important;
      cursor:pointer !important;
    }
    #screen-quiz-play #quiz-feedback-box:not(.hidden) {
      display:block !important;
      overflow:visible !important;
      position:relative !important;
      z-index:3 !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-options-container button.quiz-opt-btn {
      background:#fffdfd !important;
      color:#514b63 !important;
      border-color:#e4dcef !important;
    }
    html[data-np-theme="light"] body #screen-quiz-play #quiz-submit-multi-btn:not(.hidden),
    html[data-np-theme="light"] body #screen-quiz-play #quiz-keyboard-input-container button,
    html[data-np-theme="light"] body #screen-quiz-play #quiz-next-btn {
      background:#eee7fb !important;
      color:#51446f !important;
      border:1px solid #dcd0f1 !important;
    }

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

    /* Count and time-limit selection screens: explicitly override dark inline/card styles in light mode */
    html[data-np-theme="light"] body #screen-count-select,
    html[data-np-theme="light"] body #screen-time-select {
      background:#f8f7fb !important;
      color:#454057 !important;
    }
    html[data-np-theme="light"] body #screen-count-select > div,
    html[data-np-theme="light"] body #screen-time-select > div,
    html[data-np-theme="light"] body #screen-count-select .glass-card,
    html[data-np-theme="light"] body #screen-time-select .glass-card,
    html[data-np-theme="light"] body #screen-count-select [class*="rounded-"],
    html[data-np-theme="light"] body #screen-time-select [class*="rounded-"] {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#454057 !important;
      border-color:#e5deef !important;
      box-shadow:0 8px 24px rgba(100,82,145,.07) !important;
    }
    html[data-np-theme="light"] body #screen-count-select [style*="background"],
    html[data-np-theme="light"] body #screen-time-select [style*="background"] {
      background-color:#fffdfd !important;
      background-image:none !important;
      color:#454057 !important;
      border-color:#e5deef !important;
    }
    html[data-np-theme="light"] body #screen-count-select [class*="text-"],
    html[data-np-theme="light"] body #screen-time-select [class*="text-"],
    html[data-np-theme="light"] body #screen-count-select label,
    html[data-np-theme="light"] body #screen-time-select label,
    html[data-np-theme="light"] body #count-subject-title,
    html[data-np-theme="light"] body #time-subject-title,
    html[data-np-theme="light"] body #slider-count-display,
    html[data-np-theme="light"] body #time-slider-display {
      color:#514b63 !important;
    }
    html[data-np-theme="light"] body #screen-count-select button,
    html[data-np-theme="light"] body #screen-time-select button {
      background:#f0eaff !important;
      background-image:none !important;
      color:#51446f !important;
      border-color:#dfd3f3 !important;
      pointer-events:auto !important;
      touch-action:manipulation !important;
    }
    html[data-np-theme="light"] body #screen-count-select input[type="range"],
    html[data-np-theme="light"] body #screen-time-select input[type="range"] {
      accent-color:#b79ae8 !important;
    }
    html[data-np-theme="light"] body #screen-count-select input[type="range"]::-webkit-slider-thumb,
    html[data-np-theme="light"] body #screen-time-select input[type="range"]::-webkit-slider-thumb {
      background:#b79ae8 !important;
    }

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