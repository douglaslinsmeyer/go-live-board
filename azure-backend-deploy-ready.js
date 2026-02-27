// ============================================================
// CUTOVER MANAGEMENT APP — AZURE FUNCTION APP
// Deploy-Ready Folder Structure
//
// This file contains ALL files needed. Each section is one file.
// Create the folder structure, copy each section into its file,
// then deploy with: func azure functionapp publish <your-app-name>
//
// Folder structure:
// cutover-api/
// ├── host.json
// ├── package.json
// ├── shared/helpers.js          ← shared code (used by all functions)
// ├── getTasks/
// │   ├── index.js
// │   └── function.json
// ├── putTasks/
// │   ├── index.js
// │   └── function.json
// ├── patchTask/
// │   ├── index.js
// │   └── function.json
// ├── addTask/
// │   ├── index.js
// │   └── function.json
// ├── deleteTask/
// │   ├── index.js
// │   └── function.json
// ├── getLog/
// │   ├── index.js
// │   └── function.json
// ├── addLog/
// │   ├── index.js
// │   └── function.json
// ├── auth/
// │   ├── index.js
// │   └── function.json
// └── summary/
//     ├── index.js
//     └── function.json
// ============================================================


// ============================================================
// FILE: host.json
// ============================================================
/*
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}
*/


// ============================================================
// FILE: package.json
// ============================================================
/*
{
  "name": "cutover-mgmt-api",
  "version": "1.0.0",
  "dependencies": {
    "@azure/storage-blob": "^12.17.0",
    "@anthropic-ai/sdk": "^0.27.0"
  }
}
*/


// ============================================================
// FILE: shared/helpers.js
// Shared helper code — imported by every function
// ============================================================

// --- BEGIN shared/helpers.js ---
const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "cutover-data";
const TASKS_BLOB = "tasks.json";
const LOG_BLOB = "log.json";

function getContainer() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const blobService = BlobServiceClient.fromConnectionString(connStr);
  return blobService.getContainerClient(CONTAINER);
}

async function readBlob(blobName) {
  try {
    const container = getContainer();
    const blob = container.getBlobClient(blobName);
    const download = await blob.download(0);
    const chunks = [];
    for await (const chunk of download.readableStreamBody) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(text);
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function writeBlob(blobName, data) {
  const container = getContainer();
  const blob = container.getBlockBlobClient(blobName);
  const content = JSON.stringify(data);
  await blob.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });
}

function corsHeaders(req) {
  const origin = process.env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isAdmin(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const parts = token.split("::");
  if (parts.length < 2) return false;
  const name = parts[0];
  const role = parts[1];
  if (role !== "admin") return false;
  const adminNames = (process.env.ADMIN_NAMES || "").split(",").map(n => n.trim().toLowerCase());
  if (adminNames.includes(name.toLowerCase())) return true;
  const pass = parts[2] || "";
  return pass === (process.env.ADMIN_PASS || "");
}

module.exports = { TASKS_BLOB, LOG_BLOB, readBlob, writeBlob, corsHeaders, isAdmin };
// --- END shared/helpers.js ---


// ============================================================
// FILE: getTasks/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "tasks"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: getTasks/index.js
// GET /api/tasks — Returns the current task list
// ============================================================
// --- BEGIN getTasks/index.js ---
const { TASKS_BLOB, readBlob, corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const tasks = await readBlob(TASKS_BLOB);
    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: tasks || [], timestamp: new Date().toISOString() }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END getTasks/index.js ---


// ============================================================
// FILE: putTasks/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["put", "options"],
      "route": "tasks"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: putTasks/index.js
// PUT /api/tasks — Replaces entire task list (admin only)
// Used for: CSV upload, bulk operations
// ============================================================
// --- BEGIN putTasks/index.js ---
const { TASKS_BLOB, writeBlob, corsHeaders, isAdmin } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  if (!isAdmin(req)) {
    context.res = { status: 403, headers: corsHeaders(req), body: JSON.stringify({ error: "Admin required" }) };
    return;
  }

  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      context.res = { status: 400, headers: corsHeaders(req), body: JSON.stringify({ error: "tasks must be array" }) };
      return;
    }
    await writeBlob(TASKS_BLOB, tasks);
    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, count: tasks.length }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END putTasks/index.js ---


// ============================================================
// FILE: patchTask/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["patch", "options"],
      "route": "tasks/{id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: patchTask/index.js
