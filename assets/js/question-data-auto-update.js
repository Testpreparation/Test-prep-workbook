/* Nurse＋: question and flashcard data hot refresh.
 * Polls the repository tree for changes to already-loaded subject data scripts.
 * Updated scripts are re-evaluated only while the app is safely on its home screen.
 */
(() => {
  'use strict';

  const TREE_URL = 'https://api.github.com/repos/Testpreparation/Test-prep-workbook/git/trees/main?recursive=1';
  const CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const MIN_CHECK_GAP_MS = 10 * 60 * 1000;
  const BASE_PATH = new URL('./', window.location.href).pathname;
  const knownShas = new Map();
  let pendingUpdates = new Map();
  let checking = false;
  let applying = false;
  let lastCheckAt = 0;

  function getLoadedDataScripts() {
    return Array.from(document.scripts).filter(script => {
      if (!script.src || script.type === 'module') return false;
      try {
        const url = new URL(script.src, window.location.href);
        const path = decodeURIComponent(url.pathname).slice(BASE_PATH.length);
        return path.startsWith('科目/') && path.endsWith('.js');
      } catch (_) {
        return false;
      }
    }).map(script => {
      const url = new URL(script.src, window.location.href);
      const path = decodeURIComponent(url.pathname).slice(BASE_PATH.length);
      return { script, path };
    });
  }

  function isSafeToApply() {
    if (document.visibilityState === 'hidden') return false;
    const flashcardPlay = document.getElementById('fc-step-4-play');
    if (flashcardPlay && !flashcardPlay.classList.contains('hidden') &&
        window.getComputedStyle(flashcardPlay).display !== 'none') return false;
    return ['screen-dashboard', 'screen-dashboard-bottom-menu'].some(id => {
      const screen = document.getElementById(id);
      return screen && !screen.classList.contains('hidden') &&
        window.getComputedStyle(screen).display !== 'none';
    });
  }

  async function fetchRemoteDataShas() {
    const response = await fetch(TREE_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error('GitHub tree request failed: ' + response.status);
    const tree = await response.json();
    if (!Array.isArray(tree.tree) || tree.truncated) {
      throw new Error('GitHub tree response is incomplete');
    }
    const shas = new Map();
    for (const entry of tree.tree) {
      if (entry.type === 'blob' && entry.path.startsWith('科目/') && entry.path.endsWith('.js')) {
        shas.set(entry.path, entry.sha);
      }
    }
    return shas;
  }

  async function loadUpdatedScript(script, path, sha) {
    const nextUrl = new URL(script.src, window.location.href);
    nextUrl.searchParams.set('_np_data_sha', sha);

    // Some legacy subject files append with Array.push(). Reset only arrays
    // explicitly appended by this file, and restore them if the replacement fails.
    const sourceResponse = await fetch(nextUrl.href, { cache: 'no-store' });
    if (!sourceResponse.ok) throw new Error('Failed to inspect updated data script: ' + path);
    const source = await sourceResponse.text();
    const appendedTargets = new Set();
    const targetPattern = /window\.(QUIZ_DB|FLASHCARD_DB)\s*\.\s*([A-Za-z_$][\w$]*)\s*\.push\s*\(/g;
    let targetMatch;
    while ((targetMatch = targetPattern.exec(source))) {
      appendedTargets.add(targetMatch[1] + '.' + targetMatch[2]);
    }
    const previousTargets = new Map();
    for (const target of appendedTargets) {
      const [databaseName, key] = target.split('.');
      const database = window[databaseName];
      if (database && Array.isArray(database[key])) {
        previousTargets.set(target, database[key]);
        database[key] = [];
      }
    }

    return new Promise((resolve, reject) => {
      const replacement = document.createElement('script');
      replacement.src = nextUrl.href;
      replacement.async = false;
      replacement.onload = () => {
        script.remove();
        resolve();
      };
      replacement.onerror = () => {
        replacement.remove();
        for (const [target, previousValue] of previousTargets) {
          const [databaseName, key] = target.split('.');
          const database = window[databaseName];
          if (database) database[key] = previousValue;
        }
        reject(new Error('Failed to load updated data script: ' + path));
      };
      script.parentNode.insertBefore(replacement, script);
    });
  }

  async function applyPendingUpdates() {
    if (applying || pendingUpdates.size === 0 || !isSafeToApply()) return;
    applying = true;
    try {
      const scriptsByPath = new Map(getLoadedDataScripts().map(item => [item.path, item.script]));
      for (const [path, sha] of Array.from(pendingUpdates.entries())) {
        const script = scriptsByPath.get(path);
        if (!script) {
          pendingUpdates.delete(path);
          continue;
        }
        await loadUpdatedScript(script, path, sha);
        knownShas.set(path, sha);
        pendingUpdates.delete(path);
      }
      if (pendingUpdates.size === 0) {
        window.dispatchEvent(new CustomEvent('nurseplus:question-data-updated'));
      }
    } catch (error) {
      console.info('[Nurse＋] 問題データの自動更新を保留しました:', error);
    } finally {
      applying = false;
    }
  }

  async function checkForDataUpdates(force = false) {
    const now = Date.now();
    if (checking || !navigator.onLine || (!force && now - lastCheckAt < MIN_CHECK_GAP_MS)) return;
    checking = true;
    lastCheckAt = now;
    try {
      const remoteShas = await fetchRemoteDataShas();
      const loadedScripts = getLoadedDataScripts();

      if (knownShas.size === 0) {
        for (const { path } of loadedScripts) {
          const sha = remoteShas.get(path);
          if (sha) knownShas.set(path, sha);
        }
        return;
      }

      for (const { path } of loadedScripts) {
        const remoteSha = remoteShas.get(path);
        if (!remoteSha) continue;
        const currentSha = knownShas.get(path);
        if (currentSha && currentSha !== remoteSha) pendingUpdates.set(path, remoteSha);
        else if (!currentSha) knownShas.set(path, remoteSha);
      }
      await applyPendingUpdates();
    } catch (error) {
      console.info('[Nurse＋] 問題データの更新確認をスキップしました:', error && error.message || error);
    } finally {
      checking = false;
    }
  }

  window.addEventListener('load', () => {
    window.setTimeout(() => checkForDataUpdates(true), 3000);
  }, { once: true });

  window.setInterval(() => checkForDataUpdates(), CHECK_INTERVAL_MS);
  // 更新を学習中に検知した場合、ホームへ戻った後すぐ反映できるよう軽く確認する。
  window.setInterval(() => applyPendingUpdates(), 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForDataUpdates();
      applyPendingUpdates();
    }
  });
  window.addEventListener('focus', () => checkForDataUpdates());
})();
