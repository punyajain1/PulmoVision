import React from "react";

// probability and threshold are 0 to 1. When the model provides its screening
// threshold, colours follow that threshold, because calibrated probabilities
// on this dataset are high for everyone (most training participants had the
// disease). Without a threshold (older records) fixed bands are used.
export default function RiskGauge({ probability = 0, threshold = null, lowConfidence = false, size = 220 }) {
  const percentage = Math.min(Math.max(Math.round(probability * 100), 0), 100);
  
  // Radius and stroke
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getRiskTier = (pct) => {
    if (typeof threshold === "number") {
      const thresholdPct = Math.round(threshold * 1000) / 10;
      if (lowConfidence) return { text: "Uncertain result", color: "var(--color-amber)" };
      return probability >= threshold
        ? { text: `Above threshold (${thresholdPct}%)`, color: "var(--color-rose)" }
        : { text: `Below threshold (${thresholdPct}%)`, color: "var(--color-success)" };
    }
    if (pct < 35) return { text: "Low Probability", color: "var(--color-success)" };
    if (pct < 65) return { text: "Moderate Risk", color: "var(--color-amber)" };
    return { text: "Elevated Risk", color: "var(--color-rose)" };
  };

  const tier = getRiskTier(percentage);
  const strokeColor = tier.color;

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
            Estimated probability
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
