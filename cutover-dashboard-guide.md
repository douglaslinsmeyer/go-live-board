# Cutover Management App — User Guide
**PING Project Evo • UK/JP M3 Go-Live**

---

## What Is This App?

The Cutover Management App is a real-time, multi-user web dashboard for tracking and executing the UK/JP M3 cutover plan. It replaces the spreadsheet-based approach with a shared live view where everyone can see task progress, update statuses, add notes, and coordinate across time zones — all from a browser.

Every change is saved immediately and visible to all users. There is no "save" button — the app auto-saves everything.

---

## Getting Started

### Signing In

Open the app URL provided by your cutover lead. You'll see a sign-in screen.

**Type your full name** (e.g., "Lewis Rogal"). If you're on the team roster, your name will appear in the autocomplete dropdown — select it and click **Continue**. Using your full name consistently is important because it ties your activity to the log and enables the "My Tasks" feature.

If you need admin access and aren't on the admin list, click **"Need admin access?"** at the bottom and enter the admin password provided by your lead.

### Welcome Back Screen

When you return to the app after being away, you'll see a **Welcome Back** summary showing what changed since your last visit: tasks completed, new blockers, notes added, and who was active. Click **Enter Dashboard** to proceed.

---

## The Dashboard Layout

The dashboard has four main zones, top to bottom:

**Header Bar** — Shows the app title, your name, timezone selector, timestamp format, and view mode toggles. Also contains the Activity Log button and Sign Out.

**Stat Cards** — A row of clickable counters: Show (total visible), Plan, WIP, Done, Blocked, Dep (dependency-blocked), Late (past due), and US/CA (impact flagged). Click any card to filter the task list to just those tasks. Click again to clear the filter.

**Day Focus Toolbar** — A yellow bar with date picker and mode buttons for focusing on a specific day's work.

**Task List** — The main scrollable list of tasks, grouped by phase or shown flat. Click any task to open the side panel.

---

## Viewing Tasks

### View Modes

Use the **VIEW** toggle in the header to switch between:

**Phase** — Tasks grouped under collapsible phase headers (BL, P0, P1–P5). Each header shows a progress bar and done/total count. This is the default and best for understanding where the plan stands.

**Day** — Tasks grouped by their start date. Useful during active execution to see what's scheduled each day.

**Flat** — All tasks in a single flat list with no groupings. Best for searching or when you need to scroll through everything.

### Timezone Support

The **TZ** toggle in the header lets you switch between UK, JP, and US Central time. All timestamps in the app (start dates, end dates, log entries) adjust to your selected timezone. This is critical during the cutover when UK, Japan, and US teams are working simultaneously.

### Timestamp Format

The **TS** toggle switches between relative timestamps ("2h ago") and absolute timestamps ("Feb 19, 2:30 PM"). Use relative during active execution and absolute for review.

---

## Filtering and Searching

### Dropdown Filters

Below the header you'll find dropdowns for:

**Phase** — Filter to a single phase (BL, P0, P1–P5) or show all.

**Workstream** — Filter by functional area (Manufacturing, Order to Cash, Technical, etc.).

**Status** — Filter to a specific status (Planned, WIP, Complete, Blocked, etc.).

**Responsible** — Filter by who owns the task (PING, INFOR, JOINT, COMBO).

**Hide Done** — Checkbox to hide completed and archived tasks. Very useful during execution to focus on what's left.

### Text Search

The search box searches across task IDs, descriptions, executor names, and all personnel fields. Type a task ID like "M3-132" to jump directly to it, or search a person's name to see all their tasks.

### Stat Card Filters

The stat cards (Plan, WIP, Done, Blocked, Dep, Late, US/CA) are clickable. Click one to instantly filter the task list to just those tasks. A highlighted border shows which filter is active. Click the same card again to clear the filter.

These combine with your dropdown filters. For example: set Phase to "P1", then click "Blocked" to see all blocked tasks in Phase 1.

