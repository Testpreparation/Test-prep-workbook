
    (() => {
      try {
        const savedTheme = localStorage.getItem('nurse_plus_theme');
        document.documentElement.classList.toggle('np-light-theme', savedTheme !== 'dark');
        const savedFontSize = Number(localStorage.getItem('nurse_plus_text_size') || 100);
        if (savedFontSize >= 85 && savedFontSize <= 120) document.documentElement.dataset.npTextScale = String(savedFontSize / 100);
        document.documentElement.style.fontSize = '100%';
      } catch (_) {
        document.documentElement.classList.add('np-light-theme');
      }
    })();
  