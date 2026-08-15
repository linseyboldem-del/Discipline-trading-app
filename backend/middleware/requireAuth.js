const { supabaseAdmin } = require("../db/supabaseAdmin");

// Verifies the Supabase access token the frontend sends in the
// Authorization header, and attaches { id, email } to req.user.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = { id: data.user.id, email: data.user.email };
  next();
}

module.exports = { requireAuth };
