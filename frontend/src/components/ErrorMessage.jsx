import React from "react";

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        background: "var(--color-risk-high-bg)",
        color: "var(--color-risk-high)",
        border: "1px solid #eecfc4",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 13.5,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}
