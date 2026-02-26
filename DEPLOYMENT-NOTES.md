# Deployment Solution - February 2026

## Problem Summary

The Azure Function App deployment was failing with persistent HTTP 503 errors from the Kudu/SCM service. This affected all deployment methods:
- GitHub Actions workflows
- Azure CLI `az functionapp deploy`
- Azure CLI `az functionapp deployment source config-zip`
- Direct Kudu API calls

Both the original Function App and a freshly created replacement exhibited the same issue.

## Root Cause

The Kudu deployment service (https://cutover-mgmt-api.scm.azurewebsites.net) was returning 503 "Service Unavailable" errors, preventing traditional deployment methods from working. This is a known platform issue that can occur with Azure Functions, particularly in certain regions or configurations.

## Solution Implemented

**Used WEBSITE_RUN_FROM_PACKAGE deployment method** - This bypasses the Kudu service entirely by running the function app directly from a ZIP file stored in Azure Blob Storage.

### Implementation Steps

1. **Created deployment package:**
   ```bash
   cd backend
   npm install --production
   zip -r ../backend-deploy.zip . -x "*.git/*"
   ```

2. **Uploaded to blob storage:**
   ```bash
   az storage blob upload \
     --account-name cutovermgmtstorage001 \
     --container-name cutover-data \
     --name backend-deploy.zip \
     --file backend-deploy.zip \
     --auth-mode key \
     --overwrite
   ```

3. **Generated SAS token (1 year expiry):**
   ```bash
   az storage blob generate-sas \
     --account-name cutovermgmtstorage001 \
     --container-name cutover-data \
     --name backend-deploy.zip \
     --permissions r \
     --expiry "2027-02-26T15:03Z" \
     --auth-mode key
   ```

4. **Configured Function App:**
   ```bash
   # Set Run From Package URL
   az functionapp config appsettings set \
     --name cutover-mgmt-api \
     --resource-group rg-cutover-mgmt \
     --settings 'WEBSITE_RUN_FROM_PACKAGE=https://cutovermgmtstorage001.blob.core.windows.net/cutover-data/backend-deploy.zip?[SAS_TOKEN]'

   # Change to Node 20 LTS (recommended for Functions v4)
   az functionapp config set \
     --name cutover-mgmt-api \
     --resource-group rg-cutover-mgmt \
     --linux-fx-version "NODE|20"

   # Restart to apply changes
   az functionapp restart \
     --name cutover-mgmt-api \
     --resource-group rg-cutover-mgmt
   ```

## Verification

All functions are successfully deployed and operational:

✅ **Auth endpoint:** https://cutover-mgmt-api.azurewebsites.net/api/auth
✅ **All 8 functions registered:** addLog, addTask, auth, deleteTask, getLog, getTasks, patchTask, putTasks
✅ **CORS configured properly:** Origin set to Static Web App URL
✅ **Application settings:** All environment variables configured correctly

Test commands:
```bash
# Test auth endpoint
curl "https://cutover-mgmt-api.azurewebsites.net/api/auth?name=Brad%20Amundson"

# Test tasks endpoint
curl "https://cutover-mgmt-api.azurewebsites.net/api/tasks"

# List all functions
az rest --method get \
  --uri "https://management.azure.com/subscriptions/3accf217-7bdd-4220-b2fe-86486233c499/resourceGroups/rg-cutover-mgmt/providers/Microsoft.Web/sites/cutover-mgmt-api/functions?api-version=2022-03-01" \
  --query 'value[].name'
```

## GitHub Actions Status

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) was updated to use `Azure/functions-action@v1` instead of direct Kudu API calls. However, due to the Kudu 503 issue, **automated deployments via GitHub Actions may still fail**.

### Current Workflow Status
- ✅ Workflow syntax correct
- ✅ Uses Azure Functions action
- ⚠️ May encounter Kudu unavailability errors

### Workaround for Future Deployments

Until the Kudu service reliability improves, use manual deployment with Run From Package:

```bash
# 1. Create deployment package
cd backend
npm install --production
zip -r ../backend-deploy.zip . -x "*.git/*"

# 2. Upload to blob storage
az storage blob upload \
  --account-name cutovermgmtstorage001 \
  --container-name cutover-data \
  --name backend-deploy.zip \
  --file ../backend-deploy.zip \
  --auth-mode key \
  --overwrite

# 3. Restart Function App to pick up new package
az functionapp restart \
  --name cutover-mgmt-api \
  --resource-group rg-cutover-mgmt

# 4. Wait ~30 seconds for initialization, then test
sleep 30
curl "https://cutover-mgmt-api.azurewebsites.net/api/auth?name=Test"
```

Note: The Function App is configured with `WEBSITE_RUN_FROM_PACKAGE` pointing to the blob storage URL with SAS token, so uploading a new `backend-deploy.zip` and restarting will automatically deploy the new version.

## Alternative Solutions Considered

1. **Different Azure Region:** Could create Function App in East US instead of West US 2
2. **Premium Plan:** Upgrade from Consumption to Premium plan (EP1) for better reliability
3. **Wait for Platform Recovery:** Kudu 503 errors may resolve automatically with platform updates

## SAS Token Management

**Important:** The SAS token expires on **2027-02-26**. Before expiration:

1. Generate new SAS token:
   ```bash
   EXPIRY=$(date -u -v+1y '+%Y-%m-%dT%H:%MZ')
   az storage blob generate-sas \
     --account-name cutovermgmtstorage001 \
     --container-name cutover-data \
     --name backend-deploy.zip \
     --permissions r \
     --expiry "$EXPIRY" \
     --auth-mode key
   ```

2. Update Function App setting:
   ```bash
   az functionapp config appsettings set \
     --name cutover-mgmt-api \
     --resource-group rg-cutover-mgmt \
     --settings 'WEBSITE_RUN_FROM_PACKAGE=https://cutovermgmtstorage001.blob.core.windows.net/cutover-data/backend-deploy.zip?[NEW_SAS_TOKEN]'
   ```

3. Restart Function App

## References

- [Azure Functions - Run From Package](https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package)
- [Kudu 503 Error Discussion](https://github.com/Azure/functions-action/issues/26)
- [Failed to fetch Kudu App Settings](https://learn.microsoft.com/en-us/answers/questions/2246903/error-failed-to-fetch-kudu-app-settings-error-serv)
- [Azure Functions Deployment Best Practices](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)

## Configuration Summary

### Function App Settings
- **AZURE_STORAGE_CONNECTION_STRING:** Connection to cutovermgmtstorage001
- **ADMIN_NAMES:** "Brad Amundson,Lewis Rogal"
- **ADMIN_PASS:** PingEvo2026
- **CORS_ORIGIN:** https://white-island-000383d1e.2.azurestaticapps.net
- **WEBSITE_RUN_FROM_PACKAGE:** Blob storage URL with SAS token
- **Runtime:** Node|20 (changed from Node|24 for stability)

### Azure Resources
- **Resource Group:** rg-cutover-mgmt (West US 2)
- **Function App:** cutover-mgmt-api
- **Storage Account:** cutovermgmtstorage001
- **Static Web App:** cutover-mgmt-app (white-island-000383d1e.2.azurestaticapps.net)

## Next Steps

1. Monitor Function App health and performance
2. Test full application functionality (CSV upload, task management)
3. Consider migrating to Premium plan if Consumption plan issues persist
4. Set up Application Insights for better monitoring and diagnostics
5. Update SAS token before February 2027 expiration
