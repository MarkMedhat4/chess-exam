/**
 * exam.js — controls exam.html: instructions → questions → review →
 * submission, all as one page so the timer and autosave survive without a
 * reload. Depends on app.js, timer.js and api.js being loaded first.
 */
(function (window, document) {
  "use strict";

  var QUESTIONS = [
    "ايه ال 4 خطوات اللي بنعملهم ف الافتتاح؟",
    "الوزير بتاعك على مربع d4، كام عدد المربعات اللي الوزير يقدر يروح ليهم؟",
    "معاك بيدق أبيض على مربع b2 لسه متحركش، يقدر يتحرك كام حركة؟",
    "بنعرف ازاي إن بوردة الشطرنج معدولة ولا مقلوبة؟",
    "في التبييت، ايه أول قطعة بتتحرك؟ وايه تاني قطعة بتتحرك؟ (عايز بالترتيب)",
    "الطابية بكام نقطة؟",
    "في حالة ترقية البيدق، تقدر ترقي لإيه؟",
    "ايه الفرق بين الحصان على مربع h1 ومربع g5 ومربع c3؟ (من ناحية السيطرة على المربعات)",
    "يقدر الفيل الأبيض بتاعك ياكل الفيل الأسود للخصم؟ وايه السبب؟",
    "ايه الفرق بين الملك والوزير؟ (من ناحية الحركات)",
  ];

  var TOTAL = QUESTIONS.length;
  var AUTOSAVE_DEBOUNCE_MS = 400;
  var LOW_TIME_MINUTES = 5;

  // ---------- Elements ----------
  var el = {
    topbar: document.getElementById("exam-topbar"),
    topbarStudent: document.getElementById("topbar-student-name"),
    topbarProgress: document.getElementById("topbar-progress"),
    timerDisplay: document.getElementById("timer-display"),
    timerBadge: document.getElementById("timer-badge"),
    timerAnnouncer: document.getElementById("timer-announcer"),
    progressFill: document.getElementById("progress-fill"),
    progressTrack: document.getElementById("progress-track"),

    screenInstructions: document.getElementById("screen-instructions"),
    screenExam: document.getElementById("screen-exam"),
    screenReview: document.getElementById("screen-review"),
    instructionsDuration: document.getElementById("instructions-duration"),
    beginExamBtn: document.getElementById("begin-exam-btn"),

    dotTracker: document.getElementById("dot-tracker"),
    questionEyebrow: document.getElementById("question-eyebrow"),
    questionText: document.getElementById("question-text"),
    answerTextarea: document.getElementById("answer-textarea"),
    charCount: document.getElementById("char-count"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    reviewLinkBtn: document.getElementById("review-link-btn"),

    unansweredAlert: document.getElementById("unanswered-alert"),
    reviewList: document.getElementById("review-list"),
    backToQuestionsBtn: document.getElementById("back-to-questions-btn"),
    submitExamBtn: document.getElementById("submit-exam-btn"),

    confirmModal: document.getElementById("confirm-modal"),
    modalReviewBtn: document.getElementById("modal-review-btn"),
    modalSubmitBtn: document.getElementById("modal-submit-btn"),

    toast: document.getElementById("toast"),
    toastText: document.getElementById("toast-text"),
  };

  // ---------- State ----------
  var student = null;
  var examId = null;
  var startTime = null;
  var answers = {};
  var currentIndex = 0;
  var timer = null;
  var autosaveTimeoutId = null;
  var isSubmitting = false;

  function qKey(index) {
    return "q" + (index + 1);
  }

  function answeredCount() {
    var count = 0;
    for (var i = 0; i < TOTAL; i++) {
      if ((answers[qKey(i)] || "").trim().length > 0) count++;
    }
    return count;
  }

  // Wrap Latin letters/digits (square names like "d4", "h1") in <bdi> so the
  // Arabic bidi algorithm doesn't jump punctuation around them.
  function wrapLatinTokens(text) {
    return text.replace(/[A-Za-z0-9]+/g, function (match) {
      return "<bdi>" + match + "</bdi>";
    });
  }

  // ---------- Toast ----------
  var toastTimeoutId = null;
  function showToast(message, duration) {
    el.toastText.textContent = message;
    el.toast.classList.remove("hidden");
    window.clearTimeout(toastTimeoutId);
    toastTimeoutId = window.setTimeout(function () {
      el.toast.classList.add("hidden");
    }, duration || 3500);
  }

  // ---------- Screen switching ----------
  function showScreen(name) {
    el.screenInstructions.classList.toggle("hidden", name !== "instructions");
    el.screenExam.classList.toggle("hidden", name !== "exam");
    el.screenReview.classList.toggle("hidden", name !== "review");
    el.topbar.classList.toggle("hidden", name === "instructions");
  }

  // ---------- Dot tracker ----------
  function buildDotTracker() {
    el.dotTracker.innerHTML = "";
    for (var i = 0; i < TOTAL; i++) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.textContent = String(i + 1);
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "السؤال " + (i + 1));
      dot.dataset.index = String(i);
      dot.addEventListener("click", function () {
        var idx = Number(this.dataset.index);
        saveCurrentAnswer();
        currentIndex = idx;
        showScreen("exam");
        renderQuestion();
      });
      el.dotTracker.appendChild(dot);
    }
  }

  function refreshDotTracker() {
    var dots = el.dotTracker.children;
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      dot.classList.toggle("is-current", i === currentIndex);
      dot.classList.toggle("is-answered", (answers[qKey(i)] || "").trim().length > 0);
    }
  }

  // ---------- Progress ----------
  function refreshProgress() {
    var percent = Math.round((answeredCount() / TOTAL) * 100);
    el.progressFill.style.width = percent + "%";
    el.progressTrack.setAttribute("aria-valuenow", String(percent));
    el.topbarProgress.textContent = "السؤال " + (currentIndex + 1) + " من " + TOTAL;
  }

  // ---------- Question rendering ----------
  function renderQuestion() {
    el.questionEyebrow.textContent = "السؤال " + (currentIndex + 1) + " من " + TOTAL;
    el.questionText.innerHTML = wrapLatinTokens(QUESTIONS[currentIndex]);
    el.answerTextarea.value = answers[qKey(currentIndex)] || "";
    updateCharCount();

    el.prevBtn.disabled = currentIndex === 0;
    var isLast = currentIndex === TOTAL - 1;
    el.nextBtn.textContent = isLast ? "مراجعة الإجابات" : "السؤال التالي";

    refreshDotTracker();
    refreshProgress();
    el.answerTextarea.focus({ preventScroll: true });
  }

  function updateCharCount() {
    var length = el.answerTextarea.value.length;
    el.charCount.textContent = length + " حرف";
  }

  function saveCurrentAnswer() {
    answers[qKey(currentIndex)] = el.answerTextarea.value;
    ChessExamApp.setAnswers(answers);
  }

  function scheduleAutosave() {
    window.clearTimeout(autosaveTimeoutId);
    autosaveTimeoutId = window.setTimeout(function () {
      saveCurrentAnswer();
      refreshDotTracker();
      refreshProgress();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // ---------- Review screen ----------
  function renderReview() {
    saveCurrentAnswer();
    el.reviewList.innerHTML = "";

    var missing = [];
    for (var i = 0; i < TOTAL; i++) {
      var answerText = (answers[qKey(i)] || "").trim();
      if (!answerText) missing.push(i + 1);

      var item = document.createElement("div");
      item.className = "review-item";

      var head = document.createElement("div");
      head.className = "review-item__head";

      var qLabel = document.createElement("span");
      qLabel.className = "review-item__q";
      qLabel.textContent = "السؤال " + (i + 1);

      var badge = document.createElement("span");
      badge.className = "badge " + (answerText ? "badge--ok" : "badge--missing");
      badge.textContent = answerText ? "تمت الإجابة" : "لم تتم الإجابة";

      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn--ghost";
      editBtn.textContent = "تعديل";
      editBtn.addEventListener("click", (function (idx) {
        return function () {
          currentIndex = idx;
          showScreen("exam");
          renderQuestion();
        };
      })(i));

      head.appendChild(qLabel);
      var headRight = document.createElement("div");
      headRight.className = "btn-row";
      headRight.appendChild(badge);
      headRight.appendChild(editBtn);
      head.appendChild(headRight);

      var qText = document.createElement("p");
      qText.className = "text-muted";
      qText.style.marginBlockEnd = "var(--space-2)";
      qText.innerHTML = wrapLatinTokens(QUESTIONS[i]);

      var answerEl = document.createElement("p");
      answerEl.className = "review-item__answer";
      answerEl.textContent = answerText;

      item.appendChild(head);
      item.appendChild(qText);
      item.appendChild(answerEl);
      el.reviewList.appendChild(item);
    }

    if (missing.length > 0) {
      el.unansweredAlert.textContent =
        "لسه مجاوبتش على سؤال رقم: " + missing.join("، ") + ". تقدر ترجع تجاوب قبل التسليم.";
      el.unansweredAlert.classList.remove("hidden");
    } else {
      el.unansweredAlert.classList.add("hidden");
    }

    refreshProgress();
    showScreen("review");
  }

  // ---------- Timer ----------
  function renderTimer(remainingMs) {
    el.timerDisplay.textContent = window.ExamTimer.formatMs(remainingMs);
    el.timerBadge.classList.toggle("is-low", remainingMs <= LOW_TIME_MINUTES * 60 * 1000);
  }

  function startTimer() {
    timer = new window.ExamTimer({
      durationMinutes: (window.CHESS_EXAM_CONFIG && window.CHESS_EXAM_CONFIG.EXAM_DURATION_MINUTES) || 30,
      startTime: startTime,
      onTick: renderTimer,
      lowTimeThresholdMinutes: LOW_TIME_MINUTES,
      onLowTime: function () {
        showToast("باقي " + LOW_TIME_MINUTES + " دقايق بس! خلّص إجاباتك.", 5000);
        el.timerAnnouncer.textContent = "تنبيه: باقي " + LOW_TIME_MINUTES + " دقايق على انتهاء الوقت.";
      },
      onExpire: function () {
        el.timerAnnouncer.textContent = "انتهى وقت الامتحان. جارٍ تسليم إجاباتك.";
        autoSubmitOnTimeout();
      },
    });
    timer.start();
  }

  // ---------- beforeunload guard ----------
  function beforeUnloadHandler(e) {
    if (ChessExamApp.getSubmissionRecord()) return;
    e.preventDefault();
    e.returnValue = "";
  }

  function disableExamInteraction() {
    el.answerTextarea.disabled = true;
    el.prevBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.reviewLinkBtn.disabled = true;
    el.submitExamBtn.disabled = true;
    el.backToQuestionsBtn.disabled = true;
  }

  // ---------- Submission ----------
  function buildPayload() {
    return {
      examId: examId,
      fullName: student.fullName,
      age: student.age,
      answers: answers,
      submittedAt: new Date().toISOString(),
      durationSeconds: timer ? timer.elapsedSeconds() : null,
    };
  }

  function finishSubmission(payload) {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    ChessExamApp.setSubmissionRecord({
      examId: payload.examId,
      submittedAt: payload.submittedAt,
    });
    ChessExamApp.clearExamProgress();
    window.location.href = "success.html";
  }

  function submitNow(onFailure) {
    if (isSubmitting) return;
    isSubmitting = true;
    var payload = buildPayload();

    ChessExamApi.submitExam(payload).then(function (result) {
      if (result.ok) {
        if (timer) timer.stop();
        finishSubmission(payload);
        return;
      }
      isSubmitting = false;
      onFailure(result.message);
    });
  }

  function autoSubmitOnTimeout() {
    saveCurrentAnswer();
    disableExamInteraction();
    hideModal();
    showToast("انتهى الوقت! جارٍ تسليم إجاباتك تلقائيًا...", 6000);
    submitNow(function (message) {
      showToast(message || "حصل خطأ أثناء التسليم التلقائي. اضغط تسليم الامتحان للمحاولة تاني.", 6000);
      // Re-enable just enough to let them retry manually from the review screen.
      el.answerTextarea.disabled = false;
      el.submitExamBtn.disabled = false;
      el.backToQuestionsBtn.disabled = false;
      renderReview();
    });
  }

  var lastFocusedBeforeModal = null;
  function trapModalTab(event) {
    if (event.key !== "Tab") return;
    var focusables = [el.modalReviewBtn, el.modalSubmitBtn].filter(function (btn) {
      return !btn.disabled;
    });
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showModal() {
    lastFocusedBeforeModal = document.activeElement;
    el.confirmModal.classList.remove("hidden");
    el.modalSubmitBtn.focus();
    document.addEventListener("keydown", trapModalTab);
  }
  function hideModal() {
    el.confirmModal.classList.add("hidden");
    document.removeEventListener("keydown", trapModalTab);
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }

  function manualSubmit() {
    el.modalSubmitBtn.disabled = true;
    el.modalReviewBtn.disabled = true;
    el.modalSubmitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> جارٍ التسليم...';

    submitNow(function (message) {
      el.modalSubmitBtn.disabled = false;
      el.modalReviewBtn.disabled = false;
      el.modalSubmitBtn.textContent = "تسليم الامتحان";
      hideModal();
      showToast(message || "حصل خطأ أثناء التسليم، حاول تاني.", 5000);
    });
  }

  // ---------- Wiring ----------
  function wireEvents() {
    el.beginExamBtn.addEventListener("click", function () {
      examId = ChessExamApp.generateExamId();
      startTime = Date.now();
      ChessExamApp.setExamId(examId);
      ChessExamApp.setStartTime(startTime);

      window.addEventListener("beforeunload", beforeUnloadHandler);

      showScreen("exam");
      startTimer();
      currentIndex = 0;
      renderQuestion();
    });

    el.answerTextarea.addEventListener("input", function () {
      updateCharCount();
      scheduleAutosave();
    });

    el.prevBtn.addEventListener("click", function () {
      if (currentIndex === 0) return;
      saveCurrentAnswer();
      currentIndex--;
      renderQuestion();
    });

    el.nextBtn.addEventListener("click", function () {
      saveCurrentAnswer();
      if (currentIndex === TOTAL - 1) {
        renderReview();
      } else {
        currentIndex++;
        renderQuestion();
      }
    });

    el.reviewLinkBtn.addEventListener("click", function () {
      renderReview();
    });

    el.backToQuestionsBtn.addEventListener("click", function () {
      showScreen("exam");
      renderQuestion();
    });

    el.submitExamBtn.addEventListener("click", function () {
      showModal();
    });

    el.modalReviewBtn.addEventListener("click", function () {
      hideModal();
    });

    el.modalSubmitBtn.addEventListener("click", function () {
      manualSubmit();
    });

    el.confirmModal.addEventListener("click", function (event) {
      if (event.target === el.confirmModal) hideModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el.confirmModal.classList.contains("hidden")) {
        hideModal();
      }
    });
  }

  // ---------- Init ----------
  function init() {
    var submission = ChessExamApp.getSubmissionRecord();
    if (submission) {
      window.location.replace("success.html");
      return;
    }

    student = ChessExamApp.getStudent();
    if (!student) {
      window.location.replace("index.html");
      return;
    }

    el.topbarStudent.textContent = student.fullName;
    el.instructionsDuration.textContent =
      (window.CHESS_EXAM_CONFIG && window.CHESS_EXAM_CONFIG.EXAM_DURATION_MINUTES) || 30;

    buildDotTracker();
    wireEvents();

    examId = ChessExamApp.getExamId();
    startTime = ChessExamApp.getStartTime();
    answers = ChessExamApp.getAnswers();

    if (examId && startTime) {
      // Resuming an in-progress attempt after a reload.
      window.addEventListener("beforeunload", beforeUnloadHandler);
      showScreen("exam");
      startTimer();
      currentIndex = 0;
      for (var i = 0; i < TOTAL; i++) {
        if (!(answers[qKey(i)] || "").trim()) {
          currentIndex = i;
          break;
        }
      }
      renderQuestion();
    } else {
      showScreen("instructions");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, document);
