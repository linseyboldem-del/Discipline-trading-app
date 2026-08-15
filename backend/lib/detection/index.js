const { findSwings, inferTrend, detectStructureShift } = require("./structure");
const { findLiquidityPools, detectLiquiditySweep } = require("./liquidity");
const { findLatestOrderBlock, findBreakerBlock } = require("./orderBlocks");
const { findLatestFVG } = require("./fvg");
const { getSession } = require("./killzone");
const { gradeSetup } = require("./grading");

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

  const minRR = opts.minRR ?? 2;

  const graded = gradeSetup({
    htfBiasDirection,
    structureShift,
    sweep,
    orderBlock,
    breaker,
    fvg,
    session,
    plannedRR,
    minRR,
  });

  if (!graded.grade) {
    return { pair, skipped: true, reason: "No qualifying setup", details: graded };
  }

  const reasoning = {
    htfBias: {
      direction: htfBiasDirection,
      basis: `${candlesByTimeframe.D1?.length ? "Daily" : "H4"} swing structure (last ${htfSwings.length} swing points)`,
    },
    session: { name: session, inKillZone: ["london", "ny_am", "ny_pm"].includes(session) },
    structureShift: structureShift
      ? {
          type: structureShift.type,
          direction: structureShift.direction,
          brokenLevel: Number(structureShift.brokenLevel.toFixed(5)),
          detail:
            structureShift.type === "BOS"
              ? `Price closed beyond the prior swing ${structureShift.direction === "bullish" ? "high" : "low"} at ${structureShift.brokenLevel.toFixed(5)}, continuing the existing trend.`
              : `Price broke structure against the prevailing trend at ${structureShift.brokenLevel.toFixed(5)} — first sign of a possible reversal.`,
        }
      : null,
    liquiditySweep: sweep
      ? {
          direction: sweep.direction,
          sweptPrice: Number(sweep.sweptPrice.toFixed(5)),
          poolType: sweep.pool.type,
          detail: `Price wicked through resting ${sweep.pool.type === "sell_side" ? "sell-side" : "buy-side"} liquidity at ${sweep.sweptPrice.toFixed(5)} and closed back on the other side — classic stop-hunt signature.`,
        }
      : null,
    orderBlock: orderBlock
      ? {
          direction: orderBlock.direction,
          zone: [Number(orderBlock.low.toFixed(5)), Number(orderBlock.high.toFixed(5))],
          detail: `Last ${orderBlock.direction === "bullish" ? "down" : "up"}-close candle before a displacement leg, zone ${orderBlock.low.toFixed(5)}–${orderBlock.high.toFixed(5)}.`,
        }
      : null,
    breaker:
      breaker?.invalidated
        ? {
            direction: breaker.direction,
            zone: [Number(breaker.low.toFixed(5)), Number(breaker.high.toFixed(5))],
            detail: `Former order block was closed through and has flipped role — price later returned to retest it as a breaker.`,
          }
        : null,
    fvg: fvg
      ? {
          direction: fvg.direction,
          zone: [Number(fvg.bottom.toFixed(5)), Number(fvg.top.toFixed(5))],
          detail: `3-candle imbalance between ${fvg.bottom.toFixed(5)} and ${fvg.top.toFixed(5)} — price is expected to react here before continuing.`,
        }
      : null,
    riskReward: {
      planned: plannedRR,
      minimumRequired: minRR,
      meetsMinimum: typeof plannedRR === "number" && plannedRR >= minRR,
    },
    score: graded.score,
    gradeExplanation:
      graded.grade === "A"
        ? "Grade A: stacked confluence (FVG/OB overlap) + HTF bias aligned + inside a kill zone — the highest-conviction combination this scanner looks for."
        : graded.grade === "B"
        ? "Grade B: partial confluence with HTF bias alignment, but missing the full stack (e.g. no FVG/OB overlap, or outside a kill zone)."
        : "Grade C: a single confluence factor only — treat as noise-level, mostly useful for tuning the scanner, not for trading.",
  };

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
    reasoning,
    candleTime: lastCandle.time,
  };
}

module.exports = { analyzePair };