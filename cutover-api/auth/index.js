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
