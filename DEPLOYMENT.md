# Deployment Summary

## Azure Resources Created

All resources are in the **West US 2** region under the **PHX - IS Operations** subscription.

### Resource Group
- **Name**: `rg-cutover-mgmt`
- **Location**: West US 2

### Storage Account
- **Name**: `cutovermgmtstorage001`
- **Type**: Standard_LRS (Locally Redundant Storage)
- **Container**: `cutover-data`
- **Purpose**: Stores tasks.json, log.json for the cutover application
- **Blob Endpoint**: https://cutovermgmtstorage001.blob.core.windows.net/

### Azure Function App (Backend API)
- **Name**: `cutover-mgmt-api`
- **URL**: https://cutover-mgmt-api.azurewebsites.net
- **Runtime**: Node.js 24
- **Plan**: Consumption (Serverless)
- **API Endpoints**:
  - GET /api/tasks - Retrieve all tasks
  - PUT /api/tasks - Replace task list (admin only)
  - PATCH /api/tasks/:id - Update single task
  - POST /api/tasks - Add new task (admin only)
  - DELETE /api/tasks/:id - Delete task (admin only)
  - GET /api/log - Retrieve activity log
  - POST /api/log - Add log entry
  - GET /api/auth - Validate user authentication

**Environment Variables Configured:**
- `AZURE_STORAGE_CONNECTION_STRING` - Connection to blob storage
- `ADMIN_NAMES` - "Brad Amundson,Lewis Rogal"
- `ADMIN_PASS` - "PingEvo2026"
- `CORS_ORIGIN` - Static Web App URL

**CORS Configuration:**
- Allowed Origins: https://white-island-000383d1e.2.azurestaticapps.net

### Azure Static Web App (Frontend)
- **Name**: `cutover-mgmt-app`
- **URL**: https://white-island-000383d1e.2.azurestaticapps.net
- **Plan**: Free tier
- **Source**: Single-file React application (cutover-mgmt-multiuser.html)

## GitHub Actions Workflows

### Frontend Deployment
- **File**: `.github/workflows/deploy-frontend.yml`
- **Trigger**: Push to main (when cutover-mgmt-multiuser.html changes)
- **Actions**:
  1. Checks out code
  2. Updates API_BASE URL to point to Function App
  3. Deploys to Static Web App

### Backend Deployment
- **File**: `.github/workflows/deploy-backend.yml`
- **Trigger**: Push to main (when backend/ changes)
- **Actions**:
  1. Checks out code
  2. Sets up Node.js 24
  3. Installs dependencies
  4. Deploys to Function App

## GitHub Secrets Configured

- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token for Static Web App
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - Publish profile for Function App

## Access Information

### Application URL
🌐 **https://white-island-000383d1e.2.azurestaticapps.net**

### Admin Users
- Brad Amundson
- Lewis Rogal

### Admin Password
- `PingEvo2026` (should be changed before production use)

## Deployment Status

The initial deployment was triggered automatically when the code was pushed to GitHub.

Check deployment status:
```bash
gh run list --limit 5
```

View deployment logs:
```bash
gh run view <run-id>
```

## Manual Deployment Commands

If you need to deploy manually:

### Deploy Backend
```bash
cd backend
npm install
func azure functionapp publish cutover-mgmt-api
```

### Deploy Frontend
```bash
# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./cutover-mgmt-multiuser.html \
  --deployment-token <AZURE_STATIC_WEB_APPS_API_TOKEN>
```

## Cost Estimates

- **Storage Account**: ~$0.50/month (for typical usage)
- **Function App (Consumption)**: ~$5-10/month (depends on usage)
- **Static Web App (Free tier)**: $0/month
- **Total**: ~$5-15/month

## Tags Applied to All Resources

- `Environment`: Production
- `Application`: CutoverManagement
- `Owner`: douglasl@ping.com

## Next Steps

1. ✅ Azure resources created
2. ✅ GitHub Actions workflows configured
3. ✅ GitHub secrets set up
4. 🔄 Automatic deployment in progress
5. ⏳ Test the application at: https://white-island-000383d1e.2.azurestaticapps.net
6. ⏳ Upload cutover CSV and verify functionality
7. ⏳ Update ADMIN_PASS to a secure password for production

## Monitoring and Management

### View Function App Logs
```bash
az webapp log tail --name cutover-mgmt-api --resource-group rg-cutover-mgmt
```

### View Application Settings
```bash
az functionapp config appsettings list \
  --name cutover-mgmt-api \
  --resource-group rg-cutover-mgmt
```

### View Static Web App Details
```bash
az staticwebapp show \
  --name cutover-mgmt-app \
  --resource-group rg-cutover-mgmt
```

### Azure Portal URLs
- Resource Group: https://portal.azure.com/#@pinggolf.onmicrosoft.com/resource/subscriptions/3accf217-7bdd-4220-b2fe-86486233c499/resourceGroups/rg-cutover-mgmt
- Function App: https://portal.azure.com/#@pinggolf.onmicrosoft.com/resource/subscriptions/3accf217-7bdd-4220-b2fe-86486233c499/resourceGroups/rg-cutover-mgmt/providers/Microsoft.Web/sites/cutover-mgmt-api
- Static Web App: https://portal.azure.com/#@pinggolf.onmicrosoft.com/resource/subscriptions/3accf217-7bdd-4220-b2fe-86486233c499/resourceGroups/rg-cutover-mgmt/providers/Microsoft.Web/staticSites/cutover-mgmt-app

## Troubleshooting

### Check Deployment Status
```bash
gh run list
gh run view <run-id> --log
```

### Test API Endpoints
```bash
# Test authentication
curl "https://cutover-mgmt-api.azurewebsites.net/api/auth?name=Brad%20Amundson"

# Test get tasks
curl "https://cutover-mgmt-api.azurewebsites.net/api/tasks"
```

### Common Issues

1. **CORS errors**: Verify CORS_ORIGIN matches the Static Web App URL
2. **403 Forbidden**: Check ADMIN_NAMES and ADMIN_PASS settings
3. **Storage connection errors**: Verify AZURE_STORAGE_CONNECTION_STRING is set correctly
4. **Deployment failures**: Check GitHub Actions logs with `gh run view`

## Security Recommendations

Before production use:
1. Change `ADMIN_PASS` to a strong password
2. Consider restricting network access to the Storage Account
3. Enable Application Insights for monitoring
4. Set up alerts for Function App errors
5. Review and restrict CORS origins if needed
