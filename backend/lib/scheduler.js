const { supabaseAdmin } = require("../db/supabaseAdmin");
const { runScanForUser } = require("./scannerService");

let timer = null;

async function tick() {
  const { data: configs, error } = await supabaseAdmin.from("scanner_config").select("user_id, scan_interval_minutes");
  if (error) {
    console.error("[scheduler] Failed to load scanner configs:", error.message);
    return;
  }

  for (const cfg of configs || []) {
    try {
      const results = await runScanForUser(cfg.user_id);
      const produced = results.filter((r) => !r.skipped);
      if (produced.length > 0) {
        console.log(`[scheduler] ${produced.length} signal(s) for user ${cfg.user_id}`);
      }
    } catch (err) {
      console.error(`[scheduler] Scan failed for user ${cfg.user_id}:`, err.message);
    }
  }
}

// Runs every `intervalMinutes` — a single global interval is fine for a
// personal, low-user-count tool; per-user custom intervals would need a
// per-user timer, which isn't worth the complexity here.
function startScheduler(intervalMinutes = 15) {
  if (timer) clearInterval(timer);
  console.log(`[scheduler] Starting scanner loop every ${intervalMinutes} minute(s).`);
  timer = setInterval(tick, intervalMinutes * 60 * 1000);
  // Run once shortly after boot too, so signals aren't stale on a fresh deploy.
  setTimeout(tick, 15 * 1000);
}

module.exports = { startScheduler };
