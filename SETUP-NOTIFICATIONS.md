# Amrinerary — Notification Setup Guide

Hey Amrit! This walks you through activating the "notify me when you visit my city" feature on your travel site. Once set up, anyone who signs up gets an email from you — automatically, five days before you arrive — with no ongoing work on your end.

**Time required:** ~10 minutes  
**What you'll need:** Your Google account (amritdhir@gmail.com)

---

## Overview

There are four steps:

1. Open your Google Sheet's built-in script editor
2. Paste in the notification script
3. Deploy it as a web app (makes it receive sign-ups from the website)
4. Turn on the daily email trigger (makes it send emails automatically)

---

## Step 1 — Open your Google Sheet

Go to your **Amrinerary Google Sheet** (the one with all your travel stops). If you don't have the link handy, check your Google Drive.

Once the sheet is open, look at the top menu bar. You'll see:

```
File   Edit   View   Insert   Format   Data   Tools   Extensions   Help
```

Click **Extensions**. A dropdown menu appears with these options:

```
  Apps Script
  Add-ons  ›
  Macros   ›
  AppSheet ›
```

Click **Apps Script**.

> A new browser tab opens. This is Google's built-in code editor — it looks like a dark-themed text editor with a file tree on the left and a code panel on the right. The tab title will say something like "Apps Script — Amrinerary" or "Untitled project."

---

## Step 2 — Name the project (optional but nice)

At the very top of the Apps Script page, you'll see "Untitled project" in large text. Click it, type **Amrinerary Notifications**, and press Enter. This just makes it easier to find later.

---

## Step 3 — Paste the script

In the code panel on the right, you'll see some default code that looks like this:

```javascript
function myFunction() {

}
```

**Select all of it** (Cmd+A on Mac, Ctrl+A on Windows) and **delete it** so the panel is completely empty.

