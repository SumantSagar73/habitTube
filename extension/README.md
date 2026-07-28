# HabitTube Focus (browser extension)

Blocks every site except your **study allowlist** while a HabitTube focus session
is running. Distraction sites redirect to a "Back to focus" page with your
countdown and current goal. Ending early takes a deliberate 15-second wait +
confirm (friction), and early exits are logged — your streak survives.

## Install in Edge (or Chrome), unpacked — ~1 minute

1. Open `edge://extensions` (Chrome: `chrome://extensions`).
2. Turn on **Developer mode** (toggle, top-left in Edge / top-right in Chrome).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin **HabitTube Focus** so you can see the countdown badge.

That's it. Open HabitTube, add a few sites to your **Study allowlist**, and start
a focus session — blocking turns on automatically and lifts when the timer ends.

### Need a one-off resource?

You don't have to add temporary sites to your permanent allowlist. When you hit a
blocked site you genuinely need, the block page offers **"I need this — allow 10
min"**: a 10-second wait + confirm, then that site (only) is allowed for 10
minutes and **auto-re-blocks** afterwards. Nothing touches your permanent list,
and it's all cleared when the session ends. Keep regulars (LeetCode, your docs)
on the permanent allowlist; use this for the occasional lookup.

## Using it with a deployed site

The extension talks to HabitTube on `localhost`, `*.vercel.app`, `*.github.io`,
and `*.netlify.app` by default. If your app lives on a custom domain, add it to
`content_scripts.matches` in `manifest.json` (e.g. `"https://app.mysite.com/*"`)
and reload the extension.

## How it works

- `content.js` runs only on HabitTube pages and relays messages between the page
  and the background worker.
- `background.js` sets `declarativeNetRequest` rules that redirect all top-level
  navigations to `blocked.html`, except domains on your allowlist.
- The session end-time lives in the worker, so closing the HabitTube tab does
  **not** unblock — it holds until the timer expires (or you end it with friction).

Only HabitTube can start/stop a session; a random website cannot.
