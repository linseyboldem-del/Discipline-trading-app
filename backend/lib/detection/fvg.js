// FVG: 3-candle imbalance. Bullish if candle1.high < candle3.low.
// Bearish if candle1.low > candle3.high.

function findLatestFVG(candles) {
  for (let i = candles.length - 1; i >= 2; i--) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    if (c1.high < c3.low) {
      return { direction: "bullish", top: c3.low, bottom: c1.high, index: i, time: c3.time };
    }
    if (c1.low > c3.high) {
      return { direction: "bearish", top: c1.low, bottom: c3.high, index: i, time: c3.time };
    }
  }
  return null;
}

function overlaps(rangeA, rangeB) {
  return rangeA.bottom <= rangeB.top && rangeB.bottom <= rangeA.top;
}

module.exports = { findLatestFVG, overlaps };
