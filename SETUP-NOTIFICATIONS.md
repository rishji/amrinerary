# Setting Up City Visit Notifications

This tells you everything you need to do to activate the "notify me" feature on Amrinerary. It sends an email to anyone who signed up when you're arriving in their city in 5 days.

---

## What you need

- Your Google account (umrittheer@gmail.com) — you'll run a script from it, so emails come from you
- About 10 minutes

---

## Step 1 — Open your Google Sheet

Go to your Amrinerary Google Sheet and click:

**Extensions → Apps Script**

A new tab opens with a code editor.

---

## Step 2 — Paste the script

1. Select all the existing code in the editor and delete it
2. Open the file `scripts/gas-subscriber-app.js` from the Amrinerary repo
3. Copy the entire contents and paste it into the Apps Script editor
4. Click the floppy-disk icon (or press Cmd/Ctrl + S) to save

---

## Step 3 — Deploy as a Web App

1. Click **Deploy** (top right) → **New deployment**
2. Click the gear icon next to "Type" and select **Web app**
3. Fill in the fields:
   - **Description:** Amrinerary notifications
   - **Execute as:** Me (umrittheer@gmail.com)
   - **Who has access:** Anyone
4. Click **Deploy**
5. Google will ask you to authorize — click through and grant all permissions
6. Copy the **Web App URL** that appears (looks like `https://script.google.com/macros/s/ABC.../exec`)

**Send that URL to the person managing the website** — they need to paste it into the site config.

---

## Step 4 — Create the daily trigger

This makes the script automatically check every morning whether you're arriving anywhere in 5 days.

1. In the Apps Script editor, find the function dropdown (near the top, it probably says "doPost")
2. Change it to **setupDailyTrigger**
3. Click the **Run** button (▶)
4. Google will ask for permissions again — grant them
5. You should see "Daily trigger created" in the log at the bottom

That's it. The script will now run every day at 8am and send emails automatically.

---

## What happens automatically after this

- Anyone who signs up on the website gets added to a **Subscribers** tab in your Google Sheet (it's created automatically the first time someone signs up)
- Every morning the script checks if you're arriving somewhere in exactly 5 days
- If you are, it emails everyone who signed up for that city — from your Gmail, as you
- The email includes an unsubscribe link so people can opt out any time

---

## Managing subscribers

Open your Google Sheet and look for the **Subscribers** tab. You'll see each person's email, city, sign-up date, and whether they're active. You can manually set the `active` column to `FALSE` to remove someone.

---

## If you need to update the script later

1. Go back to Extensions → Apps Script
2. Edit the code
3. Click Deploy → **Manage deployments**
4. Click the pencil icon on your existing deployment
5. Change "Version" to **New version**
6. Click Deploy — the URL stays the same, no need to update the website
