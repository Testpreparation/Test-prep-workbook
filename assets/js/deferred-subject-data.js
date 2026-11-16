/* Nurse＋: load subject question/flashcard data after the initial home screen is ready. */
(() => {
  'use strict';
  const sources = [
  "./科目/解剖生理学/2026春学期/練習問題/anatomy2026harugakki.js",
  "科目/生化学/2026春学期/選択式/biochemistry2026harugakki.js",
  "./科目/医療概論/2026春学期/練習問題/Medicine2026harugakki.js",
  "./科目/微生物学/2026春学期/練習問題/microbiology2026harugakki.js",
  "./科目/心理学/2026春学期/練習問題/mindbehavior2026harugakki.js",
  "科目/看護学方法論Ⅲ/2026春学期/練習問題/nursingmethod2026harugakki.js",
  "科目/看護学方法論Ⅲ/2026春学期/演習問題/nursingmethod3_exercise2026harugakki.js",
  "科目/看護学方法論Ⅲ/2026春学期/練習問題/nursingmethod3_practice2026harugakki.js",
  "科目/看護学方法論Ⅲ/2026春学期/小テスト/nursingmethod3_quiz2026harugakki.js",
  "科目/薬理学/2026春学期/演習問題/pharmacology_exercise2026harugakki.js",
  "科目/薬理学/2026春学期/過去問/pharmacology_past2026harugakki.js",
  "科目/心理学/2026春学期/練習問題/psychology2026harugakki.js",
  "科目/栄養学/2026春学期/演習問題/nutrition_exercise_2026harugakki.js",
  "科目/栄養学/2026春学期/小テスト/nutrition_quiz_2026harugakki.js",
  "科目/公衆衛生学/2026春学期/演習問題/publichealth_exercise2026harugakki.js",
  "科目/公衆衛生学/2026春学期/模擬国家試験/publichealth_national2026harugakki.js",
  "科目/公衆衛生学/2026春学期/過去問/publichealth_past2026harugakki.js",
  "科目/公衆衛生看護学概論/2026春学期/基礎問題/publichealthnursing_basic2026harugakki.js",
  "科目/公衆衛生看護学概論/2026春学期/演習問題/publichealthnursing_exercise2026harugakki.js",
  "科目/解剖生理学/2026秋学期/練習問題/anatomy2026akigakki.js",
  "./科目/生化学/2026秋学期/選択式/biochemistry2026akigakki.js",
  "./科目/生化学/穴埋め式/biochemistry_fill.js",
  "科目/医療概論/2026秋学期/練習問題/Medicine2026akigakki.js",
  "科目/微生物学/2026秋学期/練習問題/microbiology2026akigakki.js",
  "科目/心理学/2026秋学期/練習問題/mindbehavior2026akigakki.js",
  "科目/看護学方法論Ⅲ/2026秋学期/練習問題/nursingmethod2026akigakki.js",
  "科目/看護学方法論Ⅲ/2026秋学期/演習問題/nursingmethod3_exercise2026akigakki.js",
  "./科目/看護学方法論Ⅲ/2026秋学期/練習問題/nursingmethod3_practice2026akigakki.js",
  "./科目/看護学方法論Ⅲ/2026秋学期/練習問題/nursingmethod3_practice2026akigakki_additional.js?v=20261022-1",
  "科目/看護学方法論Ⅲ/2026秋学期/小テスト/nursingmethod3_quiz2026akigakki.js",
  "科目/薬理学/2026秋学期/演習問題/pharmacology_exercise2026akigakki.js",
  "科目/薬理学/2026秋学期/過去問/pharmacology_past2026akigakki.js",
  "科目/心理学/2026秋学期/練習問題/psychology2026akigakki.js",
  "./科目/栄養学/2026秋学期/演習問題/nutrition_exercise_2026akigakki.js",
  "./科目/栄養学/2026秋学期/小テスト/nutrition_quiz_2026akigakki.js",
  "./科目/公衆衛生学/2026秋学期/演習問題/publichealth_exercise2026akigakki.js",
  "./科目/公衆衛生学/2026秋学期/自習問題/publichealth_selfstudy2026akigakki.js",
  "./科目/公衆衛生学/2026秋学期/模擬国家試験/publichealth_national2026akigakki.js",
  "./科目/公衆衛生学/2026秋学期/過去問/publichealth_past2026akigakki.js",
  "科目/公衆衛生看護学概論/2026秋学期/基礎問題/publichealthnursing_basic2026akigakki.js",
  "./科目/公衆衛生看護学概論/2026秋学期/演習問題/publichealthnursing_exercise2026akigakki.js",
  "./科目/病理学/2026秋学期/小テスト練習/小テスト練習　第1回/pathology_range_2026akigakki_1.js",
  "./科目/病理学/2026秋学期/小テスト練習/小テスト練習　第2回/pathology_range_2026akigakki_2.js",
  "./科目/病理学/2026秋学期/小テスト練習/小テスト練習　第3回/pathology_range_2026akigakki_3.js",
  "./科目/病理学/2026秋学期/演習問題/演習問題　第1回/pathology_exercise_2026akigakki_1.js",
  "./科目/病理学/2026秋学期/演習問題/演習問題　第2回/pathology_exercise_2026akigakki_2.js",
  "./科目/病理学/2026秋学期/演習問題/演習問題　第3回/pathology_exercise_2026akigakki_3.js",
  "./科目/生理学/2026秋学期/小テスト/physiology2026akigakki_quiz.js",
  "./科目/薬理学/看護師国家試験過去6年/pharmacology_nurse_national_6years.js",
  "./科目/公衆衛生学/2026秋学期/暗記カード/flashcard_data.js",
  "./科目/生化学/暗記カード/biochemistry_flashcard_data.js",
  "./科目/栄養学/暗記カード/nutrition_flashcard_data.js"
];
  window.NP_SUBJECT_DATA_READY = false;
  let resolveReady;
  window.NP_SUBJECT_DATA_READY_PROMISE = new Promise(resolve => { resolveReady = resolve; });

  const loadScript = src => new Promise(resolve => {
    const script = document.createElement('script');
    let settled = false;
    const finish = loaded => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (!loaded) script.remove();
      resolve(loaded);
    };
    script.src = src;
    script.async = false;
    script.onload = () => finish(true);
    script.onerror = () => {
      console.warn('[Nurse＋] 科目データを読み込めませんでした:', src);
      finish(false);
    };
    const timeoutId = window.setTimeout(() => {
      console.warn('[Nurse＋] 科目データの読み込みがタイムアウトしました:', src);
      finish(false);
    }, 8000);
    document.head.appendChild(script);
  });

  const loadAll = async () => {
    // async=false の動的scriptは挿入順に実行されるため、取得は並行しつつ依存順を維持する。
    await Promise.all(sources.map(loadScript));
    window.NP_SUBJECT_DATA_READY = true;
    resolveReady();
    window.dispatchEvent(new CustomEvent('nurseplus:subject-data-loaded'));
  };

  const schedule = () => {
    const run = () => { loadAll().catch(error => {
      console.error('[Nurse＋] 科目データの遅延読み込みに失敗しました:', error);
      window.NP_SUBJECT_DATA_READY = true;
      resolveReady();
      window.dispatchEvent(new CustomEvent('nurseplus:subject-data-loaded'));
    }); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1200 });
    else window.setTimeout(run, 0);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();