// PATCH /api/tasks/:id — Updates a single task (any user)
// Used for: status changes, notes, field edits, dependencies
// ============================================================
// --- BEGIN patchTask/index.js ---
const { TASKS_BLOB, readBlob, writeBlob, corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const taskId = req.params.id || req.query.id;
    const updates = req.body;

    if (!taskId || !updates) {
      context.res = { status: 400, headers: corsHeaders(req), body: JSON.stringify({ error: "id and updates required" }) };
      return;
    }

    const tasks = (await readBlob(TASKS_BLOB)) || [];
    const idx = tasks.findIndex(t => t.id === taskId);

    if (idx === -1) {
      context.res = { status: 404, headers: corsHeaders(req), body: JSON.stringify({ error: "Task not found" }) };
      return;
    }

    tasks[idx] = { ...tasks[idx], ...updates };
    await writeBlob(TASKS_BLOB, tasks);

    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, task: tasks[idx] }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END patchTask/index.js ---


// ============================================================
// FILE: addTask/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "tasks"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: addTask/index.js
// POST /api/tasks — Adds a new task (admin only)
// ============================================================
// --- BEGIN addTask/index.js ---
const { TASKS_BLOB, readBlob, writeBlob, corsHeaders, isAdmin } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  if (!isAdmin(req)) {
    context.res = { status: 403, headers: corsHeaders(req), body: JSON.stringify({ error: "Admin required" }) };
    return;
  }

  try {
    const newTask = req.body;
    if (!newTask?.id || !newTask?.d) {
      context.res = { status: 400, headers: corsHeaders(req), body: JSON.stringify({ error: "id and description required" }) };
      return;
    }

    const tasks = (await readBlob(TASKS_BLOB)) || [];

    if (tasks.find(t => t.id.toUpperCase() === newTask.id.toUpperCase())) {
      context.res = { status: 409, headers: corsHeaders(req), body: JSON.stringify({ error: "Task ID already exists" }) };
      return;
    }

    tasks.push(newTask);
    await writeBlob(TASKS_BLOB, tasks);

    context.res = {
      status: 201,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, task: newTask }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END addTask/index.js ---


// ============================================================
// FILE: deleteTask/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["delete", "options"],
      "route": "tasks/{id}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: deleteTask/index.js
// DELETE /api/tasks/:id — Deletes a task (admin only)
// ============================================================
// --- BEGIN deleteTask/index.js ---
const { TASKS_BLOB, readBlob, writeBlob, corsHeaders, isAdmin } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  if (!isAdmin(req)) {
    context.res = { status: 403, headers: corsHeaders(req), body: JSON.stringify({ error: "Admin required" }) };
    return;
  }

  try {
    const taskId = req.params.id || req.query.id;
    const tasks = (await readBlob(TASKS_BLOB)) || [];
    const filtered = tasks.filter(t => t.id !== taskId);

    if (filtered.length === tasks.length) {
      context.res = { status: 404, headers: corsHeaders(req), body: JSON.stringify({ error: "Task not found" }) };
      return;
    }

    await writeBlob(TASKS_BLOB, filtered);
    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END deleteTask/index.js ---


// ============================================================
// FILE: getLog/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "log"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: getLog/index.js
// GET /api/log — Returns the activity log
// ============================================================
// --- BEGIN getLog/index.js ---
const { LOG_BLOB, readBlob, corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const log = (await readBlob(LOG_BLOB)) || [];
    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ log }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END getLog/index.js ---


// ============================================================
// FILE: addLog/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "log"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: addLog/index.js
// POST /api/log — Appends to the activity log
// ============================================================
// --- BEGIN addLog/index.js ---
const { LOG_BLOB, readBlob, writeBlob, corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const entry = req.body;
    if (!entry?.msg) {
      context.res = { status: 400, headers: corsHeaders(req), body: JSON.stringify({ error: "msg required" }) };
      return;
    }

    const log = (await readBlob(LOG_BLOB)) || [];
    log.unshift({ ...entry, ts: entry.ts || new Date().toISOString() });

    // Keep last 500 entries
    const trimmed = log.slice(0, 500);
    await writeBlob(LOG_BLOB, trimmed);

    context.res = {
      status: 201,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END addLog/index.js ---


// ============================================================
// FILE: auth/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "auth"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: auth/index.js
// GET /api/auth — Validates user and returns role
// ============================================================
// --- BEGIN auth/index.js ---
const { corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const { name, password } = req.query;
    if (!name) {
      context.res = { status: 400, headers: corsHeaders(req), body: JSON.stringify({ error: "name required" }) };
      return;
    }

    const adminNames = (process.env.ADMIN_NAMES || "").split(",").map(n => n.trim().toLowerCase());
    const isNamedAdmin = adminNames.includes(name.toLowerCase());

    let role = "user";
    if (isNamedAdmin) {
      role = "admin-eligible";
    }
    if (password && password === process.env.ADMIN_PASS) {
      role = "admin";
    }

    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, isNamedAdmin }),
    };
  } catch (e) {
    context.res = { status: 500, headers: corsHeaders(req), body: JSON.stringify({ error: e.message }) };
  }
};
// --- END auth/index.js ---


