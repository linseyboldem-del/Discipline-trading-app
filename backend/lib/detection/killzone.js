// Determines which ICT kill zone a given timestamp falls into, based on
// New York local time (matches the manual's Part 2 session windows).

function getNySessionParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  return { hour: Number(hourPart.value) };
}

function getSession(date = new Date()) {
  const { hour } = getNySessionParts(date);
  if (hour >= 20 || hour < 0) return "asian";
  if (hour >= 2 && hour < 5) return "london";
  if (hour >= 7 && hour < 10) return "ny_am";
  if (hour >= 13 && hour < 16) return "ny_pm";
  return "other";
}

function isKillZone(date = new Date()) {
  return ["london", "ny_am", "ny_pm"].includes(getSession(date));
}

module.exports = { getSession, isKillZone };
