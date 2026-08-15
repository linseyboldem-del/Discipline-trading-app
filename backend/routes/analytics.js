const express = require("express");
const { supabaseAdmin } = require("../db/supabaseAdmin");

const router = express.Router();

// GET /api/analytics/summary
router.get("/summary", async (req, res) => {
  const userId = req.user.id;

  const { data: trades, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .neq("outcome", "open")
    .order("trade_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const closed = trades || [];
  const wins = closed.filter((t) => t.outcome === "win");
  const losses = closed.filter((t) => t.outcome === "loss");
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgR = closed.length
    ? closed.reduce((s, t) => s + Number(t.realized_r || 0), 0) / closed.length
    : 0;

  let equity = 0;
  const equityCurve = closed.map((t) => {
    equity += Number(t.realized_r || 0);
    return { date: t.trade_date, cumulativeR: Number(equity.toFixed(2)) };
  });

  const bySession = {};
  const byModel = {};
  for (const t of closed) {
    const s = (bySession[t.session] ||= { count: 0, wins: 0, totalR: 0 });
    s.count += 1;
    s.totalR += Number(t.realized_r || 0);
    if (t.outcome === "win") s.wins += 1;

    if (t.model) {
      const m = (byModel[t.model] ||= { count: 0, wins: 0, totalR: 0 });
      m.count += 1;
      m.totalR += Number(t.realized_r || 0);
      if (t.outcome === "win") m.wins += 1;
    }
  }

  const violationRate = closed.length
    ? (closed.filter((t) => (t.rule_violations || []).length > 0).length / closed.length) * 100
    : 0;

  res.json({
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRatePercent: Number(winRate.toFixed(1)),
    avgR: Number(avgR.toFixed(2)),
    totalR: Number(equity.toFixed(2)),
    violationRatePercent: Number(violationRate.toFixed(1)),
    equityCurve,
    bySession,
    byModel,
  });
});

module.exports = router;
