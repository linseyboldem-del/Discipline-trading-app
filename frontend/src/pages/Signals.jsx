import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Zap, RefreshCw, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const GRADE_STYLES = {
  A: "border-good text-good",
  B: "border-warn text-warn",
  C: "border-gray-500 text-gray-400",
};

export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  async function loadSignals() {
    setLoading(true);
    try {
      const data = await api.listSignals(gradeFilter || undefined);
      setSignals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeFilter]);

  async function handleScanNow() {
    setScanning(true);
    setError("");
    try {
      await api.runScan();
      await loadSignals();
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(id, status) {
    await api.updateSignalStatus(id, status);
    loadSignals();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="text-gold" size={22} /> Signals
          </h2>
          <p className="text-sm text-gray-500">
            Heuristic ICT/SMC confluence scan. Grade A requires stacked confluence, HTF bias
            alignment, and kill-zone timing — still run these through your own checklist.
          </p>
        </div>
        <button onClick={handleScanNow} disabled={scanning} className="btn-primary flex items-center gap-2">
          <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      <div className="flex gap-2">
        {["", "A", "B", "C"].map((g) => (
          <button
            key={g || "all"}
            onClick={() => setGradeFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              gradeFilter === g ? "bg-gold text-ink border-gold" : "border-line text-gray-400"
            }`}
          >
            {g ? `Grade ${g}` : "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-bad">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : signals.length === 0 ? (
        <p className="text-gray-500">
          No signals yet. Make sure your MT5 bridge is pushing candles, and Rules & Settings has
          your scanner config saved.
        </p>
      ) : (
        <div className="space-y-4">
          {signals.map((s) => (
            <div key={s.id} className={`card border-2 ${GRADE_STYLES[s.grade] || "border-line"}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {s.direction === "long" ? (
                    <ArrowUpCircle className="text-good" size={20} />
                  ) : (
                    <ArrowDownCircle className="text-bad" size={20} />
                  )}
                  <div>
                    <p className="font-semibold">
                      {s.pair} — {s.direction.toUpperCase()}{" "}
                      <span className={GRADE_STYLES[s.grade]?.split(" ")[1]}>Grade {s.grade}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.model} · {s.session} · HTF bias: {s.htf_bias} ·{" "}
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {["acted_on", "skipped"].map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatus(s.id, st)}
                      className={`px-2 py-1 rounded border ${
                        s.status === st ? "bg-gold text-ink border-gold" : "border-line text-gray-400"
                      }`}
                    >
                      {st === "acted_on" ? "Took it" : "Skipped"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <Stat label="Entry" value={s.entry} />
                <Stat label="Stop Loss" value={s.stop_loss} />
                <Stat label="Take Profit" value={s.take_profit} />
                <Stat label="Planned R:R" value={s.planned_rr} />
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500 mb-1">Confluences</p>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
                  {(s.confluences || []).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
