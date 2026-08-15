import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Brain, Sparkles } from "lucide-react";

export default function Coach() {
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.coachHistory().then(setHistory).catch(() => {});
  }, []);

  async function analyze() {
    setBusy(true);
    setError("");
    setFeedback(null);
    try {
      const r = await api.analyzeTrades(20);
      setFeedback(r.feedback);
      const h = await api.coachHistory();
      setHistory(h);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="text-gold" size={22} /> AI Coach
          </h2>
          <p className="text-sm text-muted">
            Analyzes your last 20 closed trades for patterns you can't see from inside your own head.
          </p>
        </div>
        <button onClick={analyze} disabled={busy} className="btn-primary flex items-center gap-2">
          <Sparkles size={16} /> {busy ? "Analyzing..." : "Analyze Last 20 Trades"}
        </button>
      </div>

      {error && <p className="text-bad">{error}</p>}

      {feedback && (
        <div className="card whitespace-pre-wrap leading-relaxed text-sm">{feedback}</div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="font-medium mb-3 text-muted">Previous reviews</h3>
          <div className="space-y-3">
            {history.map((h) => (
              <details key={h.id} className="card">
                <summary className="cursor-pointer text-sm text-muted">
                  {new Date(h.created_at).toLocaleString()} — {h.trade_ids.length} trades analyzed
                </summary>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{h.feedback}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
