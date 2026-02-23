# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The **Cutover Management App** is a real-time, multi-user web application for tracking and executing M3 ERP system cutover plans. It replaces spreadsheet-based cutover management with a live dashboard where distributed teams can coordinate across timezones, update task statuses, add notes, and track dependencies.

**Key characteristics:**
- Single-file HTML application with embedded React
- Azure deployment architecture (Static Web App + Azure Functions + Blob Storage)
- Multi-user with 30-second auto-refresh polling
- CSV import for cutover plan initialization
- Real-time activity logging and status tracking

## Architecture

### Frontend Architecture

**File:** `cutover-mgmt-multiuser.html`

The entire frontend is a single-file React application (~6000+ lines) with no build step. Key characteristics:

- **No transpilation required** - Uses Babel standalone in the browser
- **CDN dependencies** - React, ReactDOM, Babel, PapaParse loaded from CDN
- **Embedded CSS** - All styles inline in `<style>` tag
- **State management** - React hooks with local state (no Redux/Context)
- **Storage abstraction** - Can run in localStorage mode (single-user) or API mode (multi-user)

**Main state variables** (all defined in `App()` component):
```javascript
tasks        // Array of task objects (main data model)
loaded       // Boolean - has CSV been uploaded
uName/uRole  // Current user name and role (user/admin)
actLog       // Activity log entries
presets      // User-saved filter combinations
panel        // Currently open task detail panel
tz           // Timezone (GMT/AZT/EST/BOTH/UTC)
vM           // View mode (phase/day/flat)
```

**Key components structure:**
- Single `App()` component contains all UI
- No component hierarchy - everything rendered inline
- Heavy use of `useMemo` for derived data (filtering, grouping, stats)
- `useEffect` for data loading and 30s polling interval

### Backend Architecture

**File:** `azure-backend-deploy-ready.js`

Azure Functions backend with 8 HTTP-triggered endpoints:

**API Endpoints:**
- `GET /api/tasks` - Retrieve all tasks from blob storage
- `PUT /api/tasks` - Replace entire task list (admin only)
- `PATCH /api/tasks/:id` - Update single task fields
- `POST /api/tasks` - Add new task (admin only)
- `DELETE /api/tasks/:id` - Delete task (admin only)
- `GET /api/log` - Retrieve activity log
- `POST /api/log` - Add activity log entry
- `GET /api/auth?name=...` - Validate user/admin status

**Storage structure:**
- Azure Blob Storage container: `cutover-data`
- `tasks.json` - Array of task objects (all fields serialized except computed date objects)
- `log.json` - Array of activity log entries (chronological)
- `presets.json` - User-specific filter presets (stored client-side in localStorage only)

**Authentication:**
- Bearer token format: `name::role::password`
- Admin validation: name in `ADMIN_NAMES` env var OR correct `ADMIN_PASS`
- CORS origin configured via `CORS_ORIGIN` env var

### Data Model

**Task object structure:**
```javascript
{
  id: "M3-132",           // Unique task ID (required)
  s: "1-Planned",         // Status code (0-6)
  d: "Turn off BOD...",   // Description
  w: "Technical",         // Workstream
  a: "M3",                // Application
  p: "Phase 1",           // Phase (Phase 0, Phase 00, Phase 1-5)
  c: "DeActivation",      // Classification
  r: "INFOR",             // Responsible (PING/INFOR/JOINT/COMBO)
  ps: "Lewis Rogal",      // PING SME
  ex: "Kelly Von Hoene",  // Executor
  pp: "Josh Edwards",     // PING Support
  is: "Kelly Von Hoene",  // Infor SME
  sd: "2/16/2026",        // Start date (string)
  ed: "2/22/2026",        // End date (string)
  sdD: Date,              // Computed start date object
  edD: Date,              // Computed end date object
  ui: true,               // US/CA Impact flag
  mo: false,              // Mock Only flag
  jp: true,               // Japan Execute flag
  n: "Original notes",    // Original CSV notes
  notes: [],              // User-added notes [{text,user,ts}]
  deps: [],               // Dependencies ["M3-100", "M3-101"]
  history: [],            // Change history
  blocker: "",            // Blocker reason (if status is 3-Blocked)
  estStart: "2/16 10:00", // Estimated start timestamp
  estEnd: "2/16 14:30",   // Estimated end timestamp
  actStart: "2/16 10:15", // Actual start timestamp
  actEnd: "2/16 14:45",   // Actual end timestamp
  updatedBy: "Brad",      // Last updater
  updatedAt: "Feb 16..."  // Last update timestamp
}
```

