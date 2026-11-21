/**
 * Code.gs — Google Apps Script backend for the Chess Kids Online Exam.
 *
 * Deploy this as a Web App (Deploy → New deployment → type "Web app",
 * execute as "Me", access "Anyone"). See README.md → "Connect Google
 * Sheets" for the full walkthrough.
 *
 * Sheet layout (row 1 = headers, created automatically by setupSheet()):
 *   A Exam ID | B Full Name | C Age | D..M Q1..Q10 Answers |
 *   N Submission Date | O Duration (seconds) | P Status |
 *   Q Grade | R Instructor Comments
 *
 * Columns Q and R extend the table from the spec so an instructor can grade
 * and leave comments directly in the sheet (requirement #8); everything
 * else matches the spec's column list exactly.
 */

var SHEET_NAME = "Submissions";
var TOTAL_QUESTIONS = 10;
var HEADERS = ["Exam ID", "Full Name", "Age"]
  .concat(Array.from({ length: TOTAL_QUESTIONS }, function (_, i) { return "Q" + (i + 1) + " Answer"; }))
  .concat(["Submission Date", "Duration (seconds)", "Status", "Grade", "Instructor Comments"]);

var STATUS = { SUBMITTED: "Submitted", UNDER_REVIEW: "Under Review", GRADED: "Graded" };

/** Run this once from the Apps Script editor (select it, click ▶ Run) to
 *  create the sheet and header row before the first real submission. */
function setupSheet() {
  var sheet = getOrCreateSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/** Health check — open the Web App URL in a browser to confirm it's live.
 *  Never returns submission data. */
function doGet(e) {
  return jsonResponse_({ ok: true, message: "Chess Exam API is running." });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, message: "Empty request body." });
    }

    var payload = JSON.parse(e.postData.contents);
    var validationError = validatePayload_(payload);
    if (validationError) {
      return jsonResponse_({ ok: false, message: validationError });
    }

    var sheet = getOrCreateSheet_();
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // Server-side duplicate guard: if this Exam ID was already recorded,
    // treat the request as already-successful instead of inserting a
    // second row (covers retries/double taps and the auto-submit-on-expiry
    // racing a manual submit).
    if (findRowByExamId_(sheet, payload.examId) !== -1) {
      return jsonResponse_({ ok: true, duplicate: true, message: "Already submitted." });
    }

    var row = [payload.examId, payload.fullName, payload.age];
    for (var i = 1; i <= TOTAL_QUESTIONS; i++) {
      row.push((payload.answers && payload.answers["q" + i]) || "");
    }
    row.push(new Date(), payload.durationSeconds || "", STATUS.SUBMITTED, "", "");

    sheet.appendRow(row);

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, message: "Server error: " + err.message });
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") return "Invalid payload.";
  if (!payload.examId) return "Missing examId.";
  if (!payload.fullName || String(payload.fullName).trim().split(/\s+/).length < 3) {
    return "fullName must have at least three words.";
  }
  if (!Number.isFinite(Number(payload.age))) return "Invalid age.";
  if (!payload.answers || typeof payload.answers !== "object") return "Missing answers.";
  return null;
}

function findRowByExamId_(sheet, examId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === examId) return i + 2; // +2: header row + 1-indexing
  }
  return -1;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
