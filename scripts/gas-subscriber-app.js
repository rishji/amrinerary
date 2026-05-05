// ─────────────────────────────────────────────────────────────────────────────
// Amrinerary — City Visit Notification Script
// Google Apps Script (paste into Extensions → Apps Script inside Amrit's sheet)
//
// SETUP (one-time, done by you):
//   1. Open Amrit's Google Sheet → Extensions → Apps Script
//   2. Paste this entire file, replacing any existing code
//   3. Click "Deploy" → "New deployment" → type "Web app"
//      • Execute as: Me (amritdhir@gmail.com)
//      • Who has access: Anyone
//   4. Click "Deploy" and copy the Web App URL
//   5. Paste that URL into appConfig.gasEndpointUrl in src/app.js
//   6. Run setupDailyTrigger() ONCE from the editor (Run → Run function → setupDailyTrigger)
//      and grant the requested permissions
// ─────────────────────────────────────────────────────────────────────────────

const ITINERARY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1p6LYKwtvTj6tSq1ECNP-yfHx-jVgTk7DWRT1r7eTbuQ/export?format=csv&gid=510334876";
const SUBSCRIBER_TAB = "Subscribers";
const NOTIFY_DAYS_AHEAD = 5;

// ── Web App: receive sign-ups ─────────────────────────────────────────────────

function doPost(e) {
  try {
    const name  = ((e.parameter && e.parameter.name)  || "").trim();
    const email = ((e.parameter && e.parameter.email) || "").trim().toLowerCase();
    const city  = ((e.parameter && e.parameter.city)  || "").trim();

    if (!email || !city || !email.includes("@")) {
      return jsonOut({ ok: false, error: "Missing or invalid email/city" });
    }

    const sheet = getOrCreateSubscriberSheet();
    const rows  = sheet.getDataRange().getValues();

    // Silently accept duplicates so the frontend always sees success
    for (let i = 1; i < rows.length; i++) {
      if (
        String(rows[i][1]).toLowerCase() === email &&
        rows[i][2] === city &&
        rows[i][5] === true
      ) {
        return jsonOut({ ok: true });
      }
    }

    sheet.appendRow([
      Utilities.getUuid(),      // id
      email,                    // email
      city,                     // city
      new Date().toISOString(), // subscribed_at
      Utilities.getUuid(),      // unsubscribe_token
      true,                     // active
      name                      // name
    ]);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}

// ── Web App: handle unsubscribe links ────────────────────────────────────────

function doGet(e) {
  if (e.parameter.action === "unsubscribe" && e.parameter.token) {
    return handleUnsubscribe(e.parameter.token);
  }
  return ContentService.createTextOutput("Amrinerary notification service.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleUnsubscribe(token) {
  const sheet = getOrCreateSubscriberSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === token) {
      sheet.getRange(i + 1, 6).setValue(false);
      return HtmlService.createHtmlOutput(unsubscribeHtml());
    }
  }

  return HtmlService.createHtmlOutput(
    "<html><body style=\"font-family:sans-serif;text-align:center;padding:60px\">" +
    "<p>That unsubscribe link has already been used or is invalid.</p>" +
    "</body></html>"
  );
}

// ── Daily notification job ────────────────────────────────────────────────────
// This runs automatically every day once you call setupDailyTrigger() once.

function sendNotifications() {
  const target    = new Date();
  target.setDate(target.getDate() + NOTIFY_DAYS_AHEAD);
  const targetStr = Utilities.formatDate(target, "UTC", "yyyy-MM-dd");

  // Parse itinerary
  const csv  = UrlFetchApp.fetch(ITINERARY_CSV_URL).getContentText();
  const rows = parseCsv(csv);
  if (rows.length < 2) return;

  const headers = rows[0].map(function(h) { return h.trim().toLowerCase(); });
  var idx = {
    startDate: headers.indexOf("start_date"),
    endDate:   headers.indexOf("end_date"),
    city:      headers.indexOf("city"),
    location:  headers.indexOf("location"),
    notes:     headers.indexOf("notes")
  };

  var matchingStops = rows.slice(1).filter(function(row) {
    return (row[idx.startDate] || "").trim() === targetStr;
  });

  if (matchingStops.length === 0) return;

  // Load active subscribers
  var sheet       = getOrCreateSubscriberSheet();
  var subData     = sheet.getDataRange().getValues();
  var subscribers = subData.slice(1).filter(function(row) { return row[5] === true; });

  if (subscribers.length === 0) return;

  var webAppUrl = ScriptApp.getService().getUrl();

  matchingStops.forEach(function(stop) {
    var city     = (stop[idx.city]     || "").trim();
    var location = (stop[idx.location] || "").trim() || city;
    var start    = (stop[idx.startDate] || "").trim();
    var end      = (stop[idx.endDate]   || "").trim();
    var notes    = idx.notes >= 0 ? (stop[idx.notes] || "").trim() : "";

    if (!city) return;

    var dateRange = (end && end !== start)
      ? formatDate(start) + " – " + formatDate(end)
      : formatDate(start);

    subscribers
      .filter(function(sub) {
        return (sub[2] || "").trim().toLowerCase() === city.toLowerCase();
      })
      .forEach(function(sub) {
        var subEmail   = sub[1];
        var unsubToken = sub[4];
        var subName    = (sub[6] || "").trim();
        var unsubLink  = webAppUrl + "?action=unsubscribe&token=" + unsubToken;

        try {
          GmailApp.sendEmail(
            subEmail,
            "Amrit is coming to " + city + " in 5 days!",
            plainTextBody(subName, city, dateRange, notes, unsubLink),
            {
              htmlBody: htmlEmailBody(subName, city, dateRange, notes, unsubLink),
              name: "Amrit Dheer"
            }
          );
        } catch (err) {
          Logger.log("Failed to send to " + subEmail + ": " + err.message);
        }
      });
  });
}

