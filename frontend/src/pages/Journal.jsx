import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TradeForm from "../components/TradeForm";
import { Plus } from "lucide-react";

export default function Journal() {
  const [trades, setTrades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTrades() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setTrades(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTrades();
  }, []);

  function openNewTradeForm() {
    setEditingTrade(null);
    setShowForm(true);
  }

  function openEditForm(trade) {
    setEditingTrade(trade);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTrade(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Journal</h2>
          <p className="text-sm text-muted">
            Every trade, logged the same way, every time. Click a row to edit or close it out.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={showForm ? closeForm : openNewTradeForm}>
          <Plus size={16} /> {showForm ? "Close" : "Add Trade"}
        </button>
      </div>

      {showForm && (
        <TradeForm
          trade={editingTrade}
          onSaved={() => {
            closeForm();
            loadTrades();
          }}
          onCancel={closeForm}
        />
      )}

      {error && <p className="text-bad">{error}</p>}
      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : trades.length === 0 ? (
        <p className="text-muted">No trades logged yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-muted text-xs uppercase">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Pair</th>
                <th className="pb-2 pr-3">Dir</th>
                <th className="pb-2 pr-3">Session</th>
                <th className="pb-2 pr-3">Model</th>
                <th className="pb-2 pr-3">Risk %</th>
                <th className="pb-2 pr-3">R:R</th>
                <th className="pb-2 pr-3">Realized R</th>
                <th className="pb-2 pr-3">Outcome</th>
                <th className="pb-2 pr-3">Emotion</th>
                <th className="pb-2 pr-3">Plan?</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openEditForm(t)}
                  className="border-t border-line cursor-pointer hover:bg-ink transition-colors"
                  title="Click to edit"
                >
                  <td className="py-2 pr-3">{t.trade_date}</td>
                  <td className="py-2 pr-3">{t.pair}</td>
                  <td className="py-2 pr-3 capitalize">{t.direction}</td>
                  <td className="py-2 pr-3">{t.session}</td>
                  <td className="py-2 pr-3">{t.model}</td>
                  <td className="py-2 pr-3">{t.risk_percent}</td>
                  <td className="py-2 pr-3">{t.planned_rr}</td>
                  <td
                    className={`py-2 pr-3 ${
                      t.realized_r > 0 ? "text-good" : t.realized_r < 0 ? "text-bad" : ""
                    }`}
                  >
                    {t.realized_r ?? "—"}
                  </td>
                  <td className="py-2 pr-3 capitalize">{t.outcome}</td>
                  <td className="py-2 pr-3">{t.emotion_before}</td>
                  <td className="py-2 pr-3">{t.followed_plan ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}