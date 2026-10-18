/* Nurse＋ bootstrap: load HTML fragments before the original classic scripts. */
const NP_FRAGMENT_FILES = {
  "top-controls": "./pages/top-controls.html?v=20261019-1",
  "settings-modals": "./pages/settings-modals.html?v=20261019-1",
  "navigation-drawer": "./pages/navigation-drawer.html?v=20261019-1",
  "app-header": "./pages/app-header.html?v=20261019-1",
  "home-dashboard": "./pages/home-dashboard.html?v=20261019-1",
  "data-analysis": "./pages/data-analysis.html?v=20261019-1",
  "study-breadcrumbs": "./pages/study-breadcrumbs.html?v=20261019-1",
  "subjects-flashcards": "./pages/subjects-flashcards.html?v=20261019-1",
  "selection-screens": "./pages/selection-screens.html?v=20261019-1",
  "quiz-screens": "./pages/quiz-screens.html?v=20261019-1",
  "multiplayer-screens": "./pages/multiplayer-screens.html?v=20261019-1",
  "learning-modals": "./pages/learning-modals.html?v=20261019-1",
  "admin-modal": "./pages/admin-modal.html?v=20261019-1",
  "question-editor": "./pages/question-editor.html?v=20261019-1",
  "pwa-startup": "./pages/pwa-startup.html?v=20261019-1"
};

const NP_APP_SCRIPTS = [
  "./assets/js/app-core.js?v=20261019-1",
  "./assets/js/nurse-line-link-integration.js?v=20261019-1",
  "./assets/js/nurse-plus-pwa-experience.js?v=20261019-1",
  "./assets/js/nurse-plus-theme-toggle.js?v=20261019-1",
  "./assets/nurse-plus-analytics-addition.js?v=20261018-2",
  "./assets/js/nurse-plus-pwa-navigation.js?v=20261019-1",
  "./assets/js/app-finish-polish.js?v=20261019-1",
  "./assets/js/nurse-plus-pwa-update-notice.js?v=20261019-1"
];

function npShowBootstrapError(error) {
  console.error("[Nurse＋ bootstrap]", error);
  const message = document.createElement("div");
  message.id = "nurse-plus-bootstrap-error";
  message.setAttribute("role", "alert");
  message.style.cssText = "position:fixed;z-index:99999;inset:12px 12px auto;padding:14px;border:1px solid #e6b8b8;border-radius:14px;background:#fff5f5;color:#7f1d1d;font:14px/1.6 sans-serif;box-shadow:0 8px 30px #0002";
  message.textContent = "Nurse＋の画面を読み込めませんでした。通信環境を確認して、ページを再読み込みしてください。";
  document.body.appendChild(message);
}

async function npLoadFragment(name, template) {
  const path = NP_FRAGMENT_FILES[name];
  if (!path) throw new Error("Unknown HTML fragment: " + name);
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error("HTML fragment failed (" + response.status + "): " + path);
  const html = await response.text();
  const range = document.createRange();
  range.selectNode(template.parentNode);
  template.replaceWith(range.createContextualFragment(html));
}

function npLoadClassicScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, document.baseURI).href;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("JavaScript failed to load: " + path));
    document.body.appendChild(script);
  });
}

async function npBootstrap() {
  try {
    const templates = Array.from(document.querySelectorAll("template[data-np-fragment]"));
    const expected = Object.keys(NP_FRAGMENT_FILES);
    const found = templates.map(template => template.dataset.npFragment);
    const missing = expected.filter(name => !found.includes(name));
    if (missing.length) throw new Error("HTML fragment placeholder missing: " + missing.join(", "));
    await Promise.all(templates.map(template => npLoadFragment(template.dataset.npFragment, template)));
    for (const path of NP_APP_SCRIPTS) await npLoadClassicScript(path);
    document.documentElement.dataset.nursePlusReady = "true";
  } catch (error) {
    npShowBootstrapError(error);
  }
}

/* Top-level await delays DOMContentLoaded until the legacy scripts have
   registered their existing startup handlers. */
await npBootstrap();
