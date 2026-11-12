import React from "react";
import { 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Zap 
} from "lucide-react";

export default function MetricCard({ label, value, sublabel, iconType, variant = "blue" }) {
  const getIcon = () => {
    switch (iconType) {
      case "highRisk":
        return <ShieldAlert size={22} color="var(--color-rose)" />;
      case "lowRisk":
        return <ShieldCheck size={22} color="var(--color-success)" />;
      case "activity":
        return <Activity size={22} color="var(--color-primary)" />;
      case "rate":
        return <TrendingUp size={22} color="var(--color-sky-accent)" />;
      default:
        return <Zap size={22} color="var(--color-primary)" />;
    }
  };

  const getBorderColor = () => {
    if (variant === "rose") return "rgba(225, 29, 72, 0.15)";
    if (variant === "green") return "rgba(22, 163, 74, 0.15)";
    return "rgba(37, 99, 235, 0.15)";
  };

  const getBgGlow = () => {
    if (variant === "rose") return "rgba(255, 241, 242, 0.6)";
    if (variant === "green") return "rgba(236, 253, 245, 0.6)";
    return "rgba(239, 246, 255, 0.6)";
  };

  return (
    <div 
      className="card card-hoverable" 
      style={{ 
        position: "relative",
        overflow: "hidden",
        borderTop: `3px solid ${getBorderColor()}`,
        background: `linear-gradient(180deg, #FFFFFF 0%, ${getBgGlow()} 100%)`
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-muted)" }}>
          {label}
        </span>
        <div style={{ 
          padding: 8, 
          borderRadius: "var(--radius-md)", 
          background: "#FFFFFF",
          boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
        }}>
          {getIcon()}
        </div>
      </div>
      <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--text-heading)", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: "0.8125rem", color: "var(--text-caption)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
