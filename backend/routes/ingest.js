const express = require("express");
const { supabaseAdmin } = require("../db/supabaseAdmin");

const router = express.Router();

// POST /api/scanner/ingest
// body: { pair, timeframe, candles: [{ time, open, high, low, close, volume? }] }
// `time` may be an ISO string or epoch ms; either is normalized to timestamptz.
router.post("/", async (req, res) => {
  const { pair, timeframe, candles } = req.body || {};

  if (!pair || !timeframe || !Array.isArray(candles) || candles.length === 0) {
    return res.status(400).json({ error: "pair, timeframe, and a non-empty candles array are required" });
  }

  const rows = candles.map((c) => ({
    pair,
    timeframe,
    candle_time: new Date(c.time).toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? null,
  }));

  const { error } = await supabaseAdmin
    .from("market_candles")
    .upsert(rows, { onConflict: "pair,timeframe,candle_time" });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ingested: rows.length });
});

module.exports = router;
