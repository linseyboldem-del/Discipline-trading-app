const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { supabaseAdmin } = require("../db/supabaseAdmin");

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/coach/analyze
// body: { limit?: number }  -- how many recent trades to analyze, default 20
router.post("/analyze", async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.body?.limit) || 20, 100);

  const { data: trades, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .neq("outcome", "open")
    .order("trade_date", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  if (!trades || trades.length === 0) {
    return res.status(400).json({ error: "No closed trades to analyze yet." });
  }

  const { data: rules } = await supabaseAdmin
    .from("rules")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const tradesForPrompt = trades.map((t) => ({
    date: t.trade_date,
    pair: t.pair,
    direction: t.direction,
    session: t.session,
    model: t.model,
    risk_percent: t.risk_percent,
    planned_rr: t.planned_rr,
    realized_r: t.realized_r,
    outcome: t.outcome,
    emotion_before: t.emotion_before,
    emotion_after: t.emotion_after,
    followed_plan: t.followed_plan,
    rule_violations: t.rule_violations,
    notes: t.notes,
  }));

  const systemPrompt = `You are a blunt, data-driven trading performance coach reviewing a discretionary
gold (XAUUSD) ICT/SMC trader's journal. You are not a financial advisor and you give
no trade signals or predictions about future price. Your only job is behavioral and
statistical analysis of the trades given to you.

Structure your response in these sections, using plain text with clear headers, no markdown tables:
1. Headline pattern (the single most important thing to fix, in 1-2 sentences)
2. What's actually working (be specific: which session/model/setup has the best expectancy)
3. What's costing money (rule violations, emotional state correlations, oversized risk, revenge trading patterns)
4. One concrete, measurable change to make for the next 20 trades

Be direct and specific with numbers from the data. Do not pad with generic trading advice
that isn't grounded in the trades provided. If the sample size is small, say so explicitly
and caveat accordingly.`;

  const userPrompt = `User's configured rules: ${JSON.stringify(rules)}

Last ${trades.length} closed trades (most recent first):
${JSON.stringify(tradesForPrompt, null, 2)}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const feedback = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    await supabaseAdmin.from("coach_feedback").insert({
      user_id: userId,
      trade_ids: trades.map((t) => t.id),
      feedback,
    });

    res.json({ feedback, tradesAnalyzed: trades.length });
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(502).json({ error: "AI coach request failed. Try again shortly." });
  }
});

// GET /api/coach/history
router.get("/history", async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabaseAdmin
    .from("coach_feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
