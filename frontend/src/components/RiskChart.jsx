import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const RISK_COLORS = {
  "High Risk": "#E11D48", // Rose 600
  "Low Risk": "#16A34A",  // Emerald 600
};

export default function RiskChart({ data }) {
  const hasData = data && data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "40px 0", textAlign: "center" }}>
        No prediction records found yet. Perform an assessment to build your risk distribution.
      </div>
    );
  }

  const totalPredictions = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ position: "relative", width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={4}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry) => (
              <Cell 
                key={entry.name} 
                fill={RISK_COLORS[entry.name] || "#2563EB"} 
                stroke="#FFFFFF" 
                strokeWidth={2} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: "#0F172A",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
            }}
          />
          <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "12px", fontSize: "0.85rem" }} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center count display */}
      <div style={{
        position: "absolute",
        top: "42%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        pointerEvents: "none"
      }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-heading)", lineHeight: 1 }}>
          {totalPredictions}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginTop: 2 }}>
          Total Cases
        </div>
      </div>
    </div>
  );
}
