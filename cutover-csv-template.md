# Cutover Plan CSV Import Template
**Cutover Management App — Data Dictionary & Best Practices**

---

## Overview

This document defines the optimal CSV structure for importing a cutover plan into the Cutover Management App. The app auto-detects columns by keyword matching, so exact column names are flexible — but using the recommended names below ensures the cleanest import.

---

## Required Columns

These columns must be present for the app to function. Without them, tasks won't display correctly.

| Column Name | Type | Required | Example | Notes |
|---|---|---|---|---|
| **Activity** | Text | ✅ Yes | `M3-132` | Unique task identifier. Must be unique across the entire plan. Used for dependencies, search, and the URL-like navigation. |
| **Status** | Text | ✅ Yes | `1-Planned` | Current task status. See Status Codes below. |
| **Description and Notes** | Text | ✅ Yes | `Turn off BOD Processor: Sync.ItemMaster` | The task description. This is what people read in the task list. Keep it action-oriented: "verb + what + context." |

---

## Core Columns

These columns power the filtering, grouping, and assignment features. Strongly recommended.

| Column Name | Type | Required | Example | Notes |
|---|---|---|---|---|
| **Phase/Group** | Text | Recommended | `Phase 1 - System prep (Master Data Loading)` | The app extracts the phase from this text. Include "Phase 0", "Phase 00", "Phase 1" through "Phase 5" in the value. The descriptive text after the dash is used as the phase subtitle. |
| **Workstream** | Text | Recommended | `Manufacturing` | Functional area. Used in the workstream filter dropdown. Keep values consistent across tasks. |
| **Application** | Text | Recommended | `M3` | System or application. Displayed in task details. |
| **Task Classification** | Text | Recommended | `Data Migration` | Type of task. Displayed in task details. |
| **Responsible (PING / INFOR)** | Text | Recommended | `PING` | Who owns the task. Values should be: `PING`, `INFOR`, `JOINT`, or `COMBO`. Powers the Responsible filter. |

---

## Personnel Columns

These columns populate the assignment fields and power the person search and "My Tasks" preset.

| Column Name | Type | Required | Example | Notes |
|---|---|---|---|---|
| **PING SME** | Text | Recommended | `Lewis Rogal` | PING subject matter expert. Full name for autocomplete matching. |
| **Executor** | Text | Recommended | `Josh Edwards` | Person doing the work. Displayed in the main task list row. |
| **PING Support** | Text | Optional | `Brad Amundson` | Additional PING support. |
| **Infor SME** | Text | Optional | `Kelly Von Hoene` | Infor counterpart. |

**Best practices for names:**
- Use full names consistently: "Lewis Rogal" not "Lewis R" or "LR"
- For multiple people, separate with `/`: "Tom Kabler/Derek Harris"
- These names populate the sign-in autocomplete dropdown
- The "My Tasks" preset searches by the user's first name across all personnel columns

---

## Date Columns

| Column Name | Type | Required | Format | Example |
|---|---|---|---|---|
| **Expected start date** | Date | Recommended | `M/D/YYYY` or `M/D/YY` | `2/16/2026` or `2/16/26` |
| **Expected end date** | Date | Recommended | `M/D/YYYY` or `M/D/YY` | `2/22/2026` or `2/22/26` |

**Supported formats:** `M/D/YYYY`, `M/D/YY`, `MM-DD-YYYY`, `MM-DD-YY`, `YYYY-MM-DD`

**Important:**
- Dates power the Day Focus toolbar (Starting this day, Due by EOD)
- Past Due detection compares the end date to today's date
- Tasks without end dates won't show in Day Focus "Due by EOD" mode
- Multi-day tasks should have distinct start and end dates (not the same date for a 5-day task)

---

## Flag Columns

These columns create visual badges and power dedicated stat card filters.

| Column Name | Type | Required | Values | Notes |
|---|---|---|---|---|
| **US/CA IMPACT INDICATOR** | Text | Optional | Any non-empty value = flagged | If cell has any text, the task gets a red "US/CA IMPACT" badge. Used to identify tasks that affect North American operations during UK/JP cutover. |
| **Mock ONLY Activity?** | Text | Optional | `YES` or `Mock` | If cell contains "yes" or "mock" (case-insensitive), task gets an amber "MOCK ONLY" badge. |
| **JAPAN to Execute** | Text | Optional | `YES` | If cell contains "yes" (case-insensitive), task gets a green "JP EXEC" badge. |

---

## Comments Column

| Column Name | Type | Required | Example |
|---|---|---|---|
| **Comments and Notes** | Text | Optional | `Aligned with RR, SR, DT 2.11.2026` |

This is imported as "Original Notes (CSV)" in the task panel. It's read-only in the app — preserved as historical context from the spreadsheet. The app's own Notes feature (added during execution) is separate and timestamped/attributed.

---

## Status Codes

The app recognizes these status prefixes:

| Code | Label in App | Badge | Description |
|---|---|---|---|
| `0-Not Mock` | Not Mock | NM | Task is not part of the mock exercise (go-live only) |
| `1-Planned` | Planned | PLN | Task is planned but not started |
| `2-WIP` | In Progress | WIP | Task is actively being worked |
| `3-Blocked` | Blocked | BLK | Task is blocked (added in-app, not typically in CSV) |
| `4-Complete` | Complete | DONE | Task is finished |
| `6-Archive` | Archived | ARC | Task has been archived/removed from active plan |
| `7 - Not Go-Live` | Not Go-Live | NGL | Task is not applicable for go-live |

