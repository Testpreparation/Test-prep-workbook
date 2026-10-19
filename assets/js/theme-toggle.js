
    (() => {
      const key = 'nurse_plus_theme';
      const root = document.documentElement;
      const initThemeToggle = () => {
      const bottomMenuToggle = document.getElementById('np-bottom-menu-toggle');
      if (bottomMenuToggle && bottomMenuToggle.dataset.npBound !== 'true') {
        bottomMenuToggle.dataset.npBound = 'true';
        try { bottomMenuToggle.checked = localStorage.getItem('nurse_plus_bottom_menu_enabled') === 'true'; } catch (_) { bottomMenuToggle.checked = false; }
        bottomMenuToggle.addEventListener('change', () => {
          try { localStorage.setItem('nurse_plus_bottom_menu_enabled', String(bottomMenuToggle.checked)); } catch (_) {}
        });
      }
      const button = document.getElementById('np-theme-toggle');
      if (!button || button.dataset.npThemeBound === 'true') return;
      button.dataset.npThemeBound = 'true';
      const applyTheme = theme => {
        const isLight = theme !== 'dark';
        root.classList.toggle('np-light-theme', isLight);
        try { localStorage.setItem(key, isLight ? 'light' : 'dark'); } catch (_) {}
        button.checked = !isLight;
        button.setAttribute('aria-pressed', String(!isLight));
        button.setAttribute('aria-label', isLight ? 'ダークモードに切り替え' : 'ホワイトモードに切り替え');
      };
      let initial = 'light';
      try { initial = localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; } catch (_) {}
      applyTheme(initial);
      button.addEventListener('change', event => {
        event.stopPropagation();
        applyTheme(button.checked ? 'dark' : 'light');
      });
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle, { once: true });
      } else {
        initThemeToggle();
      }
    })();
  