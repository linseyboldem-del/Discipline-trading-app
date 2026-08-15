import { useEffect, useState } from "react";
import { api } from "../lib/api";
import StatCard from "../components/StatCard";
import EquityChart from "../components/EquityChart";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .analyticsSummary()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading...</p>;
  if (error) return <p className="text-bad">{error}</p>;
  if (!summary) return null;

  const { totalTrades, winRatePercent, avgR, totalR, violationRatePercent, equityCurve, bySession, byModel } = summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted">Your numbers, not your feelings about your numbers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Closed Trades" value={totalTrades} />
        <StatCard
          label="Win Rate"
          value={`${winRatePercent}%`}
          tone={winRatePercent >= 50 ? "good" : "warn"}
        />
        <StatCard label="Avg R" value={avgR} tone={avgR > 0 ? "good" : avgR < 0 ? "bad" : "neutral"} />
        <StatCard label="Total R" value={totalR} tone={totalR > 0 ? "good" : totalR < 0 ? "bad" : "neutral"} />
        <StatCard
          label="Rule Violation Rate"
          value={`${violationRatePercent}%`}
          tone={violationRatePercent > 20 ? "bad" : "good"}
        />
      </div>

      <div className="card">
        <h3 className="font-medium mb-3">Equity Curve (in R)</h3>
        <EquityChart data={equityCurve} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <BreakdownTable title="By Session" data={bySession} />
        <BreakdownTable title="By Entry Model" data={byModel} />
      </div>
    </div>
  );
}

function BreakdownTable({ title, data }) {
  const rows = Object.entries(data || {});
  return (
    <div className="card">
      <h3 className="font-medium mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase">
              <th className="pb-2">Name</th>
              <th className="pb-2">Trades</th>
              <th className="pb-2">Win %</th>
              <th className="pb-2">Total R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, s]) => (
              <tr key={name} className="border-t border-line">
                <td className="py-2">{name}</td>
                <td className="py-2">{s.count}</td>
                <td className="py-2">{s.count ? Math.round((s.wins / s.count) * 100) : 0}%</td>
                <td className={`py-2 ${s.totalR > 0 ? "text-good" : s.totalR < 0 ? "text-bad" : ""}`}>
                  {s.totalR.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
