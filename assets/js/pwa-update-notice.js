
    (() => {
      'use strict';
      if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
      let shown = false;
      const showUpdatedNotice = () => {
        if (shown || document.getElementById('np-pwa-update-notice')) return;
        shown = true;
        const notice = document.createElement('aside');
        notice.id = 'np-pwa-update-notice';
        notice.setAttribute('role', 'status');
        const message = document.createElement('span');
        message.textContent = 'Nurse＋の更新が適用されました。最新の画面に切り替えるには再読み込みしてください。';
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = '再読み込み';
        button.addEventListener('click', () => { button.disabled = true; button.textContent = '更新中…'; window.location.reload(); });
        notice.append(message, button); document.body.appendChild(notice);
      };
      let hadController = Boolean(navigator.serviceWorker.controller);
      let updateCheckRunning = false;
      let currentRegistration = null;
      const checkForUpdates = async () => {
        if (updateCheckRunning || document.visibilityState === 'hidden' || !navigator.onLine) return;
        updateCheckRunning = true;
        try {
          currentRegistration = currentRegistration || await navigator.serviceWorker.getRegistration('./');
          if (currentRegistration) await currentRegistration.update();
        } catch (error) {
          console.info('[Nurse＋ PWA] 更新確認をスキップ:', error && error.name || error);
        } finally {
          updateCheckRunning = false;
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdatedNotice(); hadController = true; });
      window.addEventListener('load', () => { checkForUpdates(); }, { once: true });
      // アプリを開いたままでも公開された更新を検知できるよう、表示中は30秒ごとに確認する。
      window.setInterval(checkForUpdates, 30000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdates(); });
      window.addEventListener('focus', checkForUpdates);
      window.addEventListener('online', checkForUpdates);
    })();
  