// ============================================================
// FILE: summary/function.json
// ============================================================
/*
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "summary"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
*/

// ============================================================
// FILE: summary/index.js
// POST /api/summary — Generates AI standup summary using Claude
// Body: { tasks: [...], context: {...} }
// ============================================================
// --- BEGIN summary/index.js ---
const Anthropic = require("@anthropic-ai/sdk");
const { corsHeaders } = require("../shared/helpers");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders(req) };
    return;
  }

  try {
    const { tasks, context: ctx } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      context.res = {
        status: 400,
        headers: corsHeaders(req),
        body: JSON.stringify({ ok: false, error: "tasks array required" })
      };
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      context.res = {
        status: 500,
        headers: corsHeaders(req),
        body: JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY not configured" })
      };
      return;
    }

    // Prepare task summary for AI
    const taskSummary = tasks.map(t => ({
      id: t.id,
      status: t.status,
      description: t.description || "",
      phase: t.phase || "",
      workstream: t.workstream || "",
      executor: t.executor || "",
      blocker: t.blocker || "",
      startDate: t.startDate || "",
      endDate: t.endDate || "",
      dependencies: (t.dependencies || []).length > 0 ? t.dependencies.join(", ") : "none"
    }));

    // Build context description
    let contextDesc = "";
    if (ctx?.focusDate) {
      contextDesc += `Focus Date: ${ctx.focusDate}\n`;
    }
    if (ctx?.focusMode) {
      contextDesc += `Focus Mode: ${ctx.focusMode}\n`;
    }
    if (ctx?.phaseFilter && ctx.phaseFilter !== "all") {
      contextDesc += `Phase Filter: ${ctx.phaseFilter}\n`;
    }
    if (ctx?.generatedBy) {
      contextDesc += `Generated by: ${ctx.generatedBy}\n`;
    }

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a project manager creating a concise standup summary for an M3 ERP cutover migration.

${contextDesc ? `Context:\n${contextDesc}\n` : ""}
Tasks (${tasks.length} total):
${JSON.stringify(taskSummary, null, 2)}

Generate a brief standup summary (3-5 sentences) covering:
1. Overall progress (how many tasks completed, in progress, blocked)
2. Key blockers or risks (if any)
3. Notable upcoming tasks or dependencies
4. Any critical actions needed

Keep it concise and actionable for a daily standup meeting.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const summary = message.content[0].text;

    context.res = {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, summary })
    };

  } catch (e) {
    context.log.error("Summary generation error:", e);
    context.res = {
      status: 500,
      headers: corsHeaders(req),
      body: JSON.stringify({ ok: false, error: e.message || "Failed to generate summary" })
    };
  }
};
// --- END summary/index.js ---


// ============================================================
// DEPLOYMENT INSTRUCTIONS
// ============================================================
//
// 1. Create the folder structure shown at the top of this file
// 2. Copy each section between "--- BEGIN" and "--- END" markers
//    into the corresponding file
// 3. Copy each function.json from the /* */ comment blocks into
//    the corresponding .json file (remove the /* */ wrappers)
// 4. Run: npm install
// 5. Run: func azure functionapp publish <your-function-app-name>
//
// App Settings required (set in Azure Portal → Function App → Configuration):
//   AZURE_STORAGE_CONNECTION_STRING = <your storage connection string>
//   ADMIN_NAMES = Brad Amundson,Lewis Rogal
//   ADMIN_PASS = PingEvo2026  (change for production!)
//   CORS_ORIGIN = https://your-site.azurestaticapps.net
//   ANTHROPIC_API_KEY = <your Anthropic API key>  (for AI Standup Summary feature)
//
// ============================================================
