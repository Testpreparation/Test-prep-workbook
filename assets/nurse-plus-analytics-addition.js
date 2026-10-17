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

  function getWeeklyReport(rows) {
    const today = new Date();
    const start = new Date(today.getFullYear(),today.getMonth(),today.getDate()-6);
    const previousStart = new Date(today.getFullYear(),today.getMonth(),today.getDate()-13);
    const previousEnd = new Date(today.getFullYear(),today.getMonth(),today.getDate()-7);
    const current=[], previous=[], bySubject=new Map();
    rows.forEach(row=>row.daily.forEach(item=>{
      const p=item.date.split('/').map(Number); if(p.length!==3||p.some(n=>!Number.isFinite(n))) return;
      const date=new Date(p[0],p[1]-1,p[2]);
      const target=date>=start&&date<=new Date(today.getFullYear(),today.getMonth(),today.getDate(),23,59,59,999)?'current':date>=previousStart&&date<=previousEnd?'previous':'';
      if(!target)return;
      (target==='current'?current:previous).push(item.accuracy);
      const stat=bySubject.get(row.subjectId)||{name:row.subject,current:[],previous:[]};
      stat[target].push(item.accuracy); bySubject.set(row.subjectId,stat);
    }));
    const avg=a=>a.length?Math.round(a.reduce((s,v)=>s+v,0)/a.length):null;
    return {currentCount:current.length,previousCount:previous.length,currentAvg:avg(current),previousAvg:avg(previous),
      subjectChanges:[...bySubject.values()].map(x=>({name:x.name,currentAvg:avg(x.current),previousAvg:avg(x.previous),currentCount:x.current.length})).filter(x=>x.currentAvg!==null).sort((a,b)=>a.currentAvg-b.currentAvg)};
  }
  function calculateStreak(rows) {
    const dates = new Set(rows.flatMap(row => row.daily.map(item => item.date)));
    try {
      const savedDays = JSON.parse(localStorage.getItem('study_days') || '[]');
      if (Array.isArray(savedDays)) savedDays.forEach(date => { if (typeof date === 'string') dates.add(date); });
    } catch (_) {}
    const sorted = [...dates].filter(Boolean).sort();
    localStorage.setItem('study_days', JSON.stringify(sorted));
    const today = new Date();
    const todayKey = dateKey(today);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    let cursor = dates.has(todayKey) ? today : yesterday;
    let streak = 0;
    while (dates.has(dateKey(cursor))) {
      streak++;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }
    localStorage.setItem('study_streak', String(streak));
    localStorage.setItem('study_last_date', sorted.length ? sorted[sorted.length - 1] : '');
    return streak;
  }

  const SYNC_API = 'https://nurse-line-system.onrender.com';
  const COMMUNITY_API = SYNC_API + '/api/community/question-result';
  const COMMUNITY_MINIMUM_RESPONSES = 10;
  async function createCommunityQuestionKey(question, subjectId, mode) {
    const questionText = String(question && (question.q || question.question || question.text) || '').trim();
    if (!questionText || !subjectId || !window.crypto?.subtle || typeof TextEncoder === 'undefined') return '';
    const source = [String(subjectId), String(mode || 'all'), questionText].join('::');
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function recordCommunityResult(question, isCorrect, subjectId, mode) {
    try {
      const questionKey = await createCommunityQuestionKey(question, subjectId, mode);
      if (!questionKey) return;
      const response = await fetch(COMMUNITY_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({questionKey,isCorrect:Boolean(isCorrect)}) });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const feedback = document.getElementById('quiz-feedback-box');
      if (!feedback || !data.success) return;
      let panel = document.getElementById('np-community-question-result');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'np-community-question-result';
        panel.className = 'mt-3 pt-3 border-t border-slate-600/60 text-[11px] leading-5 text-slate-300';
        panel.setAttribute('role','status'); panel.setAttribute('aria-live','polite');
        feedback.appendChild(panel);
      }
      panel.textContent = data.published && Number(data.total) >= COMMUNITY_MINIMUM_RESPONSES
        ? `みんなの正答率：${Math.round(Number(data.correct)/Number(data.total)*100)}%（${Number(data.total)}回答）`
        : `みんなの正答率：集計中（あと${Math.max(0,COMMUNITY_MINIMUM_RESPONSES-Number(data.total||0))}回答で公開）`;
    } catch (_) { /* 集計APIが利用できなくても問題演習は継続する */ }
  }
  window.NursePlusCommunityStats = window.NursePlusCommunityStats || {};
  window.NursePlusCommunityStats.recordResult = recordCommunityResult;
  const SYNC_OWNED_KEY = 'nurse_plus_sync_owned_records';
  const SYNC_CLOUD_KEY = 'nurse_plus_sync_last_cloud_records';
  const SYNC_DEVICE_KEY = 'nurse_plus_sync_device_id';

  function getSyncDeviceId() {
    let id = localStorage.getItem(SYNC_DEVICE_KEY);
    if (!id) {
      id = 'npd_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      localStorage.setItem(SYNC_DEVICE_KEY, id);
    }
    return id;
  }

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }

  function collectStudyRecords() {
    const records = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('history_accuracy_')) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if (Array.isArray(value)) records[key] = value;
      } catch (_) {}
    }
    ['study_streak', 'study_last_date', 'study_days', 'evo_today_done'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      if (key === 'study_days') {
        try { records[key] = JSON.parse(raw); } catch (_) { records[key] = []; }
      } else if (key === 'study_last_date') records[key] = raw;
      else records[key] = safeNumber(raw);
    });
    return records;
  }

  function subtractNewItems(current, baseline) {
    const counts = new Map();
    (Array.isArray(baseline) ? baseline : []).forEach(item => {
      const key = JSON.stringify(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const added = [];
    (Array.isArray(current) ? current : []).forEach(item => {
      const key = JSON.stringify(item);
      const count = counts.get(key) || 0;
      if (count > 0) counts.set(key, count - 1);
      else added.push(item);
    });
    return added;
  }

  function mergeStudyScalarRecords(owned, current) {
    ['study_streak', 'evo_today_done'].forEach(key => {
      if (current[key] !== undefined) owned[key] = Math.max(safeNumber(owned[key]), safeNumber(current[key]));
    });
    if (current.study_last_date) {
      owned.study_last_date = [owned.study_last_date, current.study_last_date].filter(Boolean).sort().at(-1);
    }
    if (Array.isArray(current.study_days)) {
      owned.study_days = [...new Set([...(Array.isArray(owned.study_days) ? owned.study_days : []), ...current.study_days])].sort();
    }
  }

  async function requestStudySync(method, payload, token) {
    const response = await fetch(SYNC_API + '/api/user/study-data', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(payload || {}) })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem('nurse_line_user_session');
      window.NURSE_LINE_SESSION = null;
      throw new Error('LINEログインの有効期限が切れています。もう一度LINEログインしてください。');
    }
    if (!response.ok || data.success === false) throw new Error(data.message || '同期に失敗しました。');
    return data;
  }

  async function syncStudyData(statusEl, buttonEl) {
    const token = localStorage.getItem('nurse_line_user_session');
    if (!token) {
      if (statusEl) statusEl.textContent = '同期するには先にLINEログインしてください。';
      return;
    }
    if (buttonEl) { buttonEl.disabled = true; buttonEl.textContent = '同期中…'; }
    if (statusEl) statusEl.textContent = 'この端末の学習記録を確認しています…';
    try {
      const current = collectStudyRecords();
      const ownedSaved = readObject(SYNC_OWNED_KEY);
      const lastCloud = readObject(SYNC_CLOUD_KEY);
      let owned;
      if (!Object.keys(ownedSaved).length) {
        // 初回はこの端末の記録をこの端末のスナップショットとして登録する。
        owned = JSON.parse(JSON.stringify(current));
      } else {
        owned = JSON.parse(JSON.stringify(ownedSaved));
        Object.keys(current).filter(key => Array.isArray(current[key])).forEach(key => {
          const added = subtractNewItems(current[key], lastCloud[key] || []);
          if (added.length) {
            const limit = 2000;
            owned[key] = (Array.isArray(owned[key]) ? owned[key] : []).concat(added).slice(-limit);
          }
        });
        mergeStudyScalarRecords(owned, current);
      }

      await requestStudySync('PUT', { deviceId: getSyncDeviceId(), records: owned }, token);
      const cloud = await requestStudySync('GET', null, token);
      const cloudRecords = cloud.records || {};
      localStorage.setItem(SYNC_OWNED_KEY, JSON.stringify(owned));
      localStorage.setItem(SYNC_CLOUD_KEY, JSON.stringify(cloudRecords));

      Object.entries(cloudRecords).forEach(([key, value]) => {
        if (key.startsWith('history_accuracy_') && Array.isArray(value)) {
          localStorage.setItem(key, JSON.stringify(value));
        } else if (key === 'study_days' && Array.isArray(value)) {
          localStorage.setItem(key, JSON.stringify(value));
        } else if (key === 'study_last_date' && typeof value === 'string') {
          localStorage.setItem(key, value);
        } else if (key === 'study_streak' || key === 'evo_today_done') {
          localStorage.setItem(key, String(safeNumber(value)));
        }
      });

      const updatedRows = getRows();
      calculateStreak(updatedRows);
      renderAnalytics();
      const refreshedStatus = document.getElementById('np-analytics-sync-status');
      if (refreshedStatus) refreshedStatus.textContent = `同期完了：${cloud.deviceCount || 1}端末分の学習記録を反映しました。`;
    } catch (error) {
      if (statusEl) statusEl.textContent = error.message || '同期に失敗しました。通信環境を確認してください。';
    } finally {
      if (buttonEl) { buttonEl.disabled = false; buttonEl.textContent = '今すぐ同期'; }
    }
  }
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* データ分析はアプリのテーマにかかわらず、画面内をホワイト×パステルで統一 */
      #${SCREEN_ID} {
        background:#fffdfd !important;
        color:#51465f !important;
        border-color:#e7def4 !important;
      }
      #${SCREEN_ID} .np-analytics-card,
      #${SCREEN_ID} [class*="bg-slate-950"],
      #${SCREEN_ID} [class*="bg-slate-900"],
      #${SCREEN_ID} [class*="bg-slate-800"],
      #${SCREEN_ID} [class*="bg-slate-700"] {
        background:#fff !important;
        background-image:linear-gradient(145deg,#fff 0%,#fffdfd 68%,#f7f2ff 100%) !important;
        color:#5b506d !important;
        border-color:#e7def4 !important;
        box-shadow:0 7px 20px rgba(91,72,116,.07) !important;
      }
      #${SCREEN_ID} h2,#${SCREEN_ID} h3,
      #${SCREEN_ID} [class*="text-slate-100"],
      #${SCREEN_ID} [class*="text-slate-200"] { color:#51465f !important; }
      #${SCREEN_ID} p,#${SCREEN_ID} [class*="text-slate-300"],
      #${SCREEN_ID} [class*="text-slate-400"],#${SCREEN_ID} [class*="text-slate-500"] { color:#81788f !important; }
      #${SCREEN_ID} [class*="text-amber-"] { color:#9a82bd !important; }
      #${SCREEN_ID} .np-analytics-track { background:#eee8f6 !important; }
      #${SCREEN_ID} .np-analytics-fill { background:linear-gradient(90deg,#a98bd8,#9bd8c3) !important; }
      #${SCREEN_ID} .np-analytics-bar { background:linear-gradient(180deg,#b39add,#9bd8c3) !important; }
      #${SCREEN_ID} .np-analytics-back {
        background:#f2eafb !important;border-color:#dfd1f5 !important;color:#604a80 !important;
      }
      #${SCREEN_ID} textarea,#${SCREEN_ID} input,#${SCREEN_ID} select {
        background:#fff !important;color:#51465f !important;border-color:#e2d8f0 !important;
      }
      #${SCREEN_ID} textarea::placeholder,#${SCREEN_ID} input::placeholder { color:#a39aae !important; }
      /* Existing white-mode rules follow, now scoped to the actual analytics screen. */
      #${SCREEN_ID},
      #${SCREEN_ID} .np-analytics-card {
        background:#fffdfd !important;
        color:#39364d !important;
        border-color:#e7def4 !important;
        box-shadow:0 8px 24px rgba(105,84,145,.08) !important;
      }
      #${SCREEN_ID} .np-analytics-metric,
      #${SCREEN_ID} h2,
      #${SCREEN_ID} h3 {
        color:#39364d !important;
      }
      #${SCREEN_ID} .np-analytics-label,
      #${SCREEN_ID} .np-analytics-day,
      #${SCREEN_ID} .np-analytics-empty,
      #${SCREEN_ID} p,
      #${SCREEN_ID} [class*="text-slate-"] {
        color:#716b83 !important;
      }
      #${SCREEN_ID} .np-analytics-track {
        background:#eee8f6 !important;
      }
      #${SCREEN_ID} .np-analytics-back {
        background:#f1eaff !important;
        border-color:#dfd1f5 !important;
        color:#5e528f !important;
      }
      #${SCREEN_ID} textarea,
      #${SCREEN_ID} input,
      #${SCREEN_ID} select {
        background:#fff !important;
        color:#39364d !important;
        border-color:#e2d8f0 !important;
      }
      #${SCREEN_ID} textarea::placeholder,
      #${SCREEN_ID} input::placeholder {
        color:#9690a6 !important;
      }
      #${SCREEN_ID} [class*="bg-slate-950"],
      #${SCREEN_ID} [class*="bg-slate-900"],
      #${SCREEN_ID} [class*="bg-slate-800"],
      #${SCREEN_ID} [class*="bg-slate-700"] {
        background-color:#f6f2fb !important;
        background-image:none !important;
      }
      #${SCREEN_ID} [class*="border-slate-"] {
        border-color:#e7def4 !important;
      }
      /* PWA white finish for all data-analysis panels, metric tiles and charts. */
      #${SCREEN_ID} .np-analytics-card {
        background:linear-gradient(145deg,#fff 0%,#fffdfd 62%,#f5f0fc 100%) !important;
        border:1px solid #e7def4 !important;
        box-shadow:0 8px 24px rgba(91,72,116,.08),inset 0 1px 0 rgba(255,255,255,.95) !important;
      }
      #${SCREEN_ID} [class*="bg-slate-"] {
        background:#fff !important;background-color:#fff !important;background-image:none !important;border-color:#e7def4 !important;
      }
      /* Final white override for nested metric/report/weakness items that previously looked grey. */
      #${SCREEN_ID} [class*="bg-slate-950"],
      #${SCREEN_ID} [class*="bg-slate-900"],
      #${SCREEN_ID} [class*="bg-slate-800"],
      #${SCREEN_ID} [class*="bg-slate-700"] {
        background:#fff !important;background-color:#fff !important;background-image:none !important;
        border-color:#e7def4 !important;color:#5b506d !important;
      }
      #${SCREEN_ID} .np-analytics-row,
      #${SCREEN_ID} .np-analytics-bar-col { color:#5b506d !important; }
      #${SCREEN_ID} .np-analytics-infographic-section {
        animation:npInfographicReveal 1.5s cubic-bezier(.22,1,.36,1) both;
      }
      #${SCREEN_ID} .np-analytics-infographic-section:nth-of-type(2) { animation-delay:.12s; }
      #${SCREEN_ID} .np-analytics-infographic-section:nth-of-type(3) { animation-delay:.24s; }
      #${SCREEN_ID} .np-analytics-infographic-section:nth-of-type(4) { animation-delay:.36s; }
      #${SCREEN_ID} .np-analytics-bar { transform-origin:bottom center; will-change:transform; }
      #${SCREEN_ID} .np-analytics-fill { will-change:width; }
      @keyframes npInfographicReveal {
        from { opacity:0; transform:translateY(12px); }
        to { opacity:1; transform:translateY(0); }
      }
      @media (prefers-reduced-motion:reduce) {
        #${SCREEN_ID} .np-analytics-infographic-section { animation:none !important; }
        #${SCREEN_ID} .np-analytics-bar { transition:none !important; transform:none !important; }
        #${SCREEN_ID} .np-analytics-fill { transition:none !important; }
      }
      #${SCREEN_ID} .np-analytics-metric { color:#4e3e68 !important; }
      #${SCREEN_ID} .np-analytics-track { background:#e7def4 !important; }
      #${SCREEN_ID} .np-analytics-fill {
        background:linear-gradient(90deg,#9870ca 0%,#75bfa4 100%) !important;
      }
      #${SCREEN_ID} .np-analytics-bar {
        background:linear-gradient(180deg,#a98bd8 0%,#7bc7aa 100%) !important;
      }
      #${SCREEN_ID} .np-analytics-back {
        background:linear-gradient(135deg,#f2eafb,#e8f6ef) !important;
        border-color:#d9c8ef !important;color:#604a80 !important;
      }
      #${SCREEN_ID} { animation: npAnalyticsEnter 1.05s cubic-bezier(.22,1,.36,1) both; }
      @keyframes npAnalyticsEnter { from { opacity:0; transform:translateY(18px) scale(.985); filter:blur(2px); } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0); } }
      .np-analytics-card { background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.18);border-radius:16px;padding:14px; }
      .np-analytics-metric { font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.04em;color:#f8fafc; }
      .np-analytics-label { color:#94a3b8;font-size:10px;margin-top:5px; }
      .np-analytics-bars { display:flex;align-items:flex-end;gap:8px;height:130px;padding-top:12px; }
      .np-analytics-bar-col { flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px; }
      .np-analytics-bar { width:min(100%,24px);min-height:3px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#fbbf24,#d97706);transition:height 1.3s ease; }
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
  function animateAnalyticsInfographics(screen) {
    if (!screen) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(screen.querySelectorAll('.np-analytics-card'));
    sections.forEach((section, index) => {
      section.classList.add('np-analytics-infographic-section');
      section.style.animationDelay = Math.min(index * 55, 440) + 'ms';
    });
    if (reduceMotion) return;

    // Bar charts: reveal each column from the baseline with a gentle stagger.
    const bars = Array.from(screen.querySelectorAll('.np-analytics-bar'));
    bars.forEach((bar, index) => {
      bar.style.transform = 'scaleY(0)';
      bar.style.transition = 'transform 1900ms cubic-bezier(.22,1,.36,1) ' + Math.min(index * 65, 420) + 'ms';
      requestAnimationFrame(() => { bar.style.transform = 'scaleY(1)'; });
    });

    // Subject progress indicators grow from zero to their real saved percentage.
    screen.querySelectorAll('.np-analytics-fill').forEach((fill, index) => {
      const targetWidth = fill.style.width || '0%';
      fill.style.width = '0%';
      fill.style.transition = 'width 2000ms cubic-bezier(.22,1,.36,1) ' + Math.min(index * 90, 450) + 'ms';
      requestAnimationFrame(() => { fill.style.width = targetWidth; });
    });

    // Count up the four summary metrics without changing their final values or stored data.
    screen.querySelectorAll('.np-analytics-metric').forEach((metric, index) => {
      const finalText = metric.textContent.trim();
      const match = finalText.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
      if (!match) return;
      const finalValue = Number(match[1]);
      if (!Number.isFinite(finalValue) || finalValue === 0) return;
      const suffix = match[2];
      const start = performance.now() + index * 90;
      const duration = 1700;
      const tick = now => {
        const progress = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        metric.textContent = Math.round(finalValue * eased) + suffix;
        if (progress < 1 && metric.isConnected) requestAnimationFrame(tick);
        else if (metric.isConnected) metric.textContent = finalText;
      };
      requestAnimationFrame(tick);
    });
  }

  function renderAnalytics() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    const rows = getRows();
    const stats = getStats(rows);
    const streak = calculateStreak(rows);
    const weeklyReport = getWeeklyReport(rows);
    const wrongQuestionRecords = (window.NursePlusWrongQuestions && typeof window.NursePlusWrongQuestions.getAll === 'function'
      ? window.NursePlusWrongQuestions.getAll() : [])
      .filter(item => item && item.question && Number(item.wrongCount || 0) > Number(item.correctCount || 0))
      .sort((a,b) => (Number(b.wrongCount||0)-Number(b.correctCount||0)) - (Number(a.wrongCount||0)-Number(a.correctCount||0)));
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
          <div><div class="text-[10px] text-amber-500 tracking-[.22em] font-semibold">STUDY ANALYTICS</div><h2 class="serif-title text-xl text-slate-100 mt-1">データ分析</h2><p class="text-[11px] text-slate-400 mt-1">科目・モード別の学習履歴と苦手傾向を分析します。</p></div>
          <button type="button" class="np-analytics-back" id="np-analytics-back">← ホーム</button>
        </div>
        <!-- 移動した4つの学習分析カード -->
        <section class="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <div class="en-title text-[10px] text-amber-500 tracking-[.22em] font-semibold">ACCURACY TREND</div>
              <h3 class="text-sm font-semibold text-slate-100 mt-1">正答率の推移</h3>
            </div>
            <span class="text-[9px] text-slate-500 rounded-full border border-slate-700 px-2 py-1">科目別・日別</span>
          </div>
          <div id="evo-accuracy-trend" class="w-full min-h-[120px]"></div>
          <p id="evo-trend-summary" class="mt-3 text-[10px] leading-relaxed text-slate-400">演習を完了すると、科目別・日別の正答率が表示されます。</p>
        </section>

        <section class="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <div class="en-title text-[10px] text-sky-400 tracking-[.22em] font-semibold">LAST 7 DAYS</div>
              <h3 class="text-sm font-semibold text-slate-100 mt-1">直近7日間の学習</h3>
            </div>
            <div id="evo-recent-7d-accuracy" class="text-xl font-mono font-bold text-sky-300">--</div>
          </div>
          <p id="evo-recent-7d-summary" class="text-[10px] text-slate-400 mb-3">直近7日間の学習記録を集計します。</p>
          <div class="relative">
            <div id="evo-recent-study-carousel" class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 pb-2">
              <div class="min-w-full snap-start rounded-xl bg-slate-800/40 p-3"><div class="text-[10px] text-slate-400">学習履歴</div><div id="evo-recent-7d-records" class="mt-2 space-y-2"><p class="text-[10px] text-slate-500">演習を完了すると記録が表示されます。</p></div></div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <div class="en-title text-[10px] text-violet-400 tracking-[.22em] font-semibold">PERSONAL REPORT</div>
              <h3 id="evo-report-title" class="text-sm font-semibold text-slate-100 mt-1">自分専用の学習レポート</h3>
            </div>
            <div class="flex gap-1.5">
              <button id="evo-report-week-button" onclick="evoSetReportPeriod('week')" aria-pressed="false" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-400 text-[10px] font-medium transition">週間</button>
              <button id="evo-report-month-button" onclick="evoSetReportPeriod('month')" aria-pressed="true" class="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 text-[10px] font-medium transition">月間</button>
            </div>
          </div>
          <div id="evo-month-label" class="text-[10px] text-slate-400 mb-3">今月</div>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-xl bg-slate-800/50 p-3"><div id="evo-month-sessions" class="text-xl font-mono font-bold text-slate-100">0</div><div class="mt-1 text-[9px] text-slate-500">演習回数</div></div>
            <div class="rounded-xl bg-slate-800/50 p-3"><div id="evo-month-questions" class="text-xl font-mono font-bold text-slate-100">0</div><div class="mt-1 text-[9px] text-slate-500">解答問題数</div></div>
            <div class="rounded-xl bg-slate-800/50 p-3"><div id="evo-month-accuracy" class="text-xl font-mono font-bold text-amber-400">--</div><div id="evo-report-accuracy-label" class="mt-1 text-[9px] text-slate-500">月間正答率</div></div>
            <div class="rounded-xl bg-slate-800/50 p-3"><div id="evo-month-time" class="text-xl font-mono font-bold text-emerald-400">0分</div><div class="mt-1 text-[9px] text-slate-500">学習時間</div></div>
          </div>
          <p id="evo-month-note" class="mt-3 text-[10px] leading-relaxed text-slate-400">演習を完了すると、個人の学習記録が集計されます。</p>
        </section>

        ${noHistory ? '<div class="np-analytics-card np-analytics-empty">まだ学習履歴がありません。問題を解くと、ここに記録が表示されます。</div>' : ''}
        <div class="grid grid-cols-2 gap-2">
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.attempts}</div><div class="np-analytics-label">記録された演習結果</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.avg===null?'--':stats.avg+'%'}</div><div class="np-analytics-label">平均正答率</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${stats.best===null?'--':stats.best+'%'}</div><div class="np-analytics-label">最高正答率</div></div>
          <div class="np-analytics-card"><div class="np-analytics-metric">${streak}</div><div class="np-analytics-label">連続学習日数（既存記録）</div></div>
        </div>
        <section class="np-analytics-card">
          <div class="flex items-center justify-between gap-2"><div><h3 class="text-sm font-semibold text-slate-100">複数端末で同期</h3><p class="text-[10px] text-slate-400 mt-1">LINEログインした端末間で学習履歴を共有します。</p></div><button type="button" id="np-analytics-sync" class="np-analytics-back">今すぐ同期</button></div>
          <p id="np-analytics-sync-status" class="text-[10px] text-slate-400 mt-3" role="status" aria-live="polite">同期するにはLINEログインとサーバー側のFirebase設定が必要です。</p>
        </section>
        <section class="np-analytics-card">
          <div class="flex justify-between items-center gap-2"><h3 class="text-sm font-semibold text-slate-100">直近7日間の学習記録</h3><span class="text-[10px] text-slate-500">合計 ${weekTotal} 件</span></div>
          <p class="text-[10px] text-slate-500 mt-1">日ごとの記録件数。データがない日は0件です。</p>
          <div class="np-analytics-bars">${days.map(d=>`<div class="np-analytics-bar-col" title="${esc(d.key)}：${d.count}件"><div class="text-[9px] text-slate-400">${d.count||''}</div><div class="np-analytics-bar" style="height:${Math.max(3,d.count/maxCount*82)}px;opacity:${d.count?1:.22}"></div><div class="np-analytics-day">${esc(d.label)}</div></div>`).join('')}</div>
        </section>
        <section class="np-analytics-card">
          <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold text-slate-100">直近7日間の平均正答率</h3><span class="text-[10px] text-slate-500">日別推移</span></div>
          <div class="np-analytics-bars">${days.map(d=>`<div class="np-analytics-bar-col" title="${esc(d.key)}：平均${d.count?d.avg+'%':'記録なし'}"><div class="text-[9px] text-slate-400">${d.count?d.avg+'%':''}</div><div class="np-analytics-bar" style="height:${Math.max(3,d.avg/100*82)}px;opacity:${d.count?1:.22};background:linear-gradient(180deg,#38bdf8,#2563eb)"></div><div class="np-analytics-day">${esc(d.label)}</div></div>`).join('')}</div>
          <p class="text-[10px] text-slate-500 mt-2">その日に保存された演習結果の平均です。記録がない日は空欄になります。</p>
        </section>
        <section class="np-analytics-card">
          <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold text-slate-100">自分専用の週間学習レポート</h3><span class="text-[10px] text-slate-500">直近7日 vs 前の7日</span></div>
          <p class="text-[10px] text-slate-400 mt-1">保存済みの演習結果から、今週の学習と成績の変化をまとめます。</p>
          <div class="grid grid-cols-2 gap-2 mt-3">
            <div class="rounded-xl bg-slate-950/50 border border-slate-700/60 p-3"><div class="text-[10px] text-slate-400">今週の演習記録</div><div class="text-xl font-semibold text-slate-100 mt-1">${weeklyReport.currentCount}件</div></div>
            <div class="rounded-xl bg-slate-950/50 border border-slate-700/60 p-3"><div class="text-[10px] text-slate-400">今週の平均正答率</div><div class="text-xl font-semibold text-slate-100 mt-1">${weeklyReport.currentAvg===null?'--':weeklyReport.currentAvg+'%'}</div></div>
          </div>
          <div class="mt-3 rounded-xl bg-slate-950/40 p-3"><div class="text-xs text-slate-200">前の7日間との比較</div>
            <div class="text-[11px] text-slate-400 mt-1">${weeklyReport.previousCount?'前週の平均：'+weeklyReport.previousAvg+'%':'前週の記録がないため、比較できません。'}</div>
            <div class="text-[11px] ${weeklyReport.currentAvg!==null&&weeklyReport.previousAvg!==null?(weeklyReport.currentAvg>=weeklyReport.previousAvg?'text-emerald-300':'text-amber-300'):'text-slate-400'} mt-1">${weeklyReport.currentAvg!==null&&weeklyReport.previousAvg!==null?'正答率 '+(weeklyReport.currentAvg-weeklyReport.previousAvg>=0?'+':'')+(weeklyReport.currentAvg-weeklyReport.previousAvg)+'ポイント':'記録が増えると成績の変化を表示します。'}</div>
          </div>
          <div class="mt-3"><div class="text-xs font-semibold text-slate-200">今週の科目別まとめ</div>
            ${weeklyReport.subjectChanges.length?weeklyReport.subjectChanges.map(item=>`<div class="np-analytics-row"><div><div class="text-xs text-slate-200">${esc(item.name)}</div><div class="text-[10px] text-slate-400 mt-1">${item.currentCount}件の記録${item.previousAvg!==null?' ・ 前週 '+item.previousAvg+'%':''}</div></div><div class="text-xs font-mono ${item.previousAvg!==null&&item.currentAvg>=item.previousAvg?'text-emerald-300':'text-amber-300'}">${item.currentAvg}%${item.previousAvg!==null?' ('+(item.currentAvg-item.previousAvg>=0?'+':'')+(item.currentAvg-item.previousAvg)+')':''}</div></div>`).join(''):'<div class="np-analytics-empty">今週の演習記録がまだありません。</div>'}
          </div>
          <p class="text-[10px] text-slate-500 mt-3">※ 保存済みの演習ごとの平均正答率です。問題単位の回答数ではありません。</p>
        </section>
        <section class="np-analytics-card">
          <h3 class="text-sm font-semibold text-slate-100">苦手分野の自動分析</h3>
          <p class="text-[10px] text-slate-500 mt-1">科目と出題モードごとの平均正答率から、復習の優先順位を提案します。</p>
          ${rows.map(row=>({ ...row, modeAvg: row.accuracy.length ? Math.round(row.accuracy.reduce((sum,value)=>sum+value,0)/row.accuracy.length) : null })).filter(row=>row.modeAvg!==null).sort((a,b)=>a.modeAvg-b.modeAvg).slice(0,3).map((row,index)=>`<div class="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"><div class="flex items-start justify-between gap-3"><div><div class="text-xs font-semibold text-slate-100">${index+1}. ${esc(row.subject)}</div><div class="text-[10px] text-slate-400 mt-1">${esc(row.mode)} ・ ${row.accuracy.length}回の記録</div></div><div class="text-sm font-mono ${row.modeAvg<70?'text-rose-400':'text-amber-300'}">${row.modeAvg}%</div></div><p class="text-[10px] leading-5 text-slate-400 mt-2">${row.modeAvg<60?'最優先で復習：解説を確認し、同じ範囲をもう一度解き直しましょう。':row.modeAvg<70?'重点復習：間違えた問題と根拠をノートにまとめましょう.':'維持・定着：数日後に再演習して正答率を確認しましょう。'}</p></div>`).join('') || '<div class="np-analytics-empty">分析できる履歴がまだありません。問題を解くと苦手傾向を表示します。</div>'}
        </section>
        <section class="np-analytics-card">
          <div class="flex items-center justify-between gap-3">
            <div><h3 class="text-sm font-semibold text-slate-100">間違えた問題から見る苦手分析</h3><p class="text-[10px] text-slate-400 mt-1">問題単位の間違い回数を集計し、復習の優先順位を表示します。</p></div>
            <button type="button" id="np-open-wrong-review" class="np-analytics-back shrink-0">復習する</button>
          </div>
          ${wrongQuestionRecords.length ? wrongQuestionRecords.slice(0,5).map((item,index)=>`<div class="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="text-[10px] text-amber-300">${index+1}. ${esc(item.subjectName || item.subjectId || '科目')} ・ ${esc(item.context && item.context.modeLabel || '演習')}</div><p class="mt-1 text-xs leading-5 text-slate-200">${esc(String(item.question.q || '問題文なし').slice(0,180))}</p></div><div class="shrink-0 text-right"><div class="text-xs font-semibold text-rose-300">${Math.max(0,Number(item.wrongCount||0)-Number(item.correctCount||0))}回</div><div class="text-[9px] text-slate-500">未解消</div></div></div><div class="mt-2 text-[10px] text-slate-500">不正解 ${Number(item.wrongCount||0)}回 ・ 正解 ${Number(item.correctCount||0)}回</div></div>`).join('') : '<div class="np-analytics-empty">問題単位の記録はまだありません。これから間違えた問題が自動で集計されます。</div>'}
        </section>
        <section class="np-analytics-card">
          <h3 class="text-sm font-semibold text-slate-100">科目別の平均正答率</h3>
          <p class="text-[10px] text-slate-500 mt-1">記録がある科目のみ表示。低い科目から並べています。</p>
          ${subjects.length ? subjects.map(s=>`<div class="np-analytics-row"><div><div class="text-xs text-slate-200">${esc(s.name)}</div><div class="np-analytics-track"><div class="np-analytics-fill" style="width:${s.avg}%"></div></div></div><div class="text-xs font-mono ${s.avg<70?'text-rose-400':'text-amber-300'}">${s.avg}%</div></div>`).join('') : '<div class="np-analytics-empty">科目別の正答率データはまだありません。</div>'}
        </section>
        <p class="text-[10px] text-slate-500 leading-5">※ 分析は保存済みの正答率履歴を集計します。同期機能を使うには、LINEログインとRender側のFirebase Admin設定が必要です。</p>
      </div>`;
    animateAnalyticsInfographics(screen);
    document.getElementById('np-analytics-back')?.addEventListener('click', () => {
      document.getElementById(SCREEN_ID)?.classList.add('hidden');
      if (typeof window.showDashboard === 'function') window.showDashboard();
    });
    const syncButton = document.getElementById('np-analytics-sync');
    const syncStatus = document.getElementById('np-analytics-sync-status');
    syncButton?.addEventListener('click', () => syncStudyData(syncStatus, syncButton));
    document.getElementById('np-open-wrong-review')?.addEventListener('click', () => {
      if (typeof window.evoOpenWrong === 'function') window.evoOpenWrong();
      else alert('復習画面を開けませんでした。ページを再読み込みしてください。');
    });
  }
  function openAnalytics() {
    if (typeof window.hideAllScreens === 'function') window.hideAllScreens();
    const host = document.getElementById('screen-data-analysis');
    if (host) host.classList.remove('hidden');
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    screen.classList.remove('hidden');
    renderAnalytics();
    screen.scrollIntoView({block:'start',behavior:'smooth'});
  }

  window.NursePlusAnalyticsAddition = Object.assign(window.NursePlusAnalyticsAddition || {}, {
    render: renderAnalytics,
    open: openAnalytics
  });
  function addEffectStyles() {
    if (document.getElementById('nurse-plus-ui-effects-style')) return;
    const style = document.createElement('style');
    style.id = 'nurse-plus-ui-effects-style';
    style.textContent = `
      /* 追加演出は既存デザインに重ねるだけ。既存の採点・画面関数は変更しない。 */
      .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]) {
        transition: transform .36s cubic-bezier(.22,1,.36,1), filter .32s ease, box-shadow .36s ease;
        -webkit-tap-highlight-color: transparent;
      }
      .glass-card button:not(:disabled):active, .glass-card [role="button"]:not([aria-disabled="true"]):active,
      #nav-drawer button:not(:disabled):active, [id^="modal-"] button:not(:disabled):active {
        transform: scale(.96) translateY(1px);
        filter: brightness(1.08);
      }
      .glass-card button:not(:disabled):hover, .glass-card [role="button"]:not([aria-disabled="true"]):hover,
      #nav-drawer button:not(:disabled):hover, [id^="modal-"] button:not(:disabled):hover {
        filter: brightness(1.045);
      }
      .glass-card button:focus-visible, .glass-card [role="button"]:focus-visible,
      #nav-drawer button:focus-visible, [id^="modal-"] button:focus-visible {
        outline: 2px solid rgba(56,189,248,.85);
        outline-offset: 3px;
      }
      @media (hover:hover) and (pointer:fine) {
        .glass-card button:not(:disabled), .glass-card [role="button"]:not([aria-disabled="true"]),
        #nav-drawer button:not(:disabled), [id^="modal-"] button:not(:disabled) {
          transition: transform .36s cubic-bezier(.22,1,.36,1), filter .32s ease, box-shadow .36s ease;
        }
        .glass-card button:not(:disabled):hover, .glass-card [role="button"]:not([aria-disabled="true"]):hover,
        #nav-drawer button:not(:disabled):hover, [id^="modal-"] button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 18px rgba(15,23,42,.12);
        }
      }
      .evo-progress > span, #evo-mission-progress, .np-analytics-fill {
        transition: width 3.2s cubic-bezier(.22,1,.36,1);
      }
      @keyframes npScreenEnter {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes npConfettiFall {
        to { transform: translate3d(var(--np-drift), 105vh, 0) rotate(var(--np-rotate)); opacity: .15; }
      }
      @keyframes npPopIn { 0% { opacity:0; transform:scale(.88) translateY(8px); } 70% { transform:scale(1.025) translateY(-1px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes npCorrectBloom { 0% { opacity:0; transform:scale(.82) rotate(-2deg); } 55% { opacity:1; transform:scale(1.06) rotate(1deg); } 78% { transform:scale(.985) rotate(0); } 100% { opacity:1; transform:scale(1) rotate(0); } }
      @keyframes npResultRise { 0% { opacity:0; transform:translateY(36px) scale(.94); filter:blur(5px); } 65% { opacity:1; transform:translateY(-5px) scale(1.015); filter:blur(0); } 100% { transform:translateY(0) scale(1); } }
      @keyframes npRevealTurn { 0% { opacity:0; transform:perspective(900px) rotateX(-18deg) translateY(24px); } 60% { opacity:1; transform:perspective(900px) rotateX(4deg) translateY(-3px); } 100% { opacity:1; transform:perspective(900px) rotateX(0) translateY(0); } }
      @keyframes npModalBloom { 0% { opacity:0; transform:scale(.78) translateY(24px); filter:blur(4px); } 60% { opacity:1; transform:scale(1.025) translateY(-3px); filter:blur(0); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes npDrawerGlide { 0% { opacity:.2; transform:translateX(-36px); } 65% { opacity:1; transform:translateX(5px); } 100% { opacity:1; transform:translateX(0); } }
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
        transition:transform 1.2s cubic-bezier(.22,1,.36,1), border-color 1.1s ease, background-color 1.1s ease, box-shadow 1.2s ease, opacity 1.1s ease;
        -webkit-tap-highlight-color:transparent;
      }
      #quiz-options-container button:active, .quiz-option:active, [data-quiz-option]:active {
        transform:scale(.985);
      }
      .np-motion-card { transition:transform 1.3s cubic-bezier(.22,1,.36,1), box-shadow 1.3s ease, border-color 1.1s ease; }
      .np-motion-card:hover { transform:translateY(-2px); }
      .np-motion-selected { box-shadow:0 0 0 2px rgba(251,191,36,.45), 0 8px 22px rgba(245,158,11,.09) !important; }
      .np-motion-correct { animation:npCorrectBloom 1.8s cubic-bezier(.22,1,.36,1) both, npGlowPulse 3.2s ease-out; }
      .np-motion-incorrect { animation:npSoftShake 1.7s ease-out; }
      #screen-quiz-result .np-result-highlight { animation:npResultRise 2s cubic-bezier(.22,1,.36,1) both; }
      .np-motion-reveal { animation:npRevealTurn 1.9s cubic-bezier(.22,1,.36,1) both; }
      .np-motion-progress { transition:width 3.2s cubic-bezier(.22,1,.36,1), background-color 1.3s ease !important; }
      .np-motion-modal { animation:npModalBloom 1.7s cubic-bezier(.22,1,.36,1) both; }
      .np-motion-drawer { animation:npDrawerGlide 1.8s cubic-bezier(.22,1,.36,1) both; }
      @keyframes npSlideIn { from { opacity:.6; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
      .np-motion-busy { position:relative; overflow:hidden; }
      .np-motion-busy::after { content:""; position:absolute; inset:0; background:linear-gradient(100deg,transparent 25%,rgba(255,255,255,.12) 50%,transparent 75%); background-size:200% 100%; animation:npShimmer 3.5s linear infinite; pointer-events:none; }
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
        // 画面全体をゆっくり表示し、直下の主要パネルも少しずつ登場させる。
        // 既存の要素・順序・機能は変えず、表示演出だけを追加。
        if (!reduceMotion && screen.id !== SCREEN_ID) {
          const panels = Array.from(screen.children).filter(el =>
            el.matches('section, article, .glass-card, .card-item, .space-y-4 > div, .grid > *') &&
            !el.matches('script,style')
          );
          panels.forEach((panel,index) => {
            if (typeof panel.animate !== 'function') return;
            // ボックスごとに登場方向・動きを変え、同じ動きの繰り返しを避ける。
            const entranceStyles = [
              [{ opacity:0, transform:'translateY(16px) scale(.975)', filter:'blur(1px)' }, { opacity:1, transform:'translateY(0) scale(1)', filter:'blur(0)' }],
              [{ opacity:0, transform:'translateX(-18px) scale(.99)', filter:'blur(.5px)' }, { opacity:1, transform:'translateX(0) scale(1)', filter:'blur(0)' }],
              [{ opacity:0, transform:'translateX(18px) scale(.99)', filter:'blur(.5px)' }, { opacity:1, transform:'translateX(0) scale(1)', filter:'blur(0)' }],
              [{ opacity:0, transform:'translateY(10px) scale(1.025)', filter:'blur(1px)' }, { opacity:1, transform:'translateY(0) scale(1)', filter:'blur(0)' }]
            ];
            panel.animate(
              entranceStyles[index % entranceStyles.length],
              { duration:850 + (index % 3) * 100, delay:Math.min(index * 95, 475), easing:'cubic-bezier(.22,1,.36,1)', fill:'both' }
            );
          });
        }
        if (!reduceMotion && typeof screen.animate === 'function' && screen.id !== SCREEN_ID) {
          screen.animate(
            [{ opacity: 0, transform: 'translateY(14px) scale(.992)', filter:'blur(1.5px)' }, { opacity: 1, transform: 'translateY(0) scale(1)', filter:'blur(0)' }],
            { duration: 1050, easing: 'cubic-bezier(.22,1,.36,1)' }
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
        feedbackBox.animate(frames, { duration: isCorrect ? 850 : 780, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
      feedbackObserver.observe(feedbackTitle, { childList: true, characterData: true, subtree: true });
    }

    // 2. ボタン・カード・タブ・モーダル・ドロワーの操作フィードバック。
    // 委譲イベントなので、後から描画される画面にも自動適用する。
    // 押した瞬間に沈み、離すと弾むボタン反応。既存クリック処理の伝播は止めない。
    let pressedTarget = null;
    const pressAnimations = new WeakMap();
    function releasePressedTarget() {
      const target = pressedTarget;
      pressedTarget = null;
      if (!target) return;
      target.style.removeProperty('--np-pressing');
      const previous = pressAnimations.get(target);
      if (previous) previous.cancel();
      if (reduceMotion || typeof target.animate !== 'function') return;
      target.animate(
        [{ transform:'scale(.945) translateY(1px)', boxShadow:'0 1px 2px rgba(15,23,42,.08)' },
         { transform:'scale(1.035) translateY(-1px)', boxShadow:'0 8px 20px rgba(15,23,42,.13)', offset:.62 },
         { transform:'scale(1) translateY(0)', boxShadow:'0 0 0 rgba(15,23,42,0)' }],
        { duration:430, easing:'cubic-bezier(.22,1,.36,1)' }
      );
    }
    document.addEventListener('pointerdown', event => {
      const target = event.target.closest('button, [role="button"], .glass-card > section, .glass-card .rounded-xl, .glass-card .rounded-2xl');
      if (!target || target.matches(':disabled,[aria-disabled="true"]') || target.closest('#' + SCREEN_ID)) return;
      if (target.matches('button,[role="button"]')) {
        pressedTarget = target;
        target.style.setProperty('--np-pressing', '1');
        if (!reduceMotion && typeof target.animate === 'function') {
          const previous = pressAnimations.get(target);
          if (previous) previous.cancel();
          pressAnimations.set(target, target.animate(
            [{ transform:'scale(1) translateY(0)' }, { transform:'scale(.945) translateY(1px)' }],
            { duration:155, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards' }
          ));
        }
      }
    }, {passive:true});
    document.addEventListener('pointerup', releasePressedTarget, {passive:true});
    document.addEventListener('pointercancel', releasePressedTarget, {passive:true});
    window.addEventListener('blur', releasePressedTarget);

    // キーボード操作でもクリックした手応えを表示。
    document.addEventListener('click', event => {
      const target = event.target.closest('button, [role="button"], [data-quiz-option], .quiz-option');
      if (event.detail === 0 && target && !target.matches(':disabled,[aria-disabled="true"]') && !target.closest('#' + SCREEN_ID)) {
        if (!reduceMotion && typeof target.animate === 'function') {
          target.animate(
            [{ transform:'scale(1)' }, { transform:'scale(.965)' }, { transform:'scale(1.025)' }, { transform:'scale(1)' }],
            { duration:380, easing:'cubic-bezier(.22,1,.36,1)' }
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
        option.animate([{ transform:'scale(.985)' }, { transform:'scale(1.012)' }, { transform:'scale(1)' }], {duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
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
          explanation.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
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
            score.animate([{opacity:0,transform:'translateY(8px) scale(.88)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:680,easing:'cubic-bezier(.22,1,.36,1)'});
          }
        }
        resultScreen.querySelectorAll('.grid > *, .space-y-4 > section').forEach((card,index) => {
          if (card.dataset.npStaggered === '1') return;
          card.dataset.npStaggered = '1';
          if (!reduceMotion && typeof card.animate === 'function') {
            card.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:950,delay:Math.min(index*140,700),easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
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
        if (el.id === 'nav-drawer' && el.classList.contains('-translate-x-full')) return;
        if (el.id && (el.id.startsWith('modal-') || el.id === 'nav-drawer')) {
          el.animate(
            el.id === 'nav-drawer'
              ? [{opacity:.55,transform:'translateX(-100%)'},{opacity:1,transform:'translateX(0)'}]
              : [{opacity:0,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
            {duration:el.id === 'nav-drawer' ? 480 : 560,easing:'cubic-bezier(.22,1,.36,1)'}
          );
        }
      });
    });
    document.querySelectorAll('[id^="modal-"], #nav-drawer').forEach(el => {
      modalObserver.observe(el,{attributes:true,attributeFilter:['class','style']});
    });

    // 5. 最終正答率を少し集計してから発表し、発表後に紙吹雪を表示する。
    function celebrateResult(screen) {
      if (screen.dataset.npCelebrated === '1') return;
      screen.dataset.npCelebrated = '1';
      const scoreEl = document.getElementById('final-score-val');
      const accuracy = scoreEl ? Number(scoreEl.textContent) : NaN;
      if (!Number.isFinite(accuracy)) return;

      // Reduce Motion設定やWeb Animations APIの有無で、正答率カウント自体を止めない。
      // 視覚効果を抑える設定でも「0から実際の正答率へ」の表示は行う。
      const canAnimate = typeof scoreEl.animate === 'function';
      const scoreLine = scoreEl.parentElement;
      const scoreCard = scoreEl.closest('.p-6');
      if (!scoreLine || !scoreCard) return;

      // 正答率だけを一旦隠し、集計中の間を作る。採点や保存済み記録は変更しない。
      const status = document.createElement('div');
      status.className = 'np-accuracy-announcement';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.textContent = '正答率を集計中';
      status.style.cssText = 'font-size:12px;letter-spacing:.16em;color:#fcd34d;min-height:18px;margin:0 0 8px;opacity:.8;';
      scoreLine.parentNode.insertBefore(status, scoreLine);
      scoreEl.textContent = '0';
      scoreLine.style.opacity = '.3';
      scoreLine.style.filter = 'blur(5px)';
      scoreLine.style.transform = 'scale(.96)';

      if (canAnimate) {
        scoreCard.animate(
          [{ boxShadow:'0 0 0 rgba(245,158,11,0)', borderColor:'rgba(51,65,85,.65)' },
           { boxShadow:'0 0 28px rgba(245,158,11,.18)', borderColor:'rgba(245,158,11,.55)' },
           { boxShadow:'0 0 10px rgba(245,158,11,.08)', borderColor:'rgba(51,65,85,.65)' }],
          { duration:1500, easing:'ease-in-out' }
        );
      }

      window.setTimeout(() => {
        if (!screen.isConnected || screen.classList.contains('hidden')) return;
        status.textContent = '結果発表！';
        status.style.opacity = '1';
        if (canAnimate) {
          status.animate(
            [{ opacity:.35, transform:'translateY(5px) scale(.96)' },
             { opacity:1, transform:'translateY(0) scale(1.06)', offset:.7 },
             { opacity:1, transform:'translateY(0) scale(1)' }],
            { duration:620, easing:'cubic-bezier(.22,1,.36,1)' }
          );
          scoreLine.animate(
            [{ opacity:.3, filter:'blur(5px)', transform:'scale(.96)' },
             { opacity:1, filter:'blur(0)', transform:'scale(1.12)', offset:.72 },
             { opacity:1, filter:'blur(0)', transform:'scale(1)' }],
            { duration:850, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards' }
          );
        } else {
          scoreLine.style.opacity = '1';
          scoreLine.style.filter = 'none';
          scoreLine.style.transform = 'none';
        }

        const startTime = performance.now();
        const countDuration = 1500;
        function countUp(now) {
          if (!scoreEl.isConnected || screen.classList.contains('hidden')) return;
          const progress = Math.min(1, (now - startTime) / countDuration);
          const eased = 1 - Math.pow(1 - progress, 3);
          scoreEl.textContent = String(Math.round(accuracy * eased));
          if (progress < 1) {
            requestAnimationFrame(countUp);
          } else {
            scoreEl.textContent = String(accuracy);
            status.remove();
            // 発表のあとにだけ祝福演出を行う。
            if (typeof window.confetti === 'function') {
              window.confetti({
                particleCount: accuracy === 100 ? 90 : 42,
                spread: accuracy === 100 ? 68 : 54,
                startVelocity: 25,
                scalar: 0.8,
                origin: { y: 0.68 }
              });
            } else {
              const colors = ['#f59e0b', '#fcd34d', '#34d399', '#60a5fa', '#f472b6', '#c084fc'];
              const layer = document.createElement('div');
              layer.setAttribute('aria-hidden', 'true');
              layer.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:99999;';
              for (let i = 0; i < 48; i++) {
                const piece = document.createElement('i');
                const duration = 1.7 + Math.random() * 1.3;
                piece.style.cssText = [
                  'position:absolute','top:-14px','left:' + (Math.random() * 100) + '%',
                  'width:' + (5 + Math.random() * 5) + 'px','height:' + (7 + Math.random() * 7) + 'px',
                  'border-radius:2px','background:' + colors[i % colors.length],'opacity:.95',
                  '--np-drift:' + ((Math.random() - .5) * 220) + 'px',
                  '--np-rotate:' + (Math.random() * 900 - 450) + 'deg',
                  'animation:npConfettiFall ' + duration + 's ease-in forwards'
                ].join(';');
                layer.appendChild(piece);
              }
              document.body.appendChild(layer);
              window.setTimeout(() => layer.remove(), 4200);
            }
          }
        }
        requestAnimationFrame(countUp);
      }, 1450);
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
    const analysisHost = document.getElementById('screen-data-analysis') || main;
    analysisHost.appendChild(screen);
    screen.classList.remove('hidden');

    // 追加分析パネルは独立画面ではなく、親のデータ分析画面の一部として扱う。
    // 親が表示中にパネルだけが hidden になった場合は、表示状態を自動的に復元する。
    const syncAnalyticsPanelVisibility = () => {
      if (!analysisHost.classList.contains('hidden') && screen.classList.contains('hidden')) {
        screen.classList.remove('hidden');
      }
    };
    const analyticsPanelVisibilityObserver = new MutationObserver(syncAnalyticsPanelVisibility);
    analyticsPanelVisibilityObserver.observe(analysisHost, { attributes: true, attributeFilter: ['class'] });
    analyticsPanelVisibilityObserver.observe(screen, { attributes: true, attributeFilter: ['class'] });

    // 既存の画面切り替え関数は上書きせず、分析画面以外を操作したときだけ閉じる。
    installEffects();
    const quizResultScreen = document.getElementById('screen-quiz-result');
    if (quizResultScreen) {
      const streakObserver = new MutationObserver(() => {
        if (quizResultScreen.classList.contains('hidden')) return;
        const streak = calculateStreak(getRows());
        const streakEl = document.getElementById('evo-streak');
        if (streakEl) streakEl.textContent = String(streak);
      });
      streakObserver.observe(quizResultScreen, { attributes: true, attributeFilter: ['class'] });
    }
    // 追加分析パネルは親の #screen-data-analysis と一緒に表示・非表示を管理する。
    // 画面内のタップでパネルだけを隠すと、基本の4項目だけが残るため、
    // クリック位置に応じてパネル単体を非表示にする処理は行わない。
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  // ACE: AIによる間違い問題の文章分析。入力された問題文だけを送信し、個人情報は送らない。
  function installWrongAnswerAnalysis() {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen || document.getElementById('np-ai-wrong-analysis')) return;
    const section = document.createElement('section');
    section.id = 'np-ai-wrong-analysis';
    section.className = 'np-analytics-card';
    section.innerHTML = `
      <h3 class="text-sm font-semibold text-slate-100">AI間違い分析・復習提案</h3>
      <p class="text-[10px] text-slate-400 mt-1">間違えた問題文・選択肢・解説を貼り付けると、弱点の知識と復習ポイントを整理します。氏名などの個人情報は入力しないでください。</p>
      <textarea id="np-ai-wrong-text" rows="5" maxlength="12000" class="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-100" placeholder="例：問題文／選択肢／正解／解説"></textarea>
      <button id="np-ai-wrong-run" type="button" class="np-analytics-back mt-2">AIで弱点を分析</button>
      <div id="np-ai-wrong-result" class="mt-3 text-xs leading-6 text-slate-200" role="status" aria-live="polite"></div>`;
    const weekly = screen.querySelector('section.np-analytics-card');
    if (weekly) weekly.parentNode.insertBefore(section, weekly.nextSibling);
    else screen.appendChild(section);
    section.querySelector('#np-ai-wrong-run')?.addEventListener('click', async () => {
      const input = section.querySelector('#np-ai-wrong-text');
      const output = section.querySelector('#np-ai-wrong-result');
      const button = section.querySelector('#np-ai-wrong-run');
      const text = (input?.value || '').trim();
      if (text.length < 20) { output.textContent = '問題文・選択肢・解説などを20文字以上入力してください。'; return; }
      button.disabled = true; output.textContent = '分析しています…';
      try {
        const response = await fetch((window.NURSE_LINE_API_BASE || '').replace(/\/$/, '') + '/api/learning/analyze-wrong-answers', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({items:[{text}]})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || 'AI分析に失敗しました。サーバー設定を確認してください。');
        const report = data.analysis;
        output.innerHTML = '';
        const box = document.createElement('div');
        box.className = 'rounded-xl border border-slate-700 bg-slate-950/40 p-3 whitespace-pre-wrap';
        box.textContent = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
        output.appendChild(box);
      } catch (error) {
        output.textContent = error.message || 'AI分析に失敗しました。';
      } finally { button.disabled = false; }
    });
  }

  const aceOriginalRenderAnalytics = renderAnalytics;
  renderAnalytics = function() {
    aceOriginalRenderAnalytics();
    installWrongAnswerAnalysis();
  };

})();