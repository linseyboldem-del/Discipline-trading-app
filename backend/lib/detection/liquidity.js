// Liquidity: resting stops above/below swing highs/lows, and equal
// highs/lows within a tolerance (both act as magnets for price).

function findLiquidityPools(swings, tolerancePercent = 0.05) {
  const pools = [];
  const highs = swings.filter((s) => s.type === "high");
  const lows = swings.filter((s) => s.type === "low");

  for (const group of [highs, lows]) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const diffPct = (Math.abs(group[i].price - group[j].price) / group[i].price) * 100;
        if (diffPct <= tolerancePercent) {
          pools.push({
            type: group[i].type === "high" ? "buy_side" : "sell_side",
            price: (group[i].price + group[j].price) / 2,
            equalPoints: [group[i], group[j]],
          });
        }
      }
    }
  }

  // Also treat the single most recent swing high/low as a liquidity pool
  // even without an equal match — it's still resting liquidity.
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  if (lastHigh) pools.push({ type: "buy_side", price: lastHigh.price, equalPoints: [lastHigh] });
  if (lastLow) pools.push({ type: "sell_side", price: lastLow.price, equalPoints: [lastLow] });

  return pools;
}

/**
 * A sweep = a candle wicks beyond a liquidity pool price but closes back
 * on the other side of it (classic stop-hunt signature).
 */
function detectLiquiditySweep(candles, pools) {
  if (candles.length === 0) return null;
  const recentCandles = candles.slice(-2);

  for (const last of recentCandles) {
    for (const pool of pools) {
      if (pool.type === "sell_side" && last.low < pool.price && last.close > pool.price) {
        return { pool, direction: "bullish", sweptPrice: pool.price, time: last.time };
      }
      if (pool.type === "buy_side" && last.high > pool.price && last.close < pool.price) {
        return { pool, direction: "bearish", sweptPrice: pool.price, time: last.time };
      }
    }
  }
  return null;
}

module.exports = { findLiquidityPools, detectLiquiditySweep };
