# Cutover Management App — Azure Deployment Guide
**PING Project Evo | Multi-User Setup**

---

## Architecture Overview

```
┌─────────────────────────┐
│   Users (Browser)       │
│   Brad, Lewis, Kelly,   │
│   Darren, etc.          │
└──────────┬──────────────┘
           │ HTTPS
           ▼
┌─────────────────────────┐
│  Azure Static Web App   │
│  index.html (React)     │
│  - Dashboard UI         │
│  - CSV Parser           │
│  - All client logic     │
└──────────┬──────────────┘
           │ REST API calls
           ▼
┌─────────────────────────┐
│  Azure Function App     │
│  Node.js 18+            │
│  - /api/tasks (CRUD)    │
│  - /api/log (read/write)│
│  - /api/auth (validate) │
│  - Admin validation     │
│  - CORS enforcement     │
└──────────┬──────────────┘
           │ Azure SDK
           ▼
┌─────────────────────────┐
│  Azure Blob Storage     │
│  Container: cutover-data│
│  - tasks.json           │
│  - log.json             │
│  - presets.json          │
└─────────────────────────┘
```

**Cost estimate:** ~$5-15/month for a cutover team of 20 users. Storage is pennies, Functions are consumption-based (pay per execution), Static Web App has a free tier.

---

## Prerequisites

- Azure subscription with permissions to create resources
- Azure CLI installed (or use Azure Portal)
- Node.js 18+ installed locally (for Function App development)
- The cutover CSV file ready

---

## Step 1: Create Azure Storage Account

### Azure Portal
1. Go to **Storage Accounts** → **+ Create**
2. Settings:
   - **Resource group:** Create new → `rg-cutover-mgmt`
   - **Storage account name:** `cutovermgmtstorage` (must be globally unique, lowercase, no hyphens)
   - **Region:** West US 2 (closest to Phoenix) or UK South (if you want data residency near PEL)
   - **Performance:** Standard
   - **Redundancy:** LRS (Locally Redundant — fine for a time-boxed tool)
3. Click **Review + Create** → **Create**

### Create the Container
1. Open your new storage account
2. Go to **Containers** → **+ Container**
3. Name: `cutover-data`
4. Public access level: **Private**
5. Click **Create**

### Get the Connection String
1. In the storage account, go to **Access keys**
2. Click **Show** next to key1
3. Copy the **Connection string** — you'll need this in Step 3

---

## Step 2: Create Azure Function App

### Azure Portal
1. Go to **Function App** → **+ Create**
2. Settings:
   - **Resource group:** `rg-cutover-mgmt` (same as storage)
   - **Function App name:** `cutover-mgmt-api` (must be globally unique)
   - **Runtime stack:** Node.js
   - **Version:** 18 LTS
   - **Region:** Same as storage account
   - **Operating System:** Linux
   - **Plan type:** Consumption (Serverless)
3. Click **Review + Create** → **Create**

### Deploy the Function Code

**Option A: Azure Portal (Quick)**
1. Open your Function App
2. Go to **App files** in the left menu
3. Create each function folder and files as described in the `azure-backend` artifact

**Option B: VS Code (Recommended)**
1. Install the **Azure Functions** VS Code extension
2. Create a local project:
```bash
mkdir cutover-api
cd cutover-api
func init --javascript
npm install @azure/storage-blob
```

3. Create the folder structure:
```
cutover-api/
├── host.json
├── package.json
├── getTasks/
│   ├── index.js
│   └── function.json
├── putTasks/
│   ├── index.js
│   └── function.json
├── patchTask/
│   ├── index.js
│   └── function.json
├── addTask/
│   ├── index.js
│   └── function.json
├── deleteTask/
│   ├── index.js
│   └── function.json
├── getLog/
│   ├── index.js
│   └── function.json
├── addLog/
│   ├── index.js
│   └── function.json
└── auth/
    ├── index.js
    └── function.json
```

4. Each `index.js` exports one function from the `azure-backend` artifact
5. Each `function.json` uses the route configs from the bottom of that artifact

6. Deploy:
```bash
func azure functionapp publish cutover-mgmt-api
```

**Option C: Azure CLI**
```bash
# Login
az login

# Deploy from local folder
cd cutover-api
func azure functionapp publish cutover-mgmt-api
```

### host.json
```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}
```

### package.json
```json
{
  "name": "cutover-mgmt-api",
  "version": "1.0.0",
  "dependencies": {
    "@azure/storage-blob": "^12.17.0"
  }
}
```

---

## Step 3: Configure Application Settings

In your Function App → **Configuration** → **Application settings**, add:

| Setting | Value | Notes |
|---------|-------|-------|
| `AZURE_STORAGE_CONNECTION_STRING` | (from Step 1) | The full connection string |
| `ADMIN_NAMES` | `Brad Amundson,Lewis Rogal` | Comma-separated, case-insensitive |
| `ADMIN_PASS` | `PingEvo2026` | Change this to something secure |
| `CORS_ORIGIN` | `https://your-site.azurestaticapps.net` | Your static site URL |

**Important:** Click **Save** after adding all settings. The Function App will restart.

### Configure CORS
1. In your Function App → **CORS** (left menu under API)
2. Add your static site URL: `https://your-site.azurestaticapps.net`
3. If testing locally, also add `http://localhost:3000`
4. Click **Save**

---

## Step 4: Create Azure Static Web App

### Azure Portal
1. Go to **Static Web Apps** → **+ Create**
2. Settings:
   - **Resource group:** `rg-cutover-mgmt`
   - **Name:** `cutover-mgmt-app`
   - **Plan type:** Free
   - **Source:** Other (manual deploy)
   - **Region:** West US 2 or closest
