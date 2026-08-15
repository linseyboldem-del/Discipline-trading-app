const { findSwings, inferTrend, detectStructureShift } = require("./structure");
const { findLiquidityPools, detectLiquiditySweep } = require("./liquidity");
const { findLatestOrderBlock, findBreakerBlock } = require("./orderBlocks");
const { findLatestFVG } = require("./fvg");
const { getSession } = require("./killzone");
const { gradeSetup } = require("./grading");

/**
 * @param {object} candlesByTimeframe - { D1: [...], H4: [...], M15: [...] }
 * @param {object} opts - { minRR }
 * @returns signal candidate object, or null if nothing qualifies
 */
function analyzePair(pair, candlesByTimeframe, opts = {}) {
  const htfCandles = candlesByTimeframe.D1?.length ? candlesByTimeframe.D1 : candlesByTimeframe.H4;
  const entryCandles = candlesByTimeframe.M15 || candlesByTimeframe.H1;

  if (!htfCandles || htfCandles.length < 10 || !entryCandles || entryCandles.length < 10) {
    return { pair, skipped: true, reason: "Insufficient candle history" };
  }

  const htfSwings = findSwings(htfCandles);
  const htfBiasDirection = inferTrend(htfSwings);

  const swings = findSwings(entryCandles);
  const structureShift = detectStructureShift(entryCandles, swings);
  const pools = findLiquidityPools(swings);
  const sweep = detectLiquiditySweep(entryCandles, pools);
  const orderBlock = findLatestOrderBlock(entryCandles);
  const breaker = findBreakerBlock(entryCandles, orderBlock);
  const fvg = findLatestFVG(entryCandles);

  const lastCandle = entryCandles[entryCandles.length - 1];
  const session = getSession(new Date(lastCandle.time));

  // Rough entry/SL/TP: entry at last close, SL beyond the OB or the
  // structure break level, TP at the next opposing liquidity pool.
  let entry = lastCandle.close;
  let stopLoss = null;
  let takeProfit = null;

  const direction = sweep?.direction || structureShift?.direction || orderBlock?.direction;

  if (direction === "bullish") {
    stopLoss = orderBlock ? orderBlock.low * 0.999 : sweep ? sweep.sweptPrice * 0.998 : null;
    const targets = pools.filter((p) => p.type === "buy_side" && p.price > entry).sort((a, b) => a.price - b.price);
    takeProfit = targets[0]?.price ?? null;
  } else if (direction === "bearish") {
    stopLoss = orderBlock ? orderBlock.high * 1.001 : sweep ? sweep.sweptPrice * 1.002 : null;
    const targets = pools.filter((p) => p.type === "sell_side" && p.price < entry).sort((a, b) => b.price - a.price);
    takeProfit = targets[0]?.price ?? null;
  }

  let plannedRR = null;
  if (stopLoss && takeProfit) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    if (risk > 0) plannedRR = Number((reward / risk).toFixed(2));
  }

  const graded = gradeSetup({
    htfBiasDirection,
    structureShift,
    sweep,
    orderBlock,
    breaker,
    fvg,
    session,
    plannedRR,
    minRR: opts.minRR ?? 2,
  });

  if (!graded.grade) {
    return { pair, skipped: true, reason: "No qualifying setup", details: graded };
  }

  return {
    pair,
    skipped: false,
    direction: graded.direction,
    grade: graded.grade,
    model: graded.model,
    htfBias: htfBiasDirection,
    session,
    entry,
    stopLoss,
    takeProfit,
    plannedRR,
    confluences: graded.confluences,
    candleTime: lastCandle.time,
  };
}

module.exports = { analyzePair };
