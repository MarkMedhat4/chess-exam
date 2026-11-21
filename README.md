<div align="center">

# امتحان الشطرنج للأطفال — Chess Kids Online Exam

Essay-based chess exam for kids, in Arabic (RTL). Vanilla HTML/CSS/JS front
end, Google Sheets as the data store, Google Apps Script as the backend.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-4285F4?logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel&logoColor=white)

</div>

## Overview

A friendly, no-login exam for children who just finished a beginner chess
course. The student types their name and age, reads the instructions, answers
10 essay questions (plain `<textarea>`, no multiple choice) within a 30‑minute
timer, reviews everything, and submits. Each submission becomes one row in a
Google Sheet that the instructor grades manually.

There is **no backend server to deploy** — the "backend" is a single Google
Apps Script function attached to the Sheet, called from the browser.

## Features

- Registration (full name validated as ≥3 words, age validated as a number)
- Friendly Arabic instructions screen
- 10 fixed essay questions, one per card, with a character counter
- Sticky progress bar + per-question dot tracker + 30‑minute countdown timer
  (configurable), with a low-time warning and **auto-submit at 00:00**
- Autosave to `localStorage` on every keystroke; resumes correctly after a
  reload (timer does not reset, previous answers are restored)
- "Are you sure?" confirmation before submitting, full review screen first
- `beforeunload` warning if the student tries to leave mid-exam
- Duplicate-submission guard, both client-side (one submission per browser
  session) and server-side (Apps Script checks the Exam ID before inserting)
- Fully right-to-left, logical CSS properties throughout, keyboard-focus
  visible, `prefers-reduced-motion` respected
- No student data is ever rendered back to the browser — the Sheet is the
  only place answers live after submission

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | HTML5, CSS3 (custom properties, no framework), vanilla JavaScript (no build step, no bundler) |
| Data store | Google Sheets |
| Backend | Google Apps Script (`doPost` Web App) |
| Hosting | Vercel (static) |
| Source control | GitHub |

## Project Structure

```text
chess-exam/
├── index.html                  registration
├── exam.html                   instructions → questions → review (one page)
├── success.html                post-submission screen
├── css/
│   └── style.css               design tokens + components, RTL-first
├── js/
│   ├── app.js                  localStorage helpers, validation, registration logic
│   ├── timer.js                resumable countdown timer
│   ├── api.js                  calls the Apps Script Web App
│   ├── exam.js                 exam flow controller (questions/review/submit)
│   ├── config.example.js       template — copy to config.js
│   └── config.js               ← you create this locally; gitignored
├── google-apps-script/
│   └── Code.gs                 the entire backend
├── docs/
│   └── BRIEF.md                scope, data flow, assumptions made
├── vercel.json
├── .gitignore
└── README.md
```

## Running locally

No install, no build step — it's static files.

```bash
cd chess-exam
cp js/config.example.js js/config.js   # then fill in APPS_SCRIPT_URL (see below)
python3 -m http.server 5500            # or any static server; `file://` breaks fetch()
# open http://localhost:5500
```

A plain `file://` double-click will **not** work because `fetch()` to the
Apps Script URL needs a real origin.

## Connect Google Sheets (the backend)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new
   spreadsheet — name it whatever you like (e.g. "Chess Exam Submissions").
2. In the Sheet, open **Extensions → Apps Script**.
3. Delete the placeholder `Code.gs` content and paste in the entire contents
   of this project's `google-apps-script/Code.gs`.
