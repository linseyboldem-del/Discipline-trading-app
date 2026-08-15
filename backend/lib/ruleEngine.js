// Pure logic, no I/O — easy to unit test and easy to reuse if you ever
// want the same checks running inside Aethelgard or a Pine Script alert
// (as a manual cross-check) later.

/**
 * @param {object} rules - row from the `rules` table
 * @param {object} input - {
 *   plannedRiskPercent, plannedRR, session, htfBiasConfirmed,
 *   liquiditySweepConfirmed, tradesTakenToday, dailyRSoFar,
 *   minutesSinceLastLoss
 * }
 */
function evaluateChecklist(rules, input) {
  const blocked = [];
  const warnings = [];

  if (input.plannedRiskPercent > rules.max_risk_percent) {
    blocked.push(
      `Planned risk ${input.plannedRiskPercent}% exceeds your max of ${rules.max_risk_percent}%.`
    );
  }

  if (input.plannedRR < rules.min_risk_reward) {
    blocked.push(
      `Planned R:R ${input.plannedRR} is below your minimum of ${rules.min_risk_reward}.`
    );
  }

  if (!rules.allowed_sessions.includes(input.session)) {
    blocked.push(`${input.session} is not in your allowed kill zones.`);
  }

  if (rules.require_htf_bias && !input.htfBiasConfirmed) {
    blocked.push("HTF bias not confirmed before entry.");
  }

  if (rules.require_liquidity_sweep && !input.liquiditySweepConfirmed) {
    blocked.push("No liquidity sweep confirmed before entry.");
  }

  if (input.tradesTakenToday >= rules.max_trades_per_day) {
    blocked.push(
      `You've already taken ${input.tradesTakenToday} trades today (limit ${rules.max_trades_per_day}).`
    );
  }

  const lossLimitR = -Math.abs(rules.daily_loss_limit_percent);
  if (input.dailyRSoFar <= lossLimitR) {
    blocked.push(
      `Daily loss limit reached (${input.dailyRSoFar}R vs limit ${lossLimitR}R). Stop for today.`
    );
  }

  if (
    typeof input.minutesSinceLastLoss === "number" &&
    input.minutesSinceLastLoss < rules.cooldown_minutes_after_loss
  ) {
    warnings.push(
      `Only ${input.minutesSinceLastLoss}m since your last loss — cooldown is ${rules.cooldown_minutes_after_loss}m. Consider waiting.`
    );
  }

  if (input.emotionBefore && ["revenge", "tilted", "fomo"].includes(input.emotionBefore)) {
    warnings.push(
      `You logged your pre-trade state as "${input.emotionBefore}". This is exactly the state most rule violations happen in.`
    );
  }

  return {
    passed: blocked.length === 0,
    blocked,
    warnings,
  };
}

module.exports = { evaluateChecklist };
