
    (() => {
      'use strict';
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      const startup = document.getElementById('np-pwa-startup');
      const startupStartedAt = performance.now();
      // 外部通信や外部スクリプトの完了を待たず、DOMの準備ができたら起動画面を解除する。
      let pageReady = document.readyState !== 'loading';
      let startupHideScheduled = false;
      const hideStartup = () => {
        if (!startup || !pageReady || startupHideScheduled) return;
        startupHideScheduled = true;
        const remaining = Math.max(0, 1800 - (performance.now() - startupStartedAt));
        window.setTimeout(() => {
          startup.classList.add('is-hidden');
          const appShell = document.querySelector('body > div.w-full.max-w-xl.mx-auto');
          if (appShell) appShell.classList.add('np-cinematic-home-reveal-active');
        }, remaining);
      };

      if (pageReady) {
        hideStartup();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          pageReady = true;
          hideStartup();
        }, { once: true });
      }

      // Renderの休止復帰はバックグラウンドで実行し、学習画面の表示を待たせない。
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);
        fetch('https://nurse-line-system.onrender.com/', {
          method: 'GET',
          cache: 'no-store',
          mode: 'cors',
          signal: controller.signal
        }).catch(error => {
          console.info('[Nurse＋ PWA] サーバー事前接続を終了:', error.name || error);
        }).finally(() => {
          window.clearTimeout(timeoutId);
        });
      }

      if ('serviceWorker' in navigator && location.protocol === 'https:') {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' })
          .then(() => {})
          .catch(error => console.warn('[Nurse＋ PWA] Service Worker registration failed:', error));
      }
      let deferredInstallPrompt = null;
      const dismissedKey = 'nurse_plus_pwa_install_dismissed_v1';
      const showInstallCard = (nativePromptAvailable) => {
        if (isStandalone || localStorage.getItem(dismissedKey) === '1' || document.getElementById('np-pwa-install')) return;
        const card = document.createElement('section');
        card.id = 'np-pwa-install';
        card.setAttribute('aria-label', 'ホーム画面への追加');
        const title = document.createElement('h2');
        title.textContent = 'Nurse＋をアプリのように使う';
        title.style.cssText = 'font-size:14px;font-weight:700;color:#514166;margin-bottom:6px';
        const description = document.createElement('p');
        description.textContent = nativePromptAvailable
          ? 'ホーム画面に追加すると、次回からすぐに開けます。'
          : 'ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選べます。';
        description.style.cssText = 'font-size:11px;line-height:1.7;color:#81758f;margin-bottom:12px';
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px';
        const dismiss = document.createElement('button');
        dismiss.type = 'button'; dismiss.className = 'np-pwa-secondary'; dismiss.textContent = 'あとで';
        dismiss.addEventListener('click', () => { localStorage.setItem(dismissedKey, '1'); card.remove(); document.body.classList.remove('np-pwa-install-open'); });
        actions.appendChild(dismiss);
        if (nativePromptAvailable) {
          const install = document.createElement('button');
          install.type = 'button'; install.className = 'np-pwa-primary'; install.textContent = 'ホーム画面に追加';
          install.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice.catch(() => null);
            deferredInstallPrompt = null;
            card.remove(); document.body.classList.remove('np-pwa-install-open');
          });
          actions.appendChild(install);
        }
        card.append(title, description, actions);
        document.body.appendChild(card);
        document.body.classList.add('np-pwa-install-open');
      };
      window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        showInstallCard(true);
      });
      window.addEventListener('appinstalled', () => {
        const card = document.getElementById('np-pwa-install');
        if (card) card.remove();
        document.body.classList.remove('np-pwa-install-open');
        localStorage.setItem(dismissedKey, '1');
      });
      window.addEventListener('load', () => {
        if (!isStandalone && !deferredInstallPrompt) window.setTimeout(() => showInstallCard(false), 1600);
      }, { once: true });
    })();
  