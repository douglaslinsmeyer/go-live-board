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
