/**
 * 解剖生理学 2026秋学期 統合問題 データ
 *
 * 問題を追加する場合は、既存の解剖生理学の問題オブジェクト形式で
 * anatomyAutumnIntegratedQuestions 配列に追加してください。
 * id は配列内で重複しない整数、options は選択肢配列、
 * correctIndex は正解選択肢の0始まりの位置、explanation は解説です。
 * 空配列は「まだ問題未登録」を意味します。
 */
(function () {
  'use strict';

  const questions = [];

  window.QUIZ_DB = window.QUIZ_DB || {};
  window.QUIZ_DB.anatomy_integrated_2026_autumn = questions;

  window.getAnatomyIntegratedQuestionsAutumn = function () {
    return questions;
  };
})();