**Status codes:**
- `0-Not Mock` - Task not in mock exercise
- `1-Planned` - Not started
- `2-WIP` - In progress
- `3-Blocked` - Blocked
- `4-Complete` - Done
- `6-Archive` - Archived

**Phase definitions** (hardcoded in `PH` array):
- Phase 0 (BL) - Baseline / Cutover Readiness
- Phase 00 (P0) - Migrate Customers to PRD
- Phase 1 (P1) - Master Data Loading
- Phase 2 (P2) - Master Data Sync
- Phase 3 (P3) - Trans Data Prep
- Phase 4 (P4) - Blackout / Trans Data Migration
- Phase 5 (P5) - Hypercare

### CSV Import

**Parser:** Uses PapaParse library

**Column mapping** (flexible keyword matching):
- Activity ID: matches "activity" (first column fallback)
- Status: matches "status"
- Description: matches "descriptionandnotes", "description"
- Phase: matches "phase", "group"
- Workstream: matches "workstream"
- Application: matches "application"
- Start Date: matches "expectedstart", "startdate"
- End Date: matches "expectedend", "enddate"
- Responsible: matches "responsible", "pinginfor"
- US/CA Impact: matches "usca", "usimpact", "impact"
- Mock Only: matches "mockonly", "mock"
- Japan Execute: matches "japantoexecute", "japan"

**Date parsing** (function `pD`):
Supports formats: `M/D/YYYY`, `M/D/YY`, `M/D`, `YYYY-MM-DD`

**Phase parsing** (function `pPh`):
Extracts phase from text containing "Phase 0", "Phase 00", "Phase 1", etc.

## Common Development Tasks

### Running Locally (Development)

1. **Single-user mode (localStorage):**
   ```bash
   # Open cutover-mgmt-multiuser.html directly in browser
   # Ensure API_BASE is empty string: const API_BASE = "";
   open cutover-mgmt-multiuser.html
   ```

2. **Multi-user mode (with Azure backend):**
   ```bash
   # Set API_BASE in HTML file to Azure Function URL
   # Example: const API_BASE = "https://cutover-mgmt-api.azurewebsites.net/api";
   ```

### Testing CSV Import

1. Use sample CSV in repository: `Brad_Ping_UK_JP_MOCK_Cutover_Plan_February_2026(M3 UK MOCK CUTOVER).csv`
2. Sign in as admin (Brad Amundson or Lewis Rogal)
3. Click "Upload CSV" and select file
4. Verify task counts match expected phases

### Deploying to Azure

**Prerequisites:**
- Azure CLI: `az login`
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4`
- Static Web Apps CLI: `npm install -g @azure/static-web-apps-cli`

**Deploy backend:**
```bash
# From root directory, create function app structure
mkdir cutover-api
cd cutover-api

# Initialize Azure Functions project
func init --javascript

