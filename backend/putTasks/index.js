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
