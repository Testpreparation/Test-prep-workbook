/* Loading feedback for subject / semester / mode / quiz / flashcard transitions.
   This is a visual transition helper only; it does not alter question data or scoring. */
(function(){
  'use strict';
  if(window.NursePlusStudyLoading) return;
  var overlay=null, hideTimer=0, showTimer=0, active=false;
  var actionPattern=/^(showSubjectScreen|selectSubject|showSemesterSelectionScreen|selectSemester|showBiochemistryFormatSelectionScreen|showPhysiologyModeSelectionScreen|selectPhysiologyMode|showAnatomyModeSelectionScreen|selectAnatomyMode|showPublicHealthModeSelectionScreen|selectPublicHealthMode|showPHNModeSelectionScreen|selectPHNMode|showPathologyModeSelectionScreen|showPathologyRoundSelectionScreen|selectPathologyMode|selectPathologyRound|showPharmacologyModeSelectionScreen|selectPharmacologyMode|showNursingMethod3ModeSelectionScreen|selectNursingMethod3Mode|showNutritionModeSelectionScreen|selectNutritionMode|showNursingModeSelectionScreen|selectNursingMode|showRoundSelectionScreen|showTimeSelectionScreen|proceedToCountOrStart|showCountSelectionScreen|showStartScreen|handleStartScreenSubmit|startQuiz|showSubjectScreen|renderFlashcardSubjectList|selectFlashcardSubject|loadFlashcardData|goToFlashcardTimeSetting|goToFlashcardCountSetting|startFlashcardPlay)$/;
  function ensure(){
    if(overlay) return overlay;
    overlay=document.createElement('div'); overlay.id='np-study-loading'; overlay.setAttribute('role','status'); overlay.setAttribute('aria-live','polite'); overlay.setAttribute('aria-label','読み込み中');
    overlay.innerHTML='<div class="np-pwa-transition-light" aria-hidden="true"></div><div class="np-pwa-transition-glass" aria-hidden="true"></div><div class="np-pwa-water-ripple" aria-hidden="true"><span></span><span></span><span></span></div><div class="np-study-loader-content"><div class="np-pwa-mark" aria-hidden="true">＋</div><div class="np-study-loader-title">Nurse＋</div><p class="np-study-loader-caption">準備しています…</p><div class="np-study-loader-track"><div class="np-study-loader-bar"></div></div></div>';
    document.body.appendChild(overlay); return overlay;
  }
  function show(){
    window.clearTimeout(hideTimer); window.clearTimeout(showTimer);
    showTimer=window.setTimeout(function(){ensure().classList.add('is-visible'); active=true;},80);
    hideTimer=window.setTimeout(hide,8000);
  }
  function hide(){
    window.clearTimeout(showTimer); window.clearTimeout(hideTimer);
    if(overlay) overlay.classList.remove('is-visible');
    active=false;
  }
  function finishSoon(){window.clearTimeout(hideTimer);hideTimer=window.setTimeout(hide,260);}
  document.addEventListener('click',function(event){
    var el=event.target&&event.target.closest?event.target.closest('[onclick]'):null;
    if(!el) return;
    var attr=el.getAttribute('onclick')||'';
    var match=attr.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
    if(!match||!actionPattern.test(match[1])) return;
    show();
    // Hide after the browser has had a chance to paint the transition. For
    // synchronous existing handlers this is a brief visual bridge, not a data-loader.
    window.requestAnimationFrame(function(){window.requestAnimationFrame(finishSoon);});
  },true);
  document.addEventListener('np:study-loading-hide',hide);
  window.NursePlusStudyLoading={show:show,hide:hide,isVisible:function(){return active;}};
})();