# Create folder structure matching azure-backend-deploy-ready.js
# Then deploy
func azure functionapp publish <function-app-name>
```

**Deploy frontend:**
```bash
# Update API_BASE in cutover-mgmt-multiuser.html
# Deploy to Static Web App
swa deploy ./cutover-mgmt-multiuser.html --deployment-token <token>
```

**Configuration required:**
Environment variables in Azure Function App:
- `AZURE_STORAGE_CONNECTION_STRING` - Blob storage connection
- `ADMIN_NAMES` - Comma-separated admin names (e.g., "Brad Amundson,Lewis Rogal")
- `ADMIN_PASS` - Admin password for non-named admins
- `CORS_ORIGIN` - Static Web App URL

### Modifying Task Fields

All task field updates go through `updField(id, field, value)` function:
- Updates local state
- Logs change to activity log
- Calls `store.patchTask()` if in API mode
- Auto-saves to storage

**Example - adding a new field:**
1. Add field to task object in CSV parser (`parseCSV` function)
2. Add field label to `fieldLabels` object
3. Add UI input in task panel rendering
4. Wire input to call `updField(taskId, "newfieldname", value)`

### Adding New Status Codes

1. Update `STATUSES` array with new status:
   ```javascript
   {id:"5-NewStatus", l:"New Status", c:"#color", bg:"#bgcolor", s:"NS"}
   ```
2. Update status mapping in `gSt()` function (status parser)
3. Update status buttons in task panel UI

### Customizing Phases

Update `PH` array for different migration projects:
```javascript
const PH=[
  {id:"Phase 1", l:"P1", f:"Custom Phase Name", dt:"Date Range", cl:"#hexcolor"},
  // ...
];
```

Also update phase parsing logic in `pPh()` function to match new phase keywords.

### Activity Log

Activity log captures all changes:
- Status changes
- Field updates
- CSV uploads
- Task additions/deletions
- Note additions

**Add log entry:**
```javascript
addL("Message describing the action");
```

Log entries auto-include timestamp and current user name.

## Important Implementation Details

### Timezone Handling

Time offset calculations in `oT()` function:
- GMT baseline (no offset)
- AZT (Arizona): GMT - 7 hours
- EST (Eastern): GMT - 5 hours
- BOTH mode: displays both GMT and AZT side-by-side

Times are display-only transformations - all data stored in original format.

### Dependencies & Blocking

**Dependency checking:**
- Task has `deps` array of prerequisite task IDs
- Task shows DEP badge if any dependency not in "4-Complete" status
- Computed via `hasPendingDeps()` inline check in rendering

**Past due detection:**
- Compare `task.edD` (end date object) to current date
- Only flagged if status is not "4-Complete" or "6-Archive"

### Auto-refresh (Multi-user Sync)

When `USE_API` is true:
- Poll interval: 30 seconds
- Fetches tasks and log from API
- Re-parses dates on received tasks
- Updates state without disrupting current UI interaction
- Last sync time displayed in header

### Smart Presets

Built-in presets with dynamic behavior:
- **My Tasks** - Filters by user's first name in any personnel field (ps, ex, pp, is)
- **Actionable** - All tasks not in Complete or Archive status
- **Blocked** - Status = "3-Blocked"
- **Past Due** - End date < today and not complete
- **US/CA** - US/CA Impact flag = true, hide completed
- **INFOR** - Responsible = "INFOR"

Custom presets: user-defined filter combinations saved to localStorage.

### Day Focus Feature

Three modes in Day Focus toolbar:
- **Starting** - `task.sdD` (start date) matches selected date
- **Due EOD** - `task.edD` (end date) ≤ selected date
- **Goal ID** - All tasks from plan start up to specified task ID (by array order)

## File Organization

```
go-live-board/
├── cutover-mgmt-multiuser.html          # Main app (single-file React)
├── azure-backend-deploy-ready.js        # Azure Functions code (all endpoints)
├── cutover-dashboard.tsx                # Read-only CSV viewer artifact
├── cutover-template.csv                 # Empty CSV template
├── Brad_Ping_UK_JP_MOCK_Cutover_Plan_February_2026(M3 UK MOCK CUTOVER).csv  # Sample data
├── cutover-dashboard-guide.md           # User guide (comprehensive)
├── azure-deployment-guide.md            # Deployment instructions
├── cutover-csv-template.md              # CSV format specification
└── Cutover Management App — User Guide.pdf  # PDF version of user guide
```

## Code Patterns

### Updating State with Activity Logging

Standard pattern for all state mutations:
```javascript
function updateSomething(id, value) {
  sT(prev => {
    const next = prev.map(t => t.id === id ? {...t, field: value} : t);
    const log = addL(`${id}: changed field to ${value}`);
    if (USE_API) {
      store.patchTask(id, {field: value});
    } else {
      saveAll(next, log);
    }
    return next;
  });
}
```

### Filtering and Derived State

Use `useMemo` for all computed data:
```javascript
const filteredTasks = useMemo(() => {
  let result = tasks;
  // Apply filters
  return result;
}, [tasks, filter1, filter2, ...]);
```

Prevents unnecessary re-computation on every render.

### Panel State Management

Current task panel controlled by `panel` state (task ID or null):
```javascript
const [panel, sPanel] = useState(null);
const openTask = sPanel("M3-132");
const closeTask = sPanel(null);
```

Panel renders as fixed position overlay on right side when `panel !== null`.

## Troubleshooting

**CSV upload fails:**
- Check CSV format matches template (see cutover-csv-template.md)
- Ensure Activity column has unique IDs
- Verify no merged cells in Excel before CSV export

**Tasks don't sync between users:**
- Verify `USE_API` is true (API_BASE is set)
- Check CORS configuration in Azure Function App
- Check browser console for 403/404 errors

**Admin features don't work:**
- Verify admin name matches `ADMIN_NAMES` env var exactly (case-insensitive)
- Check Authorization header format: `Bearer name::role::password`
- Test admin validation: `GET /api/auth?name=Brad%20Amundson`

**Dates display incorrectly:**
- Dates must be in supported formats (M/D/YYYY or M/D/YY)
- Check date parsing in browser console: `pD("2/16/2026")`
- Timezone is display-only transform, doesn't affect storage

**Performance issues:**
- Task list virtualization not implemented - large plans (>1000 tasks) may be slow
- Consider adding filters to reduce visible tasks
- Auto-refresh can be disabled by setting polling interval higher
