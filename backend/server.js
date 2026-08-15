require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { requireAuth } = require("./middleware/requireAuth");
const { requireScannerKey } = require("./middleware/requireScannerKey");
const checklistRoute = require("./routes/checklist");
const coachRoute = require("./routes/coach");
const analyticsRoute = require("./routes/analytics");
const ingestRoute = require("./routes/ingest");
const scannerRoute = require("./routes/scanner");
const { startScheduler } = require("./lib/scheduler");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

// Machine-to-machine: authenticated via shared secret, not user session
app.use("/api/scanner/ingest", requireScannerKey, ingestRoute);

// Everything below requires a valid Supabase session token
app.use("/api/checklist", requireAuth, checklistRoute);
app.use("/api/coach", requireAuth, coachRoute);
app.use("/api/analytics", requireAuth, analyticsRoute);
app.use("/api/scanner", requireAuth, scannerRoute);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`EdgeFlo backend listening on :${PORT}`);
  if (process.env.ENABLE_SCANNER_SCHEDULER !== "false") {
    startScheduler(Number(process.env.SCAN_INTERVAL_MINUTES) || 15);
  }
});
