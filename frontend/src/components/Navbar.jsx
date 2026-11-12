import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LogOut, Bell, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const getPageTitle = (path) => {
    switch (path) {
      case "/dashboard":
        return "Clinical Dashboard";
      case "/predict":
        return "New Risk Assessment";
      case "/history":
        return "Patient Prediction History";
      case "/about":
        return "System Architecture & ML Benchmarks";
      default:
        return "PulmoDetect";
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 40px",
        borderBottom: "1px solid var(--border-default)",
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>
          {getPageTitle(location.pathname)}
        </h2>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          College Minor Project Edition &bull; Intelligent Diagnostic Support
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Real-time status pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          background: "var(--color-success-bg)",
          color: "var(--color-success)",
          borderRadius: "var(--radius-full)",
          fontSize: "0.8rem",
          fontWeight: 600,
          border: "1px solid #A7F3D0"
        }}>
          <ShieldCheck size={14} />
          Model Service Online
        </div>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px 4px 12px",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border-default)"
            }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-heading-alt)" }}>
                {user.name}
              </span>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--color-primary)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={handleLogout}
              style={{ padding: "8px 14px", fontSize: "0.825rem", gap: 6 }}
            >
              <LogOut size={14} />
              Exit
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
