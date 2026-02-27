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
