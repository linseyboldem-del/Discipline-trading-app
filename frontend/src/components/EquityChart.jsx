import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function EquityChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No closed trades yet — equity curve will appear here.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262b34" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b93a1" }} />
        <YAxis tick={{ fontSize: 11, fill: "#8b93a1" }} />
        <Tooltip
          contentStyle={{ background: "#161a21", border: "1px solid #262b34", fontSize: 12 }}
          labelStyle={{ color: "#c9a227" }}
        />
        <Line type="monotone" dataKey="cumulativeR" stroke="#c9a227" strokeWidth={2} dot={false} name="Cumulative R" />
      </LineChart>
    </ResponsiveContainer>
  );
}
