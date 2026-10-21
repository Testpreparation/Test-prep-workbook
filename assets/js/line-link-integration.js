
    (() => {
      try {
        // LINE callback sends credentials in the URL fragment (#), not the query string (?).
        const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryParams = new URLSearchParams(window.location.search);
        const lineName = fragment.get('line_name') || queryParams.get('line_name');
        const lineUserId = fragment.get('line_user_id') || queryParams.get('line_user_id');
        const lineSession = fragment.get('line_session') || queryParams.get('line_session');
        const hasLineCallback = Boolean(lineName || lineUserId || lineSession);
        const isFirstLineLoginOnThisDevice = Boolean(lineUserId && !localStorage.getItem('nurse_line_user_id'));
        if (isFirstLineLoginOnThisDevice) localStorage.setItem('nurse_plus_tutorial_pending_first_login', '1');
        if (lineName) localStorage.setItem('nurse_line_user_name', lineName);
        if (lineUserId) localStorage.setItem('nurse_line_user_id', lineUserId);
        if (lineSession) {
          localStorage.setItem('nurse_line_user_session', lineSession);
          window.NURSE_LINE_SESSION = lineSession;
        }
        if (hasLineCallback) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          console.info('LINEログイン情報を保存しました。');
        }

        const savedName = localStorage.getItem('nurse_line_user_name');
        const savedSession = localStorage.getItem('nurse_line_user_session');
        if (savedSession) {
          fetch('https://nurse-line-system.onrender.com/api/user/visit', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + savedSession }
          }).then(response => {
            if (!response.ok) console.warn('LINE利用履歴の記録に失敗:', response.status);
          }).catch(error => console.warn('LINE利用履歴の記録に失敗:', error));
        }
        if (savedName) {
          window.NURSE_LINE_USER_NAME = savedName;
          console.info('保存済みLINE表示名:', savedName);

          // LINEログイン後、訪問履歴の該当レコードを更新する。
          // お知らせ機能には触れず、presence/history のみを扱う。
          const updateLineNameInVisitorHistory = async () => {
            try {
              if (typeof db === 'undefined' || !db || typeof myPlayerId === 'undefined') return;
              const historyRef = db.ref('presence/history');
              const snap = await historyRef.once('value');
              const history = snap.val() || {};
              const updates = {};
              Object.entries(history).forEach(([key, record]) => {
                if (record && record.visitorId === myPlayerId && record.lineName !== savedName) {
                  updates[`${key}/lineName`] = savedName;
                }
              });

              // ID指定の最新履歴は必ずLINE表示名付きで保存
              updates[`${myPlayerId}/visitorId`] = myPlayerId;
              updates[`${myPlayerId}/lineName`] = savedName;
              updates[`${myPlayerId}/deviceName`] = (history[myPlayerId] && history[myPlayerId].deviceName) || getVisitorDeviceName();
              updates[`${myPlayerId}/timestamp`] = firebase.database.ServerValue.TIMESTAMP;
              await historyRef.update(updates);

              // この端末の履歴を再描画
              const refreshed = await historyRef.once('value');
              if (typeof renderVisitorHistory === 'function') renderVisitorHistory(refreshed.val());
              console.info('LINE表示名を訪問履歴に反映しました。');
            } catch (error) {
              console.warn('訪問履歴のLINE表示名更新に失敗:', error);
            }
          };
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateLineNameInVisitorHistory, { once: true });
          } else {
            updateLineNameInVisitorHistory();
          }
        }

        // 初回アクセス時、LINE未ログインならログイン案内を表示する。
        // ログイン済みなら再表示しない。お知らせ機能には触れない。
        document.addEventListener('DOMContentLoaded', () => {
          if (localStorage.getItem('nurse_line_user_name') && localStorage.getItem('nurse_line_user_session') && localStorage.getItem('nurse_line_user_id')) return;
          if (document.getElementById('nurse-line-first-login-modal')) return;

          const modal = document.createElement('div');
          modal.id = 'nurse-line-first-login-modal';
          modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4';
          modal.setAttribute('role', 'dialog');
          modal.setAttribute('aria-modal', 'true');
          modal.setAttribute('aria-labelledby', 'nurse-line-first-login-title');
          modal.innerHTML = `
            <div class="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
              <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/50 text-2xl">💬</div>
              <h2 id="nurse-line-first-login-title" class="mb-2 text-lg font-bold text-white">LINEログイン</h2>
              <p class="mb-5 text-sm leading-6 text-slate-300">初回はLINEログインすると、管理画面の訪問者履歴にLINEの表示名が表示されます。</p>
              <button id="nurse-line-first-login-button" type="button" class="mb-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500">LINEでログイン</button>
              <button id="nurse-line-first-login-later" type="button" class="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">あとで</button>
              <p class="mt-3 text-[10px] leading-4 text-slate-500">ログインしなくてもアプリは利用できます。未ログインの場合、この案内は次回アクセス時にも表示されます。</p>
            </div>`;
          document.body.appendChild(modal);

          document.getElementById('nurse-line-first-login-button').addEventListener('click', () => {
            window.location.href = 'https://nurse-line-system.onrender.com/auth/line';
          });
          document.getElementById('nurse-line-first-login-later').addEventListener('click', () => {
            modal.remove();
          });
        });
      } catch (error) {
        console.warn('LINE連携情報を保存できませんでした。', error);
      }
    })();
  