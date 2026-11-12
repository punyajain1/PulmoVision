import React, { useEffect, useState } from "react";
import predictionService from "../services/predictionService.js";
import modelService from "../services/modelService.js";
import MetricCard from "../components/MetricCard.jsx";
import RiskChart from "../components/RiskChart.jsx";
import PredictionTable from "../components/PredictionTable.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { Link } from "react-router-dom";
import { 
  PlusCircle, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Calendar,
  BarChart3
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      predictionService.getDashboardStats(),
      modelService.getModelInfo().catch(() => null),
    ])
      .then(([statsData, model]) => {
        setStats(statsData);
        setModelInfo(model);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading telemetry & metrics..." />;

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        padding: "24px 30px",
        background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
        borderRadius: "var(--radius-lg)",
        color: "#FFFFFF",
        marginBottom: 28,
        boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.25)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.85, fontSize: "0.85rem", marginBottom: 6 }}>
            <Calendar size={14} />
            <span>{todayStr}</span>
          </div>
          <h1 style={{ color: "#FFFFFF", fontSize: "1.75rem", margin: "0 0 6px" }}>
            Diagnostic Intelligence Center
          </h1>
          <p style={{ color: "#BFDBFE", margin: 0, fontSize: "0.95rem", maxWidth: 580 }}>
            Real-time inference tracking, ML model metrics, and patient population risk statistics.
          </p>
        </div>

        <Link
          to="/predict"
          className="btn"
          style={{
            backgroundColor: "#FFFFFF",
            color: "var(--color-primary)",
            fontWeight: 700,
            padding: "12px 22px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}
        >
          <PlusCircle size={18} />
          New Patient Assessment
        </Link>
      </div>

      <ErrorMessage message={error} />

      {/* Primary KPI Cards */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <MetricCard
          label="Total Assessments Evaluated"
          value={stats?.total ?? 0}
          sublabel="Stored session logs"
          iconType="activity"
          variant="blue"
        />
        <MetricCard
          label="High Risk Detections"
          value={stats?.highRisk ?? 0}
          sublabel={`${stats?.total ? Math.round(((stats.highRisk || 0) / stats.total) * 100) : 0}% of cohort`}
          iconType="highRisk"
          variant="rose"
        />
        <MetricCard
          label="Low Risk Profiles"
          value={stats?.lowRisk ?? 0}
          sublabel={`${stats?.total ? Math.round(((stats.lowRisk || 0) / stats.total) * 100) : 0}% benign indicators`}
          iconType="lowRisk"
          variant="green"
        />
      </div>

      {/* Middle Row: Donut Chart & Model Performance */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24, marginBottom: 28 }}>
        {/* Risk Distribution Card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>Cohort Risk Stratification</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Breakdown of predicted low vs elevated risk
              </p>
            </div>
            <span className="badge badge-blue">Telemetry</span>
          </div>
          <RiskChart data={stats?.riskDistribution} />
        </div>

        {/* Model Pipeline Specs */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>Ensemble Model Status</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Sequential Forward Elimination + Bagging
              </p>
            </div>
            <div style={{ padding: 6, borderRadius: "50%", background: "var(--color-ice-blue)", color: "var(--color-primary)" }}>
              <Cpu size={20} />
            </div>
          </div>

          {modelInfo ? (
            <div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Algorithm</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-heading)", marginTop: 2 }}>
                    {modelInfo.model_name}
                  </div>
                </div>

                <div style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Feature Subset</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-heading)", marginTop: 2 }}>
                    {modelInfo.n_features_selected} / {modelInfo.n_features_total} selected
                  </div>
                </div>
              </div>

              {modelInfo.test_metrics && (
                <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 16 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-heading)", marginBottom: 12 }}>
                    Held-Out Test Set Benchmarks:
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>Model Accuracy</span>
                        <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                          {(modelInfo.test_metrics.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${modelInfo.test_metrics.accuracy * 100}%`, height: "100%", background: "var(--color-primary)" }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>F1-Score</span>
                        <span style={{ fontWeight: 700, color: "var(--color-sky-accent)" }}>
                          {(modelInfo.test_metrics.f1_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${modelInfo.test_metrics.f1_score * 100}%`, height: "100%", background: "var(--color-sky-accent)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, textAlign: "right" }}>
                <Link to="/about" style={{ fontSize: "0.825rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Inspect Model Benchmark Suite <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              Model service offline or metadata not found. Run training script in ml-service.
            </div>
          )}
        </div>
      </div>

      {/* Recent Predictions Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Recent Patient Evaluations</h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Latest diagnostic outcomes recorded under your credentials
            </p>
          </div>
          <Link to="/history" className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: "0.825rem" }}>
            View Complete History
          </Link>
        </div>
        <PredictionTable predictions={stats?.recent} />
      </div>
    </div>
  );
}
