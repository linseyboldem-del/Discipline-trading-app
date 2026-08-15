import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Signals from "./pages/Signals";
import Checklist from "./pages/Checklist";
import Journal from "./pages/Journal";
import Coach from "./pages/Coach";
import Settings from "./pages/Settings";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex">
      <Nav />
      <main className="flex-1 p-8 max-w-6xl">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
