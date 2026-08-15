// The Python MT5 bridge is a trusted machine-to-machine caller, not a
// browser session, so it authenticates with a static shared secret
// instead of a Supabase user JWT.

function requireScannerKey(req, res, next) {
  const key = req.headers["x-scanner-key"];
  if (!key || key !== process.env.SCANNER_INGEST_KEY) {
    return res.status(401).json({ error: "Invalid or missing scanner key" });
  }
  next();
}

module.exports = { requireScannerKey };
