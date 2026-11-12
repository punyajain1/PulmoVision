import React from "react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";

export default function ModelComparisonChart({ data }) {
  if (!data || !data.without_forward_elimination) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "40px 0" }}>
        No model comparison data available. Train the ML pipeline to populate benchmarks.
      </div>
    );
  }

  // Transform data into Recharts friendly format
  const models = Object.keys(data.without_forward_elimination);
  const chartData = models.map((modelName) => {
    const rawMetrics = data.without_forward_elimination[modelName] || {};
    const feMetrics = data.with_forward_elimination ? data.with_forward_elimination[modelName] || {} : {};

    return {
      name: modelName,
      "Baseline Accuracy": Math.round((rawMetrics.accuracy || 0) * 100),
      "Optimized (FE)": Math.round((feMetrics.accuracy || 0) * 100),
      "F1 Score": Math.round((rawMetrics.f1_score || 0) * 100),
    };
  });

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: "#64748B", fontSize: 12 }} 
            axisLine={{ stroke: "#CBD5E1" }}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: "#64748B", fontSize: 12 }} 
            axisLine={{ stroke: "#CBD5E1" }}
            tickLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`]}
            contentStyle={{
              backgroundColor: "#0F172A",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontSize: "0.85rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 10, fontSize: "0.85rem" }} 
          />
          <Bar dataKey="Baseline Accuracy" fill="#94A3B8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Optimized (FE)" fill="#2563EB" radius={[4, 4, 0, 0]} />
          <Bar dataKey="F1 Score" fill="#008BA3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
