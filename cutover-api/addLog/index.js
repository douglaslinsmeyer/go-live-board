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