// ── Trigger setup ─────────────────────────────────────────────────────────────
// Run this function ONCE from the Apps Script editor: Run → setupDailyTrigger

function setupDailyTrigger() {
  // Remove any existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "sendNotifications") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("sendNotifications")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log("Daily trigger created — sendNotifications will run every day at 8am.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrCreateSubscriberSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SUBSCRIBER_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SUBSCRIBER_TAB);
    sheet.appendRow(["id", "email", "city", "subscribed_at", "unsubscribe_token", "active", "name"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  var parts  = dateStr.split("-").map(Number);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parts[1] - 1] + " " + parts[2] + ", " + parts[0];
}

function plainTextBody(name, city, dateRange, notes, unsubLink) {
  return [
    "Hey " + (name || "there") + ",",
    "",
    "I'll be in " + city + " in just five days (" + dateRange + "), and I'd love to catch up if you're around!",
    notes ? "\n" + notes : "",
    "",
    "Drop me a line if you want to go for a walk, a meal, or just hang — it would be genuinely great to see you.",
    "",
    "Looking forward to it,",
    "Amrit",
    "",
    "—",
    "You signed up for city visit notifications on Amrinerary (https://amrinerary.pages.dev).",
    "Unsubscribe: " + unsubLink
  ].join("\n");
}

function htmlEmailBody(name, city, dateRange, notes, unsubLink) {
  var greeting   = "Hey " + (name || "there") + ",";
  var notesBlock = notes
    ? "<p style=\"margin:0 0 16px;font-size:1rem;line-height:1.7;color:#5f6882;" +
      "padding:16px;background:#fff8f0;border-radius:12px;border-left:3px solid #ffb703\">" +
      notes + "</p>"
    : "";

  return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>" +
    "<body style=\"margin:0;padding:0;background:#fff4dc;font-family:Georgia,'Times New Roman',serif\">" +
    "<div style=\"max-width:560px;margin:0 auto;padding:48px 24px\">" +
    "<div style=\"background:#fff;border-radius:20px;padding:40px;" +
    "border:1px solid rgba(23,32,51,0.08);box-shadow:0 16px 48px rgba(59,39,111,0.1)\">" +
    "<p style=\"margin:0 0 8px;font-family:'Helvetica Neue',Arial,sans-serif;" +
    "font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:#ff5b6e\">Travel notice</p>" +
    "<h1 style=\"margin:0 0 24px;font-size:1.9rem;color:#172033;line-height:1.2\">" +
    "I'll be in " + city + " soon!</h1>" +
    "<p style=\"margin:0 0 16px;font-size:1.05rem;line-height:1.75;color:#2c2c2c\">" + greeting + "</p>" +
    "<p style=\"margin:0 0 16px;font-size:1.05rem;line-height:1.75;color:#2c2c2c\">" +
    "I'll be in <strong>" + city + "</strong> in just five days (" + dateRange + "), " +
    "and I'd love to catch up if you're around!</p>" +
    notesBlock +
    "<p style=\"margin:0 0 24px;font-size:1.05rem;line-height:1.75;color:#2c2c2c\">" +
    "Drop me a line if you want to go for a walk, a meal, or just hang — " +
    "it would be genuinely great to see you.</p>" +
    "<p style=\"margin:0 0 32px;font-size:1.05rem;line-height:1.75;color:#2c2c2c\">" +
    "Looking forward to it,<br><strong>Amrit</strong></p>" +
    "<div style=\"border-top:1px solid rgba(23,32,51,0.1);padding-top:24px\">" +
    "<p style=\"margin:0;font-family:'Helvetica Neue',Arial,sans-serif;" +
    "font-size:0.78rem;color:#9aa3b5;line-height:1.6\">" +
    "You signed up to receive notifications when Amrit visits your city via " +
    "<a href=\"https://amrinerary.pages.dev\" style=\"color:#9aa3b5\">Amrinerary</a>.<br>" +
    "<a href=\"" + unsubLink + "\" style=\"color:#9aa3b5\">Unsubscribe</a></p>" +
    "</div></div></div></body></html>";
}

function unsubscribeHtml() {
  return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Unsubscribed</title></head>" +
    "<body style=\"margin:0;padding:0;background:#fff4dc;font-family:Georgia,'Times New Roman',serif\">" +
    "<div style=\"max-width:480px;margin:80px auto;padding:48px 24px;text-align:center\">" +
    "<div style=\"background:#fff;border-radius:20px;padding:40px;border:1px solid rgba(23,32,51,0.08)\">" +
    "<p style=\"margin:0 0 12px;font-size:2.4rem\">&#10003;</p>" +
    "<h1 style=\"margin:0 0 16px;font-size:1.5rem;color:#172033\">You've been unsubscribed</h1>" +
    "<p style=\"margin:0;color:#5f6882;font-size:1rem;line-height:1.65\">" +
    "You won't receive any more city visit notifications from Amrit's travel itinerary." +
    "</p></div></div></body></html>";
}

function parseCsv(text) {
  var rows       = [];
  var current    = "";
  var currentRow = [];
  var inQuotes   = false;

  for (var i = 0; i < text.length; i++) {
    var ch   = text[i];
    var next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }

    if (ch === "," && !inQuotes) { currentRow.push(current); current = ""; continue; }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      currentRow.push(current);
      rows.push(currentRow);
      current = "";
      currentRow = [];
      continue;
    }

    current += ch;
  }

  if (current || currentRow.length) { currentRow.push(current); rows.push(currentRow); }
  return rows;
}
