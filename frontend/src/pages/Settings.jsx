import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const defaultRules = {
  max_risk_percent: 1.0,
  daily_loss_limit_percent: 3.0,
  max_trades_per_day: 3,
  min_risk_reward: 2.0,
  allowed_sessions: ["london", "ny_am", "ny_pm"],
  require_htf_bias: true,
  require_liquidity_sweep: true,
  cooldown_minutes_after_loss: 30,
};

const defaultScannerConfig = {
  pairs: ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100"],
  timeframes: ["D1", "H4", "M15"],
  min_grade_for_alert: "A",
  telegram_chat_id: "",
  telegram_enabled: false,
  scan_interval_minutes: 15,
};

const ALL_SESSIONS = ["asian", "london", "ny_am", "ny_pm", "other"];

export default function Settings() {
  const [rules, setRules] = useState(defaultRules);
  const [ruleId, setRuleId] = useState(null);
  const [scannerConfig, setScannerConfig] = useState(defaultScannerConfig);
  const [scannerExists, setScannerExists] = useState(false);
  const [scannerSaved, setScannerSaved] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.from("rules").select("*").eq("user_id", user.id).maybeSingle();
      if (error) setError(error.message);
      if (data) {
        setRules(data);
        setRuleId(data.id);
      }

      const { data: scannerRow, error: scannerErr } = await supabase
        .from("scanner_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (scannerErr) setScannerError(scannerErr.message);
      if (scannerRow) {
        setScannerConfig(scannerRow);
        setScannerExists(true);
      }

      setLoading(false);
    })();
  }, []);

  function set(field, value) {
    setRules((r) => ({ ...r, [field]: value }));
    setSaved(false);
  }

  function toggleSession(s) {
    const has = rules.allowed_sessions.includes(s);
    set("allowed_sessions", has ? rules.allowed_sessions.filter((x) => x !== s) : [...rules.allowed_sessions, s]);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = { ...rules, user_id: user.id };
    delete payload.id;
    delete payload.updated_at;

    const { error } = ruleId
      ? await supabase.from("rules").update(payload).eq("id", ruleId)
      : await supabase.from("rules").insert(payload);

    if (error) setError(error.message);
    else setSaved(true);
  }

  function setScanner(field, value) {
    setScannerConfig((c) => ({ ...c, [field]: value }));
    setScannerSaved(false);
  }

  function togglePair(p) {
    const has = scannerConfig.pairs.includes(p);
    setScanner("pairs", has ? scannerConfig.pairs.filter((x) => x !== p) : [...scannerConfig.pairs, p]);
  }

  function toggleTimeframe(tf) {
    const has = scannerConfig.timeframes.includes(tf);
    setScanner(
      "timeframes",
      has ? scannerConfig.timeframes.filter((x) => x !== tf) : [...scannerConfig.timeframes, tf]
    );
  }

  async function handleSaveScanner(e) {
    e.preventDefault();
    setScannerError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = { ...scannerConfig, user_id: user.id };
    delete payload.updated_at;

    const { error } = scannerExists
      ? await supabase.from("scanner_config").update(payload).eq("user_id", user.id)
      : await supabase.from("scanner_config").insert(payload);

    if (error) setScannerError(error.message);
    else {
      setScannerSaved(true);
      setScannerExists(true);
    }
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rules & Settings</h2>
        <p className="text-sm text-muted">
          These are enforced by the pre-trade checklist. Set them once, honestly, before you're in a trade.
        </p>
      </div>

      <form onSubmit={handleSave} className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max risk per trade (%)">
            <input
              type="number"
              step="0.1"
              className="input"
              value={rules.max_risk_percent}
              onChange={(e) => set("max_risk_percent", Number(e.target.value))}
            />
          </Field>
          <Field label="Daily loss limit (R)">
            <input
              type="number"
              step="0.1"
              className="input"
              value={rules.daily_loss_limit_percent}
              onChange={(e) => set("daily_loss_limit_percent", Number(e.target.value))}
            />
          </Field>
          <Field label="Max trades per day">
            <input
              type="number"
              className="input"
              value={rules.max_trades_per_day}
              onChange={(e) => set("max_trades_per_day", Number(e.target.value))}
            />
          </Field>
          <Field label="Minimum R:R required">
            <input
              type="number"
              step="0.1"
              className="input"
              value={rules.min_risk_reward}
              onChange={(e) => set("min_risk_reward", Number(e.target.value))}
            />
          </Field>
          <Field label="Cooldown after a loss (minutes)">
            <input
              type="number"
              className="input"
              value={rules.cooldown_minutes_after_loss}
              onChange={(e) => set("cooldown_minutes_after_loss", Number(e.target.value))}
            />
          </Field>
        </div>

        <div>
          <label className="label">Allowed sessions</label>
          <div className="flex flex-wrap gap-3">
            {ALL_SESSIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rules.allowed_sessions.includes(s)}
                  onChange={() => toggleSession(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rules.require_htf_bias}
              onChange={(e) => set("require_htf_bias", e.target.checked)}
            />
            Require HTF bias confirmation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rules.require_liquidity_sweep}
              onChange={(e) => set("require_liquidity_sweep", e.target.checked)}
            />
            Require liquidity sweep confirmation
          </label>
        </div>

        {error && <p className="text-bad text-sm">{error}</p>}
        {saved && <p className="text-good text-sm">Saved.</p>}

        <button type="submit" className="btn-primary">
          Save Rules
        </button>
      </form>

      <div>
        <h2 className="text-xl font-semibold">Scanner & Signals</h2>
        <p className="text-sm text-muted">
          Which pairs/timeframes the scanner watches, and how you're notified of Grade A setups.
        </p>
      </div>

      <form onSubmit={handleSaveScanner} className="card space-y-5">
        <div>
          <label className="label">Pairs to scan</label>
          <div className="flex flex-wrap gap-3">
            {["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "US30", "NAS100", "BTCUSD"].map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={scannerConfig.pairs.includes(p)} onChange={() => togglePair(p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Timeframes (HTF bias + entry)</label>
          <div className="flex flex-wrap gap-3">
            {["D1", "H4", "H1", "M15", "M5"].map((tf) => (
              <label key={tf} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scannerConfig.timeframes.includes(tf)}
                  onChange={() => toggleTimeframe(tf)}
                />
                {tf}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum grade for alerts">
            <select
              className="input"
              value={scannerConfig.min_grade_for_alert}
              onChange={(e) => setScanner("min_grade_for_alert", e.target.value)}
            >
              <option value="A">A only</option>
              <option value="B">B and above</option>
              <option value="C">C and above (noisy)</option>
            </select>
          </Field>
          <Field label="Scan interval (minutes)">
            <input
              type="number"
              className="input"
              value={scannerConfig.scan_interval_minutes}
              onChange={(e) => setScanner("scan_interval_minutes", Number(e.target.value))}
            />
          </Field>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              checked={scannerConfig.telegram_enabled}
              onChange={(e) => setScanner("telegram_enabled", e.target.checked)}
            />
            Send Grade A alerts to Telegram
          </label>
          <Field label="Telegram chat ID">
            <input
              className="input"
              placeholder="Message your bot once, then check /getUpdates for this"
              value={scannerConfig.telegram_chat_id || ""}
              onChange={(e) => setScanner("telegram_chat_id", e.target.value)}
            />
          </Field>
        </div>

        {scannerError && <p className="text-bad text-sm">{scannerError}</p>}
        {scannerSaved && <p className="text-good text-sm">Saved.</p>}

        <button type="submit" className="btn-primary">
          Save Scanner Settings
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
