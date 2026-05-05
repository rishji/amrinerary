# City Visit Notification Feature — Implementation Plan

## Architecture Overview

Since the site is a 100% static frontend on GitHub Pages, we need two external pieces:

1. **Google Apps Script Web App** — Amrit deploys this from his subscriber Google Sheet. It acts as a tiny backend that (a) accepts sign-up form submissions and writes them to the sheet, and (b) serves subscriber data securely to GitHub Actions using a shared secret token.

2. **GitHub Actions cron job** — Runs daily, reads the public itinerary CSV, reads subscribers from the GAS endpoint, finds stops starting in exactly 5 days, and sends emails via the Resend API.

---

## What Amrit Needs to Set Up (one-time)

1. Create a Resend account → get an API key → add as GitHub repo secret `RESEND_API_KEY`
2. Create a new Google Sheet for subscribers (columns: id, email, city, subscribed_at, unsubscribe_token, active)
3. Open Extensions → Apps Script in that sheet → paste the GAS code we provide → deploy as Web App (Execute as: Me, Access: Anyone)
4. Add the Web App URL as GitHub repo secret `GAS_ENDPOINT_URL`
5. Choose a random secret string → add as GitHub repo secret `GAS_SECRET_TOKEN` and as a script property in the GAS editor
6. Add the sender email (verified in Resend) as GitHub repo secret `RESEND_FROM_EMAIL`

---

## Files to Create / Modify

### 1. `src/app.js` — Add sign-up UI

- Add a **"Get notified when Amrit visits your city"** button in the header/hero area
- On click, open a modal with:
  - Email input field
  - City dropdown — populated from the already-loaded itinerary data, deduplicated by `city` field, sorted by visit frequency (most-visited first), filtered to cities with upcoming stops first
  - Submit button
- On form submit: POST `{ email, city }` to the GAS endpoint URL (stored in `appConfig.gasEndpointUrl`)
- Show success / error state in the modal

### 2. `styles.css` — Sign-up modal styles

- Modal overlay + centered card
- Form inputs + button consistent with existing design
- Success / error states

### 3. `index.html` — Add sign-up modal HTML skeleton + notify button

- Add modal `<div>` structure
- Add "Get notified" button near the search bar or header

### 4. `scripts/gas-subscriber-app.js` — Google Apps Script code

Amrit pastes this into his Apps Script editor. It handles:

- **POST** (sign-up): validates email + city, generates UUID unsubscribe token, appends row to sheet, returns `{ ok: true }`
- **GET `?token=SECRET`** (list subscribers for GitHub Actions): validates token matches script property, returns JSON array of active subscribers `[{ email, city, unsubscribe_token }]`
- **GET `?action=unsubscribe&token=UUID`** (unsubscribe): finds row by token, sets `active = false`, returns HTML confirmation page

### 5. `scripts/send-notifications.mjs` — Notification sending script

Node.js script run by GitHub Actions:
- Reads `ITINERARY_CSV_URL` env var → fetches & parses itinerary CSV
- Reads `GAS_ENDPOINT_URL` + `GAS_SECRET_TOKEN` env vars → fetches active subscribers
- Computes target date = today + 5 days
- Finds all stops where `start_date === target_date` (all statuses)
- For each matching stop, filters subscribers whose `city` matches the stop's `city` (case-insensitive)
- Sends each matched subscriber an email via Resend API:
  - Subject: `Amrit is coming to [City] in 5 days!`
  - Body: date range, location name, notes (if any), unsubscribe link
- Logs sent count

### 6. `.github/workflows/notify.yml` — GitHub Actions cron

- Trigger: `schedule: cron: '0 8 * * *'` (8am UTC daily) + `workflow_dispatch` (manual trigger for testing)
- Steps: checkout → Node.js setup → `node scripts/send-notifications.mjs`
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `GAS_ENDPOINT_URL`, `GAS_SECRET_TOKEN`, `ITINERARY_CSV_URL` (all from GitHub secrets/vars)

---

## Data Flow

```
User fills sign-up form
        ↓
POST to GAS Web App URL
        ↓
GAS appends row to subscriber Google Sheet
        [email | city | subscribed_at | unsubscribe_token | active=true]

Every day at 8am UTC:
GitHub Actions → fetches public itinerary CSV
               → fetches subscribers from GAS (authenticated)
               → finds stops starting in 5 days
               → sends Resend emails to city-matched subscribers
               → each email has unsubscribe link → GAS marks row inactive
```

---

## City Dropdown Logic

- Uses the already-loaded `state.allStops` array (no extra API call)
- Groups by `city`, counts occurrences
- Puts cities with upcoming stops first (sorted by next visit date), then past-only cities by frequency
- Deduplicates — one entry per unique city name

---

## Unsubscribe Flow

- Each subscriber row has a UUID `unsubscribe_token`
- Email footer: `Unsubscribe: https://[GAS_URL]?action=unsubscribe&token=[UUID]`
- GAS returns a simple HTML page: "You've been unsubscribed. You won't receive further notifications."
- Row is marked `active = false` — kept for audit trail, not emailed again

---

## What We Are NOT Doing

- No database beyond Google Sheets
- No double opt-in (GDPR-minimal; Amrit can decide to add this later)
- No admin UI for Amrit to manage subscribers (he can view the Sheet directly)
- No rate limiting on the sign-up endpoint (GAS handles a modest volume fine)
