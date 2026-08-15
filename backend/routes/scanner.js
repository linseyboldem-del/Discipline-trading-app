const express = require("express");
const { supabaseAdmin } = require("../db/supabaseAdmin");
const { runScanForUser } = require("../lib/scannerService");

const router = express.Router();

// POST /api/scanner/run  — manually trigger a scan for the logged-in user
router.post("/run", async (req, res) => {
  try {
    const results = await runScanForUser(req.user.id);
    res.json({ results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/scanner/signals?grade=A&limit=50
router.get("/signals", async (req, res) => {
  const userId = req.user.id;
  const { grade, limit = 50 } = req.query;

  let query = supabaseAdmin
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (grade) query = query.eq("grade", grade);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/scanner/signals/:id  — mark a signal acted_on / skipped
router.patch("/signals/:id", async (req, res) => {
  const userId = req.user.id;
  const { status } = req.body || {};
  if (!["acted_on", "skipped", "expired", "new"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const { error } = await supabaseAdmin
    .from("signals")
    .update({ status })
    .eq("id", req.params.id)
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
