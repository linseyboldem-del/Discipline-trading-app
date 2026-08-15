export default function StatCard({ label, value, sub, tone = "neutral" }) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-gray-100";

  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
