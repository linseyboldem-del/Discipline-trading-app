// Minimal Telegram Bot API wrapper. Create a bot via @BotFather, put the
// token in TELEGRAM_BOT_TOKEN, and the user's chat_id goes in their
// scanner_config row (get it by messaging the bot once and calling
// https://api.telegram.org/bot<token>/getUpdates).

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN not set, skipping send.");
    return { skipped: true };
  }
  if (!chatId) {
    console.warn("[telegram] No chat_id configured for this user, skipping send.");
    return { skipped: true };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[telegram] send failed:", res.status, body);
    return { ok: false };
  }
  return { ok: true };
}

function formatSignalMessage(signal) {
  const dir = signal.direction === "bullish" ? "LONG" : "SHORT";
  const lines = [
    `*Grade ${signal.grade} Setup — ${signal.pair}*`,
    `${dir} · model: ${signal.model} · session: ${signal.session}`,
    `Entry: ${signal.entry}`,
    signal.stopLoss ? `SL: ${signal.stopLoss.toFixed(2)}` : null,
    signal.takeProfit ? `TP: ${signal.takeProfit.toFixed(2)}` : null,
    signal.plannedRR ? `R:R: ${signal.plannedRR}` : null,
    "",
    "Confluences:",
    ...signal.confluences.map((c) => `• ${c}`),
    "",
    "_Heuristic detection — run this through your own pre-trade checklist before acting._",
  ].filter(Boolean);
  return lines.join("\n");
}

module.exports = { sendTelegramMessage, formatSignalMessage };
