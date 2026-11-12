import React from "react";

export default function RiskGauge({ probability = 0, size = 220 }) {
  // probability is 0 to 1
  const percentage = Math.min(Math.max(Math.round(probability * 100), 0), 100);
  
  // Radius and stroke
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct < 35) return "var(--color-success)"; // #16A34A
    if (pct < 65) return "var(--color-amber)"; // #D97706
    return "var(--color-rose)"; // #E11D48
  };

  const getRiskTier = (pct) => {
    if (pct < 35) return { text: "Low Probability", color: "var(--color-success)" };
    if (pct < 65) return { text: "Moderate Risk", color: "var(--color-amber)" };
    return { text: "Elevated Risk", color: "var(--color-rose)" };
  };

  const tier = getRiskTier(percentage);
  const strokeColor = getColor(percentage);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: size, height: size / 2 + 30 }}>
        <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          {/* Background track */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.4s ease" }}
          />
        </svg>

        {/* Center Text Value */}
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, 0)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-heading)", lineHeight: 1 }}>
            {percentage}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
            Risk Confidence
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: 4,
        padding: "4px 14px", 
        borderRadius: "var(--radius-full)", 
        backgroundColor: `${tier.color}15`, 
        color: tier.color,
        fontWeight: 700,
        fontSize: "0.875rem",
        border: `1px solid ${tier.color}30`
      }}>
        {tier.text}
      </div>
    </div>
  );
}
