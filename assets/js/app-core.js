
    // ---------------------------------------------------------
    // 看護学方法論Ⅰ (lessonData) 取得用ヘルパー関数
    // ---------------------------------------------------------
    window.getNursingQuestions = function(roundVal) {
      if (typeof lessonData === 'undefined') return [];
      let results = [];
      if (roundVal === 'all' || !roundVal) {
        Object.keys(lessonData).forEach(key => {
          const roundNum = isNaN(parseInt(key, 10)) ? key : parseInt(key, 10);
          const items = lessonData[key].map(q => ({ ...q, round: roundNum }));
          results = results.concat(items);
        });
      } else {
        const key = roundVal.toString();
        if (lessonData[key]) {
          const roundNum = isNaN(parseInt(key, 10)) ? key : parseInt(key, 10);
          results = lessonData[key].map(q => ({ ...q, round: roundNum }));
        }
      }
      return results;
    };

    function selectNursingRound(selectedValue) {
      currentRound = (selectedValue === "all") ? null : selectedValue;
      if (typeof window.getNursingQuestions === "function") {
        const currentQuestions = window.getNursingQuestions(selectedValue);
        if (Array.isArray(currentQuestions) && currentQuestions.length > 0) {
          window.QUIZ_DB.nursing_method = currentQuestions;
        }
      }
      showStartScreen();
    }

    function selectBiochemistryFormat(format) {
      currentBiochemistryFormat = format;
      showStartScreen();
    }

    // =========================================================
    //  1. Firebase 設定
    // =========================================================
    const firebaseConfig = {
      databaseURL: "https://test-taisaku-7e433-default-rtdb.firebaseio.com/"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // OAuthで別ページを経由しても同じブラウザの訪問者IDを維持する
    let myPlayerId = localStorage.getItem('my_player_id') || sessionStorage.getItem('my_player_id');
    if (!myPlayerId) {
      myPlayerId = 'usr_' + Math.random().toString(36).substring(2, 9);
    }
    localStorage.setItem('my_player_id', myPlayerId);
    sessionStorage.setItem('my_player_id', myPlayerId);

    // ---------------------------------------------------------
    // 閲覧人数管理機能
    // ---------------------------------------------------------
    function getVisitorDeviceName() {
      const ua = navigator.userAgent || '';
      if (/iPhone/i.test(ua)) return 'iPhone';
      if (/iPad/i.test(ua)) return 'iPad';
      if (/Android/i.test(ua)) {
        const m = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:-[A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
        return m && m[1] ? `Android: ${m[1].trim()}` : 'Android端末';
      }
      if (/Windows/i.test(ua)) return 'Windows PC';
      if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
      if (/CrOS/i.test(ua)) return 'Chromebook';
      return '不明な端末';
    }

    function escapeVisitorHistoryText(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderVisitorHistory(data) {
      const el = document.getElementById('admin-visitor-history');
      if (!el) return;
      const rows = Object.entries(data || {}).map(([id, v]) => ({id, ...v}))
        .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100);
      if (!rows.length) {
        el.innerHTML = '<div class="text-[11px] text-slate-500 text-center py-3">閲覧履歴はありません。</div>';
        return;
      }
      el.innerHTML = rows.map(v => {
        const d = v.timestamp ? new Date(v.timestamp) : null;
        const time = d && !isNaN(d) ? d.toLocaleString('ja-JP', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '--';
        const lineName = v.lineName ? escapeVisitorHistoryText(v.lineName) : '';
        const deviceName = escapeVisitorHistoryText(v.deviceName || '不明な端末');
        const visitorId = escapeVisitorHistoryText(v.visitorId || '');
        return `<div class="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
          <div class="min-w-0"><div class="text-[11px] text-slate-200 truncate">${lineName || deviceName}</div>${lineName ? `<div class="text-[9px] text-slate-500 truncate">${deviceName}</div>` : ''}<div class="text-[9px] text-slate-600 font-mono truncate">${visitorId}</div></div>
          <div class="text-[9px] text-slate-500 whitespace-nowrap">${time}</div>
        </div>`;
      }).join('');
    }

    function initVisitorTracking() {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const deviceName = getVisitorDeviceName();
      const lineName = localStorage.getItem('nurse_line_user_name') || null;
      const visitorRecord = {
        visitorId: myPlayerId,
        deviceName,
        ...(lineName ? { lineName } : {}),
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };

      const onlineRef = db.ref(`presence/online/${myPlayerId}`);
      const connectedRef = db.ref('.info/connected');

      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          onlineRef.onDisconnect().remove();
          onlineRef.set(true);
        }
      });

      db.ref(`presence/daily/${todayStr}/${myPlayerId}`).set(true);
      db.ref(`presence/history/${myPlayerId}`).set(visitorRecord);
      db.ref('presence/history').push(visitorRecord);

      db.ref('presence/online').on('value', (snap) => {
        const count = snap.val() ? Object.keys(snap.val()).length : 0;
        const el = document.getElementById('admin-current-online-count');
        if (el) el.textContent = `${count} 人`;
      });

      db.ref(`presence/daily/${todayStr}`).on('value', (snap) => {
        const count = snap.val() ? Object.keys(snap.val()).length : 0;
        const el = document.getElementById('admin-today-visitor-count');
        if (el) el.textContent = `${count} 人`;
      });

      db.ref('presence/history').on('value', (snap) => {
        renderVisitorHistory(snap.val());
      });
    }

    // ---------------------------------------------------------
    // お知らせモーダル表示制御
    // ---------------------------------------------------------
    function openNoticeModal() {
      document.getElementById('modal-notice').classList.remove('hidden');
      const redDot = document.getElementById('notice-red-dot');
      if (redDot) {
        redDot.classList.add('hidden');
      }
      localStorage.setItem('notice_read_status', 'read');
    }
    function closeNoticeModal() {
      document.getElementById('modal-notice').classList.add('hidden');
    }

    // Nurse＋ AI/LINE連携API。サーバーURLのみ設定し、秘密鍵やLINEトークンは絶対に置かない。
    // デプロイしたサーバーのHTTPS URLを設定してください。
    const NURSE_LINE_API_BASE_URL = "https://nurse-line-system.onrender.com";
    let aiNoticeCurrentDraftId = null;

    function updateAiNoticeLengthStatus() {
      const content = document.getElementById('ai-notice-content');
      const status = document.getElementById('ai-notice-length-status');
      if (!content || !status) return;
      status.textContent = `本文 ${content.value.length} / 2000文字`;
      status.className = content.value.length > 2000 ? 'text-[10px] text-rose-400' : 'text-[10px] text-slate-500';
    }

    async function callNurseLineApi(path, payload, method = 'POST') {
      if (!NURSE_LINE_API_BASE_URL) {
        throw new Error('AI・LINEサーバーAPIが未設定です。別リポジトリのサーバーを構築してから接続してください。');
      }
      const sessionToken = sessionStorage.getItem('nurse_line_admin_session');
      if (!sessionToken) {
        throw new Error('サーバー管理者認証がありません。安全な管理者ログインを先に設定してください。');
      }
      const options = {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` }
      };
      if (method !== 'GET') options.body = JSON.stringify(payload || {});
      const response = await fetch(`${NURSE_LINE_API_BASE_URL.replace(/\/$/, '')}${path}`, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `サーバーエラー (${response.status})`);
      return data;
    }

    async function loadLineSendMode() {
      const status = document.getElementById('line-send-mode-status');
      try {
        const result = await callNurseLineApi('/api/line/send-mode', null, 'GET');
        renderLineSendMode(result.mode);
      } catch (err) {
        if (status) {
          status.textContent = 'モード取得失敗';
          status.className = 'text-[10px] text-rose-300';
        }
        console.error('LINE送信モードの取得に失敗しました:', err);
      }
    }

    function renderLineSendMode(mode) {
      const status = document.getElementById('line-send-mode-status');
      const testButton = document.getElementById('line-send-mode-test-btn');
      const allButton = document.getElementById('line-send-mode-all-btn');
      if (!status || !testButton || !allButton) return;

      if (mode === 'all') {
        status.textContent = '全員送信';
        status.className = 'text-[10px] text-rose-300 font-semibold';
        testButton.className = 'py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition';
        allButton.className = 'py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700/60 text-rose-200 text-xs font-semibold transition';
      } else {
        status.textContent = 'テスト送信';
        status.className = 'text-[10px] text-emerald-300 font-semibold';
        testButton.className = 'py-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold transition';
        allButton.className = 'py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition';
      }
    }

    async function setLineSendMode(mode) {
      if (mode !== 'test' && mode !== 'all') return;
      if (mode === 'all' && !confirm('LINEの送信先を友だち全員に切り替えます。よろしいですか？')) return;
      if (mode === 'test' && !confirm('LINEの送信先を管理者本人だけに切り替えます。よろしいですか？')) return;

      const testButton = document.getElementById('line-send-mode-test-btn');
      const allButton = document.getElementById('line-send-mode-all-btn');
      if (testButton) testButton.disabled = true;
      if (allButton) allButton.disabled = true;

      try {
        const result = await callNurseLineApi('/api/line/send-mode', { mode });
        renderLineSendMode(result.mode);
        recordAdminOperation('LINE送信モード変更', result.mode === 'all' ? '全員送信' : 'テスト送信');
        alert(result.message || 'LINE送信モードを変更しました。');
      } catch (err) {
        console.error('LINE送信モードの変更に失敗しました:', err);
        alert(err.message || 'LINE送信モードを変更できませんでした。');
      } finally {
        if (testButton) testButton.disabled = false;
        if (allButton) allButton.disabled = false;
      }
    }

    async function generateAiNoticeDraft() {
      const btn = document.getElementById('ai-notice-generate-btn');
      const instruction = document.getElementById('ai-notice-instruction').value.trim();
      const tone = document.getElementById('ai-notice-tone').value;
      const countValue = document.getElementById('ai-notice-problem-count').value;
      const problemCount = countValue === '' ? null : Number(countValue);
      if (!instruction) { alert('AIへの指示・お知らせの目的を入力してください。'); return; }
      if (problemCount !== null && (!Number.isInteger(problemCount) || problemCount < 0)) { alert('問題数は0以上の整数で入力してください。'); return; }
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = '下書きを作成中…';
      try {
        const result = await callNurseLineApi('/api/notices/draft', { instruction, tone, problemCount, appUrl: 'https://testpreparation.github.io/Test-prep-workbook/' });
        const draft = result.draft || result;
        document.getElementById('ai-notice-title').value = String(draft.title || '').slice(0, 100);
        document.getElementById('ai-notice-content').value = String(draft.content || '').slice(0, 2000);
        aiNoticeCurrentDraftId = draft.id || result.draftId || null;
        document.getElementById('ai-notice-draft-status').textContent = 'AI下書き・未承認';
        updateAiNoticeLengthStatus();
        saveAiNoticeDraft(false);
        alert('AI下書きを作成しました。公開・LINE配信前に内容を確認してください。');
      } catch (err) {
        console.error('AIお知らせ下書きの作成に失敗しました:', err);
        alert(err.message || 'AI下書きを作成できませんでした。');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    // 予約配信カレンダー：ブラウザ依存の yyyy/mm/dd 表示を避け、日付をカレンダー上で選択
    const noticeCalendarMonths = {};

    function noticeCalendarDateKey(year, monthIndex, day) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function renderNoticeCalendar(prefix) {
      const dateInput = document.getElementById(`${prefix}-schedule-date`);
      const monthLabel = document.getElementById(`${prefix}-calendar-month`);
      const daysContainer = document.getElementById(`${prefix}-calendar-days`);
      const selectedLabel = document.getElementById(`${prefix}-calendar-selected`);
      if (!dateInput || !monthLabel || !daysContainer || !selectedLabel) return;

      const selectedDate = dateInput.value;
      let view = noticeCalendarMonths[prefix];
      if (!view) {
        const base = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
        view = { year: base.getFullYear(), month: base.getMonth() };
        noticeCalendarMonths[prefix] = view;
      }
      monthLabel.textContent = `${view.year}年${view.month + 1}月`;
      selectedLabel.textContent = selectedDate
        ? `${Number(selectedDate.slice(5, 7))}月${Number(selectedDate.slice(8, 10))}日を選択中`
        : '日付未選択';
      const openValue = document.getElementById(`${prefix}-calendar-open-value`);
      const selectedTime = document.getElementById(`${prefix}-schedule-time`)?.value || '';
      if (openValue) openValue.textContent = selectedDate
        ? `${Number(selectedDate.slice(5, 7))}月${Number(selectedDate.slice(8, 10))}日（${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ja-JP', { weekday: 'short' })}）${selectedTime ? ` ${selectedTime}` : ''}`
        : '日付を選択してください';

      const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
      const today = new Date();
      const todayKey = noticeCalendarDateKey(today.getFullYear(), today.getMonth(), today.getDate());
      let html = '';
      for (let i = 0; i < firstWeekday; i++) html += '<span class="h-9"></span>';
      for (let day = 1; day <= daysInMonth; day++) {
        const key = noticeCalendarDateKey(view.year, view.month, day);
        const isSelected = key === selectedDate;
        const isToday = key === todayKey;
        const weekday = (firstWeekday + day - 1) % 7;
        const weekendClass = weekday === 5 ? ' text-sky-200' : weekday === 6 ? ' text-rose-200' : ' text-slate-200';
        const selectedClass = isSelected ? ' bg-amber-500 text-slate-950 border-amber-300 font-bold shadow' : isToday ? ' border-amber-400/80 bg-amber-950/40 font-semibold' : ' border-transparent bg-slate-800/80 hover:bg-slate-700';
        const accent = prefix === 'ai-notice' && !isSelected ? ' ring-0' : '';
        html += `<button type="button" onclick="selectNoticeCalendarDate('${prefix}','${key}')" aria-label="${view.year}年${view.month + 1}月${day}日" aria-pressed="${isSelected}" class="h-9 w-full rounded-lg border text-xs transition ${selectedClass}${isSelected ? '' : weekendClass}${accent}">${day}</button>`;
      }
      daysContainer.innerHTML = html;
    }

    function toggleNoticeCalendar(prefix) {
      const panel = document.getElementById(`${prefix}-calendar-panel`);
      const trigger = document.getElementById(`${prefix}-calendar-open-label`);
      if (!panel || !trigger) return;
      const willOpen = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) { renderNoticeCalendar(prefix); renderNoticeTimePicker(prefix); }
    }

    function moveNoticeCalendar(prefix, amount) {
      const current = noticeCalendarMonths[prefix] || (() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; })();
      const moved = new Date(current.year, current.month + amount, 1);
      noticeCalendarMonths[prefix] = { year: moved.getFullYear(), month: moved.getMonth() };
      renderNoticeCalendar(prefix);
    }

    function selectNoticeCalendarDate(prefix, dateValue) {
      const input = document.getElementById(`${prefix}-schedule-date`);
      if (!input) return;
      input.value = dateValue;
      const date = new Date(`${dateValue}T12:00:00`);
      noticeCalendarMonths[prefix] = { year: date.getFullYear(), month: date.getMonth() };
      renderNoticeCalendar(prefix);
      // Keep the combined date-and-time panel open so the user can choose both together.
      syncNoticeSchedule(prefix);
    }

    function selectNoticeCalendarToday(prefix) {
      const today = new Date();
      selectNoticeCalendarDate(prefix, noticeCalendarDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    function renderNoticeTimePicker(prefix) {
      const input = document.getElementById(`${prefix}-schedule-time`);
      const hourWheel = document.getElementById(`${prefix}-hour-wheel`);
      const minuteWheel = document.getElementById(`${prefix}-minute-wheel`);
      if (!input || !hourWheel || !minuteWheel) return;
      const selectedHour = input.value ? Number(input.value.slice(0, 2)) : 9;
      const selectedMinute = input.value ? Number(input.value.slice(3, 5)) : 0;
      const buildItems = (count, suffix) => '<div class="notice-time-wheel-spacer"></div>' +
        Array.from({ length: count }, (_, n) => {
          const value = String(n).padStart(2, '0');
          return `<div class="notice-time-wheel-item" data-value="${value}" role="option" aria-selected="false">${value}${suffix}</div>`;
        }).join('') + '<div class="notice-time-wheel-spacer"></div>';
      if (!hourWheel.dataset.ready) {
        hourWheel.innerHTML = buildItems(24, '時');
        minuteWheel.innerHTML = buildItems(60, '分');
        hourWheel.dataset.ready = '1';
        minuteWheel.dataset.ready = '1';
        hourWheel.scrollTop = selectedHour * 36;
        minuteWheel.scrollTop = selectedMinute * 36;
      }
      const setSelected = (wheel, selected) => {
        wheel.querySelectorAll('.notice-time-wheel-item').forEach((item, index) => {
          const active = index === selected;
          item.classList.toggle('is-selected', active);
          item.setAttribute('aria-selected', String(active));
        });
      };
      setSelected(hourWheel, selectedHour);
      setSelected(minuteWheel, selectedMinute);
    }

    function handleNoticeWheelScroll(prefix, unit) {
      const wheel = document.getElementById(`${prefix}-${unit}-wheel`);
      const input = document.getElementById(`${prefix}-schedule-time`);
      if (!wheel || !input || wheel.dataset.scrollLock === '1') return;
      const index = Math.max(0, Math.min(unit === 'hour' ? 23 : 59, Math.round(wheel.scrollTop / 36)));
      const items = wheel.querySelectorAll('.notice-time-wheel-item');
      items.forEach((item, i) => {
        const active = i === index;
        item.classList.toggle('is-selected', active);
        item.setAttribute('aria-selected', String(active));
      });
      const currentHour = input.value ? input.value.slice(0, 2) : '09';
      const currentMinute = input.value ? input.value.slice(3, 5) : '00';
      input.value = `${unit === 'hour' ? String(index).padStart(2, '0') : currentHour}:${unit === 'minute' ? String(index).padStart(2, '0') : currentMinute}`;
      syncNoticeSchedule(prefix);
    }

    function updateNoticeTimeFromSelects(prefix) {
      // Retained for compatibility with any existing callers.
      const input = document.getElementById(`${prefix}-schedule-time`);
      if (!input) return;
      renderNoticeTimePicker(prefix);
      syncNoticeSchedule(prefix);
    }

    function toggleNoticeTimePicker(prefix) {
      // Date and time are now selected together in the calendar panel.
      toggleNoticeCalendar(prefix);
    }

    function selectNoticeTime(prefix, value) {
      const input = document.getElementById(`${prefix}-schedule-time`);
      if (!input) return;
      input.value = value;
      renderNoticeTimePicker(prefix);
      syncNoticeSchedule(prefix);
    }

    function syncNoticeSchedule(prefix) {
      const dateInput = document.getElementById(`${prefix}-schedule-date`);
      const timeInput = document.getElementById(`${prefix}-schedule-time`);
      const hiddenInput = document.getElementById(`${prefix}-scheduled-at`);
      const preview = document.getElementById(`${prefix}-schedule-preview`);
      if (!dateInput || !timeInput || !hiddenInput) return;
      renderNoticeCalendar(prefix);
      renderNoticeTimePicker(prefix);
      if (dateInput.value && timeInput.value) {
        hiddenInput.value = `${dateInput.value}T${timeInput.value}`;
        if (preview) preview.textContent = `配信予定：${new Date(hiddenInput.value).toLocaleString('ja-JP', { dateStyle: 'full', timeStyle: 'short' })}`;
      } else {
        hiddenInput.value = '';
        if (preview) {
          const partial = Boolean(dateInput.value || timeInput.value);
          preview.textContent = partial ? '日付と時刻を両方選択してください' : (prefix === 'admin-notice' ? '配信予定：今すぐ' : '配信予定：即時配信設定に従う');
        }
      }
    }

    function noticeScheduleIsComplete(prefix) {
      const dateInput = document.getElementById(`${prefix}-schedule-date`);
      const timeInput = document.getElementById(`${prefix}-schedule-time`);
      return Boolean(dateInput && timeInput && (dateInput.value === timeInput.value || (dateInput.value && timeInput.value)));
    }

    function clearNoticeSchedule(prefix) {
      const dateInput = document.getElementById(`${prefix}-schedule-date`);
      const timeInput = document.getElementById(`${prefix}-schedule-time`);
      if (dateInput) dateInput.value = '';
      if (timeInput) timeInput.value = '';
      renderNoticeCalendar(prefix);
      renderNoticeTimePicker(prefix);
      syncNoticeSchedule(prefix);
    }

    function restoreNoticeScheduleControls(prefix, value) {
      const dateInput = document.getElementById(`${prefix}-schedule-date`);
      const timeInput = document.getElementById(`${prefix}-schedule-time`);
      const hiddenInput = document.getElementById(`${prefix}-scheduled-at`);
      if (!dateInput || !timeInput || !hiddenInput) return;
      hiddenInput.value = value || '';
      if (value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          const pad = n => String(n).padStart(2, '0');
          dateInput.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
          timeInput.value = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
      } else {
        dateInput.value = '';
        timeInput.value = '';
      }
      renderNoticeCalendar(prefix);
      renderNoticeTimePicker(prefix);
      syncNoticeSchedule(prefix);
    }

    function saveAiNoticeDraft(showMessage = true) {
      syncNoticeSchedule('ai-notice');
      const title = document.getElementById('ai-notice-title').value.trim();
      const content = document.getElementById('ai-notice-content').value.trim();
      if (!title && !content) { if (showMessage) alert('保存する下書きがありません。'); return; }
      const draft = {
        id: aiNoticeCurrentDraftId || `local_${Date.now()}`,
        title, content,
        tone: document.getElementById('ai-notice-tone').value,
        instruction: document.getElementById('ai-notice-instruction').value.trim(),
        scheduledAt: document.getElementById('ai-notice-scheduled-at').value || null,
        updatedAt: Date.now(),
        status: 'draft'
      };
      aiNoticeCurrentDraftId = draft.id;
      try {
        localStorage.setItem('nurse_plus_ai_notice_draft', JSON.stringify(draft));
        document.getElementById('ai-notice-draft-status').textContent = 'この端末に下書き保存済み';
        if (showMessage) alert('下書きをこの端末に保存しました。※端末・ブラウザ間では同期されません。');
      } catch (err) {
        console.error('下書き保存に失敗しました:', err);
        if (showMessage) alert('下書きを保存できませんでした。');
      }
    }

    function restoreAiNoticeDraft() {
      try {
        const raw = localStorage.getItem('nurse_plus_ai_notice_draft');
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (!draft || typeof draft !== 'object') return;
        document.getElementById('ai-notice-title').value = draft.title || '';
        document.getElementById('ai-notice-content').value = draft.content || '';
        document.getElementById('ai-notice-tone').value = draft.tone || 'polite';
        document.getElementById('ai-notice-instruction').value = draft.instruction || '';
        restoreNoticeScheduleControls('ai-notice', draft.scheduledAt || '');
        aiNoticeCurrentDraftId = draft.id || null;
        document.getElementById('ai-notice-draft-status').textContent = '保存済み下書きを復元';
        updateAiNoticeLengthStatus();
      } catch (err) { console.warn('AIお知らせ下書きを復元できませんでした:', err); }
    }

    function previewAiNoticeDraft() {
      syncNoticeSchedule('ai-notice');
      const title = document.getElementById('ai-notice-title').value.trim();
      const content = document.getElementById('ai-notice-content').value.trim();
      if (!title || !content) { alert('プレビューするタイトルと本文を入力してください。'); return; }
      if (content.length > 2000) { alert('本文が2000文字を超えています。短くしてください。'); return; }
      document.getElementById('ai-notice-preview-title').textContent = title;
      document.getElementById('ai-notice-preview-content').textContent = content;
      const schedule = document.getElementById('ai-notice-scheduled-at').value;
      document.getElementById('ai-notice-preview-schedule').textContent = schedule ? `配信予定：${new Date(schedule).toLocaleString('ja-JP')}` : '配信予定：今すぐ（LINE送信モードに従う）';
      document.getElementById('ai-notice-preview').classList.remove('hidden');
    }

    async function approveAndQueueAiNotice() {
      syncNoticeSchedule('ai-notice');
      if (!noticeScheduleIsComplete('ai-notice')) { alert('予約配信する場合は、日付と時刻の両方を選択してください。'); return; }
      const title = document.getElementById('ai-notice-title').value.trim();
      const content = document.getElementById('ai-notice-content').value.trim();
      const scheduledValue = document.getElementById('ai-notice-scheduled-at').value || '';
      const scheduledAt = scheduledValue ? new Date(scheduledValue).toISOString() : null;
      if (!title || !content) { alert('タイトルと本文を入力してください。'); return; }
      if (title.length > 100 || content.length > 2000) { alert('タイトルは100文字以内、本文は2000文字以内にしてください。'); return; }
      previewAiNoticeDraft();
      if (!confirm('プレビューを確認しましたか？ 承認するとサーバー側で公開とLINE配信予約を行います。')) return;
      try {
        const result = await callNurseLineApi('/api/notices/approve', {
          draftId: aiNoticeCurrentDraftId,
          title, content, scheduledAt,
          approvedAt: new Date().toISOString(),
          appUrl: 'https://testpreparation.github.io/Test-prep-workbook/',
          approvalRequired: true,
          target: 'all_followers'
        });
        document.getElementById('ai-notice-draft-status').textContent = '承認済み・サーバー受付済み';
        localStorage.removeItem('nurse_plus_ai_notice_draft');
        alert(result.message || '承認を受け付けました。配信状況はサーバー側の履歴で確認してください。');
      } catch (err) {
        console.error('AIお知らせの承認・配信予約に失敗しました:', err);
        alert(err.message || '承認・配信予約に失敗しました。安全のため公開処理は実行していません。');
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      const aiContent = document.getElementById('ai-notice-content');
      if (aiContent) aiContent.addEventListener('input', updateAiNoticeLengthStatus);
      restoreAiNoticeDraft();
      renderNoticeCalendar('admin-notice');
      renderNoticeCalendar('ai-notice');
      syncNoticeSchedule('admin-notice');
      syncNoticeSchedule('ai-notice');
    });

    async function postAdminNotice() {
      const titleInput = document.getElementById('admin-notice-title');
      const contentInput = document.getElementById('admin-notice-content');
      syncNoticeSchedule('admin-notice');
      if (!noticeScheduleIsComplete('admin-notice')) { alert('予約配信する場合は、日付と時刻の両方を選択してください。'); return; }
      const scheduleInput = document.getElementById('admin-notice-scheduled-at');

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();
      const scheduleValue = scheduleInput ? scheduleInput.value : '';
      const imageInput = document.getElementById('admin-notice-image');
      const selectedImage = imageInput && imageInput.files ? imageInput.files[0] : null;

      // 画像のみの場合はLINEへ送信するだけ。Nurse＋内や送信履歴には保存しない。
      if (selectedImage) {
        if (title || content) {
          alert('画像のみを送る場合は、タイトルと本文を空欄にしてください。');
          return;
        }
        if (!['image/jpeg', 'image/png'].includes(selectedImage.type)) {
          alert('JPEGまたはPNG画像を選択してください。');
          return;
        }
        if (selectedImage.size > 10 * 1024 * 1024) {
          alert('画像は10MB以下にしてください。');
          return;
        }
        let imageScheduledAt = null;
        if (scheduleValue) {
          const localDate = new Date(scheduleValue);
          if (!Number.isFinite(localDate.getTime()) || localDate.getTime() <= Date.now()) {
            alert('LINE配信日時は現在より後の日時を選択してください。');
            return;
          }
          imageScheduledAt = localDate.toISOString();
        }
        const imageConfirmText = imageScheduledAt
          ? `画像のみをLINEへ配信予約します。配信日時：${new Date(imageScheduledAt).toLocaleString('ja-JP')}。Nurse＋内や送信履歴には保存されません。よろしいですか？`
          : '画像のみをLINEへ送信します。Nurse＋内や送信履歴には保存されません。よろしいですか？';
        if (!confirm(imageConfirmText)) return;
        try {
          const sessionToken = sessionStorage.getItem('nurse_line_admin_session');
          if (!sessionToken) throw new Error('サーバー管理者認証がありません。再度ログインしてください。');
          const apiPath = imageScheduledAt ? '/api/notices/schedule-image' : '/api/notices/send-image';
          const requestHeaders = {
            'Content-Type': selectedImage.type,
            'Authorization': `Bearer ${sessionToken}`
          };
          if (imageScheduledAt) requestHeaders['X-Scheduled-At'] = imageScheduledAt;
          const response = await fetch(`${NURSE_LINE_API_BASE_URL.replace(/\/$/, '')}${apiPath}`, {
            method: 'POST',
            headers: requestHeaders,
            body: selectedImage
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.message || result.error || `サーバーエラー (${response.status})`);
          recordAdminOperation('LINE画像配信', imageScheduledAt ? '配信予約' : '即時配信');
          alert(result.message || (imageScheduledAt ? '画像のみの配信を予約しました。' : '画像のみをLINEへ送信しました。'));
          imageInput.value = '';
          clearNoticeSchedule('admin-notice');
          return;
        } catch (err) {
          console.error('画像のみのLINE送信に失敗しました:', err);
          alert(err.message || '画像送信に失敗しました。');
          return;
        }
      }

      if (!title || !content) {
        alert("お知らせのタイトルと本文を入力してください。");
        return;
      }

      let scheduledAt = null;
      if (scheduleValue) {
        const localDate = new Date(scheduleValue);
        if (!Number.isFinite(localDate.getTime()) || localDate.getTime() <= Date.now()) {
          alert('LINE配信日時は現在より後の日時を選択してください。');
          return;
        }
        scheduledAt = localDate.toISOString();
      }

      const fullContent = `【${title}】\n${content}`;
      const noticeData = {
        title: title,
        content: content,
        timestamp: Date.now(),
        published: true,
        scheduledAt: scheduledAt
      };

      const confirmation = scheduledAt
        ? `Nurse＋内には今すぐ投稿し、LINEは ${new Date(scheduledAt).toLocaleString('ja-JP')} に配信予約します。よろしいですか？`
        : 'Nurse＋内に投稿し、LINEへ今すぐ配信します。よろしいですか？';
      if (!confirm(confirmation)) return;

      try {
        if (scheduledAt) {
          await callNurseLineApi('/api/notices/schedule', {
            title,
            content,
            scheduledAt,
            appUrl: 'https://testpreparation.github.io/Test-prep-workbook/?openExternalBrowser=1'
          });
        } else {
          await callNurseLineApi('/api/generate-notice', { content: fullContent });
        }
        await db.ref('notices').push(noticeData);
        recordAdminOperation('お知らせ投稿', scheduledAt ? 'LINE配信予約：' + new Date(scheduledAt).toLocaleString('ja-JP') : '即時配信');

        alert(scheduledAt
          ? `お知らせを投稿しました。LINE配信は ${new Date(scheduledAt).toLocaleString('ja-JP')} に予約しました。`
          : "お知らせを投稿し、LINEへ送信しました。");
        titleInput.value = '';
        contentInput.value = '';
        clearNoticeSchedule('admin-notice');
      } catch (err) {
        console.error("お知らせの送信に失敗しました:", err);
        alert(err.message || "お知らせの送信に失敗しました。");
      }
    }

    function deleteAdminNotice(noticeId) {
      if (!confirm("このお知らせを消去しますか？")) return;

      db.ref(`notices/${noticeId}`).remove().then(() => {
        alert("お知らせを削除しました。");
      }).catch(err => {
        console.error("お知らせの削除に失敗しました:", err);
        alert("削除に失敗しました。");
      });
    }

    // ---------------------------------------------------------
    // データ形式の自動補正ヘルパー
    // ---------------------------------------------------------
    function normalizeQuestion(item) {
      if (!item) return null;

      const qText = item.q || item.question || item.title || item.text || "問題文がありません";

      let opts = item.options || item.opts || item.choices || item.answers || [];
      if (!Array.isArray(opts)) {
        opts = [];
      }

      let correctAnswers = [];
      const rawAns = item.correctAnswers !== undefined ? item.correctAnswers : (item.answers !== undefined ? item.answers : (item.answer !== undefined ? item.answer : (item.correct !== undefined ? item.correct : (item.ans !== undefined ? item.ans : item.correctIndex))));
     
      if (Array.isArray(rawAns)) {
        if (rawAns.length > 0 && typeof rawAns[0] === 'string' && opts.length > 0) {
          correctAnswers = rawAns.map(ansText => opts.indexOf(ansText)).filter(idx => idx !== -1);
          if (correctAnswers.length === 0) {
            correctAnswers = rawAns.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
          }
        } else {
          correctAnswers = rawAns.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
        }
      } else if (typeof rawAns === 'number') {
        correctAnswers = [rawAns];
      } else if (typeof rawAns === 'string') {
        const parsed = parseInt(rawAns, 10);
        if (!isNaN(parsed)) {
          correctAnswers = [parsed];
        } else if (opts.length > 0) {
          const foundIdx = opts.indexOf(rawAns);
          if (foundIdx !== -1) correctAnswers = [foundIdx];
        }
      }

      let wordBoxData = item.wordBox || item.wordGroup || item.words || null;
      let imgData = item.image || item.img || null;

      const expText = item.exp || item.explanation || item.desc || item.detail || "解説はありません。";

      return {
        ...item,
        id: item.id || `q_${Math.random().toString(36).substring(2, 9)}`,
        q: qText,
        options: opts,
        answers: correctAnswers,
        image: imgData,
        wordBox: wordBoxData,
        isMultiple: correctAnswers.length > 1,
        exp: expText,
        enableKeyboard: !!item.enableKeyboard,
        keyword: item.keyword || (typeof rawAns === 'string' && isNaN(parseInt(rawAns, 10)) ? rawAns : "")
      };
    }

    const defaultSubjects = [
      { id: "psychology", name: "心理学", code: "PSY", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: true, hasRounds: true, fixedCount: null },
      { id: "mind_behavior", name: "こころと行動", code: "MND", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: true, hasRounds: false, fixedCount: null },
      { id: "medical_intro", name: "医療概論", code: "MED", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "physiology", name: "生理学", code: "PHY", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, hasPhysiologyModes: true, fixedCount: null },
      { id: "biochemistry", name: "生化学", code: "BIO", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, hasBiochemistryFormats: true, fixedCount: null },
      { id: "microbiology", name: "微生物学", code: "MIC", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: true, hasRounds: false, fixedCount: null },
      { id: "anatomy", name: "解剖学", code: "ANA", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, hasAnatomyModes: true, fixedCount: null },
      { id: "nursing_method", name: "看護学方法論Ⅰ", code: "NUR Ⅰ", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: true, hasRounds: false, hasNursingModes: true, fixedCount: null },
      { id: "public_health_nursing", name: "公衆衛生看護学概論", code: "PHN", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, hasPHNModes: true, fixedCount: null },
      { id: "public_health", name: "公衆衛生学", code: "PUB", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, hasPublicHealthModes: true, fixedCount: null },
      { id: "nutrition", name: "栄養学", code: "NUT", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "pathology", name: "病理学", code: "PAT", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "medical_welfare", name: "医療福祉概論", code: "MWL", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "constitution", name: "日本国憲法", code: "CON", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "pharmacology", name: "薬理学", code: "PHA", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "statistics", name: "統計学", code: "STA", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "nursing_method_3", name: "看護学方法論Ⅲ", code: "NUR Ⅲ", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null },
      { id: "nursing_method_4", name: "看護学方法論Ⅳ", code: "NUR Ⅳ", visible: true, flashcardVisible: true, semesterSetting: "all", status: "available", isFixed: false, hasRounds: false, fixedCount: null }
    ];

    let subjects = [...defaultSubjects];
    let currentSubject = null;
    let currentSemester = null;
    let currentRound = null;
    let currentPhysiologyMode = 'past';
    let currentAnatomyMode = 'basic';
    let currentPublicHealthMode = 'past';
    let currentPHNMode = 'basic';
    let currentNursingMode = 'rounds';
    let currentPharmacologyMode = 'exercise';
    let currentPathologyMode = 'exercise';
    let currentPathologyRound = null;
    let currentNursingMethod3Mode = 'practice';
    let currentNutritionMode = 'exercise';
    let currentBiochemistryFormat = 'choice';
    let activeQuestions = [];
    let currentQIndex = 0;
    let score = 0;
    let isAnswered = false;
    let prioritizeWeakQuestions = false;
    let selectedIndices = new Set();
    let dragulaInstance = null;

    let quizTimer = null;
    let studySessionStartedAt = 0;
    let timeLeft = 30;
    let QUIZ_LIMIT_TIME = 30;

    let currentRoomCode = null;
    let isHost = false;
    let roomRef = null;
    let roomData = null;

    let editingSubjectId = null;
    let editingCategory = 'quiz'; // 'quiz' か 'flashcard'
    let editingQuestionsList = [];
    let editingSelectedRound = 'choice';

    // ---------------------------------------------------------
    //  暗記カード専用 状態変数 & ステップ遷移
    // ---------------------------------------------------------
    let currentSubjectPageIndex = 0;
    let flashcardAllList = [];         // 該当科目の全専用カード
    let flashcardUnlearnedList = [];   // 未学習＆表示設定のカードのみ
    let flashcardCurrentIndex = 0;
    let isFlashcardFlipped = false;
    let currentFlashcardSubject = null;
    let flashcardMode = 0;             // 0: [表:単語 / 裏:意味], 1: [表:意味 / 裏:単語]
    let flashcardSubjectLocked = false;

    function getAverageAccuracy(subjectId) {
      const historyKey = `history_accuracy_${subjectId}`;
      const records = JSON.parse(localStorage.getItem(historyKey) || '[]');
      if (!records || records.length === 0) return null;
      const sum = records.reduce((acc, curr) => acc + curr, 0);
      return Math.round(sum / records.length);
    }

    // =========================================================
    //  スライドページ切り替え機能
    // =========================================================
    function switchSubjectPage(pageIdx) {
      currentSubjectPageIndex = pageIdx;
      const track = document.getElementById('subjects-slider-track');
      const dot1 = document.getElementById('dot-page-1');
      const dot2 = document.getElementById('dot-page-2');

      if (track) {
        track.style.transform = `translateX(-${pageIdx * 50}%)`;
      }

      if (pageIdx === 0) {
        dot1.className = "w-2.5 h-2.5 rounded-full bg-amber-500 transition-all duration-300";
        dot2.className = "w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-all duration-300";
      } else {
        dot1.className = "w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-all duration-300";
        dot2.className = "w-2.5 h-2.5 rounded-full bg-amber-500 transition-all duration-300";
        backToFlashcardStep(1);
      }
    }

    function initSubjectPageSwipe() {
      const screenEl = document.getElementById('screen-subjects');
      if (!screenEl) return;

      let startX = 0;
      let startY = 0;
      let isDragging = false;

      screenEl.addEventListener('touchstart', (e) => {
        if (screenEl.classList.contains('hidden')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
      }, { passive: true });

      screenEl.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        if (screenEl.classList.contains('hidden')) { isDragging = false; return; }
        if (flashcardSubjectLocked) { isDragging = false; return; }
        isDragging = false;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
          if (diffX < 0 && currentSubjectPageIndex === 0) {
            switchSubjectPage(1);
          } else if (diffX > 0 && currentSubjectPageIndex === 1) {
            switchSubjectPage(0);
          }
        }
      }, { passive: true });
    }

    // ---------------------------------------------------------
    //  暗記カード専用データ取得 (専用外部ファイル flashcard_data.js または biochemistry_flashcard_data.js から読み込み)
    // ---------------------------------------------------------
    function fetchFlashcardDataForSubject(subjectId) {
      if (subjectId === 'nutrition' && (!window.FLASHCARD_DB || !Array.isArray(window.FLASHCARD_DB.nutrition) || window.FLASHCARD_DB.nutrition.length === 0) && Array.isArray(window.NUTRITION_FLASHCARD_DATA) && window.NUTRITION_FLASHCARD_DATA.length > 0) {
        return window.NUTRITION_FLASHCARD_DATA;
      }
      if (subjectId === 'biochemistry' && typeof window.getBiochemistryFlashcardQuestions === 'function') {
        const bioFC = window.getBiochemistryFlashcardQuestions();
        if (Array.isArray(bioFC) && bioFC.length > 0) {
          return bioFC;
        }
      }
      if (subjectId === 'nutrition' && typeof window.getNutritionFlashcardQuestions === 'function') {
        const nutritionFC = window.getNutritionFlashcardQuestions();
        if (Array.isArray(nutritionFC) && nutritionFC.length > 0) {
          return nutritionFC;
        }
      }
      if (window.FLASHCARD_DB && Array.isArray(window.FLASHCARD_DB[subjectId]) && window.FLASHCARD_DB[subjectId].length > 0) {
        return window.FLASHCARD_DB[subjectId];
      }
      return [];
    }

    // ---------------------------------------------------------
    //  2ページ目: 暗記カード ステッピング構造・画面遷移制御
    // ---------------------------------------------------------
    
    function backToFlashcardStep(stepNum) {
      document.getElementById('fc-step-1-subject-select').classList.add('hidden');
      document.getElementById('fc-step-2-dashboard').classList.add('hidden');
      document.getElementById('fc-step-3-time').classList.add('hidden');
      document.getElementById('fc-step-3-count').classList.add('hidden');
      
      const step4 = document.getElementById('fc-step-4-play');
      step4.classList.add('hidden');
      step4.classList.remove('flex');

      if (stepNum === 1) {
        flashcardSubjectLocked = false;
        const dots = document.getElementById('subject-page-dots');
        if (dots) dots.classList.remove('hidden');
        document.getElementById('fc-step-1-subject-select').classList.remove('hidden');
        renderFlashcardSubjectList();
      } else if (stepNum === 2) {
        document.getElementById('fc-step-2-dashboard').classList.remove('hidden');
        updateFlashcardDashboardUI();
      }
    }

    function renderFlashcardSubjectList() {
      const container = document.getElementById('flashcard-subject-list-container');
      if (!container) return;

      const visibleSubjects = subjects.filter(s => s.status !== 'preparing' && s.visible !== false && s.flashcardVisible !== false);
      
      if (visibleSubjects.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-xs text-slate-500">利用可能な暗記カード科目がありません。</div>`;
        return;
      }

      container.innerHTML = visibleSubjects.map(s => {
        const fcData = fetchFlashcardDataForSubject(s.id).filter(item => item.visible !== false);
        const learnedSet = getLearnedWordsSet(s.id);
        const totalCount = fcData.length;
        const learnedCount = Math.min(learnedSet.size, totalCount);
        const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

        return `
          <button onclick="selectFlashcardSubject('${s.id}')" class="card-item w-full p-3.5 rounded-xl text-left flex items-center justify-between group">
            <div class="flex items-center gap-3">
              <span class="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold">${s.code}</span>
              <div>
                <div class="text-xs font-medium text-slate-100 group-hover:text-amber-300 transition">${s.name}</div>
                <div class="text-[10px] text-slate-400 font-light mt-0.5">全${totalCount}単語 (達成率: ${progressPercent}%)</div>
              </div>
            </div>
            <span class="text-amber-500/80 group-hover:text-amber-400 transition text-xs font-medium">選択 →</span>
          </button>
        `;
      }).join('');
    }

    function selectFlashcardSubject(subjectId) {
      flashcardSubjectLocked = true;
      const dots = document.getElementById('subject-page-dots');
      if (dots) dots.classList.add('hidden');
      currentFlashcardSubject = subjects.find(s => s.id === subjectId);
      if (!currentFlashcardSubject) return;

      loadFlashcardData();
      backToFlashcardStep(2);
    }

    function getLearnedStorageKey(subjectId) {
      return `flashcard_learned_${subjectId}`;
    }

    function getLearnedWordsSet(subjectId) {
      const raw = localStorage.getItem(getLearnedStorageKey(subjectId));
      return new Set(raw ? JSON.parse(raw) : []);
    }

    function saveLearnedWordsSet(subjectId, setObj) {
      localStorage.setItem(getLearnedStorageKey(subjectId), JSON.stringify(Array.from(setObj)));
    }

    function loadFlashcardData() {
      if (!currentFlashcardSubject) return;
      const subId = currentFlashcardSubject.id;

      const rawFcData = fetchFlashcardDataForSubject(subId);

      flashcardAllList = rawFcData.map((item, i) => ({
        id: item.id || `card_${i}_${(item.word || '').substring(0, 8)}`,
        word: item.word || "単語",
        meaning: item.meaning || "意味",
        exp: item.exp || "解説はありません。",
        visible: item.visible !== false
      }));

      const learnedSet = getLearnedWordsSet(subId);
      flashcardUnlearnedList = flashcardAllList.filter(item => item.visible !== false && !learnedSet.has(item.id));
    }

    function updateFlashcardDashboardUI() {
      if (!currentFlashcardSubject) return;

      document.getElementById('fc-dash-subject-title').textContent = currentFlashcardSubject.name;

      const validList = flashcardAllList.filter(item => item.visible !== false);
      const total = validList.length;
      const learnedSet = getLearnedWordsSet(currentFlashcardSubject.id);
      const learnedCount = Math.min(learnedSet.size, total);
      const progressPercent = total > 0 ? Math.round((learnedCount / total) * 100) : 0;

      document.getElementById('fc-dash-learned-count').textContent = learnedCount;
      document.getElementById('fc-dash-total-count').textContent = total;
      document.getElementById('fc-dash-progress-percent').textContent = `${progressPercent}%`;
      document.getElementById('fc-dash-progress-bar').style.width = `${progressPercent}%`;

      // 問題がない場合の警告表示 ＆ 設定進出ボタンの有効/無効制御
      const goBtn = document.getElementById('fc-go-step3-btn');
      const warningEl = document.getElementById('fc-no-questions-warning');

      if (total === 0) {
        if (goBtn) goBtn.disabled = true;
        if (warningEl) warningEl.classList.remove('hidden');
      } else {
        if (goBtn) goBtn.disabled = false;
        if (warningEl) warningEl.classList.add('hidden');
      }

      // スイッチ状態同期
      const toggleSwitch = document.getElementById('fc-mode-toggle-switch');
      if (toggleSwitch) {
        toggleSwitch.checked = (flashcardMode === 1);
      }
      updateToggleLabelUI(flashcardMode);
    }

    function toggleFlashcardModeSwitch(isChecked) {
      flashcardMode = isChecked ? 1 : 0;
      updateToggleLabelUI(flashcardMode);
    }

    function updateToggleLabelUI(mode) {
      const titleEl = document.getElementById('fc-toggle-status-title');
      if (!titleEl) return;
      if (mode === 0) {
        titleEl.textContent = "表: 単語 → 裏: 意味";
        titleEl.className = "text-xs font-bold text-slate-200";
      } else {
        titleEl.textContent = "表: 意味 → 裏: 単語";
        titleEl.className = "text-xs font-bold text-amber-400";
      }
    }

    // ステップ3-A（目標秒数選択画面）へ遷移
    function goToFlashcardTimeSetting() {
      const validList = flashcardAllList.filter(item => item.visible !== false);
      if (validList.length === 0) {
        alert("この科目には暗記カードが登録されていません。");
        return;
      }

      document.getElementById('fc-step-2-dashboard').classList.add('hidden');
      document.getElementById('fc-step-3-count').classList.add('hidden');
      document.getElementById('fc-step-3-time').classList.remove('hidden');
      document.getElementById('fc-time-subject-title').textContent = `${currentFlashcardSubject.name} - 秒数設定`;
    }

    // ステップ3-B（枚数選択画面）へ遷移
    function goToFlashcardCountSetting() {
      document.getElementById('fc-step-3-time').classList.add('hidden');
      document.getElementById('fc-step-3-count').classList.remove('hidden');
      document.getElementById('fc-count-subject-title').textContent = `${currentFlashcardSubject.name} - 枚数設定`;
    }

    function startFlashcardPlay() {
      const validList = flashcardAllList.filter(item => item.visible !== false);
      if (validList.length === 0) {
        alert("この科目には暗記カードが登録されていません。");
        backToFlashcardStep(2);
        return;
      }

      document.getElementById('fc-step-3-count').classList.add('hidden');
      const playStep = document.getElementById('fc-step-4-play');
      playStep.classList.remove('hidden');
      playStep.classList.add('flex');

      const reqCount = parseInt(document.getElementById('fc-count-slider').value, 10) || 10;
      
      let list = [...flashcardUnlearnedList];
      if (list.length === 0) {
        const shouldReset = confirm(`「${currentFlashcardSubject.name}」はすべての単語を覚えています。記憶状態をリセットして、もう一度学習しますか？`);
        if (!shouldReset) {
          document.getElementById('fc-step-4-play').classList.add('hidden');
          document.getElementById('fc-step-4-play').classList.remove('flex');
          document.getElementById('fc-step-3-count').classList.remove('hidden');
          return;
        }
        localStorage.removeItem(getLearnedStorageKey(currentFlashcardSubject.id));
        loadFlashcardData();
        list = [...flashcardUnlearnedList];
      }

      const countToTake = Math.min(reqCount, list.length);
      list = list.sort(() => Math.random() - 0.5).slice(0, countToTake);
      flashcardUnlearnedList = list;

      flashcardCurrentIndex = 0;
      isFlashcardFlipped = false;

      renderFlashcardUI();
    }

    function renderFlashcardUI() {
      const cardEl = document.getElementById('flashcard-card');
      const qText = document.getElementById('flashcard-question-text');
      const aText = document.getElementById('flashcard-answer-text');
      const expText = document.getElementById('flashcard-exp-text');
      const progressNum = document.getElementById('flashcard-progress-num');

      const frontLabel = document.getElementById('fc-front-label');
      const backLabel = document.getElementById('fc-back-label');

      if (cardEl) {
        cardEl.classList.remove('rotate-y-180');
        isFlashcardFlipped = false;
      }

      const cardContainer = document.querySelector('#fc-step-4-play .perspective-1000');
      const buttons = document.getElementById('fc-action-buttons');
      const completedMsg = document.getElementById('fc-completed-msg');

      if (!flashcardUnlearnedList || flashcardUnlearnedList.length === 0) {
        if (cardContainer) cardContainer.classList.add('hidden');
        if (buttons) buttons.classList.add('hidden');
        if (completedMsg) completedMsg.classList.remove('hidden');
        return;
      } else {
        if (cardContainer) cardContainer.classList.remove('hidden');
        if (buttons) buttons.classList.remove('hidden');
        if (completedMsg) completedMsg.classList.add('hidden');
      }

      const item = flashcardUnlearnedList[flashcardCurrentIndex];
      if (!item) return;

      if (progressNum) {
        progressNum.textContent = `${flashcardCurrentIndex + 1} / ${flashcardUnlearnedList.length}`;
      }

      const wordStr = item.word || "単語";
      const meaningStr = item.meaning || "意味";
      const expStr = item.exp || "解説はありません。";

      if (flashcardMode === 0) {
        if (frontLabel) frontLabel.textContent = "WORD";
        if (backLabel) backLabel.textContent = "MEANING";

        if (qText) qText.textContent = wordStr;
        if (aText) aText.textContent = meaningStr;
        if (expText) expText.textContent = expStr;
      } else {
        if (frontLabel) frontLabel.textContent = "MEANING";
        if (backLabel) backLabel.textContent = "WORD";

        if (qText) qText.textContent = meaningStr;
        if (aText) aText.textContent = wordStr;
        if (expText) expText.textContent = expStr;
      }
    }

    function flipFlashcard() {
      const cardEl = document.getElementById('flashcard-card');
      if (!cardEl || flashcardUnlearnedList.length === 0) return;

      isFlashcardFlipped = !isFlashcardFlipped;
      if (isFlashcardFlipped) {
        cardEl.classList.add('rotate-y-180');
      } else {
        cardEl.classList.remove('rotate-y-180');
      }
    }

    function markCurrentCardLearned() {
      if (!currentFlashcardSubject || flashcardUnlearnedList.length === 0) return;

      const currentCard = flashcardUnlearnedList[flashcardCurrentIndex];
      if (!currentCard) return;

      const subId = currentFlashcardSubject.id;
      const learnedSet = getLearnedWordsSet(subId);
      learnedSet.add(currentCard.id);
      saveLearnedWordsSet(subId, learnedSet);

      nextFlashcard();
    }

    function nextFlashcard() {
      if (flashcardUnlearnedList.length === 0) return;
      if (flashcardCurrentIndex + 1 >= flashcardUnlearnedList.length) {
        const cardContainer = document.querySelector('#fc-step-4-play .perspective-1000');
        const buttons = document.getElementById('fc-action-buttons');
        const completedMsg = document.getElementById('fc-completed-msg');
        if (cardContainer) cardContainer.classList.add('hidden');
        if (buttons) buttons.classList.add('hidden');
        if (completedMsg) completedMsg.classList.remove('hidden');
        return;
      }
      flashcardCurrentIndex = flashcardCurrentIndex + 1;
      renderFlashcardUI();
    }

    function resetLearnedWordsForCurrentSubject() {
      if (!currentFlashcardSubject) return;
      if (confirm(`科目「${currentFlashcardSubject.name}」の記憶状態をリセットしますか？`)) {
        localStorage.removeItem(getLearnedStorageKey(currentFlashcardSubject.id));
        loadFlashcardData();
        updateFlashcardDashboardUI();
        alert("記憶状態をリセットしました。");
      }
    }

    function openLearnedWordsModal() {
      if (!currentFlashcardSubject) return;

      const subId = currentFlashcardSubject.id;
      const learnedSet = getLearnedWordsSet(subId);
      const learnedList = flashcardAllList.filter(item => learnedSet.has(item.id));

      const container = document.getElementById('learned-words-list-container');
      
      if (learnedList.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-500">まだ覚えた単語はありません。「覚えた！」ボタンを押すと一覧に追加されます。</div>`;
      } else {
        container.innerHTML = learnedList.map(item => `
          <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-2">
            <div class="space-y-0.5 overflow-hidden">
              <div class="font-bold text-amber-400 text-xs truncate">${item.word}</div>
              <div class="text-[11px] text-slate-300 font-light truncate">${item.meaning}</div>
            </div>
            <button onclick="unmarkLearnedWord('${item.id}')" class="px-2 py-1 bg-slate-800 hover:bg-rose-900 text-rose-300 border border-slate-700 rounded text-[10px] shrink-0 transition">
              未修得に戻す
            </button>
          </div>
        `).join('');
      }

      document.getElementById('modal-learned-words').classList.remove('hidden');
    }

    function unmarkLearnedWord(cardId) {
      if (!currentFlashcardSubject) return;
      const subId = currentFlashcardSubject.id;
      const learnedSet = getLearnedWordsSet(subId);
      learnedSet.delete(cardId);
      saveLearnedWordsSet(subId, learnedSet);

      openLearnedWordsModal();
      loadFlashcardData();
      updateFlashcardDashboardUI();
    }

    function closeLearnedWordsModal() {
      document.getElementById('modal-learned-words').classList.add('hidden');
    }

    // =========================================================
    //  管理者モーダル制御機能
    // =========================================================
    function openAdminAuthFromSettings() {
      closeUserSettings();
      closeNavDrawer();
      openAuthModal();
    }

    function openAuthModal() {
      const modal = document.getElementById('modal-auth');
      const input = document.getElementById('admin-password-input');
      const errorMessage = document.getElementById('auth-error-msg');
      if (!modal || !input || !errorMessage) return;
      modal.classList.remove('hidden');
      input.value = '';
      errorMessage.textContent = '';
      errorMessage.classList.add('hidden');
      window.setTimeout(() => input.focus(), 50);
    }

    function closeAuthModal() {
      const modal = document.getElementById('modal-auth');
      if (modal) modal.classList.add('hidden');
    }

    async function submitPassword() {
      const input = document.getElementById('admin-password-input');
      const errorMessage = document.getElementById('auth-error-msg');
      const submitButton = document.getElementById('admin-auth-submit');
      if (!input || !errorMessage || !submitButton || submitButton.disabled) return;
      const pwd = input.value;
      if (!pwd) {
        errorMessage.textContent = 'パスワードを入力してください。';
        errorMessage.classList.remove('hidden');
        input.focus();
        return;
      }
      submitButton.disabled = true;
      submitButton.textContent = '認証中…';
      errorMessage.classList.add('hidden');
      const authController = new AbortController();
      const authTimeout = setTimeout(() => authController.abort(), 60000);
      try {
        const apiBase = NURSE_LINE_API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(apiBase + '/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
          signal: authController.signal
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.token !== 'string' || !result.token) {
          errorMessage.textContent = result.message || ('認証に失敗しました（HTTP ' + response.status + '）。');
          errorMessage.classList.remove('hidden');
          return;
        }
        sessionStorage.setItem('nurse_line_admin_session', result.token);
        closeAuthModal();
        openAdminModal();
      } catch (err) {
        console.error('管理者認証に失敗しました:', err);
        errorMessage.textContent = err && err.name === 'AbortError'
          ? '認証サーバーから60秒以内に応答がありませんでした。少し待ってから再度お試しください。'
          : 'サーバーに接続できません。接続先またはサーバーの状態を確認してください。';
        errorMessage.classList.remove('hidden');
      } finally {
        clearTimeout(authTimeout);
        submitButton.disabled = false;
        submitButton.textContent = '認証する';
      }
    }

    const ADMIN_OPERATION_LOG_KEY = 'nurse_plus_admin_operation_log_v1';

    function getAdminOperationLog() {
      try {
        const value = JSON.parse(localStorage.getItem(ADMIN_OPERATION_LOG_KEY) || '[]');
        return Array.isArray(value) ? value : [];
      } catch (_) { return []; }
    }

    function recordAdminOperation(action, detail) {
      try {
        const log = getAdminOperationLog();
        log.unshift({ timestamp: new Date().toLocaleString('ja-JP'), action: String(action || '管理操作'), detail: String(detail || '') });
        localStorage.setItem(ADMIN_OPERATION_LOG_KEY, JSON.stringify(log.slice(0, 50)));
        renderAdminOperationLog();
      } catch (error) { console.warn('管理者操作履歴を保存できませんでした。', error); }
    }

    function renderAdminOperationLog() {
      const container = document.getElementById('admin-operation-log');
      if (!container) return;
      const entries = getAdminOperationLog();
      container.replaceChildren();
      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'text-[11px] text-slate-500 text-center py-3';
        empty.textContent = '履歴はまだありません。';
        container.appendChild(empty);
        return;
      }
      entries.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'rounded-lg border border-slate-800 bg-slate-950/60 p-2.5';
        const time = document.createElement('div');
        time.className = 'text-[9px] text-slate-500';
        time.textContent = entry.timestamp || '';
        const action = document.createElement('div');
        action.className = 'mt-1 text-[11px] font-semibold text-slate-200';
        action.textContent = entry.action || '管理操作';
        const detail = document.createElement('div');
        detail.className = 'mt-0.5 text-[10px] text-slate-400 break-words';
        detail.textContent = entry.detail || '';
        row.append(time, action, detail);
        container.appendChild(row);
      });
    }

    function clearAdminOperationLog() {
      if (!confirm('この端末に保存された管理者操作履歴を消去しますか？')) return;
      localStorage.removeItem(ADMIN_OPERATION_LOG_KEY);
      renderAdminOperationLog();
    }

    function openAdminModal() {
      const modal = document.getElementById('modal-admin');
      if (!modal) {
        console.error('管理者メニューの表示先 (#modal-admin) が見つかりません。');
        return;
      }
      modal.classList.remove('hidden');
      try { renderAdminDragList(); }
      catch (err) { console.error('管理者メニューの初期表示に失敗しました:', err); }
      renderAdminOperationLog();
      loadLineSendMode();
      loadSupportMessages();
    }

    function closeAdminModal() {
      document.getElementById('modal-admin').classList.add('hidden');
    }

    function saveSubjectsToStorage() {
      db.ref('subjects').set(subjects);
    }

    // 管理者メニュー一覧レンダリング
    function renderAdminDragList() {
      const container = document.getElementById('admin-drag-container');
      if (!container) return;

      container.innerHTML = subjects.map((s, idx) => {
        const semSetting = s.semesterSetting || 'all';
        const isFcVisible = (s.flashcardVisible !== false);

        return `
        <div data-id="${s.id}" class="drag-item p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="drag-handle cursor-grab active:cursor-grabbing text-slate-500 hover:text-amber-400 text-base">☰</span>
            <span class="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">${s.code}</span>
            <span class="text-xs font-medium text-slate-200">${s.name}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select onchange="updateSubjectSemesterSetting(${idx}, this.value)" class="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500">
              <option value="all" ${semSetting === 'all' ? 'selected' : ''}>学期: 両方</option>
              <option value="spring" ${semSetting === 'spring' ? 'selected' : ''}>学期: 春のみ</option>
              <option value="autumn" ${semSetting === 'autumn' ? 'selected' : ''}>学期: 秋のみ</option>
            </select>

            <!-- 演習問題 表示/非表示切替 -->
            <button onclick="toggleSubjectVisibility(${idx})" class="px-2.5 py-1 ${s.visible !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'} border rounded-lg text-[11px] transition">
              ${s.visible !== false ? '演習: 表示' : '演習: 非表示'}
            </button>

            <!-- 暗記カード 表示/非表示切替 -->
            <button onclick="toggleSubjectFlashcardVisibilityDirect(${idx})" class="px-2.5 py-1 ${isFcVisible ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'} border rounded-lg text-[11px] transition">
              ${isFcVisible ? '暗記: 表示' : '暗記: 非表示'}
            </button>

            <button onclick="openQuestionsEditorModal('${s.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] transition">
              編集
            </button>
            <button onclick="deleteSubject(${idx})" class="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg text-[11px] transition">
              削除
            </button>
          </div>
        </div>
      `;
      }).join('');

      if (dragulaInstance) dragulaInstance.destroy();
      dragulaInstance = dragula([container], {
        moves: (el, container, handle) => handle.classList.contains('drag-handle')
      });

      dragulaInstance.on('drop', () => {
        const newOrderIds = Array.from(container.children).map(child => child.getAttribute('data-id'));
        subjects.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
        saveSubjectsToStorage();
        recordAdminOperation('科目の並び替え', '科目一覧の表示順を変更');
      });
    }

    function updateSubjectSemesterSetting(idx, value) {
      subjects[idx].semesterSetting = value;
      saveSubjectsToStorage();
      recordAdminOperation('科目の学期設定', (subjects[idx].name || subjects[idx].id) + '：' + ({all:'春・秋',spring:'春のみ',autumn:'秋のみ'}[value] || value));
    }

    function toggleSubjectVisibility(idx) {
      subjects[idx].visible = !(subjects[idx].visible !== false);
      saveSubjectsToStorage();
      recordAdminOperation('演習表示設定', (subjects[idx].name || subjects[idx].id) + '：' + (subjects[idx].visible !== false ? '表示' : '非表示'));
      renderAdminDragList();
    }

    // 管理者一覧からの直接 暗記カード表示非表示切り替え
    function toggleSubjectFlashcardVisibilityDirect(idx) {
      subjects[idx].flashcardVisible = !(subjects[idx].flashcardVisible !== false);
      saveSubjectsToStorage();
      recordAdminOperation('暗記カード表示設定', (subjects[idx].name || subjects[idx].id) + '：' + (subjects[idx].flashcardVisible !== false ? '表示' : '非表示'));
      renderAdminDragList();
      renderFlashcardSubjectList();
    }

    function deleteSubject(idx) {
      const targetSubject = subjects[idx];
      if (!targetSubject) return;

      if (confirm(`科目「${targetSubject.name}」を削除しますか？\n（問題データおよび履歴も削除されます）`)) {
        const subId = targetSubject.id;
        subjects.splice(idx, 1);
        saveSubjectsToStorage();
        recordAdminOperation('科目削除', targetSubject.name || targetSubject.id);

        db.ref(`quiz_db/${subId}`).remove();
        db.ref(`flashcard_db/${subId}`).remove();
        if (window.QUIZ_DB[subId]) delete window.QUIZ_DB[subId];
        if (window.FLASHCARD_DB[subId]) delete window.FLASHCARD_DB[subId];

        renderAdminDragList();
        renderSubjectList();
      }
    }

    function addNewSubject() {
      const nameInput = document.getElementById('new-subject-name');
      const codeInput = document.getElementById('new-subject-code');

      const name = nameInput.value.trim();
      const code = codeInput.value.trim().toUpperCase();

      if (!name || !code) {
        alert("科目名とコードを入力してください。");
        return;
      }

      const id = "sub_" + Date.now();
      subjects.push({
        id: id,
        name: name,
        code: code,
        visible: true,
        flashcardVisible: true,
        semesterSetting: "all",
        status: "available",
        isFixed: false,
        hasRounds: false,
        fixedCount: null
      });

      window.QUIZ_DB[id] = [];
      window.FLASHCARD_DB[id] = [];
      saveSubjectsToStorage();

      nameInput.value = '';
      codeInput.value = '';
      renderAdminDragList();
      alert(`科目「${name}」を追加しました。`);
    }

    function resetAllDataToDefault() {
      if (confirm("全ての科目の平均正答率履歴データを削除しますか？")) {
        // 科目別・モード別の履歴と日別推移をまとめて削除する。
        // 学習セッションや週間・月間レポートの記録は、この操作では削除しない。
        subjects.forEach(s => {
          if (!s || !s.id) return;
          const exactKey = `history_accuracy_${s.id}`;
          localStorage.removeItem(exactKey);
          const modePrefix = `history_accuracy_${s.id}_`;
          const dailyPrefix = `history_accuracy_daily_${s.id}_`;
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(modePrefix) || key.startsWith(dailyPrefix))) keysToRemove.push(key);
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        });
        alert("平均正答率データをリセットしました。");
        renderSubjectList();
      }
    }

    // ---------------------------------------------------------
    // 管理者用：演習問題 ＆ 暗記カード 専用編集機能
    // ---------------------------------------------------------
    function toggleAiGeneratorPanel() {
      const panel = document.getElementById('ai-generator-panel');
      const icon = document.getElementById('ai-panel-toggle-icon');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        icon.textContent = '▲ 閉じる';
      } else {
        panel.classList.add('hidden');
        icon.textContent = '▼ 開発';
      }
    }

    // ★ Gemini AIによる問題生成機能（構造化出力 responseSchema を適用し、確実に動作するよう改修）
    async function generateQuestionWithGemini() {
      const imgInput = document.getElementById('ai-input-image');
      const textInput = document.getElementById('ai-input-text');
      const countSelect = document.getElementById('ai-generate-count-select');
      const btn = document.getElementById('ai-generate-btn');
      const loading = document.getElementById('ai-generate-loading');

      const text = textInput ? textInput.value.trim() : '';
      const file = imgInput && imgInput.files && imgInput.files[0];
      const count = parseInt(countSelect ? countSelect.value : "1", 10) || 1;

      if (!file && !text) {
        alert("画像を選択するか、テキスト指示を入力してください。");
        return;
      }

      btn.disabled = true;
      btn.classList.add('opacity-50');
      loading.classList.remove('hidden');

      try {
        let contentsParts = [];
        let base64Img = "";

        if (file) {
          base64Img = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64Data = base64Img.split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          contentsParts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        }

        const isKeyboardMode = (editingSubjectId === 'biochemistry' && editingSelectedRound === 'keyboard');

        let responseSchema;
        if (isKeyboardMode) {
          responseSchema = {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                keyword: { type: "STRING" },
                exp: { type: "STRING" }
              },
              required: ["q", "keyword", "exp"]
            }
          };
        } else {
          responseSchema = {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                q: { type: "STRING" },
                options: {
                  type: "ARRAY",
                  items: { type: "STRING" }
                },
                answers: {
                  type: "ARRAY",
                  items: { type: "INTEGER" }
                },
                exp: { type: "STRING" }
              },
              required: ["q", "options", "answers", "exp"]
            }
          };
        }

        const promptText = isKeyboardMode 
          ? `提示された画像またはテキストの内容から、記述式（キーボード入力用）問題を【 ${count} 問 】生成してください。補足: ${text || "重要ポイントから作成してください。"}`
          : `提示された画像またはテキストの内容から、四肢択一問題を【 ${count} 問 】生成してください。補足: ${text || "重要ポイントから作成してください。"}`;

        contentsParts.push({ text: promptText });

        const requestBody = {
          contents: [{ parts: contentsParts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`APIエラー (Status ${response.status})`);
        }

        const data = await response.json();
        const resText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!resText) {
          throw new Error("AIから有効な応答を受信できませんでした。");
        }

        let cleanJsonStr = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = cleanJsonStr.indexOf('[');
        const endIdx = cleanJsonStr.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
          cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
        }

        let questionsArray;
        try {
          questionsArray = JSON.parse(cleanJsonStr);
        } catch (parseErr) {
          console.error("Parse Error JSON Text:", resText);
          throw new Error("AI応答のJSON解析に失敗しました。");
        }

        if (!Array.isArray(questionsArray)) {
          questionsArray = [questionsArray];
        }

        let addedCount = 0;
        questionsArray.forEach(parsedQ => {
          if (!parsedQ || !parsedQ.q) return;

          if (isKeyboardMode) {
            editingQuestionsList.unshift({
              q: parsedQ.q,
              keyword: parsedQ.keyword || "",
              exp: parsedQ.exp || "AIによって生成された記述問題です。",
              image: base64Img || "",
              enableKeyboard: true,
              options: [],
              answers: [],
              round: editingSelectedRound || null
            });
          } else {
            editingQuestionsList.unshift({
              q: parsedQ.q,
              options: Array.isArray(parsedQ.options) ? parsedQ.options : ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
              answers: Array.isArray(parsedQ.answers) ? parsedQ.answers : [0],
              exp: parsedQ.exp || "AIによって生成された問題です。",
              image: base64Img || "",
              enableKeyboard: false,
              round: editingSelectedRound || null
            });
          }
          addedCount++;
        });

        renderEditorQuestionsList();
        alert(`✨ Gemini AIが ${addedCount} 問の問題を正常に作成・追加しました！`);
        
        if (imgInput) imgInput.value = '';
        if (textInput) textInput.value = '';
        toggleAiGeneratorPanel();

      } catch (err) {
        console.error("AI問題生成処理エラー:", err);
        alert("AIによる問題生成に失敗しました: " + err.message);
      } font-light;
      loading.classList.add('hidden');
    }

    function openQuestionsEditorModal(subjectId) {
      editingSubjectId = subjectId;
      editingCategory = 'quiz';
      const sub = subjects.find(s => s.id === subjectId);
      document.getElementById('editor-subject-title').textContent = `${sub ? sub.name : '科目'} - 問題編集`;

      switchEditorCategory('quiz');
      document.getElementById('modal-questions-editor').classList.remove('hidden');
    }

    function switchEditorCategory(cat) {
      editingCategory = cat;

      const tabQuiz = document.getElementById('editor-tab-quiz');
      const tabFC = document.getElementById('editor-tab-flashcard');
      const fcSubVisibilityWrap = document.getElementById('editor-flashcard-subject-visibility-wrap');
      const aiWrapper = document.getElementById('editor-ai-panel-wrapper');
      const desc = document.getElementById('editor-type-desc');

      if (cat === 'quiz') {
        tabQuiz.className = "w-1/2 py-2 rounded-lg text-xs font-bold transition text-center bg-amber-500 text-slate-950";
        tabFC.className = "w-1/2 py-2 rounded-lg text-xs font-bold transition text-center text-slate-400 hover:text-slate-200";
        fcSubVisibilityWrap.classList.add('hidden');
        aiWrapper.classList.remove('hidden');
        desc.textContent = "通常のテスト演習問題の文言、選択肢、解説を編集します。";
      } else {
        tabQuiz.className = "w-1/2 py-2 rounded-lg text-xs font-bold transition text-center text-slate-400 hover:text-slate-200";
        tabFC.className = "w-1/2 py-2 rounded-lg text-xs font-bold transition text-center bg-amber-500 text-slate-950";
        fcSubVisibilityWrap.classList.remove('hidden');
        aiWrapper.classList.add('hidden');
        desc.textContent = "暗記カード専用問題（単語・意味・表示/非表示）を編集します。";

        const sub = subjects.find(s => s.id === editingSubjectId);
        const toggleSwitch = document.getElementById('editor-fc-subject-toggle-switch');
        if (sub && toggleSwitch) {
          toggleSwitch.checked = (sub.flashcardVisible !== false);
        }
      }

      setupEditorModeSelector();
      loadQuestionsForEditor();
    }

    function toggleSubjectFlashcardVisibility(isChecked) {
      const sub = subjects.find(s => s.id === editingSubjectId);
      if (sub) {
        sub.flashcardVisible = isChecked;
        saveSubjectsToStorage();
      }
    }

    function setupEditorModeSelector() {
      const modeSelector = document.getElementById('editor-mode-selector-container');
      const modeSelect = document.getElementById('editor-mode-select');
      const sub = subjects.find(s => s.id === editingSubjectId);

      if (editingCategory === 'flashcard') {
        modeSelector.classList.add('hidden');
        editingSelectedRound = null;
        return;
      }

      if (editingSubjectId === 'biochemistry' || (sub && sub.hasBiochemistryFormats)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = `
          <option value="choice">選択式問題</option>
          <option value="keyboard">記述式 (キーボード入力) 問題</option>
        `;
        editingSelectedRound = 'choice';
        modeSelect.value = 'choice';
      } else if (editingSubjectId === 'physiology' || (sub && sub.hasPhysiologyModes)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = `
          <option value="past">過去問</option>
          <option value="quiz">小テスト</option>
        `;
        editingSelectedRound = 'past';
        modeSelect.value = 'past';
      } else if (editingSubjectId === 'public_health' || (sub && sub.hasPublicHealthModes)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = `
          <option value="past">過去問</option>
          <option value="exercise">演習問題</option>
          <option value="national">模擬国家試験</option>
        `;
        editingSelectedRound = 'past';
        modeSelect.value = 'past';
      } else if (editingSubjectId === 'public_health_nursing' || (sub && sub.hasPHNModes)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = `
          <option value="basic">練習問題</option>
          <option value="exercise">演習問題</option>
        `;
        editingSelectedRound = 'basic';
        modeSelect.value = 'basic';
      } else if (editingSubjectId === 'nursing_method' || (sub && sub.hasNursingModes)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = `
          <option value="1">第1回演習問題</option>
          <option value="2">第2回演習問題</option>
          <option value="3">第3回演習問題</option>
          <option value="4">第4回演習問題</option>
          <option value="5">第5回演習問題</option>
          <option value="6">第6回演習問題</option>
          <option value="7">第7回演習問題</option>
          <option value="8">第8回演習問題</option>
          <option value="9">第9回演習問題</option>
          <option value="10">第10回演習問題</option>
          <option value="quiz">小テスト演習問題</option>
        `;
        editingSelectedRound = '1';
        modeSelect.value = '1';
      } else if (editingSubjectId === 'psychology' || (sub && sub.hasRounds)) {
        modeSelector.classList.remove('hidden');
        modeSelect.innerHTML = Array.from({length: 10}, (_, i) => `<option value="${i+1}">第${i+1}回</option>`).join('') + `<option value="quiz">小テスト</option>`;
        editingSelectedRound = '1';
        modeSelect.value = '1';
      } else {
        modeSelector.classList.add('hidden');
        editingSelectedRound = null;
      }
    }

    function changeEditorMode(roundVal) {
      editingSelectedRound = roundVal;
      loadQuestionsForEditor();
    }

    function loadQuestionsForEditor() {
      if (editingCategory === 'flashcard') {
        const rawFc = fetchFlashcardDataForSubject(editingSubjectId);
        editingQuestionsList = rawFc.map((item, idx) => ({
          id: item.id || `fc_${editingSubjectId}_${idx}`,
          word: item.word || "単語",
          meaning: item.meaning || "意味",
          exp: item.exp || "解説はありません。",
          visible: item.visible !== false
        }));
        renderEditorQuestionsList();
        return;
      }

      let rawData = [];

      if (editingSubjectId === 'biochemistry') {
        const dbKey = (editingSelectedRound === 'keyboard') ? 'biochemistry_keyboard' : 'biochemistry';
        rawData = window.QUIZ_DB[dbKey] || [];
        if (rawData.length === 0 && typeof window.getBiochemistryQuestions === 'function') {
          rawData = window.getBiochemistryQuestions();
        }
      } else if (editingSubjectId === 'physiology' && typeof window.getPhysiologyQuestions === 'function') {
        const fetched = window.getPhysiologyQuestions(editingSelectedRound || 'past');
        if (fetched && fetched.length > 0) rawData = fetched;
      } else if (editingSubjectId === 'public_health') {
        const dbKey = `public_health_${editingSelectedRound || 'past'}`;
        rawData = window.QUIZ_DB[dbKey] || [];
      } else if (editingSubjectId === 'public_health_nursing') {
        const dbKey = `public_health_nursing_${editingSelectedRound || 'basic'}`;
        rawData = window.QUIZ_DB[dbKey] || [];
      } else if (editingSubjectId === 'nursing_method' && typeof window.getNursingQuestions === 'function') {
        const fetched = window.getNursingQuestions(editingSelectedRound || 'all');
        if (fetched && fetched.length > 0) rawData = fetched;
      } else if (editingSubjectId === 'psychology' && typeof window.getQuestions === 'function') {
        const fetched = window.getQuestions(editingSelectedRound || 'all');
        if (fetched && fetched.length > 0) rawData = fetched;
      } else {
        rawData = window.QUIZ_DB[editingSubjectId] || [];
      }

      if (editingSubjectId === 'physiology' || editingSubjectId === 'biochemistry' || editingSubjectId === 'public_health' || editingSubjectId === 'public_health_nursing') {
        editingQuestionsList = [...rawData];
      } else if (editingSelectedRound) {
        editingQuestionsList = rawData.filter(q => q.round == editingSelectedRound);
      } else {
        editingQuestionsList = [...rawData];
      }

      editingQuestionsList = editingQuestionsList.map(q => normalizeQuestion(q)).filter(Boolean);
      renderEditorQuestionsList();
    }

    function renderEditorQuestionsList() {
      const container = document.getElementById('editor-questions-list');

      if (editingCategory === 'flashcard') {
        if (editingQuestionsList.length === 0) {
          container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">暗記カードが登録されていません。「＋ 問題を追加」から追加できます。</div>`;
          return;
        }

        container.innerHTML = editingQuestionsList.map((item, idx) => `
          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 relative">
            <div class="flex justify-between items-center pb-2 border-b border-slate-800">
              <span class="text-xs font-bold text-amber-400 font-mono">カード ${idx + 1}</span>
              <div class="flex items-center gap-2">
                <button onclick="toggleFlashcardCardVisibility(${idx})" class="px-2 py-0.5 rounded text-[10px] font-bold transition ${item.visible !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}">
                  ${item.visible !== false ? '表示' : '非表示'}
                </button>
                <button onclick="removeQuestionFromEditor(${idx})" class="text-xs text-rose-400 hover:text-rose-300 transition">削除</button>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-amber-400 font-medium block">表面（単語・用語）:</label>
              <input type="text" value="${item.word || ''}" onchange="updateEditorQData(${idx}, 'word', this.value)" placeholder="例: 心筋梗塞" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500">
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-amber-400 font-medium block">裏面（意味・定義）:</label>
              <textarea onchange="updateEditorQData(${idx}, 'meaning', this.value)" placeholder="例: 冠動脈の閉塞により心筋細胞が壊死する病態..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500 h-16">${item.meaning || ''}</textarea>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-slate-400 block">補足解説:</label>
              <textarea onchange="updateEditorQData(${idx}, 'exp', this.value)" placeholder="例: 心電図ではST上昇がみられる..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500 h-14">${item.exp || ''}</textarea>
            </div>
          </div>
        `).join('');
        return;
      }

      if (editingQuestionsList.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">問題が登録されていません。「＋ 問題を追加」から追加できます。</div>`;
        return;
      }

      const isBiochemistryKeyboard = (editingSubjectId === 'biochemistry' && editingSelectedRound === 'keyboard');

      container.innerHTML = editingQuestionsList.map((q, idx) => {
        const isKeyboardMode = isBiochemistryKeyboard || q.enableKeyboard;

        return `
        <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 relative">
          <div class="flex justify-between items-center pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-amber-400 font-mono">第 ${idx + 1} 問</span>
            <button onclick="removeQuestionFromEditor(${idx})" class="text-xs text-rose-400 hover:text-rose-300 transition">削除</button>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] text-slate-400 block">問題文:</label>
            <textarea onchange="updateEditorQData(${idx}, 'q', this.value)" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500 h-16">${q.q}</textarea>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] text-slate-400 block">画像:</label>
            <input type="file" accept="image/*" onchange="handleImageFileUpload(${idx}, this)" class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-500/10 file:text-amber-300 hover:file:bg-amber-500/20 cursor-pointer">
            ${q.image ? `
              <div class="mt-2 flex items-center gap-3">
                <img src="${q.image}" class="max-h-20 rounded border border-slate-700 object-contain">
                <button onclick="removeEditorImage(${idx})" class="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] transition">画像を削除</button>
              </div>
            ` : ''}
          </div>

          ${!isKeyboardMode ? `
            <div class="space-y-1">
              <label class="text-[10px] text-slate-400 block">選択肢 (カンマ区切り):</label>
              <input type="text" value="${(q.options || []).join(', ')}" onchange="updateEditorQData(${idx}, 'options', this.value)" placeholder="選択肢1, 選択肢2, 選択肢3, 選択肢4" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block">正解の番号 (0始まり, 複数可):</label>
                <input type="text" value="${(q.answers || []).join(', ')}" onchange="updateEditorQData(${idx}, 'answers', this.value)" placeholder="例: 0 または 0, 2" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block">キーボード解答対応:</label>
                <select onchange="updateEditorQData(${idx}, 'enableKeyboard', this.value === 'true')" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500">
                  <option value="false" ${!q.enableKeyboard ? 'selected' : ''}>無効 (選択肢)</option>
                  <option value="true" ${q.enableKeyboard ? 'selected' : ''}>有効 (記述入力)</option>
                </select>
              </div>
            </div>
          ` : ''}

          <div class="space-y-1">
            <label class="text-[10px] text-slate-400 block">記述用正解キーワード (省略時は正解選択肢を判定):</label>
            <input type="text" value="${q.keyword || ''}" onchange="updateEditorQData(${idx}, 'keyword', this.value)" placeholder="例: クエン酸回路" class="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500">
          </div>

          <div class="space-y-1">
            <label class="text-[10px] text-slate-400 block">解説:</label>
            <textarea onchange="updateEditorQData(${idx}, 'exp', this.value)" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500 h-14">${q.exp || ''}</textarea>
          </div>
        </div>
      `;
      }).join('');
    }

    function toggleFlashcardCardVisibility(idx) {
      if (!editingQuestionsList[idx]) return;
      editingQuestionsList[idx].visible = !(editingQuestionsList[idx].visible !== false);
      renderEditorQuestionsList();
    }

    function handleImageFileUpload(idx, input) {
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        updateEditorQData(idx, 'image', e.target.result);
        renderEditorQuestionsList();
      };
      reader.readAsDataURL(file);
    }

    function removeEditorImage(idx) {
      updateEditorQData(idx, 'image', '');
      renderEditorQuestionsList();
    }

    function updateEditorQData(idx, field, value) {
      if (!editingQuestionsList[idx]) return;

      if (field === 'options') {
        editingQuestionsList[idx].options = value.split(',').map(s => s.trim()).filter(Boolean);
      } else if (field === 'answers') {
        editingQuestionsList[idx].answers = value.split(',').map(s => parseInt(s.trim(), 10)).filter(v => !isNaN(v));
      } else {
        editingQuestionsList[idx][field] = value;
      }
    }

    function addNewQuestionToEditor() {
      if (editingCategory === 'flashcard') {
        editingQuestionsList.push({
          id: `fc_${editingSubjectId}_${Date.now()}`,
          word: "新規単語",
          meaning: "単語の意味を入力してください",
          exp: "補足解説を入力してください",
          visible: true
        });
      } else {
        const isKeyboard = (editingSubjectId === 'biochemistry' && editingSelectedRound === 'keyboard');
        editingQuestionsList.push({
          q: "新しい問題文を入力してください",
          options: isKeyboard ? [] : ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          answers: isKeyboard ? [] : [0],
          exp: "解説を入力してください",
          image: "",
          enableKeyboard: isKeyboard,
          keyword: "",
          round: editingSelectedRound || null
        });
      }
      renderEditorQuestionsList();
    }

    function removeQuestionFromEditor(idx) {
      if (confirm("この問題を削除しますか？")) {
        editingQuestionsList.splice(idx, 1);
        renderEditorQuestionsList();
      }
    }

    function saveEditedQuestions() {
      if (!editingSubjectId) return;

      if (editingCategory === 'flashcard') {
        window.FLASHCARD_DB[editingSubjectId] = [...editingQuestionsList];
        db.ref(`flashcard_db/${editingSubjectId}`).set(editingQuestionsList).then(() => {
          alert("暗記カードデータをFirebaseに保存しました。");
          closeQuestionsEditorModal();
        }).catch(err => {
          console.error("暗記カード保存エラー:", err);
          alert("暗記カードデータの保存に失敗しました。");
        });
        return;
      }

      let saveDbKey = editingSubjectId;
      if (editingSubjectId === 'biochemistry') {
        saveDbKey = (editingSelectedRound === 'keyboard') ? 'biochemistry_keyboard' : 'biochemistry';
      } else if (editingSubjectId === 'physiology' && editingSelectedRound) {
        saveDbKey = `physiology_${editingSelectedRound}`;
      } else if (editingSubjectId === 'public_health' && editingSelectedRound) {
        saveDbKey = `public_health_${editingSelectedRound}`;
      } else if (editingSubjectId === 'public_health_nursing' && editingSelectedRound) {
        saveDbKey = `public_health_nursing_${editingSelectedRound}`;
      }

      let rawData = window.QUIZ_DB[saveDbKey] || [];

      if (editingSubjectId === 'physiology' || editingSubjectId === 'biochemistry' || editingSubjectId === 'public_health' || editingSubjectId === 'public_health_nursing') {
        rawData = [...editingQuestionsList];
      } else if (editingSelectedRound) {
        rawData = rawData.filter(q => q.round != editingSelectedRound);
        rawData = rawData.concat(editingQuestionsList);
      } else {
        rawData = [...editingQuestionsList];
      }

      window.QUIZ_DB[saveDbKey] = rawData;
      db.ref(`quiz_db/${saveDbKey}`).set(rawData).then(() => {
        alert("演習テスト問題をFirebaseに保存しました。");
        closeQuestionsEditorModal();
      }).catch(err => {
        console.error("問題保存エラー:", err);
        alert("問題データの保存に失敗しました。");
      });
    }

    function closeQuestionsEditorModal() {
      document.getElementById('modal-questions-editor').classList.add('hidden');
    }

    // =========================================================
    //  初期化・リアルタイム同期
    // =========================================================
    window.addEventListener('DOMContentLoaded', () => {
      initVisitorTracking();
      initRealtimeSync();
      initSubjectPageSwipe();

      if (localStorage.getItem('notice_read_status') === 'read') {
        const redDot = document.getElementById('notice-red-dot');
        if (redDot) redDot.classList.add('hidden');
      }

      const startBtn = document.getElementById("startButton");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          const selectedValue = document.getElementById("roundSelect").value;
          currentRound = (selectedValue === "all") ? null : selectedValue;

          if (currentSubject.id === 'psychology' && typeof window.getQuestions === "function") {
            const currentQuestions = window.getQuestions(selectedValue, currentSemester);
            if (Array.isArray(currentQuestions) && currentQuestions.length > 0) {
              window.QUIZ_DB.psychology = currentQuestions;
            }
          } else if (currentSubject.id === 'pharmacology') {
            if (currentPharmacologyMode === 'nurse_national_6years') {
              if (typeof window.getPharmacologyNurseNational6YearsQuestions === 'function') {
                window.QUIZ_DB.pharmacology = window.getPharmacologyNurseNational6YearsQuestions();
              }
            } else {
              const key = `pharmacology_${currentPharmacologyMode}_${currentSemester === '2026_autumn' ? '2026_autumn' : '2026_spring'}`;
              if (Array.isArray(window.QUIZ_DB[key])) window.QUIZ_DB.pharmacology = window.QUIZ_DB[key];
            }
          } else if (currentSubject.id === 'nursing_method_3') {
            const key = `nursing_method_3_${currentNursingMethod3Mode}_${currentSemester === '2026_autumn' ? '2026_autumn' : '2026_spring'}`;
            if (Array.isArray(window.QUIZ_DB[key])) window.QUIZ_DB.nursing_method_3 = window.QUIZ_DB[key];
          } else if (currentSubject.id === 'nursing_method' && typeof window.getNursingQuestions === "function") {
            const currentQuestions = window.getNursingQuestions(selectedValue, currentSemester);
            if (Array.isArray(currentQuestions) && currentQuestions.length > 0) {
              window.QUIZ_DB.nursing_method = currentQuestions;
            }
          }
          showStartScreen();
        });
      }
      showDashboard();
    });

    function initRealtimeSync() {
      db.ref('subjects').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && Array.isArray(val)) {
          subjects = val;
        } else {
          saveSubjectsToStorage();
        }
        renderSubjectList();
        if (currentSubjectPageIndex === 1) {
          renderFlashcardSubjectList();
        }
        if (!document.getElementById('modal-admin').classList.contains('hidden')) {
          renderAdminDragList();
        }
      });

      db.ref('quiz_db').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
          Object.keys(val).forEach(subId => {
            if (subId === 'pharmacology_nurse_national_6years') return;
            if (subId === 'nutrition_exercise_2026_autumn') return;
            if (subId === 'biochemistry_fill') return;
            window.QUIZ_DB[subId] = val[subId];
          });
        }
      });

      db.ref('flashcard_db').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
          Object.keys(val).forEach(subId => {
            window.FLASHCARD_DB[subId] = val[subId];
          });
        }
      });

      db.ref('notices').on('value', (snapshot) => {
        const val = snapshot.val();
        const container = document.getElementById('notice-list-container');
        const adminManageContainer = document.getElementById('admin-notice-manage-list');

        if (val) {
          const noticeArray = Object.keys(val).map(key => ({
            id: key,
            ...val[key]
          })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          if (container) {
            container.innerHTML = noticeArray.map(item => `
              <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div class="text-[10px] text-amber-400 font-mono">${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'お知らせ'}</div>
                <div class="font-semibold text-slate-100">${item.title}</div>
                <p class="text-slate-400 text-[11px] font-light whitespace-pre-wrap">${item.content}</p>
              </div>
            `).join('');
          }

          if (adminManageContainer) {
            adminManageContainer.innerHTML = noticeArray.map(item => `
              <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div class="overflow-hidden pr-2">
                  <div class="text-[10px] text-amber-400/80 font-mono">${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</div>
                  <div class="text-xs font-medium text-slate-200 truncate">${item.title}</div>
                </div>
                <button onclick="deleteAdminNotice('${item.id}')" class="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded text-[10px] font-medium shrink-0 transition">
                  削除
                </button>
              </div>
            `).join('');
          }

        } else {
          if (container) {
            container.innerHTML = `
              <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div class="text-[10px] text-amber-400 font-mono">新機能アップデート</div>
                <div class="font-semibold text-slate-100">演習機能が新しくなりました</div>
                <p class="text-slate-400 text-[11px] font-light">画像の表示、複数選択問題、早押し対戦（2Pマルチ）に対応しました。</p>
              </div>
            `;
          }
          if (adminManageContainer) {
            adminManageContainer.innerHTML = `<div class="text-slate-500 text-[11px] text-center py-2">現在、投稿されたお知らせはありません。</div>`;
          }
        }
      });
    }

    function prepareDrawerSettingsDropdown() {
      const content = document.getElementById('drawer-settings-content');
      const accordion = document.getElementById('settings-accordion');
      const modal = document.getElementById('user-settings-modal');
      if (content && accordion && accordion.parentElement !== content) {
        content.appendChild(accordion);
      }
      if (modal) modal.classList.add('hidden');
    }

    function openUserSettings() {
      prepareDrawerSettingsDropdown();
      const drawerSettings = document.getElementById('drawer-settings-accordion');
      const toggle = document.getElementById('drawer-settings-toggle');
      const content = document.getElementById('drawer-settings-content');
      if (!drawerSettings || !content) return;
      drawerSettings.open = !drawerSettings.open;
      if (toggle) toggle.setAttribute('aria-expanded', String(drawerSettings.open));
      content.setAttribute('aria-hidden', String(!drawerSettings.open));
      const chevron = document.getElementById('drawer-settings-chevron');
      if (chevron) chevron.style.transform = drawerSettings.open ? 'rotate(180deg)' : '';
    }

    function closeUserSettings() {
      const overlay = document.getElementById('user-settings-overlay');
      const modal = document.getElementById('user-settings-modal');
      if (overlay) overlay.classList.add('hidden');
      if (modal) modal.classList.add('hidden');
      closeThemeSettingsPage();
      closeSettingsDetail();
    }

    function openThemeSettingsPage() {
      const overlay = document.getElementById('np-theme-settings-overlay');
      const modal = document.getElementById('np-theme-settings-modal');
      if (!overlay || !modal) return;
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
    }

    function closeThemeSettingsPage() {
      const overlay = document.getElementById('np-theme-settings-overlay');
      const modal = document.getElementById('np-theme-settings-modal');
      if (overlay) overlay.classList.add('hidden');
      if (modal) modal.classList.add('hidden');
    }

    // 文字サイズ設定は文字だけに反映し、remベースのモーダル寸法は拡大しない
    function applyNurseTextScale(value) {
      const scale = Math.max(0.85, Math.min(1.2, Number(value) / 100 || 1));
      const root = document.documentElement;
      root.style.fontSize = '100%';
      root.dataset.npTextScale = String(scale);
      const excluded = 'script,style,link,meta,svg,path,input,textarea,select,option';
      const applyTo = (element) => {
        if (!(element instanceof HTMLElement) || element.matches(excluded)) return;
        if (!element.dataset.npBaseFontSize) {
          const current = parseFloat(getComputedStyle(element).fontSize) || 16;
          element.dataset.npBaseFontSize = String(current / (window.__nurseTextScale || 1));
        }
        element.style.fontSize = (Number(element.dataset.npBaseFontSize) * scale) + 'px';
      };
      document.querySelectorAll('body *').forEach(applyTo);
      window.__nurseTextScale = scale;
    }
    if (!window.__nurseTextScaleObserver) {
      window.__nurseTextScaleObserver = new MutationObserver(records => {
        const scale = Number(document.documentElement.dataset.npTextScale || 1);
        if (scale === 1) return;
        records.forEach(record => record.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          applyNurseTextScale(scale * 100);
        }));
      });
      window.__nurseTextScaleObserver.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', () => {
        applyNurseTextScale(Number(document.documentElement.dataset.npTextScale || 1) * 100);
      }, { once: true });
    }

    function openSettingsDetail(type) {
      const overlay = document.getElementById('np-settings-detail-overlay');
      const modal = document.getElementById('np-settings-detail-modal');
      const title = document.getElementById('np-settings-detail-title');
      const body = document.getElementById('np-settings-detail-body');
      if (!overlay || !modal || !title || !body) return;
      const loggedIn = Boolean(localStorage.getItem('nurse_line_user_session'));
      const noticeEnabled = localStorage.getItem('nurse_plus_in_app_notices') !== 'off';
      const textSize = Number(localStorage.getItem('nurse_plus_text_size') || 100);
      const lineAccountName = (localStorage.getItem('nurse_line_user_name') || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const reducedMotion = document.documentElement.classList.contains('np-accessibility-reduced-motion');
      const getStudyKeys = () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('history_accuracy_') || ['study_days','study_streak','study_last_date','evo_today_done'].includes(key))) keys.push(key);
        }
        return keys;
      };
      const pages = {
        account: {
          title: 'アカウント',
          body: '<div class="rounded-xl border border-violet-100 bg-violet-50/70 p-3"><div class="font-semibold text-slate-700">LINEアカウント情報</div><p class="mt-2 text-sm">LINE表示名：<span class="font-semibold">' + (lineAccountName || '取得できていません') + '</span></p><p class="mt-1 text-sm">LINEログイン状態：' + (loggedIn ? 'ログイン済み' : '未ログイン') + '</p><p class="mt-1 text-xs text-slate-500">表示名はLINE連携時に取得した情報です。表示名を変更する場合はLINE側のプロフィールを変更してください。</p><a href="https://nurse-line-system.onrender.com/auth/line" class="mt-3 inline-flex rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-700">LINEログイン／連携 ↗</a></div><div class="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><div class="font-semibold text-slate-700">複数端末で同期</div><p class="mt-1 text-sm text-slate-600">LINEログインした端末間で学習履歴を共有します。</p><button type="button" id="np-account-sync" class="mt-3 np-settings-entry"><span>今すぐ同期</span><span aria-hidden="true">↻</span></button><p id="np-account-sync-status" class="mt-2 text-xs text-slate-500" role="status" aria-live="polite">' + (loggedIn ? '同期するにはサーバー側のFirebase設定が必要です。' : '同期するには先にLINEログインしてください。') + '</p></div>'
        },
        audio: {
          title: 'オーディオ',
          body: '<p>操作音や正解・不正解のサウンドを自分好みに調整できます。設定はこの端末に保存されます。</p><div class="mt-3 space-y-3"><label class="flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><span><span class="block font-medium text-slate-700">効果音</span><span class="block text-xs text-slate-500 mt-1">タップ・選択・画面操作・正解・不正解のサウンド</span></span><input id="quiz-sfx-toggle" type="checkbox" role="switch" aria-label="効果音" class="np-toggle-switch" ' + (npAudio.sfx ? 'checked' : '') + '></label><label class="block rounded-xl border border-violet-100 bg-violet-50/70 p-3"><span class="flex items-center justify-between gap-3"><span class="font-medium text-slate-700">音量</span><span id="quiz-audio-volume-label" class="text-xs text-slate-500">' + Math.round(npAudio.volume * 100) + '%</span></span><input id="quiz-audio-volume" type="range" min="0" max="100" value="' + Math.round(npAudio.volume * 100) + '" class="mt-3 w-full accent-violet-500" aria-label="音量"></label><button type="button" id="quiz-audio-mute" class="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700">' + (npAudio.muted ? '音をオンにする' : 'すべての音をオフにする') + '</button></div><p class="mt-3 text-xs text-slate-500">BGMは使用せず、操作音と正解・不正解の効果音のみ再生します。端末の設定やブラウザの仕様により、最初の操作が必要な場合があります。</p>'
        },
        notifications: {
          title: '通知設定',
          body: '<p>アプリ内のお知らせ表示に関する設定です。</p><label class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><span><span class="block font-medium text-slate-700">アプリ内のお知らせ</span><span class="block text-xs text-slate-500 mt-1">この端末の設定を保存します。</span></span><input id="np-notice-toggle" type="checkbox" role="switch" aria-label="アプリ内のお知らせ" class="np-toggle-switch" ' + (noticeEnabled ? 'checked' : '') + '></label><p class="mt-3 text-xs text-slate-500">公式LINEからの配信設定は変更しません。</p>'
        },
        sync: {
          title: '学習状況を同期',
          body: '<p>LINEログインした端末間で、保存済みの学習記録を同期できます。</p><div class="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><p class="font-medium text-slate-700">同期状態</p><p class="mt-1">' + (loggedIn ? 'LINEログイン済みです。データ分析画面の「今すぐ同期」から同期を実行できます。' : '同期するには先にLINEログインしてください。') + '</p></div><button type="button" onclick="closeSettingsDetail();openSettingsDetail(\'account\')" class="mt-3 np-settings-entry"><span>アカウント設定を開く</span><span aria-hidden="true">›</span></button>'
        },
        privacy: {
          title: 'プライバシー',
          body: '<p>このページでは、Nurse＋で扱う情報と利用目的について説明します。</p><div class="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><div class="font-semibold text-slate-700">1. 取り扱う情報</div><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600"><li>LINE連携時に取得するLINE表示名とログイン状態に関する情報</li><li>アプリの利用日時やアクセス回数などの利用履歴</li><li>端末に保存される演習結果、正答率、学習状況などの学習記録</li></ul><p class="mt-2 text-xs text-slate-500">アクセス履歴と学習内容の記録は別の目的で扱います。アクセス履歴には、解答した問題の内容を記録しません。</p></div><div class="mt-3 rounded-xl border border-violet-100 bg-white p-3"><div class="font-semibold text-slate-700">2. 利用目的</div><ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600"><li>LINEログイン状態やアカウント連携の確認</li><li>演習結果の表示、間違えた問題の復習、正答率や学習状況の分析</li><li>対応している機能での学習記録の同期</li><li>アクセス状況の把握と、アプリの保守・改善</li></ul></div><div class="mt-3 rounded-xl border border-violet-100 bg-white p-3"><div class="font-semibold text-slate-700">3. 保存と外部サービス</div><p class="mt-1 text-sm text-slate-600">学習記録の一部は利用中の端末のブラウザ内に保存されます。LINEログインや学習状況の同期など、機能に応じてLINEおよびアプリのサーバーやデータベースなどの外部サービスを利用します。外部サービス側で扱われる情報は、それぞれのサービスの規約・プライバシーポリシーにも従います。</p><p class="mt-2 text-sm text-slate-600">端末の共有やブラウザデータの消去により、保存状態が変わる場合があります。</p></div><div class="mt-3 rounded-xl border border-violet-100 bg-white p-3"><div class="font-semibold text-slate-700">4. 第三者提供</div><p class="mt-1 text-sm text-slate-600">法令に基づく場合などを除き、個人情報を本人の同意なく第三者へ提供しないよう取り扱います。機能提供に必要な範囲で外部サービスを利用する場合があります。</p></div><div class="mt-3 rounded-xl border border-violet-100 bg-white p-3"><div class="font-semibold text-slate-700">5. 確認・削除</div><p class="mt-1 text-sm text-slate-600">この端末に保存された対象の学習記録は、データ管理から削除できます。削除後は元に戻せません。LINEログイン情報やサーバー側の記録は、端末の学習記録を削除しても別途残る場合があります。</p><button type="button" onclick="openSettingsDetail(\'data\')" class="mt-3 np-settings-entry"><span>データ管理を開く</span><span aria-hidden="true">›</span></button></div><p class="mt-3 text-xs text-slate-500">この説明はNurse＋内の情報の扱いを案内するものです。情報の利用方法に関するお問い合わせは、公式LINEからご連絡ください。</p><a href="https://lin.ee/PUMfCax" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">公式LINEでお問い合わせ ↗</a>'
        },
        data: {
          title: 'データ管理',
          body: '<p>この端末に保存された学習記録の管理と、アプリのキャッシュ更新ができます。</p><div class="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><div class="font-medium text-slate-700">学習記録</div><p class="mt-1">保存項目数：' + getStudyKeys().length + '件</p></div><button type="button" id="np-clear-app-cache" class="mt-3 w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700">アプリのキャッシュをクリア</button><p class="mt-2 text-xs text-slate-500">古い画面が表示される場合に使用します。キャッシュとService Workerを更新します。学習記録やLINEログイン情報は削除しません。</p><p id="np-clear-app-cache-status" class="mt-2 text-xs text-slate-500" role="status" aria-live="polite"></p><button type="button" id="np-delete-study-data" class="mt-4 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">この端末の学習記録を削除</button><p class="mt-2 text-xs text-slate-500">削除すると対象記録を元に戻せません。LINEログイン情報は削除しません。</p>'
        },
        accessibility: {
          title: 'アクセシビリティ',
          body: '<p>文字の大きさをスライダーで調整できます。設定はこの端末に保存されます。</p><label class="mt-3 block rounded-xl border border-violet-100 bg-violet-50/70 p-3"><span class="flex items-center justify-between gap-3 font-medium text-slate-700"><span>文字サイズ</span><strong id="np-text-size-value">' + textSize + '%</strong></span><input id="np-text-size-slider" type="range" min="85" max="120" step="5" value="' + textSize + '" class="mt-3 w-full accent-violet-500" aria-label="文字サイズ"></label><p class="mt-2 text-xs text-slate-500">小さめ 85% ～ 標準 100% ～ 大きめ 120%</p><label class="mt-2 flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3"><span class="font-medium text-slate-700">アニメーションを減らす</span><input id="np-reduced-motion-toggle" type="checkbox" class="h-4 w-4 accent-violet-500" ' + (reducedMotion ? 'checked' : '') + '></label>'
        },
        help: {
          title: 'ヘルプ・サポート',
          body: "<div class=\"rounded-xl border border-violet-100 bg-violet-50/70 p-4\"><div class=\"font-semibold text-slate-700\">Nurse＋の使い方</div><p class=\"mt-1 text-sm text-slate-600\">看護学習を自分のペースで進められるWebアプリです。利用できる科目やモードはアプリ内の案内をご確認ください。</p></div><div class=\"mt-3 rounded-xl border border-violet-100 bg-white p-3\"><div class=\"font-semibold text-slate-700\">学習を始める</div><ol class=\"mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-600\"><li><span class=\"font-medium text-slate-700\">科目を選ぶ：</span>ホームやメニューから学習したい科目を開きます。</li><li><span class=\"font-medium text-slate-700\">モードを選ぶ：</span>表示される問題演習、小テスト、模擬国家試験などから利用したいモードを選びます。</li><li><span class=\"font-medium text-slate-700\">解答・復習する：</span>問題に回答したら解説を確認し、間違えた問題や迷って答えた問題を重点的に復習しましょう。</li></ol></div><div class=\"mt-3 rounded-xl border border-violet-100 bg-white p-3\"><div class=\"font-semibold text-slate-700\">便利な機能</div><div class=\"mt-2 space-y-2 text-sm text-slate-600\"><p><span class=\"font-medium text-slate-700\">暗記カード：</span>カードを見ながら用語や知識を確認し、すきま時間の復習に活用できます。</p><p><span class=\"font-medium text-slate-700\">データ分析：</span>保存された演習履歴や正答率などを確認し、苦手な範囲の振り返りに役立てます。表示される記録は利用状況や端末の保存状態によって異なります。</p><p><span class=\"font-medium text-slate-700\">利用できる科目：</span>科目によって利用できるモードが異なります。利用可能な内容はアプリ内の表示をご確認ください。</p></div></div><div class=\"mt-3 rounded-xl border border-violet-100 bg-white p-3\"><div class=\"font-semibold text-slate-700\">設定項目のヘルプ</div><div class=\"mt-2 space-y-3 text-sm text-slate-600\"><p><span class=\"font-semibold text-slate-700\">アカウント：</span>LINEログイン状態と連携情報を確認します。</p><p><span class=\"font-semibold text-slate-700\">テーマ・外観：</span>アプリの表示をホワイト／ダークに切り替えます。</p><p><span class=\"font-semibold text-slate-700\">通知設定：</span>この端末でアプリ内のお知らせを表示するか設定します。公式LINEからの配信設定には影響しません。</p><p><span class=\"font-semibold text-slate-700\">学習状況を同期：</span>対応している場合、LINEログイン後の学習記録の同期状態や手順を確認します。</p><p><span class=\"font-semibold text-slate-700\">プライバシー：</span>学習記録の利用目的や保存状況を確認します。</p><p><span class=\"font-semibold text-slate-700\">データ管理：</span>この端末に保存された学習記録の件数を確認し、必要に応じて削除します。削除した記録は元に戻せません。</p><p><span class=\"font-semibold text-slate-700\">アクセシビリティ：</span>文字サイズやアニメーションの表示を調整します。</p></div></div><div class=\"mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4\"><div class=\"font-semibold text-slate-700\">お問い合わせ・サポート</div><p class=\"mt-1 text-sm text-slate-600\">使い方でわからないこと、不具合の報告、改善のご要望などはNurse＋公式LINEからお問い合わせください。</p><a href=\"https://lin.ee/PUMfCax\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"mt-3 flex w-full items-center justify-center rounded-xl border border-violet-300 bg-violet-100 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-200 active:scale-[0.99]\">公式LINEでお問い合わせ ↗</a><p class=\"mt-2 text-xs text-slate-500\">ボタンを押すと公式LINEのページが開きます。</p></div>"
        },
        info: {
          title: 'アプリ情報',
          body: '<div class="overflow-hidden rounded-2xl border border-violet-100 bg-white"><div class="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-50 p-5 text-center"><div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/90 text-3xl font-bold text-violet-600 shadow-sm">＋</div><div class="mt-3 text-xs font-semibold tracking-[.22em] text-violet-500">NURSE PLUS</div><h3 class="mt-1 text-2xl font-bold text-slate-800">Nurse＋</h3><p class="mt-1 text-sm text-slate-600">看護学習サポート</p><p class="mt-3 text-xs leading-5 text-slate-500">看護学の学習と復習をサポートするWebアプリ</p></div><div class="divide-y divide-slate-100 px-4"><div class="flex items-start justify-between gap-4 py-3"><span class="text-sm text-slate-500">アプリ名</span><span class="text-right text-sm font-semibold text-slate-700">Nurse＋</span></div><div class="flex items-start justify-between gap-4 py-3"><span class="text-sm text-slate-500">アプリの種類</span><span class="text-right text-sm font-semibold text-slate-700">学習用Webアプリ</span></div><div class="flex items-start justify-between gap-4 py-3"><span class="text-sm text-slate-500">利用方法</span><span class="text-right text-sm font-semibold text-slate-700">ブラウザから利用</span></div></div></div><div class="mt-4"><h3 class="mb-2 text-sm font-bold text-slate-700">主な機能</h3><div class="grid grid-cols-2 gap-2"><div class="rounded-xl border border-violet-100 bg-violet-50/70 p-3"><div class="text-lg text-violet-600">▤</div><div class="mt-1 text-sm font-semibold text-slate-700">問題演習</div><p class="mt-1 text-xs leading-5 text-slate-500">科目別の問題や小テストに取り組む</p></div><div class="rounded-xl border border-fuchsia-100 bg-fuchsia-50/70 p-3"><div class="text-lg text-fuchsia-600">▧</div><div class="mt-1 text-sm font-semibold text-slate-700">暗記カード</div><p class="mt-1 text-xs leading-5 text-slate-500">用語や知識を繰り返し復習</p></div><div class="rounded-xl border border-sky-100 bg-sky-50/70 p-3"><div class="text-lg text-sky-600">▥</div><div class="mt-1 text-sm font-semibold text-slate-700">データ分析</div><p class="mt-1 text-xs leading-5 text-slate-500">学習履歴や正答率を振り返る</p></div><div class="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><div class="text-lg text-emerald-600">⚙</div><div class="mt-1 text-sm font-semibold text-slate-700">自分に合わせた設定</div><p class="mt-1 text-xs leading-5 text-slate-500">テーマや文字サイズなどを調整</p></div></div></div><div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 class="text-sm font-semibold text-slate-700">ご利用について</h3><p class="mt-1 text-xs leading-5 text-slate-600">利用できる科目や機能は、提供状況やアプリ内の案内によって異なります。最新の利用可能な内容はアプリ内のお知らせをご確認ください。</p></div><div class="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-4"><h3 class="text-sm font-semibold text-slate-700">お問い合わせ</h3><p class="mt-1 text-xs leading-5 text-slate-600">使い方の質問、不具合の報告、改善のご要望は公式LINEからご連絡ください。</p><a href="https://lin.ee/PUMfCax" target="_blank" rel="noopener noreferrer" class="mt-3 flex w-full items-center justify-center rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.99]">公式LINEでお問い合わせ ↗</a></div>'
        }
      };
      const page = pages[type];
      if (!page) return;
      title.textContent = page.title;
      body.innerHTML = page.body;
      if (type === 'audio') npUpdateAudioUI();
      overlay.classList.remove('hidden');
      modal.classList.remove('hidden');
      body.querySelector('#np-support-form')?.addEventListener('submit', submitSupportInquiry);
      body.querySelector('#np-notice-toggle')?.addEventListener('change', event => {
        localStorage.setItem('nurse_plus_in_app_notices', event.target.checked ? 'on' : 'off');
        const toggle = event.target;
        toggle.classList.remove('np-just-enabled', 'np-just-disabled');
        void toggle.offsetWidth;
        if (toggle.checked) {
          toggle.classList.add('np-just-enabled');
          window.setTimeout(() => toggle.classList.remove('np-just-enabled'), 900);
        } else {
          toggle.classList.add('np-just-disabled');
          window.setTimeout(() => toggle.classList.remove('np-just-disabled'), 400);
        }
      });
      body.querySelector('#np-text-size-slider')?.addEventListener('input', event => {
        const value = Number(event.target.value);
        applyNurseTextScale(value);
        localStorage.setItem('nurse_plus_text_size', String(value));
        const output = body.querySelector('#np-text-size-value');
        if (output) output.textContent = value + '%';
      });
      body.querySelector('#np-reduced-motion-toggle')?.addEventListener('change', event => {
        document.documentElement.classList.toggle('np-accessibility-reduced-motion', event.target.checked);
        localStorage.setItem('nurse_plus_reduced_motion', event.target.checked ? 'on' : 'off');
      });
      body.querySelector('#np-clear-app-cache')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        const status = body.querySelector('#np-clear-app-cache-status');
        if (!window.confirm('アプリのキャッシュをクリアして、最新版を読み込み直しますか？学習記録とLINEログイン情報は削除しません。')) return;
        button.disabled = true;
        button.textContent = 'キャッシュをクリア中…';
        if (status) status.textContent = 'キャッシュとアプリの更新設定を確認しています。';
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames
              .filter(name => name.startsWith('nurse-plus-pwa-'))
              .map(name => caches.delete(name)));
          }
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations
              .filter(registration => {
                const scriptURL = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
                return scriptURL.startsWith(location.origin + '/Test-prep-workbook/');
              })
              .map(registration => registration.unregister()));
          }
          if (status) status.textContent = '完了しました。最新版を読み込み直します…';
          const refreshUrl = new URL(location.href);
          refreshUrl.searchParams.set('np_cache_refresh', String(Date.now()));
          window.setTimeout(() => location.replace(refreshUrl.toString()), 350);
        } catch (error) {
          console.error('[Nurse＋] アプリのキャッシュクリアに失敗しました:', error);
          if (status) status.textContent = '自動クリアに失敗しました。SafariのWebサイトデータから消去してください。';
          button.disabled = false;
          button.textContent = 'もう一度キャッシュをクリア';
        }
      });
      body.querySelector('#np-delete-study-data')?.addEventListener('click', () => {
        if (!window.confirm('この端末の学習記録を削除しますか？この操作は取り消せません。')) return;
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('history_accuracy_') ||
            [
              'study_days',
              'study_streak',
              'study_last_date',
              'evo_today_done',
              'nurse_plus_study_sessions',
              'nurse_plus_accuracy_baseline',
              'nurse_plus_sync_owned_records',
              'nurse_plus_sync_last_cloud_records'
            ].includes(key)
          )) keys.push(key);
        }
        keys.forEach(key => localStorage.removeItem(key));
        closeSettingsDetail();
        openSettingsDetail('data');
      });
    }

    async function submitSupportInquiry(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('#np-support-submit');
      const status = form.querySelector('#np-support-status');
      const payload = {
        category: form.querySelector('#np-support-category')?.value || '',
        subject: form.querySelector('#np-support-subject')?.value || '',
        message: form.querySelector('#np-support-message')?.value || '',
        contact: form.querySelector('#np-support-contact')?.value || ''
      };
      if (!submitButton || !status) return;
      submitButton.disabled = true;
      submitButton.textContent = '送信中…';
      status.classList.remove('hidden');
      status.className = 'text-xs text-slate-500';
      status.textContent = '問い合わせを送信しています。';
      try {
        const response = await fetch(NURSE_LINE_API_BASE_URL.replace(/\/$/, '') + '/api/support/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || '送信できませんでした。');
        status.className = 'text-xs text-emerald-700';
        status.textContent = result.message || '問い合わせを送信しました。';
        form.reset();
      } catch (error) {
        status.className = 'text-xs text-rose-600';
        status.textContent = error.message || '送信できませんでした。時間をおいて再度お試しください。';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '問い合わせを送信';
      }
    }

    async function loadSupportMessages() {
      const container = document.getElementById('admin-support-messages');
      if (!container) return;
      container.textContent = '問い合わせを読み込み中…';
      try {
        const result = await callNurseLineApi('/api/support/messages', null, 'GET');
        const messages = Array.isArray(result.messages) ? result.messages : [];
        container.replaceChildren();
        if (!messages.length) {
          const empty = document.createElement('div');
          empty.className = 'text-[11px] text-slate-500 text-center py-3';
          empty.textContent = '問い合わせはまだありません。';
          container.appendChild(empty);
          return;
        }
        messages.forEach(item => {
          const card = document.createElement('article');
          card.className = 'rounded-lg border border-slate-700 bg-slate-950/70 p-3 space-y-2';
          const top = document.createElement('div');
          top.className = 'flex flex-wrap items-center justify-between gap-2';
          const category = document.createElement('span');
          category.className = 'text-[10px] font-semibold text-violet-300';
          category.textContent = item.category || 'お問い合わせ';
          const state = document.createElement('span');
          state.className = 'text-[10px] text-amber-300';
          state.textContent = ({ new: '未確認', read: '確認済み', resolved: '対応済み' })[item.status] || '未確認';
          top.append(category, state);
          const subject = document.createElement('div');
          subject.className = 'text-xs font-semibold text-slate-100 break-words';
          subject.textContent = item.subject || '(件名なし)';
          const date = document.createElement('div');
          date.className = 'text-[10px] text-slate-500';
          date.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString('ja-JP') : '';
          const message = document.createElement('p');
          message.className = 'whitespace-pre-wrap break-words text-xs leading-5 text-slate-300';
          message.textContent = item.message || '';
          card.append(top, subject, date, message);
          if (item.contact) {
            const contact = document.createElement('p');
            contact.className = 'break-words text-[10px] text-slate-400';
            contact.textContent = '返信先：' + item.contact;
            card.appendChild(contact);
          }
          const actions = document.createElement('div');
          actions.className = 'flex flex-wrap gap-2';
          [['read', '確認済みにする'], ['resolved', '対応済みにする']].forEach(([statusValue, label]) => {
            if (item.status === statusValue || (statusValue === 'read' && item.status === 'resolved')) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] text-slate-200 hover:bg-slate-800';
            button.textContent = label;
            button.addEventListener('click', async () => {
              button.disabled = true;
              try {
                await callNurseLineApi('/api/support/messages/' + encodeURIComponent(item.id) + '/status', { status: statusValue }, 'PATCH');
                loadSupportMessages();
              } catch (error) {
                alert(error.message || '問い合わせ状態を更新できませんでした。');
                button.disabled = false;
              }
            });
            actions.appendChild(button);
          });
          card.appendChild(actions);
          container.appendChild(card);
        });
      } catch (error) {
        container.textContent = error.message || '問い合わせ一覧を取得できませんでした。';
      }
    }

    function closeSettingsDetail() {
      const overlay = document.getElementById('np-settings-detail-overlay');
      const modal = document.getElementById('np-settings-detail-modal');
      if (overlay) overlay.classList.add('hidden');
      if (modal) modal.classList.add('hidden');
    }

    function toggleDrawerSettings(event) {
      if (event) event.preventDefault();
      openUserSettings();
    }

    function toggleNavDrawer() {
      const drawer = document.getElementById('nav-drawer');
      const overlay = document.getElementById('nav-overlay');
      if (!drawer || !overlay) return;
      const isOpen = !drawer.classList.contains('-translate-x-full');
      if (isOpen) {
        closeNavDrawer();
      } else {
        closeUserSettings();
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
      }
    }

    function closeNavDrawer() {
      const drawer = document.getElementById('nav-drawer');
      const overlay = document.getElementById('nav-overlay');
      if (drawer) drawer.classList.add('-translate-x-full');
      if (overlay) overlay.classList.add('hidden');
      closeUserSettings();
    }

    try {
      document.documentElement.classList.toggle('np-accessibility-large-text', localStorage.getItem('nurse_plus_large_text') === 'on');
      document.documentElement.classList.toggle('np-accessibility-reduced-motion', localStorage.getItem('nurse_plus_reduced_motion') === 'on');
    } catch (_) {}
    document.addEventListener('DOMContentLoaded', prepareDrawerSettingsDropdown, { once: true });

    const evoModeDefs = s => {
      if (s.id === 'physiology' || s.hasPhysiologyModes) return [{key:'past',label:'過去問'},{key:'quiz',label:'小テスト'}];
      if (s.id === 'anatomy' || s.hasAnatomyModes) return [{key:'basic',label:'練習問題'},{key:'applied',label:'応用問題'}];
      if (s.id === 'public_health' || s.hasPublicHealthModes) return [{key:'past',label:'過去問'},{key:'exercise',label:'演習問題'},{key:'national',label:'模擬国家試験'}];
      if (s.id === 'public_health_nursing' || s.hasPHNModes) return [{key:'basic',label:'練習問題'},{key:'exercise',label:'演習問題'}];
      if (s.id === 'pharmacology') return [{key:'exercise',label:'演習問題'},{key:'past',label:'過去問'},{key:'nurse_national_6years',label:'過去6年看護師国家試験'}];
      if (s.id === 'nursing_method_3') return [{key:'practice',label:'練習問題'},{key:'quiz',label:'小テスト'},{key:'exercise',label:'演習問題'}];
      return [{key:'all',label:'通常'}];
    };

    function evoGetStats() {
      const rows=[]; let attempts=0, sum=0, best=null;
      (subjects||[]).filter(s=>s.visible!==false && s.status!=='preparing').forEach(s=>{
        evoModeDefs(s).forEach(m=>{
          const rec=JSON.parse(localStorage.getItem(`history_accuracy_${s.id}_${m.key}`)||'[]');
          if(rec.length){ const avg=Math.round(rec.reduce((a,b)=>a+b,0)/rec.length); rows.push({s,mode:m,avg}); attempts+=rec.length; sum+=rec.reduce((a,b)=>a+b,0); best=Math.max(best??0,...rec); }
        });
      });
      rows.sort((a,b)=>a.avg-b.avg);
      return {rows,attempts,avg:attempts?Math.round(sum/attempts):null,best};
    }

    let evoConditionDateIndex = 0;

    function evoGetConditionDates(){
      const dates = new Set();
      (subjects||[]).filter(s=>s.visible!==false && s.status!=='preparing').forEach(s=>{
        evoModeDefs(s).forEach(m=>{
          const rec = JSON.parse(localStorage.getItem(`history_accuracy_daily_${s.id}_${m.key}`)||'[]');
          rec.forEach(x=>{ if(x && x.date) dates.add(x.date); });
        });
      });
      return Array.from(dates).sort((a,b)=>{
        const pa=a.split('/').map(Number), pb=b.split('/').map(Number);
        return new Date(pb[0],pb[1]-1,pb[2]) - new Date(pa[0],pa[1]-1,pa[2]);
      });
    }

    function evoRenderCondition(){
      const box=document.getElementById('evo-subjects');
      if(!box) return;
      const dates=evoGetConditionDates();
      if(evoConditionDateIndex >= dates.length) evoConditionDateIndex=Math.max(0,dates.length-1);
      const selectedDate=dates[evoConditionDateIndex];
      const dateEl=document.getElementById('evo-condition-date');
      const prevEl=document.getElementById('evo-condition-prev');
      const nextEl=document.getElementById('evo-condition-next');
      if(dateEl) dateEl.textContent=selectedDate || '履歴';
      if(prevEl) prevEl.disabled=!dates.length || evoConditionDateIndex>=dates.length-1;
      if(nextEl) nextEl.disabled=!dates.length || evoConditionDateIndex<=0;
      if(prevEl) prevEl.classList.toggle('opacity-40', prevEl.disabled);
      if(nextEl) nextEl.classList.toggle('opacity-40', nextEl.disabled);

      const conditionRows=[];
      (subjects||[]).filter(s=>s.visible!==false && s.status!=='preparing').forEach(s=>{
        evoModeDefs(s).forEach(m=>{
          if(selectedDate){
            const rec=JSON.parse(localStorage.getItem(`history_accuracy_daily_${s.id}_${m.key}`)||'[]');
            const dayRec=rec.filter(x=>x && x.date===selectedDate);
            if(dayRec.length){
              const avg=Math.round(dayRec.reduce((a,b)=>a+Number(b.accuracy||0),0)/dayRec.length);
              conditionRows.push({s,mode:m,avg});
            }
          }else{
            const rec=JSON.parse(localStorage.getItem(`history_accuracy_${s.id}_${m.key}`)||'[]');
            if(rec.length){
              const avg=Math.round(rec.reduce((a,b)=>a+Number(b||0),0)/rec.length);
              conditionRows.push({s,mode:m,avg});
            }
          }
        });
      });
      conditionRows.sort((a,b)=>a.s.name.localeCompare(b.s.name,'ja') || a.mode.label.localeCompare(b.mode.label,'ja'));
      box.innerHTML=conditionRows.length?conditionRows.map(x=>`<div><div class="flex justify-between text-[10px] mb-1"><span class="text-slate-300 truncate pr-2">${x.s.name} <span class="text-slate-500">/ ${x.mode.label}</span></span><span class="font-mono ${x.avg<70?'text-rose-400':'text-amber-400'}">${x.avg}%</span></div><div class="evo-progress"><span style="width:${x.avg}%"></span></div></div>`).join(''):`<div class="text-[11px] text-slate-500 text-center py-4">${selectedDate?'この日の演習履歴がありません。':'まだ演習履歴がありません。'}</div>`;
    }

    function evoConditionPrevDate(){
      const dates=evoGetConditionDates();
      if(evoConditionDateIndex < dates.length-1){ evoConditionDateIndex++; evoRenderCondition(); }
    }

    function evoConditionNextDate(){
      const dates=evoGetConditionDates();
      if(evoConditionDateIndex > 0){ evoConditionDateIndex--; evoRenderCondition(); }
    }

    function evoGetFirstAccuracyRecorded() {
      const byDate = {};
      Object.keys(localStorage).forEach(key => {
        if (!key.startsWith('history_accuracy_daily_')) return;
        try {
          const records = JSON.parse(localStorage.getItem(key) || '[]');
          records.forEach(record => {
            if (!record || !record.date || !Number.isFinite(Number(record.accuracy))) return;
            if (!byDate[record.date]) byDate[record.date] = { sum: 0, count: 0 };
            byDate[record.date].sum += Number(record.accuracy);
            byDate[record.date].count += 1;
          });
        } catch (_) {}
      });
      const dates = Object.keys(byDate).sort((a, b) => {
        const pa = a.split('/').map(Number), pb = b.split('/').map(Number);
        return new Date(pa[0], pa[1] - 1, pa[2]) - new Date(pb[0], pb[1] - 1, pb[2]);
      });
      if (!dates.length) return null;
      const first = byDate[dates[0]];
      return Math.round(first.sum / first.count);
    }

    function evoRecordStudyCompletion(now, result) {
      const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
      const days = JSON.parse(localStorage.getItem('study_days') || '[]');
      if (!days.includes(dateStr)) {
        days.push(dateStr);
        if (days.length > 1000) days.splice(0, days.length - 1000);
        localStorage.setItem('study_days', JSON.stringify(days));
      }
      const previousDate = localStorage.getItem('study_last_date');
      let streak = Number(localStorage.getItem('study_streak') || 0);
      if (previousDate !== dateStr) {
        if (previousDate) {
          const previousParts = previousDate.split('/').map(Number);
          const previousDay = new Date(previousParts[0], previousParts[1] - 1, previousParts[2]);
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const diffDays = Math.round((today - previousDay) / 86400000);
          streak = diffDays === 1 ? streak + 1 : 1;
        } else {
          streak = 1;
        }
        localStorage.setItem('study_last_date', dateStr);
        localStorage.setItem('study_streak', String(streak));
      }

      if (localStorage.getItem('nurse_plus_accuracy_baseline') === null) {
        const firstRecordedAccuracy = evoGetFirstAccuracyRecorded();
        localStorage.setItem('nurse_plus_accuracy_baseline', String(firstRecordedAccuracy === null ? result.accRate : firstRecordedAccuracy));
      }
      const sessions = JSON.parse(localStorage.getItem('nurse_plus_study_sessions') || '[]');
      sessions.push({
        date: dateStr,
        timestamp: `${dateStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        score: Number(result.score || 0),
        total: Number(result.total || 0),
        accuracy: Number(result.accRate || 0),
        durationSeconds: Number(result.durationSeconds || 0)
      });
      if (sessions.length > 1000) sessions.splice(0, sessions.length - 1000);
      localStorage.setItem('nurse_plus_study_sessions', JSON.stringify(sessions));
    }

    function evoGetAccuracyTrendData() {
      const subjectList = Array.isArray(subjects) ? subjects : (Array.isArray(defaultSubjects) ? defaultSubjects : []);
      const subjectData = [];
      const allDates = new Set();

      subjectList.forEach(subject => {
        if (!subject || !subject.id) return;
        const byDate = {};
        const prefix = `history_accuracy_daily_${subject.id}_`;
        Object.keys(localStorage).forEach(key => {
          if (!key.startsWith(prefix)) return;
          try {
            const records = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(records)) return;
            records.forEach(record => {
              if (!record || !record.date || !Number.isFinite(Number(record.accuracy))) return;
              if (!byDate[record.date]) byDate[record.date] = { sum: 0, count: 0 };
              byDate[record.date].sum += Number(record.accuracy);
              byDate[record.date].count += 1;
              allDates.add(record.date);
            });
          } catch (_) {}
        });
        const daily = {};
        Object.entries(byDate).forEach(([date, item]) => {
          daily[date] = Math.round(item.sum / item.count);
        });
        if (Object.keys(daily).length) {
          subjectData.push({
            id: subject.id,
            name: subject.name || subject.code || subject.id,
            daily
          });
        }
      });

      const sortDate = (a, b) => {
        const pa = a.split('/').map(Number), pb = b.split('/').map(Number);
        return new Date(pa[0], pa[1] - 1, pa[2]) - new Date(pb[0], pb[1] - 1, pb[2]);
      };
      const dates = Array.from(allDates).sort(sortDate).slice(-7);
      const daily = dates.map(date => {
        const values = subjectData
          .filter(subject => Number.isFinite(subject.daily[date]))
          .map(subject => subject.daily[date]);
        return {
          date,
          accuracy: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
        };
      });
      const subjectsWithAverages = subjectData.map(subject => {
        const values = dates.filter(date => Number.isFinite(subject.daily[date])).map(date => subject.daily[date]);
        return {
          id: subject.id,
          name: subject.name,
          daily: subject.daily,
          accuracy: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
          records: values.length
        };
      });
      return { subjects: subjectsWithAverages, dates, daily };
    }

    function evoRenderAccuracyTrend() {
      const box = document.getElementById('evo-accuracy-trend');
      const summary = document.getElementById('evo-trend-summary');
      if (!box) return;
      const chart = evoGetAccuracyTrendData();
      const data = chart.subjects;
      if (!data.length || !chart.dates.length) {
        box.style.gridTemplateColumns = '';
        box.style.display = '';
        box.innerHTML = '<div class="col-span-7 text-center text-[11px] text-slate-500 py-8">まだ演習履歴がありません。</div>';
        if (summary) summary.textContent = '演習を完了すると、科目別の縦棒と日別の正答率推移が表示されます。';
        return;
      }

      const width = 1000;
      const plotTop = 12;
      const baseline = 112;
      const plotHeight = baseline - plotTop;
      const colors = ['#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#22d3ee', '#f97316', '#a3e635', '#f472b6', '#818cf8'];
      const lineColor = '#e879f9';
      const dayWidth = width / chart.dates.length;
      const groupWidth = dayWidth * 0.72;
      const barGap = 2;
      const barWidth = Math.max(3, Math.min(18, (groupWidth - barGap * Math.max(0, data.length - 1)) / data.length));
      const yFor = value => baseline - (Math.max(0, Math.min(100, value)) / 100) * plotHeight;
      const bars = [];
      chart.dates.forEach((date, dayIndex) => {
        const groupStart = dayIndex * dayWidth + (dayWidth - (data.length * barWidth + Math.max(0, data.length - 1) * barGap)) / 2;
        data.forEach((subject, subjectIndex) => {
          const value = subject.daily[date];
          if (!Number.isFinite(value)) return;
          const height = Math.max(2, baseline - yFor(value));
          const x = groupStart + subjectIndex * (barWidth + barGap);
          bars.push(`<rect x="${x}" y="${baseline - height}" width="${barWidth}" height="${height}" rx="2" fill="${colors[subjectIndex % colors.length]}" opacity="0.88"><title>${subject.name}: ${value}%（${date}）</title></rect>`);
        });
      });
      const subjectLines = data.map((subject, subjectIndex) => {
        const color = colors[subjectIndex % colors.length];
        const points = chart.dates.map((date, index) => Number.isFinite(subject.daily[date]) ? (index + 0.5) * dayWidth + ',' + yFor(subject.daily[date]) : null);
        const segments = [];
        let segment = [];
        points.forEach(point => { if (point) segment.push(point); else { if (segment.length > 1) segments.push(segment); segment = []; } });
        if (segment.length > 1) segments.push(segment);
        const lines = segments.map(pointsInSegment => '<polyline points="' + pointsInSegment.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>').join('');
        const dots = chart.dates.map((date, index) => { const value = subject.daily[date]; if (!Number.isFinite(value)) return ''; return '<circle cx="' + ((index + 0.5) * dayWidth) + '" cy="' + yFor(value) + '" r="3.5" fill="' + color + '" stroke="#ffffff" stroke-width="1"><title>' + subject.name + ': ' + value + '% (' + date + ')</title></circle>'; }).join('');
        return lines + dots;
      }).join('');
      const overallPoints = chart.daily.map((item, index) => Number.isFinite(item.accuracy) ? (index + 0.5) * dayWidth + ',' + yFor(item.accuracy) : null);
      const overallSegments = [];
      let overallSegment = [];
      overallPoints.forEach(point => { if (point) overallSegment.push(point); else { if (overallSegment.length > 1) overallSegments.push(overallSegment); overallSegment = []; } });
      if (overallSegment.length > 1) overallSegments.push(overallSegment);
      const overallLine = overallSegments.map(pointsInSegment => '<polyline points="' + pointsInSegment.join(' ') + '" fill="none" stroke="' + lineColor + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"></polyline>').join('');
      const overallDots = chart.daily.map((item, index) => Number.isFinite(item.accuracy) ? '<circle cx="' + ((index + 0.5) * dayWidth) + '" cy="' + yFor(item.accuracy) + '" r="4" fill="' + lineColor + '" stroke="#ffffff" stroke-width="1.5"><title>全体正答率: ' + item.accuracy + '% (' + item.date + ')</title></circle>' : '').join('');
      const dateLabels = chart.dates.map((date, index) => {
        const parts = date.split('/');
        const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
        return `<text x="${(index + 0.5) * dayWidth}" y="132" text-anchor="middle" font-size="12" fill="#94a3b8">${label}</text>`;
      }).join('');

      box.style.display = 'block';
      box.style.gridTemplateColumns = '';
      box.style.minHeight = '0';
      box.classList.add('relative');
      box.innerHTML = `
        <svg aria-label="日別・科目別正答率の縦棒と科目別正答率の折れ線グラフ" role="img" viewBox="0 0 ${width} 140" preserveAspectRatio="none" class="block w-full" style="height:150px;overflow:visible">
          <line x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" stroke="#64748b" stroke-opacity="0.35" stroke-width="1"></line>
          ${bars.join('')}
          ${subjectLines}
          ${overallLine}
          ${overallDots}
          ${dateLabels}
        </svg>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          ${data.map((subject, index) => `<span class="inline-flex items-center gap-1 text-[9px] text-slate-400"><span class="inline-block w-2 h-2 rounded-sm" style="background:${colors[index % colors.length]}"></span>${subject.name}</span>`).join('')}
          <span class="inline-flex items-center gap-1 text-[9px] text-slate-400"><span class="inline-block w-3 border-t-2 border-dashed" style="border-color:${lineColor}"></span>全体正答率</span>
        </div>`;
      if (summary) {
        const best = data.reduce((a, b) => b.accuracy > a.accuracy ? b : a);
        const lowest = data.reduce((a, b) => b.accuracy < a.accuracy ? b : a);
        summary.textContent = data.length > 1
          ? `縦棒・折れ線ともに科目別の正答率（直近${chart.dates.length}学習日）。科目平均の最高：${best.name} ${best.accuracy}%／最低：${lowest.name} ${lowest.accuracy}%`
          : `縦棒・折れ線ともに${data[0].name}の日別正答率（直近${chart.dates.length}学習日）。`;
      }
    }

    function evoRenderGrowth() {
      const startEl = document.getElementById('evo-growth-start');
      const currentEl = document.getElementById('evo-growth-current');
      const deltaEl = document.getElementById('evo-growth-delta');
      const note = document.getElementById('evo-growth-note');
      if (!startEl || !currentEl || !deltaEl) return;
      const baselineRaw = localStorage.getItem('nurse_plus_accuracy_baseline');
      const stats = evoGetStats();
      if (baselineRaw === null || stats.avg === null) {
        startEl.textContent = '--'; currentEl.textContent = '--'; deltaEl.textContent = '--';
        if (note) note.textContent = '最初の演習を完了すると成長記録が始まります。';
        return;
      }
      const baseline = Number(baselineRaw);
      const delta = stats.avg - baseline;
      startEl.textContent = `${baseline}%`;
      currentEl.textContent = `${stats.avg}%`;
      deltaEl.textContent = `${delta > 0 ? '+' : ''}${delta}pt`;
      deltaEl.className = `text-lg font-mono font-bold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-300'}`;
      if (note) note.textContent = '保存されている最古の正答率記録と、演習履歴の平均を比較しています。';
    }

    function evoScrollRecentStudyCarousel(index) {
      const carousel = document.getElementById('evo-recent-study-carousel');
      if (!carousel) return;
      carousel.scrollTo({ left: index * carousel.clientWidth, behavior: 'smooth' });
      const dots = carousel.parentElement ? carousel.parentElement.querySelectorAll('[aria-label="カルーセルのページ"] button') : [];
      dots.forEach((dot, dotIndex) => {
        dot.classList.add('bg-white');
        dot.classList.toggle('opacity-100', dotIndex === index);
        dot.classList.toggle('opacity-40', dotIndex !== index);
      });
    }

    function evoRenderSubjectBarLineChart(now = new Date()) {
      const recordsEl = document.getElementById('evo-recent-7d-records');
      const analyticsScreen = document.getElementById('screen-analytics-addition');
      if (!recordsEl && !analyticsScreen) return;
      let chartCard = document.getElementById('evo-subject-bar-line-chart-card');
      if (!chartCard) {
        chartCard = document.createElement('section');
        chartCard.id = 'evo-subject-bar-line-chart-card';
        chartCard.className = 'evo-card mb-4';
        chartCard.innerHTML = '<div class="flex items-start justify-between gap-3 mb-3"><div><div class="text-xs font-semibold text-slate-200">科目別正答率の推移</div><div class="text-[10px] text-slate-500 mt-1">直近7日間・科目別</div></div><span class="evo-chip">7 DAYS</span></div><div id="evo-subject-bar-line-chart"></div><p id="evo-subject-bar-line-chart-note" class="text-[10px] text-slate-500 mt-2">科目ごとに色分け：縦棒と折れ線で表示</p>';
      }
      // グラフは「データ分析」画面内の統計カードの下、
      // 「直近7日間の学習記録」セクションの直上へ配置する。
      // recordsElは別画面側の要素なので、配置先の判定には使わない。
      if (analyticsScreen) {
        const recentSection = Array.from(analyticsScreen.querySelectorAll('section'))
          .find(section => section.querySelector('h3')?.textContent.trim() === '直近7日間の学習記録');
        if (recentSection) {
          recentSection.parentNode.insertBefore(chartCard, recentSection);
        } else {
          // 分析画面のDOM再構築中のみ、画面内末尾へ退避する。
          analyticsScreen.appendChild(chartCard);
        }
      } else {
        const recentCard = recordsEl ? (recordsEl.closest('.evo-card') || recordsEl.parentElement) : null;
        if (recentCard && recentCard.parentNode) {
          recentCard.parentNode.insertBefore(chartCard, recentCard);
        } else if (recordsEl && recordsEl.parentNode) {
          recordsEl.parentNode.insertBefore(chartCard, recordsEl);
        }
      }
      const box = document.getElementById('evo-subject-bar-line-chart');
      const note = document.getElementById('evo-subject-bar-line-chart-note');
      if (!box) return;
      const toKey = date => `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      const dates = Array.from({length:7}, (_, i) => toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i)));
      const list = Array.isArray(subjects) ? subjects : (Array.isArray(defaultSubjects) ? defaultSubjects : []);
      const colors = ['#60a5fa','#34d399','#fbbf24','#fb7185','#c084fc','#22d3ee','#f97316','#a3e635','#f472b9','#818cf8','#fb923c','#2dd4bf'];
      const data = [];
      list.forEach(subject => {
        if (!subject || !subject.id) return;
        const daily = {};
        dates.forEach(date => { daily[date] = null; });
        Object.keys(localStorage).forEach(key => {
          if (!key.startsWith(`history_accuracy_daily_${subject.id}_`)) return;
          try {
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(saved)) return;
            saved.forEach(record => {
              if (!record || !dates.includes(record.date) || !Number.isFinite(Number(record.accuracy))) return;
              daily[record.date] = daily[record.date] === null ? Number(record.accuracy) : (daily[record.date] + Number(record.accuracy)) / 2;
            });
          } catch (_) {}
        });
        if (dates.some(date => Number.isFinite(daily[date]))) data.push({name:subject.name || subject.code || subject.id, daily});
      });
      if (!data.length) {
        box.innerHTML = '<div class="text-center text-[11px] text-slate-500 py-5">まだ科目別の正答率記録がありません。</div>';
        if (note) note.textContent = '演習履歴が保存されると、科目ごとの縦棒と折れ線が表示されます。';
        return;
      }
      const width=700, height=220, left=28, right=8, top=12, bottom=34;
      const plotW=width-left-right, plotH=height-top-bottom, base=top+plotH;
      const x=i=>left+(i+.5)*(plotW/7), y=v=>top+(100-Math.max(0,Math.min(100,v)))*plotH/100;
      const dayW=plotW/7, groupW=dayW*.76, gap=2;
      const barW=Math.max(3,Math.min(16,(groupW-gap*Math.max(0,data.length-1))/data.length));
      let bars='', lines='', legend='';
      [0,50,100].forEach(v=>{bars+=`<line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".12"/><text x="${left-5}" y="${y(v)+4}" fill="#94a3b8" text-anchor="end" font-size="10">${v}</text>`;});
      dates.forEach((date,di)=>{
        const start=left+di*dayW+(dayW-(data.length*barW+Math.max(0,data.length-1)*gap))/2;
        data.forEach((subject,si)=>{
          const v=subject.daily[date]; if(!Number.isFinite(v)) return;
          const color=colors[si%colors.length], bx=start+si*(barW+gap);
          bars+=`<rect class="evo-subject-chart-bar" x="${bx}" y="${y(v)}" width="${barW}" height="${Math.max(1,base-y(v))}" rx="2" fill="${color}" opacity=".36"><title>${subject.name}: ${Math.round(v)}%（${date}）</title></rect>`;
        });
        const label=date.split('/').slice(1).join('/');
        bars+=`<text x="${x(di)}" y="${height-12}" fill="#94a3b8" text-anchor="middle" font-size="10">${label}</text>`;
      });
      data.forEach((subject,si)=>{
        const color=colors[si%colors.length];
        const points=dates.map((date,i)=>{
          const value=subject.daily[date];
          if(!Number.isFinite(value)) return null;
          const groupStart=left+i*dayW+(dayW-(data.length*barW+Math.max(0,data.length-1)*gap))/2;
          const barCenter=groupStart+si*(barW+gap)+barW/2;
          return {x:barCenter,y:y(value),v:value,date};
        });
        let segment=[];
        const flush=()=>{if(segment.length>1) lines+=`<polyline points="${segment.map(p=>p.x+','+p.y).join(' ')}" fill="none" class="evo-subject-chart-line" stroke="${color}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;segment=[];};
        points.forEach(p=>{if(!p){flush();return;}segment.push(p);lines+=`<circle class="evo-subject-chart-point" cx="${p.x}" cy="${p.y}" r="3" fill="${color}" stroke="#fff" stroke-width="1"><title>${subject.name}: ${Math.round(p.v)}%（${p.date}）</title></circle>`;});
        flush();
        legend+=`<span class="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><span class="inline-block w-2 h-2 rounded-full" style="background:${color}"></span>${subject.name}</span>`;
      });
      box.innerHTML=`<svg role="img" aria-label="直近7日間の科目別正答率。縦棒と折れ線を科目ごとに色分け" viewBox="0 0 ${width} ${height}" class="block w-full" style="height:auto;max-height:260px;overflow:visible">${bars}${data.length?lines:''}</svg><div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">${legend}</div>`;
      // Infographic motion: draw thin trend lines, raise bars from the baseline, then reveal data points.
      // Respect the user's reduced-motion accessibility preference.
      const chartSvg = box.querySelector('svg');
      const reduceChartMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (chartSvg && !reduceChartMotion) {
        chartSvg.querySelectorAll('.evo-subject-chart-bar').forEach((bar, index) => {
          bar.style.transformBox = 'fill-box';
          bar.style.transformOrigin = 'center bottom';
          bar.style.transform = 'scaleY(0)';
          bar.style.opacity = '0.12';
          bar.style.transition = 'transform 900ms cubic-bezier(.22,1,.36,1) ' + Math.min(index * 28, 560) + 'ms, opacity 500ms ease ' + Math.min(index * 28, 560) + 'ms';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            bar.style.transform = 'scaleY(1)';
            bar.style.opacity = '.36';
          }));
        });
        chartSvg.querySelectorAll('.evo-subject-chart-line').forEach((line, index) => {
          try {
            const length = line.getTotalLength();
            if (!Number.isFinite(length) || length <= 0) return;
            line.style.strokeDasharray = String(length);
            line.style.strokeDashoffset = String(length);
            line.style.transition = 'stroke-dashoffset 1250ms cubic-bezier(.22,1,.36,1) ' + Math.min(index * 140, 700) + 'ms';
            requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; }));
          } catch (_) {}
        });
        chartSvg.querySelectorAll('.evo-subject-chart-point').forEach((point, index) => {
          point.style.transformBox = 'fill-box';
          point.style.transformOrigin = 'center';
          point.style.transform = 'scale(.25)';
          point.style.opacity = '0';
          point.style.transition = 'transform 420ms cubic-bezier(.22,1,.36,1) ' + (Math.min(index * 55, 900) + 550) + 'ms, opacity 350ms ease ' + (Math.min(index * 55, 900) + 550) + 'ms';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            point.style.transform = 'scale(1)';
            point.style.opacity = '1';
          }));
        });
      }
      if(note) note.textContent='縦棒：各日の正答率／細い折れ線：科目ごとの推移。記録のない日は線でつないでいません。';
    }
    // 追加分析画面の描画完了後からも呼び出せるように公開する。
    window.evoRenderSubjectBarLineChart = evoRenderSubjectBarLineChart;

    function evoRenderRecentStudyCarousel(now = new Date()) {
      const accuracyEl = document.getElementById('evo-recent-7d-accuracy');
      const summaryEl = document.getElementById('evo-recent-7d-summary');
      const recordsEl = document.getElementById('evo-recent-7d-records');
      if (!accuracyEl || !summaryEl || !recordsEl) return;
      evoRenderSubjectBarLineChart(now);
      let allSessions = [];
      try {
        const saved = JSON.parse(localStorage.getItem('nurse_plus_study_sessions') || '[]');
        if (Array.isArray(saved)) allSessions = saved;
      } catch (_) {}
      const toKey = date => `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      const startKey = toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      const endKey = toKey(now);
      const sessions = allSessions.filter(item => item && item.date && item.date >= startKey && item.date <= endKey)
        .sort((a, b) => String(b.timestamp || b.date).localeCompare(String(a.timestamp || a.date)));
      const totalQuestions = sessions.reduce((sum, item) => sum + Math.max(0, Number(item.total || 0)), 0);
      const totalCorrect = sessions.reduce((sum, item) => sum + Math.max(0, Number(item.score || 0)), 0);
      accuracyEl.textContent = totalQuestions ? `${Math.round(totalCorrect / totalQuestions * 100)}%` : '--';
      summaryEl.textContent = sessions.length
        ? `演習${sessions.length}回・${totalQuestions}問を集計`
        : '直近7日間の記録はまだありません。演習を完了すると集計されます。';
      if (!sessions.length) {
        recordsEl.innerHTML = '<p class="text-[10px] text-slate-500">直近7日間の学習記録はありません。</p>';
        return;
      }
      recordsEl.innerHTML = sessions.slice(0, 5).map(item => {
        const date = String(item.timestamp || item.date);
        const total = Math.max(0, Number(item.total || 0));
        const score = Math.max(0, Number(item.score || 0));
        const accuracy = total ? Math.round(score / total * 100) : Number(item.accuracy || 0);
        return '<div class="flex items-center justify-between gap-3 rounded-lg bg-slate-800/40 px-3 py-2"><div><div class="font-medium text-slate-200">' + date + '</div><div class="mt-0.5 text-[10px] text-slate-500">' + total + '問中 ' + score + '問正解</div></div><div class="shrink-0 font-mono font-semibold text-amber-400">' + accuracy + '%</div></div>';
      }).join('');
    }

    window.evoStudyReportPeriod = window.evoStudyReportPeriod || 'month';

    function evoSetReportPeriod(period) {
      window.evoStudyReportPeriod = period === 'week' ? 'week' : 'month';
      evoRenderMonthlyReport(new Date());
    }

    function evoRenderMonthlyReport(now = new Date()) {
      const label = document.getElementById('evo-month-label');
      const title = document.getElementById('evo-report-title');
      const sessionsEl = document.getElementById('evo-month-sessions');
      const questionsEl = document.getElementById('evo-month-questions');
      const accuracyEl = document.getElementById('evo-month-accuracy');
      const accuracyLabel = document.getElementById('evo-report-accuracy-label');
      const timeEl = document.getElementById('evo-month-time');
      const note = document.getElementById('evo-month-note');
      const monthButton = document.getElementById('evo-report-month-button');
      const weekButton = document.getElementById('evo-report-week-button');
      if (!sessionsEl || !questionsEl || !accuracyEl || !timeEl) return;

      const period = window.evoStudyReportPeriod === 'week' ? 'week' : 'month';
      const year = now.getFullYear(), month = now.getMonth();
      let sessions = [];
      if (period === 'week') {
        const end = new Date(year, month, now.getDate());
        const start = new Date(year, month, now.getDate() - 6);
        const toKey = date => `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        const startKey = toKey(start), endKey = toKey(end);
        sessions = JSON.parse(localStorage.getItem('nurse_plus_study_sessions') || '[]')
          .filter(item => item && item.date && item.date >= startKey && item.date <= endKey);
        if (label) label.textContent = '直近7日';
        if (title) title.textContent = '自分専用の学習レポート';
        if (accuracyLabel) accuracyLabel.textContent = '週間正答率';
        if (note) note.textContent = sessions.length
          ? '直近7日間の演習完了時に保存された記録を集計しています。'
          : '直近7日間の記録はまだありません。演習を完了すると集計されます。';
      } else {
        sessions = JSON.parse(localStorage.getItem('nurse_plus_study_sessions') || '[]')
          .filter(item => item && item.date && item.date.startsWith(`${year}/${String(month + 1).padStart(2, '0')}/`));
        if (label) label.textContent = `${year}年${month + 1}月`;
        if (title) title.textContent = '自分専用の学習レポート';
        if (accuracyLabel) accuracyLabel.textContent = '月間正答率';
        if (note) note.textContent = sessions.length
          ? '演習完了時に保存された記録を集計しています。学習時間は演習開始から完了までの経過時間です。'
          : '今月の記録はまだありません。演習を完了すると集計されます。';
      }
      if (monthButton) {
        monthButton.setAttribute('aria-pressed', String(period === 'month'));
        monthButton.className = `px-3 py-1.5 rounded-lg border text-[10px] font-medium transition ${period === 'month' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}`;
      }
      if (weekButton) {
        weekButton.setAttribute('aria-pressed', String(period === 'week'));
        weekButton.className = `px-3 py-1.5 rounded-lg border text-[10px] font-medium transition ${period === 'week' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}`;
      }

      const totalQuestions = sessions.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalCorrect = sessions.reduce((sum, item) => sum + Number(item.score || 0), 0);
      const totalSeconds = sessions.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0);
      const hours = Math.floor(totalSeconds / 3600), minutes = Math.floor((totalSeconds % 3600) / 60);
      sessionsEl.textContent = String(sessions.length);
      questionsEl.textContent = String(totalQuestions);
      accuracyEl.textContent = totalQuestions ? `${Math.round(totalCorrect / totalQuestions * 100)}%` : '--';
      timeEl.textContent = hours ? `${hours}時間${minutes}分` : `${minutes}分`;
    }

    function renderDashboard() {
      const st=evoGetStats();
      const today = new Date();
      const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
      const streak=Number(localStorage.getItem('study_streak')||0);
      const done=Number(localStorage.getItem('evo_today_done')||0);
      const streakEl=document.getElementById('evo-streak'); if(streakEl) streakEl.textContent=streak;
      const left=document.getElementById('evo-mission-left'); if(left) left.textContent=Math.max(0,10-done);
      const doneEl=document.getElementById('evo-mission-done'); if(doneEl) doneEl.textContent=`${Math.min(done,10)}問完了`;
      const prog=document.getElementById('evo-mission-progress'); if(prog) prog.style.width=`${Math.min(done,10)*10}%`;
      const ta=document.getElementById('evo-total-attempts'); if(ta) ta.textContent=st.attempts;
      const av=document.getElementById('evo-avg'); if(av) av.textContent=st.avg===null?'--':`${st.avg}%`;
      const be=document.getElementById('evo-best'); if(be) be.textContent=st.best===null?'--':`${st.best}%`;
      evoConditionDateIndex=0;
      evoRenderCondition();
      evoRenderAccuracyTrend();
      evoRenderGrowth();
    }

    function showDashboard(){
      hideAllScreens();
      const bottomMenuEnabled = document.documentElement.classList.contains('np-bottom-menu-enabled');
      const el = document.getElementById(bottomMenuEnabled ? 'screen-dashboard-bottom-menu' : 'screen-dashboard');
      if(el) el.classList.remove('hidden');
      if (bottomMenuEnabled) {
        renderSubjectList();
      } else {
        renderDashboard();
      }
    }
    function showDataAnalysis(){
      hideAllScreens();
      const el=document.getElementById('screen-data-analysis');
      if(el) el.classList.remove('hidden');
      if (window.NursePlusAnalyticsAddition && typeof window.NursePlusAnalyticsAddition.open === 'function') {
        window.NursePlusAnalyticsAddition.open();
      } else {
        const originalAnalytics = document.getElementById('screen-analytics-addition');
        if (originalAnalytics) originalAnalytics.classList.remove('hidden');
        if (window.NursePlusAnalyticsAddition && typeof window.NursePlusAnalyticsAddition.render === 'function') {
          window.NursePlusAnalyticsAddition.render();
        }
      }
      evoRenderGrowth();
      // 追加分析画面の open() が別セクションへスクロールするため、
      // 正答率推移を含むデータ分析画面を最後に表示位置へ戻す。
      if (el) requestAnimationFrame(() => {
        if (el.isConnected && !el.classList.contains('hidden')) {
          el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      });
    }
    function evoStartPractice(){
      showSubjectScreen();
      const first=(subjects||[]).find(s=>s.visible!==false && s.status!=='preparing');
      if(first) selectSubject(first.id);
    }
    function evoOpenWeak(){ showSubjectScreen(); }
    function evoOpenWrong() {
      const entries = getWrongQuestionReviewRecords().filter(item => item && Number(item.wrongCount || 0) > Number(item.correctCount || 0) && item.question);
      const previous = document.getElementById('nurse-plus-wrong-review-modal');
      if (previous) previous.remove();
      const overlay = document.createElement('div');
      overlay.id = 'nurse-plus-wrong-review-modal';
      overlay.className = 'fixed inset-0 z-[99990] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      const card = document.createElement('div');
      card.className = 'w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl';
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between gap-3 border-b border-slate-700 pb-3';
      const title = document.createElement('h2');
      title.className = 'serif-title text-lg text-slate-100';
      title.textContent = '間違えた問題の復習';
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800'; close.textContent = '✕';
      close.addEventListener('click', () => overlay.remove());
      header.append(title, close);
      card.appendChild(header);
      const intro = document.createElement('p');
      intro.className = 'my-3 text-xs leading-5 text-slate-400';
      intro.textContent = '間違いが正解回数を上回る問題を科目・モード別にまとめました。復習で正解を重ねると、対象から外れていきます。';
      card.appendChild(intro);
      if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-center text-sm text-slate-300';
        empty.textContent = '復習する問題はまだありません。問題演習で間違えた問題がここに保存されます。';
        card.appendChild(empty);
      } else {
        const groups = new Map();
        entries.forEach(item => {
          const groupKey = item.context && item.context.historyKey ? item.context.historyKey : item.subjectId;
          if (!groups.has(groupKey)) groups.set(groupKey, []);
          groups.get(groupKey).push(item);
        });
        groups.forEach(group => {
          const first = group[0];
          const section = document.createElement('section');
          section.className = 'mt-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3';
          const groupTitle = document.createElement('div');
          groupTitle.className = 'text-sm font-semibold text-slate-100';
          groupTitle.textContent = first.subjectName || first.subjectId || '科目';
          const mode = document.createElement('div');
          mode.className = 'mt-1 text-[10px] text-slate-400';
          mode.textContent = (first.context && first.context.modeLabel ? first.context.modeLabel : '演習') + ' ・ 復習対象 ' + group.length + '問';
          section.append(groupTitle, mode);
          group.slice(0, 3).forEach(item => {
            const preview = document.createElement('p');
            preview.className = 'mt-2 text-[11px] leading-5 text-slate-300';
            preview.textContent = '・' + String(item.question.q || '問題文なし').slice(0, 100);
            section.appendChild(preview);
          });
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mt-3 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition';
          button.textContent = 'この科目・モードを復習する';
          button.addEventListener('click', () => evoLaunchWrongReview(group, overlay));
          section.appendChild(button);
          card.appendChild(section);
        });
      }
      overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      close.focus();
    }

    function evoLaunchWrongReview(group, overlay) {
      if (!Array.isArray(group) || !group.length) return;
      const first = group[0];
      const context = first.context || {};
      const targetSubject = (subjects || []).find(subject => subject.id === first.subjectId);
      if (!targetSubject) {
        alert('この問題の科目を見つけられませんでした。科目一覧を開いてください。');
        return;
      }
      currentSubject = targetSubject;
      currentSemester = context.semester || currentSemester;
      currentRound = context.round ?? null;
      currentPathologyRound = context.pathologyRound ?? null;
      currentPathologyMode = context.pathologyMode || currentPathologyMode;
      currentBiochemistryFormat = context.biochemistryFormat || currentBiochemistryFormat;
      currentPhysiologyMode = context.physiologyMode || currentPhysiologyMode;
      currentAnatomyMode = context.anatomyMode || currentAnatomyMode;
      currentPublicHealthMode = context.publicHealthMode || currentPublicHealthMode;
      currentPHNMode = context.phnMode || currentPHNMode;
      currentPharmacologyMode = context.pharmacologyMode || currentPharmacologyMode;
      currentNursingMethod3Mode = context.nursingMethod3Mode || currentNursingMethod3Mode;
      activeQuestions = group.map(item => JSON.parse(JSON.stringify(item.question)));
      currentQIndex = 0;
      score = 0;
      prioritizeWeakQuestions = false;
      if (overlay) overlay.remove();
      hideAllScreens();
      const quizScreen = document.getElementById('screen-quiz-play');
      if (quizScreen) quizScreen.classList.remove('hidden');
      renderQuestion();
    }

    function updateStudyBreadcrumb() {
      const nav = document.getElementById('study-breadcrumbs');
      const list = document.getElementById('study-breadcrumb-list');
      if (!nav || !list) return;

      const screenStages = [
        ['screen-semester-select', '学期選択'],
        ['screen-physiology-mode-select', 'モード選択'],
        ['screen-anatomy-mode-select', 'モード選択'],
        ['screen-publichealth-mode-select', 'モード選択'],
        ['screen-phn-mode-select', 'モード選択'],
        ['screen-pathology-mode-select', 'モード選択'],
        ['screen-pathology-round-select', '回数選択'],
        ['screen-pharmacology-mode-select', 'モード選択'],
        ['screen-nursing-mode-select', 'モード選択'],
        ['screen-nursing-method-3-mode-select', 'モード選択'],
        ['screen-nutrition-mode-select', 'モード選択'],
        ['screen-biochemistry-format-select', '出題形式'],
        ['screen-time-select', '制限時間'],
        ['screen-round-select', '出題モード'],
        ['screen-count-select', '出題数'],
        ['screen-quiz-start', '演習開始']
      ];
      const activeStage = screenStages.find(([id]) => {
        const screen = document.getElementById(id);
        return screen && !screen.classList.contains('hidden');
      });

      // パンくずが表示される学習画面では、同じ移動先のヘッダー戻るボタンを重ねて表示しない。
      const breadcrumbStageActive = Boolean(activeStage && currentSubject);
      screenStages.forEach(([id]) => {
        const screen = document.getElementById(id);
        if (!screen) return;
        screen.querySelectorAll('button[onclick]').forEach((button) => {
          const action = button.getAttribute('onclick') || '';
          const duplicatesBreadcrumb = /showSubjectScreen\(|showSemesterSelectionScreen\(|showPathologyModeSelectionScreen\(/.test(action);
          if (!duplicatesBreadcrumb) return;
          button.classList.toggle('hidden', breadcrumbStageActive && id === activeStage[0]);
        });
      });

      if (!activeStage || !currentSubject) {
        nav.classList.add('hidden');
        list.replaceChildren();
        return;
      }

      nav.classList.remove('hidden');
      list.replaceChildren();

      const addCrumb = (label, onClick, current = false) => {
        const item = document.createElement('li');
        item.className = 'flex items-center gap-2';
        if (list.children.length) {
          const separator = document.createElement('span');
          separator.className = 'text-violet-300';
          separator.textContent = '›';
          separator.setAttribute('aria-hidden', 'true');
          item.appendChild(separator);
        }
        if (onClick && !current) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'rounded-md px-1 py-1 text-violet-700 hover:bg-violet-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400';
          button.textContent = label;
          button.addEventListener('click', onClick);
          item.appendChild(button);
        } else {
          const text = document.createElement('span');
          text.className = current ? 'px-1 py-1 font-semibold text-slate-700' : 'px-1 py-1 text-slate-500';
          text.textContent = label;
          if (current) text.setAttribute('aria-current', 'step');
          item.appendChild(text);
        }
        list.appendChild(item);
      };

      addCrumb('科目一覧', showSubjectScreen);
      addCrumb(currentSubject.name, showSemesterSelectionScreen);
      if (activeStage[0] !== 'screen-semester-select' && currentSemester) {
        const semesterLabel = currentSemester === '2026_spring' ? '2026春学期' : '2026秋学期';
        addCrumb(semesterLabel, () => selectSemester(currentSemester));
      }
      addCrumb(activeStage[1], null, true);
    }

    function hideAllScreens() {
      document.getElementById('study-breadcrumbs')?.classList.add('hidden');
      stopQuizTimer();
      const dashboard = document.getElementById('screen-dashboard');
      if (dashboard) dashboard.classList.add('hidden');
      const dataAnalysis = document.getElementById('screen-data-analysis');
      if (dataAnalysis) dataAnalysis.classList.add('hidden');
      document.getElementById('screen-subjects').classList.add('hidden');
      document.getElementById('screen-semester-select').classList.add('hidden');
      document.getElementById('screen-physiology-mode-select').classList.add('hidden');
      document.getElementById('screen-anatomy-mode-select').classList.add('hidden');
      document.getElementById('screen-publichealth-mode-select').classList.add('hidden');
      document.getElementById('screen-phn-mode-select').classList.add('hidden');
      document.getElementById('screen-pathology-mode-select').classList.add('hidden');
      document.getElementById('screen-pathology-round-select').classList.add('hidden');
      document.getElementById('screen-pharmacology-mode-select').classList.add('hidden');
      document.getElementById('screen-nursing-mode-select').classList.add('hidden');
      document.getElementById('screen-nursing-method-3-mode-select').classList.add('hidden');
      document.getElementById('screen-nutrition-mode-select').classList.add('hidden');
      document.getElementById('screen-biochemistry-format-select').classList.add('hidden');
      document.getElementById('screen-time-select').classList.add('hidden');
      document.getElementById('screen-round-select').classList.add('hidden');
      document.getElementById('screen-count-select').classList.add('hidden');
      document.getElementById('screen-quiz-start').classList.add('hidden');
      document.getElementById('screen-quiz-play').classList.add('hidden');
      document.getElementById('screen-quiz-result').classList.add('hidden');
      document.getElementById('screen-multi-lobby').classList.add('hidden');
      document.getElementById('screen-multi-room').classList.add('hidden');
      document.getElementById('screen-multi-play').classList.add('hidden');
    }

    function showSubjectScreen() {
      hideAllScreens();
      document.getElementById('screen-subjects').classList.remove('hidden');
      document.getElementById('study-breadcrumbs')?.classList.add('hidden');

      // 科目一覧へ戻るたびに暗記カード側の選択状態を初期化し、
      // 暗記カードページとページ切替ドットを再び操作できるようにする。
      flashcardSubjectLocked = false;
      const dots = document.getElementById('subject-page-dots');
      if (dots) dots.classList.remove('hidden');
      const track = document.getElementById('subjects-slider-track');
      if (track) track.style.transform = 'translateX(0%)';

      switchSubjectPage(0);
      renderSubjectList();
      renderFlashcardSubjectList();
    }

    function renderSubjectList() {
      const containers = [
        { element: document.getElementById('subject-list-container'), count: document.getElementById('subject-count-display') },
        { element: document.getElementById('bottom-menu-subject-list-container'), count: document.getElementById('bottom-menu-subject-count') }
      ].filter(target => target.element);
      const visibleSubjects = subjects.filter(s => s.visible !== false);
      containers.forEach(target => {
        if (target.count) target.count.textContent = `全${visibleSubjects.length}科目`;
        target.element.innerHTML = visibleSubjects.map(s => {
        const isPrep = s.status === 'preparing';
        const isPhysiology = s.id === 'physiology';
        const isAnatomy = s.id === 'anatomy';
        const isPublicHealth = s.id === 'public_health';
        const isPHN = s.id === 'public_health_nursing';
        const isNursing = s.id === 'nursing_method';
        const isBiochemistry = s.id === 'biochemistry';
        const statusLabel = isPrep ? '【準備中】' : (s.hasPhysiologyModes || isPhysiology ? '過去問・小テスト対応' : (s.hasAnatomyModes || isAnatomy ? '練習問題・応用問題対応' : (s.hasPublicHealthModes || isPublicHealth ? '過去問・演習問題・模擬国試対応' : (s.hasPHNModes || isPHN ? '練習問題・演習問題対応' : (s.hasBiochemistryFormats || isBiochemistry ? '選択式・記述式対応' : (s.hasNursingModes || isNursing ? '12回別問題・問題数選択可' : (s.hasRounds ? '全13回 小テスト対応' : (s.fixedCount ? `過去問演習（${s.fixedCount}問固定）` : '過去問演習・問題数選択可'))))))));
       
        const avgAcc = isPrep ? null : getAverageAccuracy(s.id);
        const avgDisplay = (avgAcc !== null) ? `${avgAcc}%` : '-- %';

        return `
          <div class="w-full overflow-hidden rounded-xl">
          <button onclick="selectSubject('${s.id}')" ${isPrep ? 'disabled' : ''} class="card-item w-full p-4 rounded-xl text-left flex items-center justify-between group">

            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">${s.code}</span>
              <div>
                <div class="text-sm font-medium text-slate-100 group-hover:text-amber-300 transition">${s.name}</div>
                ${target.element.id === 'bottom-menu-subject-list-container' ? '' : `<div class="text-[11px] ${isPrep ?  'text-amber-500/80 font-semibold' : 'text-slate-400 font-light'} mt-0.5">${statusLabel}</div>`}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-[10px] text-slate-500 font-light">平均正答率</div>
                <div class="text-xs font-mono font-semibold ${avgAcc !== null ? 'text-amber-400' : 'text-slate-600'}">${avgDisplay}</div>
              </div>
              <span class="text-slate-500 group-hover:text-amber-400 transition text-sm">${isPrep ? '🔒' : '→'}</span>
            </div>
          </button>
          ${target.element.id === 'bottom-menu-subject-list-container' ? '<button type="button" class="w-full px-4 py-2.5 flex items-center justify-center gap-2 rounded-b-xl bg-emerald-100 text-emerald-900 text-sm font-semibold"><span>暗記カード</span><span aria-hidden="true">→</span></button>' : ''}
        </div>
        `;
        }).join('');
      });
    }

    function selectSubject(subjectId) {
      currentSubject = subjects.find(s => s.id === subjectId);
      if (!currentSubject || currentSubject.status === 'preparing') return;

      showSemesterSelectionScreen();
    }

    function showSemesterSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-semester-select').classList.remove('hidden');
      updateStudyBreadcrumb();
      document.getElementById('semester-subject-title').textContent = `${currentSubject.name} - 学期選択`;

      const springBtn = document.getElementById('semester-spring-btn');
      const autumnBtn = document.getElementById('semester-autumn-btn');

      const setting = currentSubject.semesterSetting || 'all';

      if (setting === 'spring') {
        springBtn.classList.remove('hidden');
        autumnBtn.classList.add('hidden');
      } else if (setting === 'autumn') {
        springBtn.classList.add('hidden');
        autumnBtn.classList.remove('hidden');
      } else {
        springBtn.classList.remove('hidden');
        autumnBtn.classList.remove('hidden');
      }
    }

    function selectSemester(semester) {
      currentSemester = semester;

      if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) {
        showPhysiologyModeSelectionScreen();
      } else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) {
        showAnatomyModeSelectionScreen();
      } else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) {
        showPublicHealthModeSelectionScreen();
      } else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) {
        showPHNModeSelectionScreen();
      } else if (currentSubject.id === 'biochemistry' || currentSubject.hasBiochemistryFormats) {
        showBiochemistryFormatSelectionScreen();
      } else if (currentSubject.id === 'pharmacology') {
        showPharmacologyModeSelectionScreen();
      } else if (currentSubject.id === 'pathology') {
        showPathologyModeSelectionScreen();
      } else if (currentSubject.id === 'nursing_method_3') {
        showNursingMethod3ModeSelectionScreen();
      } else if (currentSubject.id === 'nutrition') {
        showNutritionModeSelectionScreen();
      } else if (currentSubject.id === 'nursing_method' || currentSubject.hasNursingModes) {
        showNursingModeSelectionScreen();
      } else if (currentSubject.hasRounds) {
        showRoundSelectionScreen();
      } else {
        currentRound = null;
        showStartScreen();
      }
    }

    function showBiochemistryFormatSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-biochemistry-format-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function showPhysiologyModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-physiology-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectPhysiologyMode(mode) {
      currentPhysiologyMode = mode;
      showStartScreen();
    }

    function showAnatomyModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-anatomy-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectAnatomyMode(mode) {
      currentAnatomyMode = mode;
      showStartScreen();
    }

    function showPublicHealthModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-publichealth-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectPublicHealthMode(mode) {
      currentPublicHealthMode = mode;
      showStartScreen();
    }

    function showPHNModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-phn-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectPHNMode(mode) {
      currentPHNMode = mode;
      showStartScreen();
    }

    function showPathologyModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-pathology-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function showPathologyRoundSelectionScreen() {
  hideAllScreens();

  const modeLabel =
    currentPathologyMode === 'quiz'
      ? '小テスト'
      : currentPathologyMode === 'practice'
        ? '小テスト練習'
        : '演習問題';

  document.getElementById('pathology-round-select-label').textContent =
    `${modeLabel}：回数を選択してください`;

  document.getElementById('screen-pathology-round-select').classList.remove('hidden');
      updateStudyBreadcrumb();
}

    function selectPathologyMode(mode) {
      currentPathologyMode = mode;
      showPathologyRoundSelectionScreen();
    }

    function selectPathologyRound(round) {
      currentPathologyRound = round;
      currentRound = round;
      showStartScreen();
    }

    function showPharmacologyModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-pharmacology-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectPharmacologyMode(mode) {
      currentPharmacologyMode = mode;
      currentRound = null;
      showStartScreen();
    }

    function showNursingMethod3ModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-nursing-method-3-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectNursingMethod3Mode(mode) {
      currentNursingMethod3Mode = mode;
      currentRound = null;
      showStartScreen();
    }

    function showNutritionModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-nutrition-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectNutritionMode(mode) {
      currentNutritionMode = mode;
      currentRound = null;
      showStartScreen();
    }

    function showNursingModeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-nursing-mode-select').classList.remove('hidden');
      updateStudyBreadcrumb();
    }

    function selectNursingMode(mode) {
      currentNursingMode = mode;
      showRoundSelectionScreen();
    }

    function showRoundSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-round-select').classList.remove('hidden');
      updateStudyBreadcrumb();
      document.getElementById('round-subject-title').textContent = `${currentSubject.name} モード選択`;

      const roundBackBtn = document.getElementById('round-back-btn');
      if (currentSubject.id === 'nursing_method' || currentSubject.hasNursingModes) {
        roundBackBtn.onclick = () => showNursingModeSelectionScreen();
      } else {
        roundBackBtn.onclick = () => showSemesterSelectionScreen();
      }
    }

    function showTimeSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-time-select').classList.remove('hidden');
      updateStudyBreadcrumb();
      document.getElementById('time-subject-title').textContent = `${currentSubject.name} 制限時間設定`;
      
      const backBtn = document.getElementById('time-back-btn');
      if (currentSubject.id === 'biochemistry' || currentSubject.hasBiochemistryFormats) {
        backBtn.onclick = () => showBiochemistryFormatSelectionScreen();
      } else {
        backBtn.onclick = () => showStartScreen();
      }
    }

    function updateTimeSliderValue(val) {
      document.getElementById('time-slider-display').textContent = val;
      QUIZ_LIMIT_TIME = parseInt(val, 10);
    }

    function proceedToCountOrStart() {
      if (currentSubject.fixedCount) {
        startQuiz();
      } else {
        showCountSelectionScreen();
      }
    }

    function showCountSelectionScreen() {
      hideAllScreens();
      document.getElementById('screen-count-select').classList.remove('hidden');
      updateStudyBreadcrumb();
      document.getElementById('count-subject-title').textContent = `${currentSubject.name} 出題数設定`;
    }

    function showStartScreen() {
      hideAllScreens();
      document.getElementById('screen-quiz-start').classList.remove('hidden');
      updateStudyBreadcrumb();

      const titleEl = document.getElementById('quiz-subject-title');
      const headingEl = document.getElementById('start-screen-heading');
      const descEl = document.getElementById('start-screen-desc');
      const countContainer = document.getElementById('count-selector-container');
      const backBtn = document.getElementById('start-back-btn');

      if (currentSubject.id === 'biochemistry' || currentSubject.hasBiochemistryFormats) {
        backBtn.onclick = () => showBiochemistryFormatSelectionScreen();
        const fmtTitle = currentBiochemistryFormat === 'keyboard' ? '記述式' : (currentBiochemistryFormat === 'fill' ? '穴埋式' : '選択式');
        titleEl.textContent = `${currentSubject.name} - ${fmtTitle}`;
        headingEl.textContent = `${currentSubject.name}（${fmtTitle}）`;
        descEl.textContent = currentBiochemistryFormat === 'keyboard'
          ? `生化学のキーボード入力（記述式）問題が出題されます。`
          : (currentBiochemistryFormat === 'fill'
            ? `生化学の穴埋式（キーボード入力）問題が出題されます。`
            : `生化学の選択式問題が出題されます。`);
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) {
        backBtn.onclick = () => showPhysiologyModeSelectionScreen();
        const modeTitle = currentPhysiologyMode === 'quiz' ? '小テスト' : '過去問';
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = currentPhysiologyMode === 'quiz'
          ? `生理学の小テスト問題が出題されます。`
          : `生理学の過去問演習問題が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) {
        backBtn.onclick = () => showAnatomyModeSelectionScreen();
        const modeTitle = currentAnatomyMode === 'applied' ? '応用問題' : '練習問題';
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = currentAnatomyMode === 'applied'
          ? `解剖学の応用・発展レベルの問題が出題されます。`
          : `解剖学の基礎・標準問題が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) {
        backBtn.onclick = () => showPublicHealthModeSelectionScreen();
        const modeTitle = currentPublicHealthMode === 'past' ? '過去問' : (currentPublicHealthMode === 'exercise' ? '演習問題' : '模擬国家試験');
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = `公衆衛生学の${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) {
        backBtn.onclick = () => showPHNModeSelectionScreen();
        const modeTitle = currentPHNMode === 'basic' ? '練習問題' : '演習問題';
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = `公衆衛生看護学概論の${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');

     
      } else if (currentSubject.id === 'pathology') {
        backBtn.onclick = () => showPathologyRoundSelectionScreen();

        const modeTitle =
          currentPathologyMode === 'quiz'
            ? '小テスト'
            : currentPathologyMode === 'practice'
              ? '小テスト練習'
              : currentPathologyMode === 'range'
                ? '小テスト範囲'
                : '演習問題';

        titleEl.textContent = `${currentSubject.name} - 第${currentPathologyRound}回${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（第${currentPathologyRound}回${modeTitle}）`;
        descEl.textContent = `病理学の第${currentPathologyRound}回${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');


      } else if (currentSubject.id === 'pharmacology') {
        backBtn.onclick = () => showPharmacologyModeSelectionScreen();
        const modeTitle = currentPharmacologyMode === 'nurse_national_6years' ? '過去6年看護師国家試験' : (currentPharmacologyMode === 'past' ? '過去問' : '演習問題');
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = `薬理学の${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'nursing_method_3') {
        backBtn.onclick = () => showNursingMethod3ModeSelectionScreen();
        const modeTitle = currentNursingMethod3Mode === 'practice' ? '練習問題' : (currentNursingMethod3Mode === 'quiz' ? '小テスト' : '演習問題');
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = `${currentSubject.name}の${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'nutrition') {
        backBtn.onclick = () => showNutritionModeSelectionScreen();
        const modeTitle = currentNutritionMode === 'exercise' ? '演習問題' : '小テスト';
        titleEl.textContent = `${currentSubject.name} - ${modeTitle}`;
        headingEl.textContent = `${currentSubject.name}（${modeTitle}）`;
        descEl.textContent = `${currentSubject.name}の${modeTitle}が出題されます。`;
        countContainer.classList.add('hidden');

      } else if (currentSubject.id === 'nursing_method' || currentSubject.hasNursingModes) {
        backBtn.onclick = () => showNursingModeSelectionScreen();
        if (currentRound === 'quiz') {
          titleEl.textContent = `${currentSubject.name} - 小テスト`;
          headingEl.textContent = `小テスト 演習`;
          descEl.textContent = `小テストの問題が出題されます。次へ進んで時間と問題数を選択してください。`;
          countContainer.classList.add('hidden');
        } else if (currentRound) {
          titleEl.textContent = `${currentSubject.name} - 第${currentRound}回`;
          headingEl.textContent = `第 ${currentRound} 回 演習`;
          descEl.textContent = `第${currentRound}回の演習を開始します。次へ進んで時間と問題数を選択してください。`;
          countContainer.classList.add('hidden');
        } else {
          titleEl.textContent = `${currentSubject.name} - 総合練習問題`;
          headingEl.textContent = `総合練習問題`;
          descEl.textContent = `全範囲の中からランダムに問題が出題されます。次へ進んで時間と問題数を選択してください。`;
          countContainer.classList.add('hidden');
        }
      } else if (currentSubject.hasRounds) {
        backBtn.onclick = () => showRoundSelectionScreen();
        if (currentRound) {
          titleEl.textContent = `${currentSubject.name} - 第${currentRound}回`;
          headingEl.textContent = `第 ${currentRound} 回 演習`;
          descEl.textContent = `第${currentRound}回の演習を開始します。次へ進んで時間と問題数を選択してください。`;
          countContainer.classList.add('hidden');
        } else {
          titleEl.textContent = `${currentSubject.name} - 総合練習問題`;
          headingEl.textContent = `総合練習問題`;
          descEl.textContent = `全範囲の中からランダムに問題が出題されます。次へ進んで時間と問題数を選択してください。`;
          countContainer.classList.add('hidden');
        }
      } else {
        backBtn.onclick = () => showSemesterSelectionScreen();
        titleEl.textContent = currentSubject.name;
        headingEl.textContent = `${currentSubject.name} 演習問題`;
       
        descEl.textContent = `データベースから問題が出題されます。次へ進んで時間と問題数を選択してください。`;
        countContainer.classList.add('hidden');
      }

      updateHighscoreDisplay();
    }

    function handleStartScreenSubmit() {
      showTimeSelectionScreen();
    }

    function updateSliderValue(val) {
      document.getElementById('slider-count-display').textContent = val;
    }

    function getHighscoreKey() {
      let modeSuffix = '';
      if (currentSemester) {
        modeSuffix += `_${currentSemester}`;
      }
      if (currentSubject.id === 'biochemistry' || currentSubject.hasBiochemistryFormats) {
        modeSuffix += `_${currentBiochemistryFormat}`;
      } else if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) {
        modeSuffix += `_${currentPhysiologyMode}`;
      } else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) {
        modeSuffix += `_${currentAnatomyMode}`;
      } else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) {
        modeSuffix += `_${currentPublicHealthMode}`;
      } else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) {
        modeSuffix += `_${currentPHNMode}`;
      } else if (currentSubject.id === 'pharmacology') {
        modeSuffix += `_${currentPharmacologyMode}`;
      } else if (currentSubject.id === 'nursing_method_3') {
        modeSuffix += `_${currentNursingMethod3Mode}`;
      } else if (currentRound) {
        modeSuffix += `_r${currentRound}`;
      }
      return `highscore_${currentSubject.id}${modeSuffix}`;
    }

    function updateHighscoreDisplay() {
      const key = getHighscoreKey();
      const saved = localStorage.getItem(key);
      const badge = document.getElementById('start-screen-highscore');
      badge.textContent = (saved !== null) ? `${saved}%` : "未挑戦";
    }

    function getWeakQuestionStatsKey() {
      return `weak_question_stats_${getAttemptHistoryKey()}`;
    }

    function getWeakQuestionId(q) {
      if (!q) return '';
      if (q.id !== undefined && q.id !== null && String(q.id).trim() !== '') return `id:${String(q.id)}`;
      return `q:${String(q.q || '').trim()}`;
    }

    function getWeakQuestionStats() {
      try {
        const raw = JSON.parse(localStorage.getItem(getWeakQuestionStatsKey()) || '{}');
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      } catch (e) {
        return {};
      }
    }

    const WRONG_QUESTION_REVIEW_STORAGE_KEY = 'nurse_plus_wrong_questions_v1';

    function getWrongQuestionReviewRecords() {
      try {
        const value = JSON.parse(localStorage.getItem(WRONG_QUESTION_REVIEW_STORAGE_KEY) || '[]');
        return Array.isArray(value) ? value : [];
      } catch (_) { return []; }
    }

    function getQuestionReviewContext() {
      let modeLabel = '通常';
      if (currentSubject.id === 'biochemistry') modeLabel = currentBiochemistryFormat === 'fill' ? '穴埋め式' : currentBiochemistryFormat === 'keyboard' ? '記述式' : '選択式';
      else if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) modeLabel = currentPhysiologyMode === 'quiz' ? '小テスト' : '過去問';
      else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) modeLabel = currentAnatomyMode === 'applied' ? '応用問題' : '練習問題';
      else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) modeLabel = ({past:'過去問',exercise:'演習問題',national:'模擬国家試験'})[currentPublicHealthMode] || '演習';
      else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) modeLabel = currentPHNMode === 'exercise' ? '演習問題' : '練習問題';
      else if (currentSubject.id === 'pharmacology') modeLabel = currentPharmacologyMode === 'nurse_national_6years' ? '看護師国家試験過去6年分' : currentPharmacologyMode === 'past' ? '過去問' : '演習問題';
      else if (currentSubject.id === 'nursing_method_3') modeLabel = currentNursingMethod3Mode === 'quiz' ? '小テスト' : '練習問題';
      else if (currentSubject.id === 'pathology') modeLabel = (currentPathologyMode === 'practice' ? '小テスト練習' : '演習問題') + (currentPathologyRound ? ' 第' + currentPathologyRound + '回' : '');
      return {
        subjectId: currentSubject.id,
        subjectName: currentSubject.name || currentSubject.id,
        historyKey: getAttemptHistoryKey(),
        modeLabel,
        semester: currentSemester,
        round: currentRound,
        pathologyRound: currentPathologyRound,
        pathologyMode: currentPathologyMode,
        biochemistryFormat: currentBiochemistryFormat,
        physiologyMode: currentPhysiologyMode,
        anatomyMode: currentAnatomyMode,
        publicHealthMode: currentPublicHealthMode,
        phnMode: currentPHNMode,
        pharmacologyMode: currentPharmacologyMode,
        nursingMethod3Mode: currentNursingMethod3Mode
      };
    }

    function saveWrongQuestionReviewRecord(q, isCorrect) {
      const questionId = getWeakQuestionId(q);
      if (!questionId || !currentSubject) return;
      const context = getQuestionReviewContext();
      const key = context.historyKey + '::' + questionId;
      const records = getWrongQuestionReviewRecords();
      let record = records.find(item => item && item.key === key);
      const question = {
        id: q.id,
        q: String(q.q || ''),
        options: Array.isArray(q.options) ? q.options.slice() : [],
        answers: Array.isArray(q.answers) ? q.answers.slice() : [],
        answer: q.answer,
        correctAnswer: q.correctAnswer,
        keyword: q.keyword,
        exp: q.exp || q.explanation || '',
        image: q.image || '',
        wordBox: q.wordBox || null,
        isMultiple: !!q.isMultiple,
        enableKeyboard: !!q.enableKeyboard
      };
      if (!record) {
        record = { key, questionId, subjectId: context.subjectId, subjectName: context.subjectName, context, question, wrongCount: 0, correctCount: 0 };
        records.unshift(record);
      } else {
        record.context = context;
        record.question = question;
        record.subjectName = context.subjectName;
      }
      if (isCorrect) record.correctCount = Number(record.correctCount || 0) + 1;
      else record.wrongCount = Number(record.wrongCount || 0) + 1;
      record.lastAnsweredAt = Date.now();
      localStorage.setItem(WRONG_QUESTION_REVIEW_STORAGE_KEY, JSON.stringify(records.slice(0, 300)));
    }

    window.NursePlusWrongQuestions = window.NursePlusWrongQuestions || {};
    window.NursePlusWrongQuestions.getAll = getWrongQuestionReviewRecords;

    function saveWeakQuestionResult(q, isCorrect) {
      const key = getWeakQuestionId(q);
      if (!key) return;
      const stats = getWeakQuestionStats();
      if (!stats[key]) stats[key] = { correct: 0, wrong: 0 };
      if (isCorrect) stats[key].correct++;
      else stats[key].wrong++;
      localStorage.setItem(getWeakQuestionStatsKey(), JSON.stringify(stats));
      saveWrongQuestionReviewRecord(q, isCorrect);
    }

    function isWeakQuestion(q, stats) {
      const item = stats[getWeakQuestionId(q)];
      return !!item && Number(item.wrong || 0) > Number(item.correct || 0);
    }

    const npAudio={ctx:null,master:null,sfx:localStorage.getItem('nurse_plus_audio_sfx')!=='off',volume:Math.max(0,Math.min(1,Number(localStorage.getItem('nurse_plus_audio_volume')??25)/100)),muted:localStorage.getItem('nurse_plus_audio_muted')==='on'};
    function npInitAudio(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!npAudio.ctx){npAudio.ctx=new AC();npAudio.master=npAudio.ctx.createGain();npAudio.master.gain.value=npAudio.muted?0:npAudio.volume;npAudio.master.connect(npAudio.ctx.destination);}if(npAudio.ctx.state==='suspended')npAudio.ctx.resume().catch(()=>{});return npAudio.ctx;}
    function npTone(freq,dur,vol,delay=0){const c=npInitAudio();if(!c||npAudio.muted||!npAudio.sfx)return;const t=c.currentTime+delay;const voice=(ratio,level,wave,cutoff,attack=.012,release=.1,detune=0)=>{const o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();o.type=wave;o.frequency.setValueAtTime(freq*ratio,t);o.detune.setValueAtTime(detune,t);filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);filter.Q.value=.55;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*level),t+attack);g.gain.setTargetAtTime(.0001,t+Math.min(dur*.52,.16),Math.max(.025,release));o.connect(filter);filter.connect(g);g.connect(npAudio.master);o.onended=()=>{try{o.disconnect();filter.disconnect();g.disconnect();}catch(e){}};o.start(t);o.stop(t+dur+.12);};voice(1,.72,'sine',4200,.012,Math.max(.04,dur*.18));voice(2,.14,'sine',5200,.008,Math.max(.04,dur*.16),2);if(dur>.09)voice(.5,.09,'triangle',1300,.02,Math.max(.04,dur*.22),-2);}
    function npUiSound(kind='tap'){if(npAudio.muted||!npAudio.sfx)return;const sets={tap:[[880,.045,.008,0],[1174.66,.065,.006,.025]],select:[[659.25,.075,.012,0],[987.77,.1,.009,.045]],open:[[523.25,.1,.011,0],[659.25,.12,.012,.045],[783.99,.16,.009,.09]],close:[[783.99,.07,.009,0],[587.33,.1,.01,.035]],next:[[698.46,.075,.011,0],[880,.1,.012,.045],[1046.5,.12,.008,.09]],success:[[659.25,.16,.018,0],[830.61,.19,.017,.065],[987.77,.23,.016,.13],[1318.51,.29,.012,.21]],error:[[392,.12,.014,0],[311.13,.17,.015,.055],[261.63,.22,.011,.12]],toggle:[[659.25,.07,.009,0],[987.77,.09,.009,.035]],start:[[523.25,.1,.012,0],[659.25,.12,.013,.07],[783.99,.14,.012,.14],[1046.5,.22,.01,.22]],back:[[698.46,.075,.009,0],[523.25,.12,.01,.05]],nav:[[587.33,.07,.009,0],[783.99,.1,.009,.045]],submit:[[587.33,.08,.01,0],[783.99,.1,.012,.05],[1174.66,.16,.012,.12]],finish:[[523.25,.1,.01,0],[659.25,.12,.012,.06],[783.99,.15,.014,.12],[1046.5,.2,.014,.2],[1318.51,.26,.01,.3]],card:[[1046.5,.06,.007,0],[1396.91,.1,.008,.035]],settings:[[659.25,.07,.008,0],[880,.1,.008,.04],[1174.66,.13,.007,.09]]};(sets[kind]||sets.tap).forEach(n=>npTone(n[0],n[1],n[2],n[3]));}
    function npAnswerSound(ok){if(ok){npUiSound('success');npTone(1567.98,.36,.013,.25);npTone(1975.53,.3,.009,.34);}else{npUiSound('error');npTone(233.08,.32,.012,.2);}}
    function npResultChime(percentage){
      if(npAudio.muted||!npAudio.sfx)return;
      const rate=Math.max(0,Math.min(100,Math.round(Number(percentage)||0)));
      let notes;
      if(rate>=100){
        notes=[[1046.5,.1,.012,0],[1318.51,.12,.013,.07],[1567.98,.18,.014,.15],[2093,.28,.012,.25]];
      }else if(rate>=80){
        notes=[[880,.1,.011,0],[1174.66,.13,.012,.08],[1567.98,.18,.011,.17]];
      }else if(rate>=60){
        notes=[[698.46,.1,.009,0],[880,.12,.009,.09]];
      }else{
        notes=[[523.25,.12,.008,0],[392,.16,.009,.1]];
      }
      notes.forEach(n=>npTone(n[0],n[1],n[2],n[3]));
    }
    function npAnimateAccuracy(target, correctCount, questionCount){
      const el=document.getElementById('final-score-val');
      if(!el)return Promise.resolve(0);
      // 採点処理から渡された正答数・総問題数を唯一の正本として使う。
      // 結果タイトルのDOMは表示更新タイミングに左右されるため計算根拠にしない。
      const parsedCorrect=Number(correctCount),parsedTotal=Number(questionCount);
      const validCounts=Number.isFinite(parsedCorrect)&&Number.isFinite(parsedTotal)&&parsedTotal>0&&parsedCorrect>=0&&parsedCorrect<=parsedTotal;
      const supplied=Number(target);
      const calculated=validCounts?Math.round(parsedCorrect/parsedTotal*100):NaN;
      const goal=Math.max(0,Math.min(100,Number.isFinite(calculated)?calculated:(Number.isFinite(supplied)&&supplied>=0&&supplied<=100?Math.round(supplied):0)));
      if(el._npAccuracyFrame)cancelAnimationFrame(el._npAccuracyFrame);
      if(el._npAccuracyFallback)clearTimeout(el._npAccuracyFallback);
      // 先行アニメーションをキャンセルしたPromiseは null で完了させ、旧結果での上書きを防ぐ。
      if(el._npAccuracyResolve)el._npAccuracyResolve(null);
      const runId=(Number(el._npAccuracyRunId)||0)+1;
      el._npAccuracyRunId=runId;
      el._npAccuracyGoal=goal;
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('transition');
      el.textContent='0';
      return new Promise(resolve=>{
        el._npAccuracyResolve=resolve;
        const started=performance.now(),duration=1900;
        let lastTick=-1,completed=false;
        const finish=()=>{
          if(el._npAccuracyRunId!==runId||completed)return;
          completed=true;
          if(el._npAccuracyFrame)cancelAnimationFrame(el._npAccuracyFrame);
          el._npAccuracyFrame=null;
          // アニメーション完了時に、計算済みの正答率を必ず最終値として固定する。
          el.textContent=String(goal);
          // カウントアップ完了後に一瞬だけ数値を弾ませ、結果発表のメリハリを付ける。
          // 数値や採点には触れず、transform のみを短くアニメーションする。
          if (typeof el.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.animate(
              [
                { transform: 'scale(1)' },
                { transform: 'scale(1.14)', offset: 0.38 },
                { transform: 'scale(1)' }
              ],
              { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }
            );
          }
          if(el._npAccuracyFallback)clearTimeout(el._npAccuracyFallback);
          el._npAccuracyFallback=null;
          el._npAccuracyResolve=null;
          npResultChime(goal);
          resolve(goal);
        };
        el._npAccuracyFallback=setTimeout(finish,duration+500);
        const frame=now=>{
          if(el._npAccuracyRunId!==runId||completed)return;
          const p=Math.min(1,Math.max(0,(now-started)/duration));
          const eased=1-Math.pow(1-p,3.4);
          const value=p>=1?goal:Math.round(goal*eased);
          el.textContent=String(value);
          const tick=Math.floor(value/4);
          if(tick>lastTick&&p<1){
            lastTick=tick;
            if(tick>0&&npAudio.sfx&&!npAudio.muted)npTone(520+Math.min(520,tick*18),.045,.0028,0);
          }
          if(p<1)el._npAccuracyFrame=requestAnimationFrame(frame);
          else{el._npAccuracyFrame=null;finish();}
        };
        el._npAccuracyFrame=requestAnimationFrame(frame);
      });
    }
    function npUpdateAudioUI(){const s=document.getElementById('quiz-sfx-toggle'),v=document.getElementById('quiz-audio-volume'),m=document.getElementById('quiz-audio-mute');if(s)s.checked=npAudio.sfx;if(v)v.value=Math.round(npAudio.volume*100);const label=document.getElementById('quiz-audio-volume-label');if(label)label.textContent=Math.round(npAudio.volume*100)+'%';if(m)m.textContent=npAudio.muted?'音をオンにする':'すべての音をオフにする';}
    (function(){const unlockAudio=()=>{npInitAudio();};document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('touchstart',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);document.addEventListener('change',e=>{const t=e.target;if(t.id==='quiz-sfx-toggle'){npAudio.sfx=t.checked;localStorage.setItem('nurse_plus_audio_sfx',t.checked?'on':'off');if(npAudio.sfx)npUiSound('toggle');}if(t.id==='quiz-audio-volume'){npAudio.volume=Number(t.value)/100;localStorage.setItem('nurse_plus_audio_volume',String(Number(t.value)));const label=document.getElementById('quiz-audio-volume-label');if(label)label.textContent=t.value+'%';if(npAudio.master&&npAudio.ctx)npAudio.master.gain.setTargetAtTime(npAudio.muted?0:npAudio.volume,npAudio.ctx.currentTime,.1);}});document.addEventListener('click',e=>{const mute=e.target.closest&&e.target.closest('#quiz-audio-mute');if(mute){npAudio.muted=!npAudio.muted;localStorage.setItem('nurse_plus_audio_muted',npAudio.muted?'on':'off');if(npAudio.master&&npAudio.ctx)npAudio.master.gain.setTargetAtTime(npAudio.muted?0:npAudio.volume,npAudio.ctx.currentTime,.08);npUpdateAudioUI();if(!npAudio.muted)npUiSound('toggle');return;}const target=e.target.closest&&e.target.closest('button,[role="button"],input[type="radio"],input[type="checkbox"],a[href]');if(!target||target.disabled||target.id==='quiz-sfx-toggle'||target.id==='quiz-audio-volume')return;if(target.matches('input[type="radio"],input[type="checkbox"]')){npUiSound('select');return;}if(target.closest('#quiz-options-container,[data-question-option],.quiz-option,.quiz-opt-btn')){npUiSound('select');return;}if(target.matches('#quiz-next-btn')){npUiSound('next');return;}if(target.matches('#quiz-submit-multi-btn,#quiz-keyboard-input-container button')){npUiSound('submit');return;}if(target.matches('[aria-expanded="true"],[data-state="open"]')){npUiSound('close');return;}if(target.matches('[aria-expanded="false"],[data-state="closed"]')){npUiSound('open');return;}if(target.matches('a[href]')){npUiSound('nav');return;}const label=(target.getAttribute('aria-label')||target.innerText||target.textContent||'').trim().replace(/\s+/g,' ').slice(0,50);if(/開始|スタート|挑戦する|演習を始める|はじめる/.test(label)){npUiSound('start');return;}if(/結果を見る|完了|終了|提出|確定/.test(label)){npUiSound('finish');return;}if(/戻る|ホーム|閉じる|キャンセル/.test(label)){npUiSound('back');return;}if(/設定|オーディオ|テーマ|通知/.test(label)){npUiSound('settings');return;}if(/科目|モード|選択|カード/.test(label)){npUiSound('nav');return;}npUiSound('tap');});})();
    function startQuiz() {
      npInitAudio(); npUpdateAudioUI();
      prioritizeWeakQuestions = !!document.getElementById('weak-question-toggle')?.checked;
      const isAutumn = (currentSemester === '2026_autumn');

      if (currentSubject.id === 'psychology') {
        const fnName = isAutumn ? 'getQuestionsAutumn' : 'getQuestions';
        if (typeof window[fnName] === 'function') {
          const psychData = window[fnName](currentRound ? currentRound.toString() : 'all');
          if (Array.isArray(psychData) && psychData.length > 0) {
            window.QUIZ_DB.psychology = psychData;
          }
        } else if (typeof window.getQuestions === 'function') {
          const psychData = window.getQuestions(currentRound ? currentRound.toString() : 'all', currentSemester);
          if (Array.isArray(psychData) && psychData.length > 0) window.QUIZ_DB.psychology = psychData;
        }
      }

      if (currentSubject.id === 'nursing_method') {
        const fnName = isAutumn ? 'getNursingQuestionsAutumn' : 'getNursingQuestions';
        if (typeof window[fnName] === 'function') {
          const nursingData = window[fnName](currentRound ? currentRound.toString() : 'all');
          if (Array.isArray(nursingData) && nursingData.length > 0) {
            window.QUIZ_DB.nursing_method = nursingData;
          }
        } else if (typeof window.getNursingQuestions === 'function') {
          const nursingData = window.getNursingQuestions(currentRound ? currentRound.toString() : 'all', currentSemester);
          if (Array.isArray(nursingData) && nursingData.length > 0) window.QUIZ_DB.nursing_method = nursingData;
        }
      }

      if (currentSubject.id === 'microbiology') {
        const fnName = isAutumn ? 'getMicrobiologyQuestionsAutumn' : 'getMicrobiologyQuestions';
        if (typeof window[fnName] === 'function') {
          const microData = window[fnName]();
          if (Array.isArray(microData) && microData.length > 0) window.QUIZ_DB.microbiology = microData;
        }
      }

      if (currentSubject.id === 'medical_intro') {
        const fnName = isAutumn ? 'getMedicineQuestionsAutumn' : 'getMedicineQuestions';
        if (typeof window[fnName] === 'function') {
          const medData = window[fnName]();
          if (Array.isArray(medData) && medData.length > 0) window.QUIZ_DB.medical_intro = medData;
        }
      }

      if (currentSubject.id === 'mind_behavior') {
        const fnName = isAutumn ? 'getMindBehaviorQuestionsAutumn' : 'getMindBehaviorQuestions';
        if (typeof window[fnName] === 'function') {
          const mindData = window[fnName]();
          if (Array.isArray(mindData) && mindData.length > 0) window.QUIZ_DB.mind_behavior = mindData;
        }
      }

      if (currentSubject.id === 'physiology') {
        const fnName = isAutumn ? 'getPhysiologyQuestionsAutumn' : 'getPhysiologyQuestions';
        if (typeof window[fnName] === 'function') {
          const physioData = window[fnName](currentPhysiologyMode);
          if (Array.isArray(physioData) && physioData.length > 0) window.QUIZ_DB.physiology = physioData;
        }
      }

      if (currentSubject.id === 'nursing_method_3') {
        if (currentNursingMethod3Mode === 'practice' && isAutumn && typeof window.loadNursingMethod3Practice2026Autumn === 'function') {
          window.loadNursingMethod3Practice2026Autumn();
        }
        const key = `nursing_method_3_${currentNursingMethod3Mode}_${isAutumn ? '2026_autumn' : '2026_spring'}`;
        if (Array.isArray(window.QUIZ_DB[key]) && window.QUIZ_DB[key].length > 0) {
          window.QUIZ_DB.nursing_method_3 = window.QUIZ_DB[key];
        }
      }

      if (currentSubject.id === 'nutrition') {
        const key = `nutrition_${currentNutritionMode}_${isAutumn ? '2026_autumn' : '2026_spring'}`;
        if (Array.isArray(window.QUIZ_DB[key])) {
          window.QUIZ_DB.nutrition = window.QUIZ_DB[key];
        }
      }

      if (currentSubject.id === 'public_health') {
        const modeSuffix = currentPublicHealthMode.charAt(0).toUpperCase() + currentPublicHealthMode.slice(1);
        const fnName = isAutumn ? `getPublicHealth${modeSuffix}QuestionsAutumn` : `getPublicHealth${modeSuffix}Questions`;
        if (typeof window[fnName] === 'function') {
          const phData = window[fnName]();
          if (Array.isArray(phData) && phData.length > 0) {
            window.QUIZ_DB[`public_health_${currentPublicHealthMode}`] = phData;
          }
        }
      }

      if (currentSubject.id === 'public_health_nursing') {
        const modeSuffix = currentPHNMode.charAt(0).toUpperCase() + currentPHNMode.slice(1);
        const fnName = isAutumn ? `getPublicHealthNursing${modeSuffix}QuestionsAutumn` : `getPublicHealthNursing${modeSuffix}Questions`;
        if (typeof window[fnName] === 'function') {
          const phnData = window[fnName]();
          if (Array.isArray(phnData) && phnData.length > 0) {
            window.QUIZ_DB[`public_health_nursing_${currentPHNMode}`] = phnData;
          }
        }
      }

      if (currentSubject.id === 'biochemistry') {
        const fnName = isAutumn ? 'getBiochemistryQuestionsAutumn' : 'getBiochemistryQuestions';
        if (typeof window[fnName] === 'function') {
          const bioData = window[fnName]();
          if (Array.isArray(bioData) && bioData.length > 0) window.QUIZ_DB.biochemistry = bioData;
        }
      }

      if (currentSubject.id === 'biochemistry' && currentBiochemistryFormat === 'fill') {
        if (typeof window.getBiochemistryFillQuestions === 'function') {
          const fillData = window.getBiochemistryFillQuestions();
          if (Array.isArray(fillData)) window.QUIZ_DB.biochemistry_fill = fillData;
        }
      }

      if (currentSubject.id === 'anatomy') {
        if (currentAnatomyMode === 'applied') {
          const fnName = isAutumn ? 'getAnatomyAppliedQuestionsAutumn' : 'getAnatomyAppliedQuestions';
          if (typeof window[fnName] === 'function') {
            const anatomyAppliedData = window[fnName]();
            if (Array.isArray(anatomyAppliedData) && anatomyAppliedData.length > 0) {
              window.QUIZ_DB.anatomy_applied = anatomyAppliedData;
            }
          }
        } else {
          const fnName = isAutumn ? 'getAnatomyQuestionsAutumn' : 'getAnatomyQuestions';
          if (typeof window[fnName] === 'function') {
            const anatomyBasicData = window[fnName]();
            if (Array.isArray(anatomyBasicData) && anatomyBasicData.length > 0) {
              window.QUIZ_DB.anatomy = anatomyBasicData;
            }
          }
        }
      }

     
      let targetDbKey = currentSubject.id;
      if (currentSubject.id === 'anatomy' && currentAnatomyMode === 'applied') {
        targetDbKey = 'anatomy_applied';
      } else if (currentSubject.id === 'public_health') {
        targetDbKey = `public_health_${currentPublicHealthMode}`;
      } else if (currentSubject.id === 'public_health_nursing') {
        targetDbKey = `public_health_nursing_${currentPHNMode}`;
      } else if (currentSubject.id === 'biochemistry' && currentBiochemistryFormat === 'keyboard') {
        targetDbKey = (window.QUIZ_DB.biochemistry_keyboard && window.QUIZ_DB.biochemistry_keyboard.length > 0) ? 'biochemistry_keyboard' : 'biochemistry';
      } else if (currentSubject.id === 'biochemistry' && currentBiochemistryFormat === 'fill') {
        targetDbKey = 'biochemistry_fill';
      } else if (currentSubject.id === 'nursing_method_3') {
        targetDbKey = `nursing_method_3_${currentNursingMethod3Mode}_${isAutumn ? '2026_autumn' : '2026_spring'}`;
     
} else if (currentSubject.id === 'pathology') {
  if (currentPathologyMode === 'practice') {
    targetDbKey = `pathology_practice_${isAutumn ? '2026_autumn' : '2026_spring'}_round${currentPathologyRound}`;
  } else if (currentPathologyMode === 'exercise') {
    targetDbKey = `pathology_exercise_${isAutumn ? '2026_autumn' : '2026_spring'}_round${currentPathologyRound}`;
  
  } else {
    targetDbKey = `pathology_${currentPathologyMode}_${isAutumn ? '2026_autumn' : '2026_spring'}`;
  }

      } else if (currentSubject.id === 'pharmacology' && currentPharmacologyMode === 'nurse_national_6years') {
        targetDbKey = 'pharmacology_nurse_national_6years';
      }



     let rawData = window.QUIZ_DB[targetDbKey] || [];

if (rawData.length === 0) {
  alert("該当科目の問題が登録されていません。");
  return;
}

// 出題する問題一覧を作成
if (
  (currentSubject.hasRounds ||
   currentSubject.hasNursingModes ||
   currentSubject.id === 'pathology') &&
  currentRound !== null
) {
  list = rawData.filter(q => q.round == currentRound);
  if (list.length === 0) list = [...rawData];
} else {
  list = [...rawData];
}

// 病理学の小テスト練習に○・×の選択肢を追加
if (targetDbKey.startsWith('pathology_practice_')) {
  list = list.map(q => ({
    ...q,
    options: ['○', '×']
  }));
}

// 問題データを整える
list = list.map(q => normalizeQuestion(q)).filter(Boolean);

      if (currentSubject.id === 'biochemistry' && currentBiochemistryFormat === 'keyboard') {
        list = list.map(q => ({
          ...q,
          enableKeyboard: true
        }));
      }

      if (currentSubject.id === 'biochemistry' && currentBiochemistryFormat === 'fill') {
        list = list.map(q => ({
          ...q,
          enableKeyboard: true
        }));
      }

      list = list.map(q => {
        if (!q.options || q.options.length <= 1) return q;
       
        const correctOptTexts = q.answers.map(idx => q.options[idx]).filter(Boolean);
        const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
        const newAnsIndices = correctOptTexts.map(text => shuffledOpts.indexOf(text)).filter(idx => idx !== -1);

        return {
          ...q,
          options: shuffledOpts,
          answers: newAnsIndices
        };
      });

      list = list.sort(() => Math.random() - 0.5);

      if (prioritizeWeakQuestions) {
        const weakStats = getWeakQuestionStats();
        const weakList = list.filter(q => isWeakQuestion(q, weakStats));
        const normalList = list.filter(q => !isWeakQuestion(q, weakStats));
        list = [...weakList, ...normalList];
      }

      let reqCount = currentSubject.fixedCount || (parseInt(document.getElementById('quiz-count-slider')?.value) || 10);
      list = list.slice(0, Math.min(reqCount, list.length));

      activeQuestions = list;
      currentQIndex = 0;
      score = 0;
      studySessionStartedAt = Date.now();

      hideAllScreens();
      document.getElementById('screen-quiz-play').classList.remove('hidden');
      renderQuestion();
    }

    function renderQuestion() {
      isAnswered = false;
      selectedIndices.clear();
      const q = activeQuestions[currentQIndex];
      const total = activeQuestions.length;

      document.getElementById('quiz-progress-text').textContent = `QUESTION ${currentQIndex + 1} / ${total}`;
      document.getElementById('quiz-score-live').textContent = `正解: ${score}`;
     
      const qNumText = `Q${currentQIndex + 1}` + (q.isMultiple ? ` 【複数選択問題 (${q.answers.length}つ選択)】` : '');
      document.getElementById('quiz-question-number').textContent = qNumText;
      const fillNumbers = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
      if (currentBiochemistryFormat === 'fill' && currentSubject.id === 'biochemistry') {
        let fillIndex = 0;
        const fillQuestionText = String(q.q || '').replace(/（[①②③④⑤⑥⑦⑧⑨⑩]）|\([①②③④⑤⑥⑦⑧⑨⑩]\)/g, () => {
          const num = fillNumbers[fillIndex++];
          return num ? `（${num}）` : '（　）';
        });
        document.getElementById('quiz-question-text').textContent = fillQuestionText;
      } else {
        document.getElementById('quiz-question-text').textContent = q.q;
      }

      const imgContainer = document.getElementById('quiz-image-container');
      const imgEl = document.getElementById('quiz-image');
      if (q.image) {
        imgEl.src = q.image;
        imgContainer.classList.remove('hidden');
      } else {
        imgEl.src = '';
        imgContainer.classList.add('hidden');
      }

      const wbContainer = document.getElementById('quiz-wordbox-container');
      const wbContent = document.getElementById('quiz-wordbox-content');
      if (q.wordBox) {
        wbContainer.classList.remove('hidden');
        if (Array.isArray(q.wordBox)) {
          wbContent.innerHTML = q.wordBox.map(w => `<span class="inline-block px-2 py-0.5 m-0.5 rounded bg-slate-900 border border-slate-700/80 font-mono">${w}</span>`).join(' ');
        } else {
          wbContent.textContent = q.wordBox;
        }
      } else {
        wbContainer.classList.add('hidden');
        wbContent.innerHTML = '';
      }

      const fbBox = document.getElementById('quiz-feedback-box');
      fbBox.className = "hidden p-4 rounded-xl border text-xs leading-relaxed space-y-2";

      const submitBtn = document.getElementById('quiz-submit-multi-btn');
      const container = document.getElementById('quiz-options-container');
      const kbContainer = document.getElementById('quiz-keyboard-input-container');

      if (q.enableKeyboard) {
        container.classList.add('hidden');
        submitBtn.classList.add('hidden');
        if (currentBiochemistryFormat === 'fill' && currentSubject.id === 'biochemistry') {
          kbContainer.classList.remove('hidden');
          const fillTargets = String(q.answer || '').split('、').map(v => v.trim()).filter(Boolean);
          kbContainer.innerHTML = `
            <p class="text-xs text-amber-400 font-medium">（①）などの空欄に入力してください。</p>
            <div class="space-y-2 mt-3">
              ${fillTargets.map((_, i) => {
                const num = fillNumbers[i];
                return `<label for="fill-answer-${num}" class="flex items-center gap-2 text-sm text-slate-200"><span class="shrink-0 font-semibold text-amber-300">${num}</span><input type="text" id="fill-answer-${num}" data-fill-number="${num}" class="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500" aria-label="${num}の解答" autocomplete="off" onkeydown="if(event.key==='Enter') submitKeyboardAnswer()"></label>`;
              }).join('')}
            </div>
            <button onclick="submitKeyboardAnswer()" class="w-full px-5 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-semibold rounded-xl text-sm transition shadow-lg mt-4">解答する</button>
          `;
          const firstFillInput = kbContainer.querySelector('[id^="fill-answer-"]');
          if (firstFillInput) firstFillInput.focus();
        } else {
          kbContainer.classList.remove('hidden');
          kbContainer.innerHTML = `
            <p class="text-xs text-amber-400 font-medium">正しい用語・文字を入力してください。</p>
            <div class="flex gap-2">
              <input type="text" id="quiz-keyboard-input" placeholder="例: 用語または文字を入力" onkeydown="if(event.key==='Enter') submitKeyboardAnswer()" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500">
              <button onclick="submitKeyboardAnswer()" class="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-semibold rounded-xl text-xs transition shadow-lg shrink-0">解答</button>
            </div>
          `;
          const kbInput = document.getElementById('quiz-keyboard-input');
          kbInput.value = '';
          kbInput.disabled = false;
        }
      } else {
        container.classList.remove('hidden');
        kbContainer.classList.add('hidden');

        if (q.isMultiple) {
          submitBtn.classList.remove('hidden');
          container.innerHTML = q.options.map((opt, idx) => `
            <button id="opt-btn-${idx}" onclick="toggleOptionSelect(${idx})" class="quiz-opt-btn w-full p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-200 text-xs text-left hover:bg-slate-800 transition flex items-center gap-3">
              <span id="opt-check-${idx}" class="w-4 h-4 rounded border border-slate-600 bg-slate-950 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0"></span>
              <span>${opt}</span>
            </button>
          `).join('');
        } else {
          submitBtn.classList.add('hidden');
          container.innerHTML = q.options.map((opt, idx) => `
            <button onclick="handleSingleAnswer(${idx})" class="quiz-opt-btn w-full p-3.5 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-200 text-xs text-left hover:bg-slate-800 transition flex items-center justify-between">
              <span>${opt}</span>
              <span class="opt-mark hidden font-bold"></span>
            </button>
          `).join('');
        }
      }

      startQuizTimer();
    }

    function toggleOptionSelect(idx) {
      if (isAnswered) return;
      const btn = document.getElementById(`opt-btn-${idx}`);
      const check = document.getElementById(`opt-check-${idx}`);

      if (selectedIndices.has(idx)) {
        selectedIndices.delete(idx);
        btn.classList.remove('border-amber-500/80', 'bg-amber-950/30');
        check.textContent = '';
        check.classList.remove('border-amber-500');
      } else {
        selectedIndices.add(idx);
        btn.classList.add('border-amber-500/80', 'bg-amber-950/30');
        check.textContent = '✓';
        check.classList.add('border-amber-500');
      }
    }

    function startQuizTimer() {
      stopQuizTimer();
      timeLeft = QUIZ_LIMIT_TIME;
      updateTimerBarUI();

      const intervalMs = 100;
      quizTimer = setInterval(() => {
        timeLeft -= intervalMs / 1000;
        if (timeLeft <= 0) {
          timeLeft = 0;
          updateTimerBarUI();
          stopQuizTimer();
          handleTimeout();
        } else {
          updateTimerBarUI();
        }
      }, intervalMs);
    }

    function stopQuizTimer() {
      if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
      }
    }

    function updateTimerBarUI() {
      const bar = document.getElementById('quiz-timer-bar');
      if (!bar) return;
     
      const percentage = Math.max(0, (timeLeft / QUIZ_LIMIT_TIME) * 100);
      bar.style.width = `${percentage}%`;

      if (percentage <= 16.6) {
        bar.className = "h-full bg-rose-500 transition-all duration-100 ease-linear";
      } else if (percentage <= 33.3) {
        bar.className = "h-full bg-amber-500 transition-all duration-100 ease-linear";
      } else {
        bar.className = "h-full bg-emerald-500 transition-all duration-100 ease-linear";
      }
    }

    function handleTimeout() {
      if (isAnswered) return;
      const q = activeQuestions[currentQIndex];
      if (q.enableKeyboard) {
        if (currentBiochemistryFormat === 'fill' && currentSubject.id === 'biochemistry') {
          evaluateFillAnswers([], true);
        } else {
          evaluateKeyboardAnswer("", true);
        }
      } else if (q.isMultiple) {
        evaluateAnswers([], true);
      } else {
        evaluateAnswers([-1], true);
      }
    }

    function handleSingleAnswer(selectedIdx) {
      if (isAnswered) return;
      stopQuizTimer();
      evaluateAnswers([selectedIdx], false);
    }

    function submitMultipleAnswers() {
      if (isAnswered) return;
      if (selectedIndices.size === 0) {
        alert("1つ以上の選択肢を選んでください。");
        return;
      }
      stopQuizTimer();
      evaluateAnswers(Array.from(selectedIndices), false);
    }

    function submitKeyboardAnswer() {
      if (isAnswered) return;
      if (currentBiochemistryFormat === 'fill' && currentSubject.id === 'biochemistry') {
        const inputs = Array.from(document.querySelectorAll('[id^="fill-answer-"]')).sort((a, b) => {
          const order = (el) => String(el.dataset.fillNumber || '').charCodeAt(0);
          return order(a) - order(b);
        });
        const values = inputs.map(input => input.value.trim());
        stopQuizTimer();
        evaluateFillAnswers(values, false);
        return;
      }
      const inputEl = document.getElementById('quiz-keyboard-input');
      const val = inputEl.value.trim();
      if (!val) {
        alert("回答を入力してください。");
        return;
      }
      stopQuizTimer();
      evaluateKeyboardAnswer(val, false);
    }

    function evaluateFillAnswers(userTexts, isTimeout) {
      isAnswered = true;
      const q = activeQuestions[currentQIndex];
      const inputs = Array.from(document.querySelectorAll('[id^="fill-answer-"]')).sort((a, b) => {
        const order = (el) => String(el.dataset.fillNumber || '').charCodeAt(0);
        return order(a) - order(b);
      });
      inputs.forEach(input => input.disabled = true);

      const normalizeStr = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                  .replace(/◯|〇|O|o/g, '〇')
                  .toLowerCase()
                  .replace(/\s+/g, '');
      };

      const targets = String(q.answer || '').split('、').map(v => v.trim());
      let isCorrect = !isTimeout && userTexts.length === targets.length;
      if (isCorrect) {
        for (let i = 0; i < targets.length; i++) {
          const normUser = normalizeStr(userTexts[i]);
          const normTarget = normalizeStr(targets[i]);
          if (!normUser || !normTarget || !(normUser === normTarget || normTarget.includes(normUser) || normUser.includes(normTarget))) {
            isCorrect = false;
            break;
          }
        }
      }

      if(npAudio.sfx&&!npAudio.muted)npAnswerSound(isCorrect);
      saveWeakQuestionResult(q, isCorrect);

      const fbBox = document.getElementById('quiz-feedback-box');
      const fbTitle = document.getElementById('quiz-feedback-title');
      const fbDesc = document.getElementById('quiz-feedback-desc');
      let answerIndex = 0;
      const answeredQuestionText = String(q.q || '').replace(/（[①②③④⑤⑥⑦⑧⑨⑩]）|\([①②③④⑤⑥⑦⑧⑨⑩]\)/g, () => {
        const correct = targets[answerIndex] || '';
        answerIndex++;
        return `（${correct}）`;
      });
      document.getElementById('quiz-question-text').textContent = answeredQuestionText;

      if (isCorrect) {
        score++;
        fbBox.className = "p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = "✓ 正解！";
      } else {
        fbBox.className = "p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = isTimeout ? "⌛ 時間切れ..." : "✕ 不正解...";
      }
      if (currentBiochemistryFormat === 'fill' && currentSubject.id === 'biochemistry') {
        fbDesc.innerHTML = `<div class="font-semibold text-amber-300">正解：${q.correctAnswer || q.answer || ""}</div><div class="mt-1">解説：${q.explanation || q.exp || "解説はありません。"}</div>`;
      } else {
        fbDesc.textContent = q.exp || "解説はありません。";
      }
      document.getElementById('quiz-score-live').textContent = `正解: ${score}`;
      document.getElementById('quiz-next-btn').textContent = (currentQIndex + 1 >= activeQuestions.length) ? "結果を見る →" : "次へ進む →";
    }

    function evaluateKeyboardAnswer(userText, isTimeout) {
      isAnswered = true;
      const q = activeQuestions[currentQIndex];
      const kbInput = document.getElementById('quiz-keyboard-input');
      const fbBox = document.getElementById('quiz-feedback-box');
      const fbTitle = document.getElementById('quiz-feedback-title');
      const fbDesc = document.getElementById('quiz-feedback-desc');

      if (kbInput) kbInput.disabled = true;

      const normalizeStr = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                  .replace(/◯|〇|O|o/g, '〇')
                  .toLowerCase()
                  .replace(/\s+/g, '');
      };

      const normUser = normalizeStr(userText);
      let isCorrect = false;

      if (!isTimeout && normUser !== '') {
        let targets = [];
        if (q.keyword && String(q.keyword).trim()) {
          targets.push(String(q.keyword));
        }
        if (q.options && q.options.length > 0) {
          q.answers.forEach(idx => {
            if (q.options[idx]) targets.push(String(q.options[idx]));
          });
        }
        if (q.correct && typeof q.correct === 'string') {
          targets.push(q.correct);
        }
        if (q.answer && typeof q.answer === 'string') {
          targets.push(q.answer);
        }

        for (let target of targets) {
          const normTarget = normalizeStr(target);
          if (normTarget && (normUser === normTarget || normTarget.includes(normUser) || normUser.includes(normTarget))) {
            isCorrect = true;
            break;
          }
        }
      }

      if(npAudio.sfx&&!npAudio.muted)npAnswerSound(isCorrect);
      saveWeakQuestionResult(q, isCorrect);

      if (isCorrect) {
        score++;
        fbBox.className = "p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = "✓ 正解！";
      } else {
        fbBox.className = "p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = isTimeout ? "⌛ 時間切れ..." : "✕ 不正解...";
      }

      fbDesc.textContent = q.exp || "解説はありません。";
      document.getElementById('quiz-score-live').textContent = `正解: ${score}`;
      document.getElementById('quiz-next-btn').textContent = (currentQIndex + 1 >= activeQuestions.length) ? "結果を見る →" : "次へ進む →";
    }

    function evaluateAnswers(userSelectedArray, isTimeout) {
      isAnswered = true;
      const q = activeQuestions[currentQIndex];
      const buttons = document.querySelectorAll('.quiz-opt-btn');
      const submitBtn = document.getElementById('quiz-submit-multi-btn');
      const fbBox = document.getElementById('quiz-feedback-box');
      const fbTitle = document.getElementById('quiz-feedback-title');
      const fbDesc = document.getElementById('quiz-feedback-desc');

      submitBtn.classList.add('hidden');

      const correctSorted = [...q.answers].sort((a,b) => a-b).join(',');
      const userSorted = [...userSelectedArray].filter(v => v >= 0).sort((a,b) => a-b).join(',');
      const isCorrect = (!isTimeout && userSorted.length > 0 && correctSorted === userSorted);

      if(npAudio.sfx&&!npAudio.muted)npAnswerSound(isCorrect);
      saveWeakQuestionResult(q, isCorrect);

      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        const isTargetCorrect = q.answers.includes(idx);
        const isUserChosen = userSelectedArray.includes(idx);

        if (isTargetCorrect) {
          btn.classList.add(
            'bg-emerald-900/90',
            'border-2',
            'border-emerald-400',
            'ring-2',
            'ring-emerald-400/70',
            'ring-inset',
            'text-emerald-50',
            'shadow-[0_0_0_2px_rgba(52,211,153,0.16)]'
          );
          const badge = document.createElement('span');
          badge.className = 'shrink-0 ml-2 rounded-md border border-emerald-200 bg-emerald-300 px-2 py-1 text-[10px] font-extrabold tracking-wide text-emerald-950';
          badge.textContent = '✓ 正解';
          btn.appendChild(badge);
        } else if (isUserChosen) {
          btn.classList.add(
            'bg-rose-900/90',
            'border-2',
            'border-rose-300',
            'ring-2',
            'ring-rose-400/70',
            'ring-inset',
            'text-rose-50',
            'shadow-[0_0_0_2px_rgba(251,113,133,0.16)]'
          );
          const badge = document.createElement('span');
          badge.className = 'shrink-0 ml-2 rounded-md border border-rose-200 bg-rose-300 px-2 py-1 text-[10px] font-extrabold tracking-wide text-rose-950';
          badge.textContent = '✕ あなたの回答';
          btn.appendChild(badge);
        } else {
          btn.classList.add('opacity-50');
        }
      });

      if (isCorrect) {
        score++;
        fbBox.className = "p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = "✓ 正解！";
      } else {
        fbBox.className = "p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-200 text-xs leading-relaxed space-y-2 block";
        fbTitle.textContent = isTimeout ? "⌛ 時間切れ..." : "✕ 不正解...";
      }

      fbDesc.textContent = q.exp || "解説はありません。";
      document.getElementById('quiz-score-live').textContent = `正解: ${score}`;
      document.getElementById('quiz-next-btn').textContent = (currentQIndex + 1 >= activeQuestions.length) ? "結果を見る →" : "次へ進む →";
    }

    function nextQuestion() {
      currentQIndex++;
      if (currentQIndex >= activeQuestions.length) {
        showResultScreen();
      } else {
        renderQuestion();
      }
    }

    function quitQuiz() {
      if (confirm("現在の演習を終了して科目選択画面へ戻りますか？")) {
        stopQuizTimer();
        showSubjectScreen();
      }
    }

    function getAttemptHistoryKey() {
      let modeSuffix = '';
      if (currentSemester) {
        modeSuffix += `_${currentSemester}`;
      }
      if (currentSubject.id === 'biochemistry' || currentSubject.hasBiochemistryFormats) {
        modeSuffix += `_${currentBiochemistryFormat}`;
      } else if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) {
        modeSuffix += `_${currentPhysiologyMode}`;
      } else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) {
        modeSuffix += `_${currentAnatomyMode}`;
      } else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) {
        modeSuffix += `_${currentPublicHealthMode}`;
      } else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) {
        modeSuffix += `_${currentPHNMode}`;
      } else if (currentRound) {
        modeSuffix += `_r${currentRound}`;
      }
      return `attempt_history_${currentSubject.id}${modeSuffix}`;
    }

    function showResultScreen() {
      stopQuizTimer();
      hideAllScreens();
      document.getElementById('screen-quiz-result').classList.remove('hidden');

      const total = activeQuestions.length;
      const accRate = total > 0 ? Math.round((score / total) * 100) : 0;

      document.getElementById('result-score-title').textContent = `全${total}問中 ${score}問正解`;
      // 正答率のカウントアップが完了するまで、結果コメント・演出・効果音の発表を待つ。
      const evalText = document.getElementById('final-eval-text');
      npAnimateAccuracy(accRate, score, total).then(finalAccuracy => {
        // 再実行でキャンセルされた古いアニメーションは、発表や表示を更新しない。
        if (finalAccuracy === null) return;
        if (accRate === 100) {
          evalText.textContent = "素晴らしい！満点達成です！";
          if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          npUiSound('success');
        } else if (accRate >= 80) {
          evalText.textContent = "合格ライン達成！大変優秀です。";
          npUiSound('success');
        } else if (accRate >= 60) {
          evalText.textContent = "あと一歩！間違えた箇所を復習しましょう。";
          npUiSound('select');
        } else {
          evalText.textContent = "繰り返し練習して基礎を固めましょう。";
          npUiSound('close');
        }
      });

      const key = getHighscoreKey();
      const prevBest = localStorage.getItem(key);
      const newRecordBadge = document.getElementById('new-record-badge');

      if (prevBest === null || accRate > parseInt(prevBest, 10)) {
        localStorage.setItem(key, accRate);
        newRecordBadge.classList.remove('hidden');
        npTone(1318.51,.18,.016,.12); npTone(1760,.24,.014,.22);
      } else {
        newRecordBadge.classList.add('hidden');
      }

      let conditionMode = 'all';
      if (currentSubject.id === 'physiology' || currentSubject.hasPhysiologyModes) conditionMode = currentPhysiologyMode;
      else if (currentSubject.id === 'anatomy' || currentSubject.hasAnatomyModes) conditionMode = currentAnatomyMode;
      else if (currentSubject.id === 'public_health' || currentSubject.hasPublicHealthModes) conditionMode = currentPublicHealthMode;
      else if (currentSubject.id === 'public_health_nursing' || currentSubject.hasPHNModes) conditionMode = currentPHNMode;
      else if (currentSubject.id === 'pharmacology') conditionMode = currentPharmacologyMode;
      else if (currentSubject.id === 'nursing_method_3') conditionMode = currentNursingMethod3Mode;
      const historyKey = `history_accuracy_${currentSubject.id}_${conditionMode}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.push(accRate);
      if (history.length > 20) history.shift();
      localStorage.setItem(historyKey, JSON.stringify(history));

      const now = new Date();
      const dailyHistoryKey = `history_accuracy_daily_${currentSubject.id}_${conditionMode}`;
      const dailyHistory = JSON.parse(localStorage.getItem(dailyHistoryKey) || '[]');
      dailyHistory.push({ date: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`, accuracy: accRate });
      if (dailyHistory.length > 100) dailyHistory.shift();
      localStorage.setItem(dailyHistoryKey, JSON.stringify(dailyHistory));

      const durationSeconds = studySessionStartedAt ? Math.max(0, Math.round((Date.now() - studySessionStartedAt) / 1000)) : 0;
      studySessionStartedAt = 0;
      evoRecordStudyCompletion(now, { score, total, accRate, durationSeconds });

      const attemptKey = getAttemptHistoryKey();
      const attemptHistory = JSON.parse(localStorage.getItem(attemptKey) || '[]');
      
      const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      attemptHistory.unshift({
        score: score,
        total: total,
        accRate: accRate,
        timestamp: dateStr
      });

      if (attemptHistory.length > 10) {
        attemptHistory.pop();
      }
      localStorage.setItem(attemptKey, JSON.stringify(attemptHistory));

      const historyListContainer = document.getElementById('quiz-attempt-history-list');
      if (historyListContainer) {
        historyListContainer.innerHTML = attemptHistory.map((item, idx) => `
          <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">#${attemptHistory.length - idx}</span>
              <span class="text-slate-400 text-[11px] font-mono">${item.timestamp}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-slate-300 font-mono">${item.score} / ${item.total}問正解</span>
              <span class="font-bold font-mono ${item.accRate >= 80 ? 'text-emerald-400' : (item.accRate >= 60 ? 'text-amber-400' : 'text-rose-400')}">${item.accRate}%</span>
            </div>
          </div>
        `).join('');
      }
    }

    // =========================================================
    //  2人マルチプレイ (早押し対戦) ロジック
    // =========================================================
    function showMultiplayerLobby() {
      hideAllScreens();
      document.getElementById('screen-multi-lobby').classList.remove('hidden');
    }

    function createMultiRoom() {
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      currentRoomCode = roomCode;
      isHost = true;

      roomRef = db.ref(`multi_rooms/${roomCode}`);
      roomRef.set({
        hostId: myPlayerId,
        status: 'waiting',
        subjectId: subjects[0]?.id || 'psychology',
        questionCount: 10,
        players: {
          p1: { id: myPlayerId, score: 0 },
          p2: null
        },
        currentQIndex: 0,
        questions: [],
        buzzPlayer: null,
        created: Date.now()
      }).then(() => {
        enterMultiRoomView();
      });
    }

    function joinMultiRoom() {
      const code = document.getElementById('join-code-input').value.trim();
      if (!code || code.length !== 4) {
        alert("4桁の部屋コードを入力してください。");
        return;
      }

      const targetRef = db.ref(`multi_rooms/${code}`);
      targetRef.once('value', (snap) => {
        const val = snap.val();
        if (!val) {
          alert("該当する部屋が見つかりません。コードを確認してください。");
          return;
        }
        if (val.players && val.players.p2 && val.players.p2.id !== myPlayerId) {
          alert("この部屋は既に満員です。");
          return;
        }

        currentRoomCode = code;
        isHost = false;
        roomRef = targetRef;

        roomRef.child('players/p2').set({
          id: myPlayerId,
          score: 0
        }).then(() => {
          enterMultiRoomView();
        });
      });
    }

    function enterMultiRoomView() {
      hideAllScreens();
      document.getElementById('screen-multi-room').classList.remove('hidden');

      document.getElementById('multi-room-code-display').textContent = currentRoomCode;
      document.getElementById('multi-room-code-large').textContent = currentRoomCode;

      const hostSettings = document.getElementById('host-settings-area');
      const guestMsg = document.getElementById('guest-waiting-msg');
      
      if (isHost) {
        hostSettings.classList.remove('hidden');
        guestMsg.classList.add('hidden');

        const selectEl = document.getElementById('multi-subject-select');
        selectEl.innerHTML = subjects.filter(s => s.status !== 'preparing' && s.visible !== false).map(s => `
          <option value="${s.id}">${s.name}</option>
        `).join('');
      } else {
        hostSettings.classList.add('hidden');
        guestMsg.remove('hidden');
      }

      listenToRoomUpdates();
    }

    function listenToRoomUpdates() {
      if (!roomRef) return;

      roomRef.on('value', (snap) => {
        roomData = snap.val();
        if (!roomData) return;

        const p1Status = document.getElementById('p1-status');
        const p2Status = document.getElementById('p2-status');
        const startBtn = document.getElementById('multi-start-btn');

        if (roomData.players && roomData.players.p1) {
          p1Status.textContent = roomData.players.p1.id === myPlayerId ? "あなた (接続完了)" : "接続中";
        } else {
          p1Status.textContent = "待機中...";
        }

        if (roomData.players && roomData.players.p2) {
          p2Status.textContent = roomData.players.p2.id === myPlayerId ? "あなた (接続完了)" : "対戦相手 (参加済)";
        } else {
          p2Status.textContent = "待機中...";
        }

        if (isHost) {
          if (roomData.players && roomData.players.p1 && roomData.players.p2) {
            startBtn.disabled = false;
            startBtn.textContent = "対戦を開始する！";
          } else {
            startBtn.disabled = true;
            startBtn.textContent = "相手の参加を待っています...";
          }
        }

        if (roomData.status === 'playing') {
          if (document.getElementById('screen-multi-play').classList.contains('hidden')) {
            hideAllScreens();
            document.getElementById('screen-multi-play').classList.remove('hidden');
          }
          renderMultiPlayView();
        }
      });
    }

    function startMultiGame() {
      if (!isHost || !roomRef) return;

      const selectedSubId = document.getElementById('multi-subject-select').value;
      const count = parseInt(document.getElementById('multi-count-slider').value, 10);

      let rawData = window.QUIZ_DB[selectedSubId] || [];
      if (rawData.length === 0) {
        alert("選択された科目に問題がありません。");
        return;
      }

      let qList = rawData.map(q => normalizeQuestion(q)).filter(Boolean);
      qList = qList.sort(() => Math.random() - 0.5).slice(0, Math.min(count, qList.length));

      roomRef.update({
        status: 'playing',
        subjectId: selectedSubId,
        questionCount: qList.length,
        questions: qList,
        currentQIndex: 0,
        buzzPlayer: null,
        answeredChoice: null
      });
    }

    function renderMultiPlayView() {
      if (!roomData || !roomData.questions) return;

      const qIndex = roomData.currentQIndex || 0;
      const q = roomData.questions[qIndex];
      const total = roomData.questions.length;

      document.getElementById('multi-progress-text').textContent = `QUESTION ${qIndex + 1} / ${total}`;
      
      const isP1 = (roomData.players.p1.id === myPlayerId);
      const myScore = isP1 ? roomData.players.p1.score : (roomData.players.p2 ? roomData.players.p2.score : 0);
      const oppScore = isP1 ? (roomData.players.p2 ? roomData.players.p2.score : 0) : roomData.players.p1.score;

      document.getElementById('multi-my-score').textContent = myScore;
      document.getElementById('multi-opp-score').textContent = oppScore;

      document.getElementById('multi-q-num').textContent = `Q${qIndex + 1}`;
      document.getElementById('multi-q-text').textContent = q.q;

      const imgContainer = document.getElementById('multi-image-container');
      const imgEl = document.getElementById('multi-image');
      if (q.image) {
        imgEl.src = q.image;
        imgContainer.classList.remove('hidden');
      } else {
        imgEl.src = '';
        imgContainer.classList.add('hidden');
      }

      const banner = document.getElementById('buzz-status-banner');
      const container = document.getElementById('multi-options-container');
      const nextBtnWrap = document.getElementById('multi-next-btn-wrap');

      if (roomData.buzzPlayer) {
        const isMeBuzz = (roomData.buzzPlayer === myPlayerId);
        const isCorrect = roomData.isBuzzCorrect;

        if (isCorrect) {
          banner.textContent = isMeBuzz ? "🎉 あなたが正解しました！ (+1pt)" : "相手が正解しました！";
          banner.className = isMeBuzz ? "p-3 rounded-xl bg-emerald-900/90 border border-emerald-500 text-emerald-200 text-xs font-bold text-center" : "p-3 rounded-xl bg-rose-900/90 border border-rose-500 text-rose-200 text-xs font-bold text-center";
        } else {
          banner.textContent = isMeBuzz ? "❌ 残念！不正解です..." : "相手が不正解でした！";
          banner.className = "p-3 rounded-xl bg-rose-900/90 border border-rose-500 text-rose-200 text-xs font-bold text-center";
        }

        if (isHost) {
          nextBtnWrap.classList.remove('hidden');
        }
      } else {
        banner.textContent = "正しい選択肢を先に押してください！";
        banner.className = "p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center text-xs font-bold transition";
        nextBtnWrap.classList.add('hidden');
      }

      container.innerHTML = (q.options || []).map((opt, idx) => {
        const isChosen = (roomData.answeredChoice === idx);
        const isTargetCorrect = q.answers.includes(idx);
        let btnStyle = "bg-slate-900/80 border-slate-700/60 text-slate-200 hover:bg-slate-800";

        if (roomData.buzzPlayer) {
          if (isTargetCorrect) {
            btnStyle = "bg-emerald-950/80 border-emerald-500/80 text-emerald-200";
          } else if (isChosen && !isTargetCorrect) {
            btnStyle = "bg-rose-950/80 border-rose-500/80 text-rose-200";
          } else {
            btnStyle = "bg-slate-950/40 border-slate-800 text-slate-600";
          }
        }

        return `
          <button onclick="handleMultiChoiceClick(${idx})" ${roomData.buzzPlayer ? 'disabled' : ''} class="w-full p-4 rounded-xl border ${btnStyle} text-xs font-medium text-left transition shadow flex justify-between items-center">
            <span>${opt}</span>
          </button>
        `;
      }).join('');
    }

    function handleMultiChoiceClick(choiceIdx) {
      if (!roomRef || !roomData || roomData.buzzPlayer) return;

      const qIndex = roomData.currentQIndex || 0;
      const q = roomData.questions[qIndex];
      const isCorrect = q.answers.includes(choiceIdx);

      const isP1 = (roomData.players.p1.id === myPlayerId);
      const playerKey = isP1 ? 'p1' : 'p2';
      const currentScore = isP1 ? roomData.players.p1.score : roomData.players.p2.score;

      const updates = {};
      updates['buzzPlayer'] = myPlayerId;
      updates['answeredChoice'] = choiceIdx;
      updates['isBuzzCorrect'] = isCorrect;

      if (isCorrect) {
        updates[`players/${playerKey}/score`] = currentScore + 1;
      }

      roomRef.update(updates);
    }

    function nextMultiQuestionHost() {
      if (!isHost || !roomRef || !roomData) return;

      const nextIndex = (roomData.currentQIndex || 0) + 1;
      if (nextIndex >= roomData.questions.length) {
        alert("全問題が終了しました！ロビーに戻ります。");
        roomRef.update({ status: 'finished' });
        showSubjectScreen();
      } else {
        roomRef.update({
          currentQIndex: nextIndex,
          buzzPlayer: null,
          answeredChoice: null,
          isBuzzCorrect: null
        });
      }
    }

    function leaveMultiRoom() {
      if (roomRef) {
        roomRef.off();
      }
      showSubjectScreen();
    }
  