---

## Day Focus

The **Day Focus** toolbar (yellow bar) is designed for daily cutover execution. It has four modes:

**Off** — No date filtering. Shows all tasks matching your other filters.

**Starting** — Shows only tasks whose start date matches the selected date. Use this for the daily standup: "What are we kicking off today?"

**Due EOD** — Shows tasks due by end of the selected day (end date ≤ selected date). Use this to track what must be done today.

**Goal ID** — Enter a task ID, and the app shows all tasks from the beginning of the plan up to and including that task. Use this when the cutover lead says "our goal is to get through M3-250 by end of day" — it shows everything up to that point so you can see what's left.

The date picker defaults to today. During the cutover, you'll typically set the date each morning and use "Starting" or "Due EOD" mode throughout the day.

---

## Updating Tasks

### Opening the Task Panel

Click any task row to open the **side panel** on the right. The panel shows the full task details: ID, description, status, all personnel, dates, workstream, application, classification, and any flags (US/CA Impact, Mock Only, JP Execute).

### Changing Status

The panel shows status buttons at the top. Click the appropriate status to change a task:

| Status | When to Use |
|---|---|
| **Planned (PLN)** | Task hasn't started yet |
| **In Progress (WIP)** | Work has begun |
| **Blocked (BLK)** | Something is preventing progress |
| **Complete (DONE)** | Task is finished and verified |

When you change a status, the activity log records who changed it and when. If you set a task to **Blocked**, you'll be prompted to add a reason — please always do this so others know what the blocker is.

### Auto-Advance

When you mark a task **Complete**, the panel automatically advances to the next incomplete task in sequence. This lets you work through a series of tasks without manually clicking each one — complete, review the next one, complete, and so on.

### Adding Notes

The **Notes** section in the task panel lets you add timestamped, attributed notes. Type your note and click **Add Note**. Notes appear with your name and timestamp, creating a running commentary on the task. All team members can see notes.

Notes added here are separate from the "Original Notes (CSV)" section, which shows the original comments imported from the spreadsheet. Those are read-only for reference.

### Dependencies

The **Dependencies** section lets you define which tasks must be completed before this one can proceed. Type a task ID and add it. If any dependency is not yet complete, the task shows a **DEP** badge (orange) and appears in the "Dep" stat card count.

Dependencies create visual indicators: the task row shows which tasks it's waiting on, and completing a prerequisite task automatically updates the dependency status for downstream tasks.

To remove a dependency, click the × next to it in the panel.

---

## Presets (Saved Filters)

Presets save your current filter combination so you can switch between views quickly.

### Built-In Smart Presets

The app includes presets that are automatically personalized:

**My Tasks** — Shows all tasks where your first name appears in any personnel field (SME, Executor, Support). This is your personal to-do list.

**Actionable** — Shows all non-completed tasks. Your "what's still open" view.

**Blocked** — Shows all blocked tasks across the plan.

**Past Due** — Shows all overdue tasks.

**US/CA** — Shows all tasks with US/CA impact flags (with completed tasks hidden).

**INFOR** — Shows all tasks owned by Infor.

### Custom Presets

Set your filters the way you want, then click the **Presets** button, type a name, and save. Your custom presets are stored and available whenever you sign in. Only you see your custom presets.

---

## Activity Log

Click the **📝 Log** button in the header to open the Activity Log panel. This shows a chronological feed of every change made by every user: status changes, notes added, tasks created, CSV uploads, and more.

### Log Filters

**By type:** All, Status (status changes only), Notes (notes only), Admin (uploads, task creation/deletion).

**By time:** All Time, Today, Last 4h, Last 1h. During active execution, "Last 1h" is useful to see what just happened.

Each log entry shows the user's name, timestamp, and what they did. Entries are color-coded: amber for status changes, blue for notes, purple for admin actions.

---

## Special Badges and Flags