Now open the file called `gas-subscriber-app.js` from the Amrinerary repo (it's inside the `scripts/` folder). Copy the entire contents of that file.

Paste it into the empty Apps Script code panel.

Click the **floppy disk icon** (💾) in the toolbar — or press **Cmd+S / Ctrl+S** — to save.

> The toolbar looks like this across the top of the editor:
> ```
> ≡   Amrinerary Notifications   ▷ Run   🐞 Debug   [function dropdown]   ↺   💾
> ```

---

## Step 4 — Deploy as a Web App

This is the most important step. It gives the script a public URL so the website can send it sign-up data.

### 4a. Start a new deployment

Look for the **Deploy** button in the top-right area of the Apps Script editor. It's a blue button. Click it.

A small dropdown appears with two options:

```
  ┌─────────────────────────────┐
  │  New deployment             │
  │  Manage deployments         │
  └─────────────────────────────┘
```

Click **New deployment**.

### 4b. Set the deployment type

A dialog box appears titled **New deployment**. On the left side you'll see a section called "Select type" with a gear icon (⚙️). Click that gear icon.

A small menu appears:

```
  ✓ Web app
    API executable
    Library
    Add-on
```

Click **Web app** (it may already be selected with a checkmark).

### 4c. Fill in the settings

The dialog now shows a form with these fields:

**Description**
> Type: `Amrinerary notifications`

**Execute as**
> This dropdown controls whose Google account the script runs as.
> Click the dropdown — it shows options like "Me" and "User accessing the web app."
> Select **Me (amritdhir@gmail.com)**

**Who has access**
> This controls who can call the web app URL.
> Click the dropdown — it shows:
> ```
>   Only myself
>   Anyone with Google account
>   Anyone
> ```
> Select **Anyone**

The completed form should look like:

```
  ┌────────────────────────────────────────────────────────┐
  │  New deployment                                        │
  │                                                        │
  │  Description:   Amrinerary notifications               │
  │                                                        │
  │  Execute as:    Me (amritdhir@gmail.com)         ▼    │
  │                                                        │
  │  Who has access: Anyone                          ▼    │
  │                                                        │
  │                              [Cancel]   [Deploy]       │
  └────────────────────────────────────────────────────────┘
```

Click **Deploy**.

### 4d. Grant permissions

Google will immediately show a permissions dialog because the script needs access to your Gmail and Google Sheets.

You'll see: **"Authorization required — This project requires your permission to access your data."**

Click **Authorize access**.

Google then shows a screen: **"Choose an account"** — click **amritdhir@gmail.com**.

Next you may see a warning screen saying **"Google hasn't verified this app."** This is normal for personal scripts. Click **Advanced** (bottom left of the warning), then click **"Go to Amrinerary Notifications (unsafe)"** — it's safe, it's your own script.

Finally, a permissions screen lists what the script needs:

```
  Amrinerary Notifications wants to:
  ✉  Send email on your behalf
  📊  See, edit, create and delete your spreadsheets
```

Click **Allow**.

### 4e. Copy the Web App URL

After granting permissions, you'll be taken back to a **"Deployment successful"** screen:

```
  ┌───────────────────────────────────────────────────────────────────┐
  │  Deployment successfully updated                                  │
  │                                                                   │
  │  Web app                                                          │
  │  URL:  https://script.google.com/macros/s/AKfycby.../exec  [📋]  │
  │                                                                   │
  │                                               [Done]              │
  └───────────────────────────────────────────────────────────────────┘
```

Click the **copy icon** (📋) next to the URL, or click the URL and copy it manually.

**Send this URL to the person managing your website.** They'll paste it into the site config to activate the sign-up form. The URL will look like:

```
https://script.google.com/macros/s/AKfycby[long string of characters]/exec
```

Click **Done**.

---

## Step 5 — Turn on the daily email trigger

The script now exists and can receive sign-ups, but you still need to tell Google to run it every morning. This is a one-time setup.

### 5a. Select the right function

Back in the Apps Script editor, look for the **function dropdown** in the toolbar. It's the box between the Debug button and the refresh icon:

```
  ▷ Run   🐞 Debug   [ sendNotifications ▼ ]   ↺   💾
```

Click that dropdown. It lists all the functions in the script:

```
  doPost
  doGet
  handleUnsubscribe
  sendNotifications
  setupDailyTrigger      ← select this one
  getOrCreateSubscriberSheet
  ...
```

Select **setupDailyTrigger**.

### 5b. Run it

Click the **▷ Run** button (the triangle/play button to the left of the dropdown).

Google may ask for permissions again — follow the same steps as in Step 4d and click Allow.

### 5c. Confirm it worked

At the bottom of the screen, a panel called **Execution log** slides up. After a few seconds you should see:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Execution log                                               │
  │                                                              │
  │  [timestamp]  Notice  Execution started                      │
  │  [timestamp]  Info    Daily trigger created — sendNotifi...  │
  │  [timestamp]  Notice  Execution completed                    │
  └──────────────────────────────────────────────────────────────┘
```

If you see "Daily trigger created" — you're done! ✓

If you see an error in red, double-check that you granted all permissions in Step 4d and try running it again.

---

## You're all set

Here's what now happens automatically, every day, forever:

1. At **8am**, the script wakes up and checks your itinerary
2. It looks for any city where your `start_date` is exactly **5 days from today**
3. For each match, it finds everyone who signed up for that city
4. It sends them an email from **amritdhir@gmail.com** saying you're arriving soon and you'd love to meet up
5. Each email has a personal-looking "Hey friend…" message and an unsubscribe link at the bottom

You never have to touch it again. Just keep your Google Sheet itinerary up to date.

---

## Managing your subscriber list

Open your Google Sheet. The first time anyone signs up from the website, a new tab called **Subscribers** will appear automatically. It has these columns:

| id | email | city | subscribed_at | unsubscribe_token | active |
|----|-------|------|---------------|-------------------|--------|
| … | friend@example.com | San Francisco | 2026-05-05 | … | TRUE |

- To **remove someone manually**, find their row and change `active` from `TRUE` to `FALSE`
- The `unsubscribe_token` column is used for the unsubscribe links in emails — don't edit those

---

## If something goes wrong

**"I don't see a Subscribers tab"**
That's fine — it's created automatically the first time someone signs up from the website. It doesn't exist yet if no one has signed up.

**"The emails aren't sending"**
Go back to Extensions → Apps Script and check the **Executions** page (left sidebar, clock icon). You can see every time the script ran and whether it succeeded or errored.

**"I need to update the script"**
1. Go to Extensions → Apps Script
2. Edit the code
3. Click Deploy → Manage deployments
4. Click the pencil ✏️ on your deployment
5. Set Version to **New version** and click Deploy
The URL stays the same — no need to update the website.

**"I want to test it before waiting 5 days"**
In the Apps Script editor, switch the function dropdown to `sendNotifications` and click Run. It will check today's itinerary and send any emails that would go out if today were 5 days before a stop.
