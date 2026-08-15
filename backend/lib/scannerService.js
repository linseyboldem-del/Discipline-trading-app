const { supabaseAdmin } = require("../db/supabaseAdmin");
const { analyzePair } = require("./detection");
const { sendTelegramMessage, formatSignalMessage } = require("./telegram");

async function loadCandles(pair, timeframe, limit = 150) {
  const { data, error } = await supabaseAdmin
    .from("market_candles")
    .select("candle_time, open, high, low, close, volume")
    .eq("pair", pair)
    .eq("timeframe", timeframe)
    .order("candle_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || [])
    .map((c) => ({
      time: c.candle_time,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume,
    }))
    .reverse();
}

async function runScanForUser(userId) {
  const { data: config, error: configErr } = await supabaseAdmin
    .from("scanner_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (configErr) throw new Error(configErr.message);
  if (!config) throw new Error("No scanner_config found for this user. Set it up in Settings first.");

  const results = [];

  for (const pair of config.pairs) {
    const candlesByTimeframe = {};
    for (const tf of config.timeframes) {
      candlesByTimeframe[tf] = await loadCandles(pair, tf);
    }

    const result = analyzePair(pair, candlesByTimeframe, { minRR: 1.5 });
    results.push(result);

    if (result.skipped) continue;

    const { error: insertErr, data: inserted } = await supabaseAdmin
      .from("signals")
      .upsert(
        {
          user_id: userId,
          pair: result.pair,
          direction: result.direction === "bullish" ? "long" : "short",
          grade: result.grade,
          model: result.model,
          htf_bias: result.htfBias,
          session: result.session,
          entry: result.entry,
          stop_loss: result.stopLoss,
          take_profit: result.takeProfit,
          planned_rr: result.plannedRR,
          confluences: result.confluences,
          reasoning: result.reasoning,
          candle_time: new Date(result.candleTime).toISOString(),
        },
        { onConflict: "user_id,pair,model,candle_time", ignoreDuplicates: true }
      )
      .select()
      .maybeSingle();

    if (insertErr) {
      console.error(`Failed to insert signal for ${pair}:`, insertErr.message);
      continue;
    }

    if (inserted && !inserted.notified) {
      const gradeRank = { A: 3, B: 2, C: 1 };
      const shouldNotify =
        config.telegram_enabled &&
        config.telegram_chat_id &&
        gradeRank[inserted.grade] >= gradeRank[config.min_grade_for_alert];

      if (shouldNotify) {
        await sendTelegramMessage(config.telegram_chat_id, formatSignalMessage(result));
        await supabaseAdmin.from("signals").update({ notified: true }).eq("id", inserted.id);
      }
    }
  }

  return results;
}

module.exports = { runScanForUser, loadCandles };