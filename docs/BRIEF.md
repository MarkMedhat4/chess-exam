# BRIEF — Chess Kids Online Examination System

## Goal
A friendly, Arabic-only essay exam for children who finished a beginner chess
course. Students register with name + age, read instructions, answer 10 essay
questions with a 30‑minute timer and autosave, review their answers, and
submit. Submissions are stored as rows in a Google Sheet via a Google Apps
Script web app. No login system — this is a single public exam link given out
by the instructor.

## Audience
Children (and their parents helping them type) taking a beginner chess course.
Arabic-first, right‑to‑left, large and simple UI, short friendly copy, no
distracting animation.

## Pages
- `index.html` — registration (full name, age)
- `exam.html` — instructions screen → one‑question‑at‑a‑time exam → review
  screen → submission confirmation, all as JS‑toggled sections in one page
  (keeps the timer and autosave alive without page reloads)
- `success.html` — submission confirmation screen

## Stack (explicitly requested, not the skill's Next.js/Supabase default)
HTML5 + CSS3 + vanilla JavaScript, no build step, no framework. Google Sheets
as the data store, Google Apps Script (`doPost`) as the only backend. Static
hosting on Vercel, source on GitHub.

## Data flow
1. Registration data is kept in `localStorage` only — nothing is sent to
   Sheets until final submission (per spec).
2. A client-generated Exam ID and start timestamp are created once the student
   clicks "ابدأ حل الامتحان" and are persisted in `localStorage`, so a reload
   resumes the same attempt instead of starting a new one.
3. Answers autosave to `localStorage` on every keystroke (debounced).
4. On submit, the full payload posts to the Apps Script Web App as
   `text/plain` JSON (avoids a CORS preflight, which Apps Script doesn't
   support), which appends one row to the sheet and returns success/failure.
5. The Apps Script checks the Exam ID for an existing row before appending,
   as a second, server-side duplicate-submission guard.

## Assumptions made (flagging since the spec didn't specify)
- **Timer expiry**: the spec asks for a 30‑minute timer but doesn't say what
  happens at zero. Implemented: auto-submit whatever has been answered when
  the timer hits 0, with a short on-screen notice, rather than leaving the
  student stuck.
- **Age bounds**: accepting ages 4–99 as "a valid number"; adjust in
  `js/app.js` (`AGE_MIN` / `AGE_MAX`) if the course has a different range.
- **Name validation**: "at least three words" is checked by splitting on
  whitespace; it does not try to validate that the words are proper Arabic
  names, only that there are ≥3 non-empty tokens.
- **Secrets**: an Apps Script Web App URL isn't a credential in the usual
  sense (it's meant to be called from the browser), but it's still kept out
  of version control via `js/config.js` (gitignored) with `js/config.example.js`
  checked in as the template, per the "never commit API secrets" requirement.
- **Admin UI**: the spec asks for search/filter/grading "so an instructor
  can…" — this is delivered as a well-structured Google Sheet (status column,
  grade column, comments column, Sheets' native filter/search) rather than a
  second custom admin web app, since none was explicitly requested.

## Out of scope
Student login/auth, a custom admin dashboard (Sheets covers requirement 8),
automated grading, email notifications.