**The app matches on the leading digit**, so these all work:
- `1-Planned`, `1 - Planned`, `1Planned`, `1` → all map to Planned
- `4-Complete`, `4-Done`, `4` → all map to Complete

---

## Phase Naming

The app extracts phase from the Phase/Group column using keyword matching:

| Phase ID | Display Label | Keywords Matched |
|---|---|---|
| Phase 0 | **BL** (Baseline) | "Phase 0 -", "Baseline", "Cutover Readiness" |
| Phase 00 | **P0** | "Phase 00", "Migrate Customers" |
| Phase 1 | **P1** | "Phase 1" |
| Phase 2 | **P2** | "Phase 2" |
| Phase 3 | **P3** | "Phase 3" |
| Phase 4 | **P4** | "Phase 4" |
| Phase 5 | **P5** | "Phase 5" |

**Important:** "Phase 0" (with a space after) is matched before "Phase 00". If your Phase 0 tasks don't have "Baseline" or "Cutover Readiness" in the text, make sure the value starts with "Phase 0 -" (with space-dash) to avoid being matched as Phase 00.

---

## Task Ordering

The app displays tasks in the order they appear in the CSV. This means:

- **Sort your CSV by execution sequence before exporting**
- Tasks within a phase should be in the order they need to be executed
- The "Goal: get to ID" feature shows all tasks from the start of the plan up to the target task, based on row order
- The "Auto-advance" feature (marking a task complete shows the next one) uses row order

**Recommended sort order:** Phase → Task Order/Grouping → Activity ID

---

## Columns NOT Imported (Ignored)

These columns from your original spreadsheet are not used by the app. They can be present in the CSV without causing issues — they're simply ignored.

| Column | Reason |
|---|---|
| Task Order / Grouping | Used for sort order only — sort the CSV before export |
| Verified by Infor | Not displayed in the app |
| Reference Links | Not displayed (could be added to Description or Comments) |

---

## Sample CSV

```csv
Activity,Status,Workstream,Application,"Phase/Group",Task Classification,"Description and Notes","US/CA IMPACT INDICATOR","Mock ONLY Activity?","JAPAN to Execute","Expected start date","Expected end date","Responsible (PING / INFOR)",PING SME,Executor,PING Support,Infor SME,"Comments and Notes"
UK-1,2-WIP,Management,All,"Phase 0 - Environment Baseline / Cutover Readiness",Organizational,"Post SIT Issue Resolution - Must be complete before starting M3-116",,,YES,2/2/2026,2/13/2026,PING,Lewis Rogal,Lewis Rogal,Lewis Rogal,Morgan Boushka,Go-Live Only
M3-132,1-Planned,Technical,M3,"Phase 1 - System prep (Master Data Loading)",DeActivation,"Turn off BOD Processor: Sync.ItemMaster - Schedule outage with North America",YES,,YES,2/16/2026,2/22/2026,INFOR,Lewis Rogal,Kelly Von Hoene,Josh Edwards,Kelly Von Hoene,"US master data needs manual push after reactivation"
M3-307,1-Planned,"Order to Cash",M3,"Phase 4 - Final prep/Black out (Trans Data Migration)","Data Conversion","Load configured Customer Orders (HYDRA) - 4783 orders 12217 lines - Stagger load",YES,,,2/25/2026,3/1/2026,PING,Gavin/Mike/Sandy,Gavin South,Gavin/Mike/Sandy,Dhandapani C.,"Stagger: 1000/day then 1400/day then weekend"
```

---

## Pre-Import Checklist

Before exporting from Excel and uploading to the app:

- [ ] **Unique Activity IDs** — Every task has a unique ID. No blanks, no duplicates.
- [ ] **Consistent status codes** — All statuses start with 0, 1, 2, 4, 6, or 7.
- [ ] **Consistent names** — Person names are spelled the same everywhere. "Lewis Rogal" not sometimes "Lewis R."
- [ ] **Dates are clean** — No text mixed into date cells. Format is M/D/YYYY or M/D/YY.
- [ ] **Phase text includes phase number** — Every Phase/Group value contains "Phase 0", "Phase 00", "Phase 1", etc.
- [ ] **Sorted by execution sequence** — Tasks are in the order they should be executed within each phase.
- [ ] **No merged cells** — Excel merged cells break CSV export. Unmerge everything before saving as CSV.
- [ ] **No blank rows** — Remove any spacer rows, section headers, or summary rows that aren't actual tasks.
- [ ] **Save as CSV UTF-8** — File → Save As → CSV UTF-8 (Comma delimited). This preserves special characters in names.
- [ ] **Test the export** — Open the CSV in a text editor to verify it looks right before uploading.

---

## Adapting for Other Migrations

This template is designed for PING's UK/JP M3 cutover, but the app is reusable. To adapt for a different migration:

1. **Phase labels** — Update the `PH` array in the app code to match your phases
2. **Admin names** — Update `ADMIN_NAMES` for your team
3. **Flag columns** — The US/CA Impact, Mock Only, and JP Execute flags can be repurposed by renaming the CSV columns. The app matches on keywords like "impact", "mock", and "japan".
4. **Status codes** — Keep the same numeric prefixes (0-6). The labels can be changed in the `STATUSES` array.
5. **Workstream values** — These are auto-detected from the CSV, so use whatever workstream names make sense for your project.

The app imposes no fixed schema beyond Activity + Status + Description. Everything else enhances the experience but isn't required.
