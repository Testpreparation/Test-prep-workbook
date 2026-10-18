
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
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdatedNotice(); hadController = true; });
      window.addEventListener('load', async () => {
        try { const registration = await navigator.serviceWorker.getRegistration('./'); if (registration) await registration.update(); }
        catch (error) { console.info('[Nurse＋ PWA] 更新確認をスキップ:', error && error.name || error); }
      }, { once: true });
    })();
  