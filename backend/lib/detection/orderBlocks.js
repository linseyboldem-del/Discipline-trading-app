// Order Block = last opposite-colored candle before a displacement leg.
// Displacement = a candle whose range is meaningfully larger than the
// recent average range (a proxy for institutional participation).

function averageRange(candles, n = 14) {
  const slice = candles.slice(-n - 1, -1);
  if (slice.length === 0) return 0;
  return slice.reduce((s, c) => s + (c.high - c.low), 0) / slice.length;
}

function isBullish(c) {
  return c.close >= c.open;
}

/**
 * Finds the most recent displacement leg and the order block that
 * preceded it. Returns null if nothing qualifies.
 */
function findLatestOrderBlock(candles, displacementMultiplier = 1.8) {
  if (candles.length < 5) return null;
  const avgRange = averageRange(candles);
  if (avgRange === 0) return null;

  for (let i = candles.length - 1; i >= 2; i--) {
    const c = candles[i];
    const range = c.high - c.low;
    if (range >= avgRange * displacementMultiplier) {
      const displacementBullish = isBullish(c);
      // Walk backwards to find the last opposite-colored candle
      for (let j = i - 1; j >= 0; j--) {
        const prev = candles[j];
        const prevBullish = isBullish(prev);
        if (displacementBullish && !prevBullish) {
          return {
            direction: "bullish",
            index: j,
            high: prev.high,
            low: prev.low,
            displacementIndex: i,
            time: prev.time,
          };
        }
        if (!displacementBullish && prevBullish) {
          return {
            direction: "bearish",
            index: j,
            high: prev.high,
            low: prev.low,
            displacementIndex: i,
            time: prev.time,
          };
        }
        // Don't walk back further than a few candles — the OB should be
        // immediately adjacent to the displacement, not arbitrarily far.
        if (i - j > 4) break;
      }
    }
  }
  return null;
}

/**
 * A Breaker Block is a former Order Block that price has since closed
 * back through decisively — it flips role (support <-> resistance).
 */
function findBreakerBlock(candles, orderBlock) {
  if (!orderBlock) return null;
  const after = candles.slice(orderBlock.displacementIndex + 1);
  for (const c of after) {
    if (orderBlock.direction === "bullish" && c.close < orderBlock.low) {
      return { ...orderBlock, brokerConfirmedAt: c.time, invalidated: true };
    }
    if (orderBlock.direction === "bearish" && c.close > orderBlock.high) {
      return { ...orderBlock, brokerConfirmedAt: c.time, invalidated: true };
    }
  }
  return null;
}

module.exports = { findLatestOrderBlock, findBreakerBlock, averageRange };
