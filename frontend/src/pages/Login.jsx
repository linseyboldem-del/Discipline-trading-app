import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gold">Discipline</h1>
          <p className="text-sm text-muted">Your personal trading system. Only you have access.</p>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-bad text-sm">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
          {mode === "signin" ? <LogIn size={16} /> : <UserPlus size={16} />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-muted hover:text-gold w-full text-center"
        >
          {mode === "signin" ? "First time? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
