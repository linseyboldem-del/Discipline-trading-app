import { supabase } from "./supabaseClient";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

async function authedFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  runChecklist: (payload) =>
    authedFetch("/api/checklist", { method: "POST", body: JSON.stringify(payload) }),
  analyzeTrades: (limit = 20) =>
    authedFetch("/api/coach/analyze", { method: "POST", body: JSON.stringify({ limit }) }),
  coachHistory: () => authedFetch("/api/coach/history"),
  analyticsSummary: () => authedFetch("/api/analytics/summary"),
  runScan: () => authedFetch("/api/scanner/run", { method: "POST" }),
  listSignals: (grade) => authedFetch(`/api/scanner/signals${grade ? `?grade=${grade}` : ""}`),
  updateSignalStatus: (id, status) =>
    authedFetch(`/api/scanner/signals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
