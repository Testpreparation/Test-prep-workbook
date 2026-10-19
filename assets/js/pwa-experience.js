
    (() => {
      'use strict';
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      const startup = document.getElementById('np-pwa-startup');
      const startupStartedAt = performance.now();
      let pageLoaded = document.readyState === 'complete';
      let backendWakeFinished = !navigator.onLine;
      let startupHideScheduled = false;
      const startupCaption = startup ? startup.querySelector('p') : null;
      const hideStartup = () => {
        if (!startup || !pageLoaded || !backendWakeFinished || startupHideScheduled) return;
        startupHideScheduled = true;
        const remaining = Math.max(0, 3000 - (performance.now() - startupStartedAt));
        window.setTimeout(() => {
          startup.classList.add('is-hidden');
          // Start the home reveal at the same moment the startup overlay fades,
          // rather than during page loading while the overlay still covers it.
          const appShell = document.querySelector('body > div.w-full.max-w-xl.mx-auto');
          if (appShell) appShell.classList.add('np-cinematic-home-reveal-active');
        }, remaining);
      };

      // 起動画面の表示中にRenderへアクセスして休止状態からの復帰を促す。
      // 学習画面の利用自体はサーバー応答を必須にせず、最大65秒で起動画面を解除する。
      const wakeRenderBackend = async () => {
        if (!navigator.onLine) {
          backendWakeFinished = true;
          hideStartup();
          return;
        }
        if (startupCaption) startupCaption.textContent = 'サーバーを準備しています…';
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 65000);
        try {
          await fetch('https://nurse-line-system.onrender.com/', {
            method: 'GET',
            cache: 'no-store',
            mode: 'cors',
            signal: controller.signal
          });
        } catch (error) {
          // サーバー停止・通信不良でも、学習画面を開けるよう起動画面を解除する。
          console.info('[Nurse＋ PWA] サーバーの事前接続を終了:', error.name || error);
        } finally {
          window.clearTimeout(timeoutId);
          backendWakeFinished = true;
          if (startupCaption) startupCaption.textContent = '学びを、少しずつ。';
          hideStartup();
        }
      };
      wakeRenderBackend();

      if (pageLoaded) {
        hideStartup();
      } else {
        window.addEventListener('load', () => {
          pageLoaded = true;
          hideStartup();
        }, { once: true });
      }

      const status = document.createElement('div');
      status.id = 'np-pwa-status';
      status.setAttribute('role', 'status');
      status.innerHTML = '<span class="np-pwa-dot"></span><span class="np-pwa-status-text">オンライン</span>';
      document.body.appendChild(status);
      const updateStatus = () => {
        const offline = !navigator.onLine;
        status.dataset.state = offline ? 'offline' : 'online';
        status.querySelector('.np-pwa-status-text').textContent = offline
          ? 'オフライン：保存済みの内容を表示中'
          : 'オンライン';
        status.title = offline
          ? '一度読み込んだページ・問題データを中心に利用できます。未読込の問題や外部サービスは使えない場合があります。'
          : '通信状態を表示しています。';
      };
      window.addEventListener('online', updateStatus);
      window.addEventListener('offline', updateStatus);
      if ('serviceWorker' in navigator && location.protocol === 'https:') {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' })
          .then(() => { updateStatus(); navigator.serviceWorker.addEventListener('controllerchange', updateStatus); })
          .catch(error => console.warn('[Nurse＋ PWA] Service Worker registration failed:', error));
      }
      updateStatus();

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
  