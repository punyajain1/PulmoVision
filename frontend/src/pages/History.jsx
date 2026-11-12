import React, { useEffect, useState } from "react";
import predictionService from "../services/predictionService.js";
import PredictionTable from "../components/PredictionTable.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { History as HistoryIcon, Filter, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

export default function History() {
  const [predictions, setPredictions] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL, HIGH, LOW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    predictionService
      .listPredictions()
      .then(setPredictions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id) {
    try {
      await predictionService.deletePrediction(id);
      setPredictions((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredPredictions = predictions.filter((p) => {
    if (filter === "HIGH") return p.prediction === "High Risk";
    if (filter === "LOW") return p.prediction === "Low Risk";
    return true;
  });

  if (loading) return <LoadingSpinner label="Loading historical predictions..." />;

  const highCount = predictions.filter((p) => p.prediction === "High Risk").length;
  const lowCount = predictions.filter((p) => p.prediction === "Low Risk").length;

  return (
    <div>
      {/* Header section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              padding: 8,
              borderRadius: "var(--radius-md)",
              background: "var(--color-ice-blue)",
              color: "var(--color-primary)"
            }}>
              <HistoryIcon size={22} />
            </div>
            <h1 style={{ margin: 0 }}>Prediction History Logs</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Audit trail of all patient inferences executed under your authenticated session.
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: "flex",
          gap: 8,
          background: "#FFFFFF",
          padding: 6,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)"
        }}>
          <button
            onClick={() => setFilter("ALL")}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              background: filter === "ALL" ? "var(--color-primary)" : "transparent",
              color: filter === "ALL" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
          >
            All ({predictions.length})
          </button>
          <button
            onClick={() => setFilter("HIGH")}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              background: filter === "HIGH" ? "var(--color-rose)" : "transparent",
              color: filter === "HIGH" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
          >
            High Risk ({highCount})
          </button>
          <button
            onClick={() => setFilter("LOW")}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "0.825rem",
              fontWeight: 600,
              cursor: "pointer",
              background: filter === "LOW" ? "var(--color-success)" : "transparent",
              color: filter === "LOW" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
          >
            Low Risk ({lowCount})
          </button>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Main Table Card */}
      <div className="card">
        <PredictionTable predictions={filteredPredictions} onDelete={handleDelete} />
      </div>
    </div>
  );
}