3. Click **Review + Create** → **Create**

### Deploy the Frontend

**Option A: Azure Portal (Quick)**
1. Open your Static Web App
2. Go to **Overview** → note the URL (e.g., `https://happy-tree-123.azurestaticapps.net`)
3. Use the **Deployment token** to deploy via CLI:
```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./index.html --deployment-token <your-token>
```

**Option B: Blob Storage ($web)**
If you already have a storage account with static website enabled:
1. Storage account → **Static website** → Enable
2. Upload `index.html` to the `$web` container
3. Note the **Primary endpoint** URL

### Update the Frontend Config
Before deploying, update the `API_BASE` line in `index.html`:
```javascript
const API_BASE = "https://cutover-mgmt-api.azurewebsites.net/api";
```

---

## Step 5: Test the Deployment

### Test the API directly
```bash
# Test GET tasks (should return empty)
curl https://cutover-mgmt-api.azurewebsites.net/api/tasks

# Test auth
curl "https://cutover-mgmt-api.azurewebsites.net/api/auth?name=Brad%20Amundson"
```

Expected responses:
```json
// GET /api/tasks
{"tasks":[],"timestamp":"2026-02-19T..."}

// GET /api/auth?name=Brad%20Amundson
{"name":"Brad Amundson","role":"admin-eligible","isNamedAdmin":true}
```

### Test the full flow
1. Open your Static Web App URL
2. Sign in as Brad Amundson → Continue as Admin
3. Upload the cutover CSV
4. Verify tasks load
5. Open a second browser/incognito window
6. Sign in as Lewis Rogal → Continue as Admin
7. Verify the same tasks appear (loaded from blob storage)
8. In window 1, change a task status
9. Within 30 seconds, verify window 2 shows the update

---

## Step 6: Go Live Configuration

### Before the cutover event:

**1. Update admin password**
- Function App → Configuration → Change `ADMIN_PASS` to something the team agrees on
- Don't use the default `PingEvo2026` in production

**2. Update admin list**
- Add any additional admins needed for the event
- `ADMIN_NAMES` = `Brad Amundson,Lewis Rogal,Doug Linsmeyer`

**3. Lock down CORS**
- Remove `localhost` from CORS settings
- Only allow your production Static Web App URL

**4. Upload the final CSV**
- Sign in as admin
- Upload the latest cutover plan
- Verify task counts and phase distribution

**5. Share the URL**
- Send the Static Web App URL to the team
- Include the user guide document
- Remind everyone: sign in with your full name, team members get autocomplete

---

## Operational Notes

### Data Backup
Azure Blob Storage supports soft delete and versioning. Enable these:
1. Storage account → **Data protection**
2. Enable **Blob soft delete** (7 days)
3. Enable **Blob versioning**

This means if someone accidentally re-uploads a bad CSV, you can recover the previous version.

### Monitoring
1. Function App → **Monitor** shows invocation logs
2. Storage account → **Metrics** shows read/write operations
3. Set up an **Alert** on Function App errors if you want notifications

### Scaling
The consumption plan auto-scales. For a 20-person team during a 2-week cutover:
- Expect ~5,000-10,000 API calls/day during active execution
- Well within free tier limits for Functions
- Blob storage operations will be minimal (few cents/day)

### After the Cutover
1. Export the final state: GET /api/tasks → save as JSON
2. Export the activity log: GET /api/log → save as JSON
3. These become your cutover execution record for lessons learned
4. Delete or stop the resources to avoid ongoing charges

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch" in browser | CORS not configured | Add your site URL to Function App CORS settings |
| Tasks don't load | Storage connection string wrong | Verify `AZURE_STORAGE_CONNECTION_STRING` in App Settings |
| Admin features don't work | Auth token not passing | Check browser console for 403 errors, verify `ADMIN_NAMES` spelling |
| Data not syncing between users | Both using localStorage | Verify `API_BASE` is set in the frontend |
| Slow initial load | Cold start on consumption plan | First request after idle takes 5-10s. Subsequent requests are fast. |
| 404 on API calls | Function not deployed | Verify functions are listed in Function App → Functions |
| CSV upload fails for non-admin | Expected behavior | Only admins can upload. Non-admins see "Waiting for data" |

### Quick Diagnostic
Open browser developer tools (F12) → Console tab. Look for:
- `API getTasks failed` → backend connectivity issue
- `403` responses → admin validation failing
- `CORS` errors → CORS not configured

---

## File Inventory

| Artifact | Purpose | Where to Deploy |
|----------|---------|-----------------|
| `cutover-dashboard` | Read-only CSV viewer (mock prep) | Claude artifact or Azure Static Web App |
| `cutover-static-site` | CSV viewer as standalone HTML | Azure Static Web App `$web` container |
| `cutover-mgmt-app` | Management app (Claude artifact) | Claude.ai — for development/testing |
| `cutover-mgmt-azure` | Management app single-user HTML | Azure Static Web App — works without backend |
| `cutover-mgmt-multiuser` | Management app multi-user HTML | Azure Static Web App — requires Function App backend |
| `azure-backend` | Azure Function API code | Azure Function App |
| `cutover-dashboard-guide` | User guide document | Share with team (email, Teams, SharePoint) |
| `azure-deployment-guide` | This document | Internal reference for deployment |

---

## Quick Reference: Resource Names

Fill these in during setup:

| Resource | Name | URL |
|----------|------|-----|
| Resource Group | `rg-cutover-mgmt` | |
| Storage Account | | |
| Storage Container | `cutover-data` | |
| Function App | | `https://_________.azurewebsites.net` |
| Static Web App | | `https://_________.azurestaticapps.net` |
| Admin Password | | (store securely) |
