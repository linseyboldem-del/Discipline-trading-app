// Pure candle-analysis functions. Candle shape: { time, open, high, low, close }

/**
 * Fractal-style swing detection: a candle is a swing high if its high is
 * the max within `lookback` candles on each side; swing low similarly.
 */
function findSwings(candles, lookback = 2) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const c = candles[i];
    const isHigh = window.every((w) => w.high <= c.high);
    const isLow = window.every((w) => w.low >= c.low);
    if (isHigh) swings.push({ index: i, type: "high", price: c.high, time: c.time });
    if (isLow) swings.push({ index: i, type: "low", price: c.low, time: c.time });
  }
  return swings;
}

/**
 * Reads the last few swings to infer current trend: bullish if the most
 * recent high/low pair are both higher than the prior pair (HH+HL);
 * bearish if both lower (LL+LH); otherwise 'ranging'.
 */
function inferTrend(swings) {
  const highs = swings.filter((s) => s.type === "high").slice(-2);
  const lows = swings.filter((s) => s.type === "low").slice(-2);
  if (highs.length < 2 || lows.length < 2) return "ranging";

  const higherHigh = highs[1].price > highs[0].price;
  const higherLow = lows[1].price > lows[0].price;
  const lowerHigh = highs[1].price < highs[0].price;
  const lowerLow = lows[1].price < lows[0].price;

  if (higherHigh && higherLow) return "bullish";
  if (lowerLow && lowerHigh) return "bearish";
  return "ranging";
}

/**
 * Looks for the most recent Break of Structure (continuation) or Change
 * of Character (reversal) by checking whether the latest close breaks
 * the most recent relevant swing point.
 */
function detectStructureShift(candles, swings) {
  if (candles.length === 0 || swings.length < 2) return null;
  const trend = inferTrend(swings);
  const recentCandles = candles.slice(-2);

  const lastSwingHigh = [...swings].reverse().find((s) => s.type === "high");
  const lastSwingLow = [...swings].reverse().find((s) => s.type === "low");

  for (const last of recentCandles) {
    if (trend === "bullish" && lastSwingHigh && last.close > lastSwingHigh.price) {
      return { type: "BOS", direction: "bullish", brokenLevel: lastSwingHigh.price, time: last.time };
    }
    if (trend === "bearish" && lastSwingLow && last.close < lastSwingLow.price) {
      return { type: "BOS", direction: "bearish", brokenLevel: lastSwingLow.price, time: last.time };
    }
    if (trend === "bullish" && lastSwingLow && last.close < lastSwingLow.price) {
      return { type: "CHoCH", direction: "bearish", brokenLevel: lastSwingLow.price, time: last.time };
    }
    if (trend === "bearish" && lastSwingHigh && last.close > lastSwingHigh.price) {
      return { type: "CHoCH", direction: "bullish", brokenLevel: lastSwingHigh.price, time: last.time };
    }
  }
  return null;
}

module.exports = { findSwings, inferTrend, detectStructureShift };
