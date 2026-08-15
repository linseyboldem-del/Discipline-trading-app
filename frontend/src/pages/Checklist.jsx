import { useState } from "react";
import { api } from "../lib/api";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const SESSIONS = ["asian", "london", "ny_am", "ny_pm", "other"];
const EMOTIONS = ["calm", "confident", "anxious", "fomo", "revenge", "tilted", "bored"];

const initialForm = {
  session: "london",
  plannedRiskPercent: 1,
  plannedRR: 2,
  htfBiasConfirmed: false,
  liquiditySweepConfirmed: false,
  emotionBefore: "calm",
};

export default function Checklist() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api.runChecklist(form);
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Pre-Trade Checklist</h2>
        <p className="text-sm text-muted">Run this before every entry. If it says stop, stop.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Session / Kill Zone</label>
            <select className="input" value={form.session} onChange={(e) => set("session", e.target.value)}>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Emotional state right now</label>
            <select
              className="input"
              value={form.emotionBefore}
              onChange={(e) => set("emotionBefore", e.target.value)}
            >
              {EMOTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Planned risk %</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.plannedRiskPercent}
              onChange={(e) => set("plannedRiskPercent", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Planned R:R</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.plannedRR}
              onChange={(e) => set("plannedRR", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.htfBiasConfirmed}
              onChange={(e) => set("htfBiasConfirmed", e.target.checked)}
            />
            HTF bias confirmed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.liquiditySweepConfirmed}
              onChange={(e) => set("liquiditySweepConfirmed", e.target.checked)}
            />
            Liquidity sweep confirmed
          </label>
        </div>

        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Checking..." : "Run Checklist"}
        </button>
      </form>

      {error && <p className="text-bad">{error}</p>}

      {result && (
        <div className={`card border-2 ${result.passed ? "border-good" : "border-bad"}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.passed ? (
              <ShieldCheck className="text-good" />
            ) : (
              <ShieldX className="text-bad" />
            )}
            <h3 className="font-semibold text-lg">{result.passed ? "Clear to trade" : "Do not take this trade"}</h3>
          </div>

          {result.blocked.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase text-bad font-medium mb-1">Blocking issues</p>
              <ul className="list-disc list-inside text-sm text-muted space-y-1">
                {result.blocked.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <p className="text-xs uppercase text-warn font-medium mb-1 flex items-center gap-1">
                <ShieldAlert size={14} /> Warnings
              </p>
              <ul className="list-disc list-inside text-sm text-muted space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
