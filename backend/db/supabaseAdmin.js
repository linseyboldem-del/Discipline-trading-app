// Server-side Supabase client using the SERVICE ROLE key.
// NEVER expose this key to the frontend. It bypasses RLS, which is why
// every function that uses it must manually filter by user_id.
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabaseAdmin };
