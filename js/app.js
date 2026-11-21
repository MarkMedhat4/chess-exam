/**
 * app.js — shared utilities used by every page (registration, exam, success):
 * localStorage helpers, validation, and the small "ChessExamApp" namespace
 * other scripts read from. Loaded first on every page.
 */
(function (window) {
  "use strict";

  var STORAGE_KEYS = {
    STUDENT: "chessExam.student",
    EXAM_ID: "chessExam.examId",
    START_TIME: "chessExam.startTime",
    ANSWERS: "chessExam.answers",
    SUBMISSION: "chessExam.submission",
  };

  var AGE_MIN = 4;
  var AGE_MAX = 99;

  // ---------- localStorage helpers (defensive: private browsing / quota
  // errors should not crash the exam) ----------
  function readJSON(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("ChessExamApp: failed to read", key, err);
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("ChessExamApp: failed to save", key, err);
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  // ---------- Validation ----------
  function validateFullName(name) {
    var trimmed = (name || "").trim();
    if (!trimmed) return false;
    var words = trimmed.split(/\s+/).filter(Boolean);
    return words.length >= 3;
  }

  function validateAge(ageValue) {
    var age = Number(ageValue);
    if (!Number.isFinite(age)) return false;
    if (!Number.isInteger(age)) return false;
    return age >= AGE_MIN && age <= AGE_MAX;
  }

  // ---------- IDs ----------
  function generateExamId() {
    var ts = Date.now().toString(36).toUpperCase();
    var rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return "CHESS-" + ts + "-" + rand;
  }

  // ---------- Public API ----------
  var ChessExamApp = {
    STORAGE_KEYS: STORAGE_KEYS,
    AGE_MIN: AGE_MIN,
    AGE_MAX: AGE_MAX,

    validateFullName: validateFullName,
    validateAge: validateAge,
    generateExamId: generateExamId,

    getStudent: function () {
      return readJSON(STORAGE_KEYS.STUDENT);
    },
    setStudent: function (student) {
      return writeJSON(STORAGE_KEYS.STUDENT, student);
    },

    getExamId: function () {
      return readJSON(STORAGE_KEYS.EXAM_ID);
    },
    setExamId: function (id) {
      return writeJSON(STORAGE_KEYS.EXAM_ID, id);
    },

    getStartTime: function () {
      return readJSON(STORAGE_KEYS.START_TIME);
    },
    setStartTime: function (timestamp) {
      return writeJSON(STORAGE_KEYS.START_TIME, timestamp);
    },

    getAnswers: function () {
      return readJSON(STORAGE_KEYS.ANSWERS) || {};
    },
    setAnswers: function (answers) {
      return writeJSON(STORAGE_KEYS.ANSWERS, answers);
    },

    getSubmissionRecord: function () {
      return readJSON(STORAGE_KEYS.SUBMISSION);
    },
    setSubmissionRecord: function (record) {
      return writeJSON(STORAGE_KEYS.SUBMISSION, record);
    },

    // Called after a successful submit, or when starting a brand new
    // registration, to drop the in-progress attempt (but keeps the
    // submission record itself so success.html / duplicate checks work).
    clearExamProgress: function () {
      remove(STORAGE_KEYS.EXAM_ID);
      remove(STORAGE_KEYS.START_TIME);
      remove(STORAGE_KEYS.ANSWERS);
    },

    // Full reset, used when a new student starts registration from scratch.
    clearEverything: function () {
      Object.keys(STORAGE_KEYS).forEach(function (k) {
        remove(STORAGE_KEYS[k]);
      });
    },
  };

  window.ChessExamApp = ChessExamApp;

  // ---------- Registration page wiring ----------
  // Only runs if the registration form exists on this page (index.html).
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("registration-form");
    if (!form) return;

    // Starting a fresh registration always clears any previous attempt,
    // so two different students sharing a device/kiosk don't inherit
    // each other's half-finished exam or submission flag.
    ChessExamApp.clearEverything();

    var nameInput = document.getElementById("full-name");
    var ageInput = document.getElementById("age");
    var nameField = document.getElementById("field-name");
    var ageField = document.getElementById("field-age");
    var startBtn = document.getElementById("start-btn");

    function setFieldValid(fieldEl, isValid) {
      fieldEl.classList.toggle("is-invalid", !isValid);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var nameOk = ChessExamApp.validateFullName(nameInput.value);
      var ageOk = ChessExamApp.validateAge(ageInput.value);

      setFieldValid(nameField, nameOk);
      setFieldValid(ageField, ageOk);

      if (!nameOk) {
        nameInput.focus();
        return;
      }
      if (!ageOk) {
        ageInput.focus();
        return;
      }

      startBtn.disabled = true;

      ChessExamApp.setStudent({
        fullName: nameInput.value.trim(),
        age: Number(ageInput.value),
        registeredAt: new Date().toISOString(),
      });

      window.location.href = "exam.html";
    });

    // Clear the error state as soon as the student fixes the field.
    nameInput.addEventListener("input", function () {
      if (nameField.classList.contains("is-invalid") && ChessExamApp.validateFullName(nameInput.value)) {
        setFieldValid(nameField, true);
      }
    });
    ageInput.addEventListener("input", function () {
      if (ageField.classList.contains("is-invalid") && ChessExamApp.validateAge(ageInput.value)) {
        setFieldValid(ageField, true);
      }
    });
  });
})(window);
