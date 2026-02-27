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