Tasks may display colored badges that indicate special characteristics:

**US/CA IMPACT** (red) — This task affects North American operations. Extra coordination required with US/CA teams.

**MOCK ONLY** (amber) — This task is only for the mock cutover exercise, not for go-live.

**JP EXEC** (green) — This task should be executed by the Japan team.

**DEP** (orange) — This task has unfinished dependencies. Check the task panel to see what it's waiting on.

**PAST DUE** (red, on the row) — This task's end date has passed and it's not yet complete.

---

## Admin Features

If you're signed in as an admin (name on the admin list or authenticated with password), you have additional capabilities:

**Upload CSV** — Upload or re-upload the cutover plan CSV. This replaces all task data. Use with care during active execution.

**Re-upload** — The "Re-upload" button in the header lets admins refresh the plan data without signing out.

**Add Task** — The green "+ Add Task" button lets admins create new tasks that weren't in the original CSV. You'll enter the task ID, description, phase, and other details.

**Delete Task** — Within the task panel, admins can delete tasks that are no longer needed.

Regular users cannot upload data, add tasks, or delete tasks. They can update statuses, add notes, and manage dependencies.

---

## Tips for Cutover Execution

**Start each day** by setting Day Focus to today's date with "Starting" mode. Review what's kicking off.

**Use "My Tasks" preset** to see your personal workload at a glance.

**Always add a note when blocking a task.** "Blocked" with no explanation slows everyone down.

**Check the Activity Log** periodically to see what others are doing, especially if you're waiting on a prerequisite.

**Use dependencies** rather than just notes to track task ordering. The app will automatically flag tasks whose prerequisites aren't done.

**Don't change someone else's task status** without coordinating with them, unless you're the cutover lead managing the overall flow.

**Keep the app open** during active execution. It auto-refreshes every 30 seconds to show changes from other users. You'll also see the "Welcome Back" summary if you've been away.

---

## Quick Reference

| Action | How |
|---|---|
| Find my tasks | Click "My Tasks" preset |
| See what's blocked | Click "Blocked" stat card or preset |
| Focus on today | Day Focus → today's date → "Starting" or "Due EOD" |
| Jump to a specific task | Type the task ID in the search box |
| Mark task complete | Click task → click "Complete" button in panel |
| Add a note | Click task → scroll to Notes → type → "Add Note" |
| Add a dependency | Click task → scroll to Dependencies → type task ID → Add |
| See what changed | Click "📝 Log" button in header |
| Switch timezone | Click TZ toggle in header (UK / JP / US) |
| Save a filter view | Set filters → Presets → name it → Save |
| Sign out | Click "← Sign Out" in header |

---

## FAQ

**Q: Do I need to install anything?**
No. The app runs in your web browser. Works on desktop, laptop, tablet, and phone. Chrome, Edge, Safari, and Firefox are all supported.

**Q: What if I lose internet connection?**
The app needs an internet connection to load and save data. If you lose connection, you'll see errors when trying to save changes. Reconnect and refresh the page.

**Q: Can I accidentally break something?**
Status changes and notes are logged and visible to everyone, so mistakes can be identified and corrected. Only admins can upload new data or delete tasks. If something goes wrong, contact your cutover lead.

**Q: Why don't I see any tasks?**
Either the cutover plan hasn't been uploaded yet (admins need to do this first), or your filters are too restrictive. Try clicking "Actionable" preset or clearing all filters.

**Q: How do I see the full history of a task?**
Open the task panel and scroll down. You'll see all notes and the "Original Notes (CSV)" from the spreadsheet. For status change history, check the Activity Log and search for the task ID.

**Q: Can two people edit the same task at once?**
Yes. The app uses last-write-wins, so the most recent save takes effect. In practice, coordinate verbally during the cutover — the activity log makes it clear who changed what.

---

*For technical issues or deployment questions, contact your cutover app administrator.*
