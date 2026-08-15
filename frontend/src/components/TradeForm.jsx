import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MODELS = ["silver_bullet", "ob_fvg", "judas_ote", "breaker", "unicorn", "other"];
const SESSIONS = ["asian", "london", "ny_am", "ny_pm", "other"];
const EMOTIONS = ["calm", "confident", "anxious", "fomo", "revenge", "tilted", "bored"];

const blank = {
  trade_date: new Date().toISOString().slice(0, 10),
  pair: "XAUUSD",
  direction: "long",
  session: "london",
  model: "ob_fvg",
  entry: "",
  stop_loss: "",
  take_profit: "",
  risk_percent: 1,
  planned_rr: 2,
  realized_r: "",
  outcome: "open",
  emotion_before: "calm",
  emotion_after: "",
  followed_plan: true,
  notes: "",
};

export default function TradeForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        ...form,
        user_id: user.id,
        entry: form.entry === "" ? null : Number(form.entry),
        stop_loss: form.stop_loss === "" ? null : Number(form.stop_loss),
        take_profit: form.take_profit === "" ? null : Number(form.take_profit),
        realized_r: form.realized_r === "" ? null : Number(form.realized_r),
        risk_percent: Number(form.risk_percent),
        planned_rr: Number(form.planned_rr),
      };

      const { error } = await supabase.from("trades").insert(payload);
      if (error) throw error;
      setForm(blank);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Date">
          <input type="date" className="input" value={form.trade_date} onChange={(e) => set("trade_date", e.target.value)} />
        </Field>
        <Field label="Pair">
          <input className="input" value={form.pair} onChange={(e) => set("pair", e.target.value)} />
        </Field>
        <Field label="Direction">
          <select className="input" value={form.direction} onChange={(e) => set("direction", e.target.value)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Session">
          <select className="input" value={form.session} onChange={(e) => set("session", e.target.value)}>
            {SESSIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Entry Model">
          <select className="input" value={form.model} onChange={(e) => set("model", e.target.value)}>
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Outcome">
          <select className="input" value={form.outcome} onChange={(e) => set("outcome", e.target.value)}>
            <option value="open">Open</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
        </Field>
        <Field label="Entry Price">
          <input type="number" step="0.01" className="input" value={form.entry} onChange={(e) => set("entry", e.target.value)} />
        </Field>
        <Field label="Stop Loss">
          <input type="number" step="0.01" className="input" value={form.stop_loss} onChange={(e) => set("stop_loss", e.target.value)} />
        </Field>
        <Field label="Take Profit">
          <input type="number" step="0.01" className="input" value={form.take_profit} onChange={(e) => set("take_profit", e.target.value)} />
        </Field>
        <Field label="Risk %">
          <input type="number" step="0.1" className="input" value={form.risk_percent} onChange={(e) => set("risk_percent", e.target.value)} />
        </Field>
        <Field label="Planned R:R">
          <input type="number" step="0.1" className="input" value={form.planned_rr} onChange={(e) => set("planned_rr", e.target.value)} />
        </Field>
        <Field label="Realized R (fill on close)">
          <input type="number" step="0.1" className="input" value={form.realized_r} onChange={(e) => set("realized_r", e.target.value)} />
        </Field>
        <Field label="Emotion before">
          <select className="input" value={form.emotion_before} onChange={(e) => set("emotion_before", e.target.value)}>
            {EMOTIONS.map((em) => (
              <option key={em} value={em}>{em}</option>
            ))}
          </select>
        </Field>
        <Field label="Emotion after">
          <select className="input" value={form.emotion_after} onChange={(e) => set("emotion_after", e.target.value)}>
            <option value="">—</option>
            {EMOTIONS.map((em) => (
              <option key={em} value={em}>{em}</option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.followed_plan} onChange={(e) => set("followed_plan", e.target.checked)} />
        I followed my own plan on this trade
      </label>

      {error && <p className="text-bad text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving..." : "Save Trade"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
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
