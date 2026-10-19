
    (() => {
      const key = 'nurse_plus_theme';
      const root = document.documentElement;
      const initThemeToggle = () => {
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
  