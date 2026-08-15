// Grade A ("Unicorn-style"): multiple independent confluences stack at
// the same zone AND align with HTF bias AND fall inside a kill zone.
// This directly mirrors Part 4/6 of the manual — no single concept alone
// is ever graded A, by design.

function gradeSetup({
  htfBiasDirection, // 'bullish' | 'bearish' | 'ranging'
  structureShift, // from detectStructureShift
  sweep, // from detectLiquiditySweep
  orderBlock, // from findLatestOrderBlock
  breaker, // from findBreakerBlock
  fvg, // from findLatestFVG
  session, // from getSession
  plannedRR,
  minRR = 2,
}) {
  const confluences = [];
  let direction = null;

  if (sweep) {
    confluences.push(`Liquidity sweep (${sweep.direction})`);
    direction = sweep.direction;
  }
  if (structureShift) {
    confluences.push(`${structureShift.type} (${structureShift.direction})`);
    direction = direction || structureShift.direction;
  }
  if (orderBlock && (!direction || orderBlock.direction === direction)) {
    confluences.push(`Order Block (${orderBlock.direction})`);
    direction = direction || orderBlock.direction;
  }
  if (breaker?.invalidated && (!direction || breaker.direction === direction)) {
    confluences.push(`Breaker Block (${breaker.direction})`);
  }
  if (fvg && (!direction || fvg.direction === direction)) {
    confluences.push(`Fair Value Gap (${fvg.direction})`);
  }

  const fvgObOverlap =
    fvg && orderBlock && fvg.direction === orderBlock.direction &&
    fvg.bottom <= orderBlock.high && orderBlock.low <= fvg.top;
  if (fvgObOverlap) confluences.push("FVG/OB overlap (Unicorn-grade zone)");

  const biasAligned = direction && htfBiasDirection === direction;
  if (biasAligned) confluences.push(`HTF bias aligned (${htfBiasDirection})`);

  const inKillZone = ["london", "ny_am", "ny_pm"].includes(session);
  if (inKillZone) confluences.push(`Inside kill zone (${session})`);

  const rrOk = typeof plannedRR === "number" && plannedRR >= minRR;
  if (rrOk) confluences.push(`R:R ${plannedRR} meets minimum`);

  if (!direction) {
    return { grade: null, direction: null, confluences, reasons: ["No directional trigger found"] };
  }

  let score = 0;
  if (sweep) score += 1;
  if (structureShift) score += 1;
  if (orderBlock) score += 1;
  if (breaker?.invalidated) score += 1;
  if (fvg) score += 1;
  if (fvgObOverlap) score += 1;
  if (biasAligned) score += 1;
  if (inKillZone) score += 1;
  if (rrOk) score += 1;

  let grade;
  let model;
  if (score >= 7 && fvgObOverlap && biasAligned && inKillZone) {
    grade = "A";
    model = "unicorn";
  } else if (score >= 5 && biasAligned) {
    grade = "B";
    model = orderBlock ? "ob_fvg" : "breaker";
  } else if (score >= 2) {
    grade = "C";
    model = "other";
  } else {
    grade = null;
    model = null;
  }

  return { grade, model, direction, confluences, score };
}

module.exports = { gradeSetup };
