const express = require("express");
const { supabaseAdmin } = require("../db/supabaseAdmin");
const { evaluateChecklist } = require("../lib/ruleEngine");

const router = express.Router();

// POST /api/checklist
// body: { plannedRiskPercent, plannedRR, session, htfBiasConfirmed,
//         liquiditySweepConfirmed, emotionBefore, tradeId? }
router.post("/", async (req, res) => {
  const userId = req.user.id;
  const input = req.body || {};

  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from("rules")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (rulesErr) return res.status(500).json({ error: rulesErr.message });
  if (!rules) return res.status(400).json({ error: "No rules configured yet. Set them up in Settings first." });

  const today = new Date().toISOString().slice(0, 10);

  const { data: summaryRows, error: summaryErr } = await supabaseAdmin
    .from("daily_r_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("trade_date", today)
    .maybeSingle();

  if (summaryErr) return res.status(500).json({ error: summaryErr.message });

  const { data: lastLoss } = await supabaseAdmin
    .from("trades")
    .select("created_at")
    .eq("user_id", userId)
    .eq("outcome", "loss")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const minutesSinceLastLoss = lastLoss
    ? Math.round((Date.now() - new Date(lastLoss.created_at).getTime()) / 60000)
    : null;

  const result = evaluateChecklist(rules, {
    plannedRiskPercent: Number(input.plannedRiskPercent ?? 0),
    plannedRR: Number(input.plannedRR ?? 0),
    session: input.session,
    htfBiasConfirmed: Boolean(input.htfBiasConfirmed),
    liquiditySweepConfirmed: Boolean(input.liquiditySweepConfirmed),
    tradesTakenToday: summaryRows?.trade_count ?? 0,
    dailyRSoFar: Number(summaryRows?.total_r ?? 0),
    minutesSinceLastLoss,
    emotionBefore: input.emotionBefore,
  });

  const { error: logErr } = await supabaseAdmin.from("checklist_logs").insert({
    user_id: userId,
    trade_id: input.tradeId || null,
    answers: input,
    passed: result.passed,
    blocked_reasons: result.blocked,
  });
  if (logErr) console.error("Failed to log checklist run:", logErr.message);

  res.json(result);
});

module.exports = router;
