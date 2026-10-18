
    (() => {
      const key = 'nurse_plus_theme';
      const root = document.documentElement;
      const button = document.getElementById('np-theme-toggle');
      const icon = document.getElementById('np-theme-icon');
      const label = document.getElementById('np-theme-label');
      if (!button) return;
      const applyTheme = theme => {
        const isLight = theme !== 'dark';
        root.classList.toggle('np-light-theme', isLight);
        try { localStorage.setItem(key, isLight ? 'light' : 'dark'); } catch (_) {}
        button.setAttribute('aria-pressed', String(!isLight));
        button.setAttribute('aria-label', isLight ? 'ダークモードに切り替え' : 'ホワイトモードに切り替え');
        icon.textContent = isLight ? '☾' : '☀';
        label.textContent = isLight ? 'ダーク' : 'ホワイト';
      };
      let initial = 'light';
      try { initial = localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; } catch (_) {}
      applyTheme(initial);
      button.addEventListener('click', event => {
        event.stopPropagation();
        applyTheme(root.classList.contains('np-light-theme') ? 'dark' : 'light');
      });
      const themeCard = document.getElementById('np-theme-settings-card');
      if (themeCard) {
        themeCard.addEventListener('click', event => {
          if (event.target.closest('#np-theme-toggle')) return;
          openThemeSettingsPage();
        });
        themeCard.addEventListener('keydown', event => {
          if (event.target !== themeCard || !['Enter', ' '].includes(event.key)) return;
          event.preventDefault();
          openThemeSettingsPage();
        });
      }
    })();
  