import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, ShieldCheck, Brain, Settings, LogOut, Zap } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/signals", label: "Signals", icon: Zap },
  { to: "/checklist", label: "Pre-Trade Check", icon: ShieldCheck },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/coach", label: "AI Coach", icon: Brain },
  { to: "/settings", label: "Rules & Settings", icon: Settings },
];

export default function Nav() {
  return (
    <nav className="w-56 shrink-0 border-r border-line h-screen sticky top-0 flex flex-col p-4">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-gold">Discipline</h1>
        <p className="text-xs text-gray-500">Personal trading system</p>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                isActive ? "bg-gold text-ink font-medium" : "text-gray-300 hover:bg-panel"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-panel"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </nav>
  );
}
