
    // 設定カテゴリーは同時に1つだけ開く
    (function () {
      const accordion = document.getElementById('settings-accordion');
      if (!accordion || accordion.dataset.singleOpenBound === 'true') return;
      accordion.dataset.singleOpenBound = 'true';
      accordion.addEventListener('toggle', function (event) {
        const opened = event.target;
        if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
        accordion.querySelectorAll(':scope > details[open]').forEach(function (item) {
          if (item !== opened) item.open = false;
        });
      }, true);
    })();
  