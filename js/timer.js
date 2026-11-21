/**
 * timer.js — a small countdown timer that resumes correctly after a page
 * reload: it works off a fixed start timestamp + duration rather than a
 * running counter, so refreshing mid-exam does not grant extra time.
 */
(function (window) {
  "use strict";

  function ExamTimer(options) {
    this.durationMs = options.durationMinutes * 60 * 1000;
    this.startTime = options.startTime; // epoch ms
    this.onTick = options.onTick || function () {};
    this.onExpire = options.onExpire || function () {};
    this.onLowTime = options.onLowTime || function () {};
    this.lowTimeThresholdMs = (options.lowTimeThresholdMinutes || 5) * 60 * 1000;
    this._intervalId = null;
    this._expired = false;
    this._lowFired = false;
  }

  ExamTimer.prototype.remainingMs = function () {
    var elapsed = Date.now() - this.startTime;
    var remaining = this.durationMs - elapsed;
    return remaining > 0 ? remaining : 0;
  };

  ExamTimer.prototype.elapsedSeconds = function () {
    return Math.round((Date.now() - this.startTime) / 1000);
  };

  ExamTimer.prototype.start = function () {
    var self = this;
    this._tick(); // fire immediately so the UI doesn't show a blank state
    this._intervalId = window.setInterval(function () {
      self._tick();
    }, 1000);
    return this;
  };

  ExamTimer.prototype.stop = function () {
    if (this._intervalId) {
      window.clearInterval(this._intervalId);
      this._intervalId = null;
    }
  };

  ExamTimer.prototype._tick = function () {
    var remaining = this.remainingMs();
    this.onTick(remaining);

    if (!this._lowFired && remaining > 0 && remaining <= this.lowTimeThresholdMs) {
      this._lowFired = true;
      this.onLowTime(remaining);
    }

    if (remaining <= 0 && !this._expired) {
      this._expired = true;
      this.stop();
      this.onExpire();
    }
  };

  function formatMs(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return pad(minutes) + ":" + pad(seconds);
  }

  window.ExamTimer = ExamTimer;
  window.ExamTimer.formatMs = formatMs;
})(window);
