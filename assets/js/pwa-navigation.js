
    (() => {
      'use strict';

      const screenNodes = Array.from(document.querySelectorAll('[id^="screen-"]'));
      const visibility = new WeakMap();
      screenNodes.forEach(screen => visibility.set(screen, screen.classList.contains('hidden')));

      const ignoredHistoryScreens = new Set([
        'screen-quiz-play', 'screen-quiz-result',
        'screen-multi-room', 'screen-multi-play'
      ]);
      const getActiveScreenId = () => {
        const active = screenNodes.find(screen => !screen.classList.contains('hidden'));
        return active ? active.id : null;
      };
      const getTrackedScreenId = () => {
        const active = getActiveScreenId();
        return active && !ignoredHistoryScreens.has(active) ? active : null;
      };

      const routeActions = {
        'screen-dashboard': () => typeof showDashboard === 'function' && showDashboard(),
        'screen-data-analysis': () => typeof showDataAnalysis === 'function' && showDataAnalysis(),
        'screen-subjects': () => typeof showSubjectScreen === 'function' && showSubjectScreen(),
        'screen-semester-select': () => typeof showSemesterSelectionScreen === 'function' && showSemesterSelectionScreen(),
        'screen-physiology-mode-select': () => typeof showPhysiologyModeSelectionScreen === 'function' && showPhysiologyModeSelectionScreen(),
        'screen-anatomy-mode-select': () => typeof showAnatomyModeSelectionScreen === 'function' && showAnatomyModeSelectionScreen(),
        'screen-publichealth-mode-select': () => typeof showPublicHealthModeSelectionScreen === 'function' && showPublicHealthModeSelectionScreen(),
        'screen-phn-mode-select': () => typeof showPHNModeSelectionScreen === 'function' && showPHNModeSelectionScreen(),
        'screen-pathology-mode-select': () => typeof showPathologyModeSelectionScreen === 'function' && showPathologyModeSelectionScreen(),
        'screen-pathology-round-select': () => typeof showPathologyRoundSelectionScreen === 'function' && showPathologyRoundSelectionScreen(),
        'screen-pharmacology-mode-select': () => typeof showPharmacologyModeSelectionScreen === 'function' && showPharmacologyModeSelectionScreen(),
        'screen-nursing-mode-select': () => typeof showNursingModeSelectionScreen === 'function' && showNursingModeSelectionScreen(),
        'screen-nursing-method-3-mode-select': () => typeof showNursingMethod3ModeSelectionScreen === 'function' && showNursingMethod3ModeSelectionScreen(),
        'screen-nutrition-mode-select': () => typeof showNutritionModeSelectionScreen === 'function' && showNutritionModeSelectionScreen(),
        'screen-biochemistry-format-select': () => typeof showBiochemistryFormatSelectionScreen === 'function' && showBiochemistryFormatSelectionScreen(),
        'screen-time-select': () => typeof showTimeSelectionScreen === 'function' && showTimeSelectionScreen(),
        'screen-round-select': () => typeof showRoundSelectionScreen === 'function' && showRoundSelectionScreen(),
        'screen-count-select': () => typeof showCountSelectionScreen === 'function' && showCountSelectionScreen(),
        'screen-quiz-start': () => typeof showStartScreen === 'function' && showStartScreen(),
        'screen-multi-lobby': () => typeof showMultiplayerLobby === 'function' && showMultiplayerLobby()
      };

      let suppressNextHistoryPush = false;
      let lastTrackedScreen = getTrackedScreenId();
      try {
        if (lastTrackedScreen) {
          history.replaceState({ ...(history.state || {}), npScreen: lastTrackedScreen }, '', location.href);
        }
      } catch (_) {}

      let navigationCheckScheduled = false;
      const updateNavigationState = () => {
        navigationCheckScheduled = false;
        const active = getTrackedScreenId();
        if (!active || active === lastTrackedScreen) return;
        lastTrackedScreen = active;
        if (suppressNextHistoryPush) {
          suppressNextHistoryPush = false;
          return;
        }
        try {
          history.pushState({ ...(history.state || {}), npScreen: active }, '', location.href);
        } catch (_) {}
      };

      const observer = new MutationObserver(records => {
        records.forEach(record => {
          const screen = record.target;
          if (!screen || !screen.id || !screen.id.startsWith('screen-')) return;
          const isHidden = screen.classList.contains('hidden');
          const wasHidden = visibility.get(screen);
          if (wasHidden === true && isHidden === false) {
            screen.classList.remove('np-screen-enter-motion');
            void screen.offsetWidth;
            screen.classList.add('np-screen-enter-motion');
            screen.addEventListener('animationend', () => screen.classList.remove('np-screen-enter-motion'), { once: true });
          }
          visibility.set(screen, isHidden);
        });
        if (!navigationCheckScheduled) {
          navigationCheckScheduled = true;
          requestAnimationFrame(updateNavigationState);
        }
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

      window.addEventListener('popstate', event => {
        const target = event.state && event.state.npScreen;
        const current = getActiveScreenId();
        if ((current === 'screen-quiz-play' || current === 'screen-quiz-result') && target) {
          if (!window.confirm('演習画面を離れて前の画面に戻りますか？')) {
            try { history.pushState({ ...(history.state || {}), npScreen: current }, '', location.href); } catch (_) {}
            return;
          }
        }
        if (!target || target === current || !routeActions[target]) return;
        suppressNextHistoryPush = true;
        routeActions[target]();
      });

      // LINE内ブラウザでは外部ブラウザを強制起動できないため、ユーザー操作の案内だけを表示する。
      const isLineBrowser = /Line\//i.test(navigator.userAgent);
      if (isLineBrowser) {
        let dismissed = false;
        try { dismissed = sessionStorage.getItem('nurse_plus_line_external_browser_guide_dismissed') === '1'; } catch (_) {}
        if (!dismissed) {
          const guide = document.createElement('aside');
          guide.id = 'np-line-browser-guide';
          guide.setAttribute('role', 'status');
          guide.innerHTML = '<div style="font-size:13px;font-weight:700;margin-bottom:5px">Nurse＋は外部ブラウザでの利用がおすすめです</div>' +
            '<p style="font-size:11px;line-height:1.7;color:#786b89">LINE内ブラウザではログインがうまく進まない場合があります。右上の「…」メニューから「デフォルトのブラウザで開く」または「他のアプリで開く」を選んでください。</p>' +
            '<div class="np-line-guide-actions"><button type="button" class="np-line-guide-copy">ページのURLをコピー</button><button type="button" class="np-line-guide-close">閉じる</button></div>';
          document.body.appendChild(guide);
          guide.querySelector('.np-line-guide-copy').addEventListener('click', async () => {
            const button = guide.querySelector('.np-line-guide-copy');
            try {
              await navigator.clipboard.writeText(location.href);
              button.textContent = 'コピーしました';
            } catch (_) {
              window.prompt('このURLをコピーしてください', location.href);
            }
          });
          guide.querySelector('.np-line-guide-close').addEventListener('click', () => {
            try { sessionStorage.setItem('nurse_plus_line_external_browser_guide_dismissed', '1'); } catch (_) {}
            guide.remove();
          });
        }
      }
    })();
  