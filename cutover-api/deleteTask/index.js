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