4. In the Apps Script editor's function dropdown (top toolbar), select
   **`setupSheet`** and click **Run** once. The first run will ask you to
   authorize the script (it's your own script acting on your own sheet —
   approve it). This creates a "Submissions" tab with the header row.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → **Web app**.
   - Description: anything (e.g. "Chess exam API v1").
   - **Execute as:** Me.
   - **Who has access:** Anyone. *(Required — anonymous students submit
     without a Google login. This only exposes the `doPost`/`doGet`
     endpoints, never the Sheet's contents — see "Keep it private" below.)*
   - Click **Deploy**, authorize again if asked, then **copy the Web App
     URL** (ends in `/exec`).
6. Paste that URL into `js/config.js`:
   ```js
   window.CHESS_EXAM_CONFIG = {
     APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx.../exec",
     EXAM_DURATION_MINUTES: 30,
   };
   ```
7. Open the Web App URL directly in a browser — you should see
   `{"ok":true,"message":"Chess Exam API is running."}`. That confirms the
   deployment works before you test a full exam submission.

**Re-deploying after editing `Code.gs`:** Apps Script Web App URLs don't
change automatically — after editing the script, use **Deploy → Manage
deployments → ✏️ (edit) → New version → Deploy** so the live URL picks up
your changes. ("Test deployments" use a different URL and are for the Apps
Script editor's own test runner, not for the live site.)

### Sheet columns

| Col | Field | Col | Field |
|---|---|---|---|
| A | Exam ID | J | Q7 Answer |
| B | Full Name | K | Q8 Answer |
| C | Age | L | Q9 Answer |
| D | Q1 Answer | M | Q10 Answer |
| E | Q2 Answer | N | Submission Date |
| F | Q3 Answer | O | Duration (seconds) |
| G | Q4 Answer | P | Status |
| H | Q5 Answer | Q | Grade *(extra)* |
| I | Q6 Answer | R | Instructor Comments *(extra)* |

Columns **Q** and **R** are added beyond the spec's table so requirement #8
(manual grading + comments) has somewhere to live.

### Keep it private

"Anyone" access is for the **script endpoint**, not the spreadsheet. The
Sheet itself keeps its normal Google Drive sharing settings — by default,
only you can open it. Do **not** separately share the Sheet publicly, or
student answers become visible to anyone with the link.

### Admin / grading workflow (requirement #8)

No separate admin app was built — the Sheet itself covers it:
- **Search by name / filter by age:** use Sheets' built-in filter (Data →
  Create a filter) on columns B and C.
- **Review answers:** read columns D–M for a row.
- **Grade + comment:** type directly into columns Q and R.
- **Status:** change column P to `Under Review` or `Graded` as you work
  through submissions; it starts as `Submitted`. Use Data → Data validation
  on column P if you want a dropdown instead of free text.

## GitHub

```bash
cd chess-exam
git init
git add .
git commit -m "Chess kids online exam"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`js/config.js` is gitignored on purpose — `js/config.example.js` is the
template that gets committed instead. Anyone who clones the repo must create
their own `js/config.js` with their own Apps Script URL (step 6 above).

## Deploy to Vercel

1. Push the repo to GitHub (above).
2. In Vercel: **Add New → Project**, import the repo.
3. Framework preset: **Other** (it's static — no build command, no install
   step; leave Build/Output settings at their defaults, output is the repo
   root).
4. Vercel does **not** see `js/config.js` (it's gitignored), so before or
   right after the first deploy, add it back via one of:
   - Easiest: remove `js/config.js` from `.gitignore` for this one file and
     commit it — acceptable here because the Apps Script URL isn't a
     private secret (access is already gated by "Anyone can call this one
     endpoint", not by keeping the URL hidden), **or**
   - Keep it gitignored and instead inline the same two lines directly at
     the top of `js/api.js` before deploying, **or**
   - Use a tiny build step (a "Install Command" of
     `cp js/config.example.js js/config.js && sed -i "s#APPS_SCRIPT_URL: \"\"#APPS_SCRIPT_URL: \"$APPS_SCRIPT_URL\"#" js/config.js`
     with `APPS_SCRIPT_URL` set as a Vercel environment variable) if you'd
     rather keep it fully out of the repo.

   The project ships with the simplest option (committing `config.js`
   un-ignored) commented in `.gitignore` — pick whichever fits your comfort
   level; all three produce the same running site.
5. Deploy. Visit the production URL and confirm `index.html` → `exam.html` →
   `success.html` all load (the three files are the three routes).

## Testing checklist

- [ ] Registration rejects a one- or two-word name
- [ ] Registration rejects non-numeric / out-of-range age
- [ ] Valid registration navigates to the instructions screen
- [ ] "ابدأ حل الامتحان" starts the 30-minute timer and shows question 1
- [ ] Next/previous navigation works; dot tracker reflects answered questions
- [ ] Reloading mid-exam restores the same timer countdown and saved answers
      (not a fresh 30 minutes, not blank answers)
- [ ] Leaving the tab mid-exam triggers the browser's "leave site?" prompt
- [ ] Review screen lists all 10 questions, flags unanswered ones, "تعديل"
      jumps back to the right question
- [ ] Confirmation dialog appears before submission
- [ ] A real submission appends exactly one correctly-filled row to the
      Sheet, with Arabic text intact
- [ ] Re-submitting the same browser session does not create a second row
      (try resubmitting, and try letting the timer hit 00:00 right after a
      manual submit)
- [ ] Letting the timer hit 00:00 auto-submits whatever was answered
- [ ] Success page shows after submission; visiting `exam.html` again
      afterwards redirects straight to `success.html`
- [ ] Mobile widths (320–430px) have no horizontal scroll or clipped text
- [ ] Works after a real Vercel production deploy, not just locally

## Design System

**Direction:** "Modern Chess Academy" — calm, structured, friendly for kids;
one navy, one gold accent; generous whitespace; no gradients or decorative
clutter. Tokens live at the top of `css/style.css`.

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#14213D` | Headings, header bar, secondary buttons |
| `--color-secondary` | `#FCA311` | Primary buttons, progress fill, accents |
| `--color-bg` | `#F8F5EF` | Page background |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-text` | `#1B263B` | Body text |
| `--color-success` | `#2E7D32` | Answered state, success states |

**Fonts:** Cairo (headings/UI) + Tajawal (body) — both wide-coverage,
friendly Arabic faces, loaded from Google Fonts.

Radius scale (sm/md/lg/pill), 3-level shadow scale, and a 4px spacing scale
are all defined once as CSS custom properties — no one-off values anywhere
in the component CSS.

## Important decisions

See `docs/BRIEF.md` for the full list (timer-expiry behavior, age bounds,
name validation rule, why the Apps Script URL isn't treated as a hard
secret, why grading uses the Sheet directly instead of a second admin app).

## Troubleshooting

| Problem | Fix |
|---|---|
| Submission hangs, then times out | `APPS_SCRIPT_URL` missing/wrong in `js/config.js`, or the deployment's access isn't set to "Anyone" |
| Submission fails only in production, works on `localhost` | Re-check step 5 ("Anyone" access) — some Workspace accounts default to "Anyone within organization" |
| Arabic text shows as `????` in the Sheet | Shouldn't happen (Sheets is UTF-8 natively) — if it does, confirm `Code.gs` wasn't saved with a different encoding by a non-Apps-Script editor |
| Two rows for one exam | Confirm you redeployed after any `Code.gs` edit (old deployments keep running the old code) |
| `fetch` fails with a CORS error | Make sure `api.js` wasn't changed to send `Content-Type: application/json` — it must stay `text/plain` to avoid a CORS preflight that Apps Script can't answer |
| Blank page at `exam.html` | You opened it directly without registering first — go through `index.html` |

## Future improvements

- Optional PDF/email receipt with the Exam ID
- A lightweight grading view (sortable, read-only) instead of using the raw
  Sheet, if the instructor wants something friendlier than spreadsheet rows
- Automated scoring assistance (e.g. keyword matching) to speed up grading,
  while keeping the final grade a human decision

## License

MIT — do whatever you like with it.
