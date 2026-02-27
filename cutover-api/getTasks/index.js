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
