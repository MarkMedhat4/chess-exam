/**
 * api.js — talks to the Google Apps Script Web App.
 *
 * Important: the request is sent as Content-Type "text/plain" rather than
 * "application/json". Apps Script Web Apps do not handle CORS preflight
 * (OPTIONS) requests, so a JSON content-type would make the browser send a
 * preflight that Apps Script can't answer and the request would fail. A
 * "text/plain" request is a CORS "simple request" and skips preflight
 * entirely; Code.gs still parses the body as JSON on the server.
 */
(function (window) {
  "use strict";

  var REQUEST_TIMEOUT_MS = 15000;

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () {
        reject(new Error("timeout"));
      }, ms);
      promise.then(
        function (value) {
          window.clearTimeout(timer);
          resolve(value);
        },
        function (err) {
          window.clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /**
   * @param {Object} payload - exam submission payload (see Code.gs for the
   *   exact shape it expects).
   * @returns {Promise<{ok: boolean, duplicate?: boolean, message?: string}>}
   */
  function submitExam(payload) {
    var config = window.CHESS_EXAM_CONFIG || {};
    var url = config.APPS_SCRIPT_URL;

    if (!url) {
      return Promise.resolve({
        ok: false,
        message:
          "لم يتم ضبط رابط الخادم بعد (APPS_SCRIPT_URL في js/config.js). راجع ملف README.",
      });
    }

    var request = fetch(url, {
      method: "POST",
      // Deliberately text/plain — see file header comment.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("http-" + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        if (!data || typeof data.ok === "undefined") {
          throw new Error("bad-response");
        }
        return data;
      });

    return withTimeout(request, REQUEST_TIMEOUT_MS).catch(function (err) {
      console.error("ChessExamApi: submit failed", err);
      var message =
        err && err.message === "timeout"
          ? "استغرق الاتصال وقتًا طويلاً. تأكد من اتصال الإنترنت وحاول تاني."
          : "حصل خطأ أثناء إرسال الامتحان. تأكد من اتصال الإنترنت وحاول تاني.";
      return { ok: false, message: message };
    });
  }

  window.ChessExamApi = { submitExam: submitExam };
})(window);
