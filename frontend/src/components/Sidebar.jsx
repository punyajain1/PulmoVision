import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  PlusCircle, 
  History as HistoryIcon, 
  Info, 
  Activity,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/predict", label: "New Prediction", icon: PlusCircle },
  { to: "/history", label: "History & Triage", icon: HistoryIcon },
  { to: "/research", label: "Research Benchmarks", icon: Activity },
  { to: "/about", label: "System Architecture", icon: Info },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <nav
      style={{
        width: 260,
        background: "var(--bg-sidebar)",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "24px 16px",
      }}
    >
      <div>
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px 28px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-sky-accent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)"
          }}>
            <Activity size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              PulmoDetect
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-caption)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Clinical Intelligence
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-caption)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, paddingLeft: 12, marginBottom: 4 }}>
            Main Menu
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  color: isActive ? "#FFFFFF" : "#94A3B8",
                  background: isActive 
                    ? "linear-gradient(90deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.05) 100%)" 
                    : "transparent",
                  borderLeft: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                })}
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile */}
      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 18 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "rgba(255, 255, 255, 0.04)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "#FFFFFF",
              flexShrink: 0
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user?.name || "Clinician / Researcher"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-caption)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user?.email || "active session"}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
