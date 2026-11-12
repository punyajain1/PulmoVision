import React, { useState, useEffect } from "react";
import modelService from "../services/modelService.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Cpu, Award, GitCommit, BookOpen, AlertTriangle } from "lucide-react";

// Every number on this page comes from the ML service (via the backend).
// If a request fails, the section says so instead of showing placeholder data.

const pct = (v) => (typeof v === "number" ? `${Math.round(v * 1000) / 10}%` : "n/a");
const toPct = (v) => (typeof v === "number" ? Math.round(v * 1000) / 10 : null);

function SectionError({ what }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 8,
      background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: "0.8rem"
    }}>
      <AlertTriangle size={16} />
      Could not load {what} from the model service. It may be starting up; reload the page in a minute.
    </div>
  );
}

function StatCard({ label, value, note, color }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-caption)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>{note}</div>
    </div>
  );
}

export default function ResearchBench() {
  const [useSFS, setUseSFS] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("roc_auc");
  const [modelInfo, setModelInfo] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [eliminationSteps, setEliminationSteps] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      modelService.getModelInfo(),
      modelService.getModelComparison(),
      modelService.getFeatureElimination(),
    ]).then(([info, comp, elim]) => {
      if (cancelled) return;
      if (info.status === "fulfilled") setModelInfo(info.value);
      if (comp.status === "fulfilled") setComparisonData(comp.value);
      if (elim.status === "fulfilled") setEliminationSteps(Array.isArray(elim.value) ? elim.value : []);
      setErrors({
        info: info.status === "rejected",
        comparison: comp.status === "rejected",
        elimination: elim.status === "rejected",
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const metrics = modelInfo?.test_metrics || {};
  const activeModels = comparisonData
    ? (useSFS ? comparisonData.with_forward_elimination : comparisonData.without_forward_elimination) || {}
    : {};

  const chartData = Object.entries(activeModels).map(([name, m]) => ({
    name,
    score: toPct(m[selectedMetric]),
    accuracy: toPct(m.accuracy),
    precision: toPct(m.precision),
    recall: toPct(m.recall),
    f1: toPct(m.f1_score),
    auc: toPct(m.roc_auc),
  }));
  const cell = (v) => (v === null ? "n/a" : `${v}%`);
  const addedSteps = (eliminationSteps || []).filter((s) => !s.stopped);
  const stopStep = (eliminationSteps || []).find((s) => s.stopped);

  return (
    <div className="container" style={{ padding: "28px 0" }}>
      {/* Title Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            padding: 8,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #2563EB, #0284C7)",
            color: "#FFFFFF"
          }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-heading)" }}>
              Research Benchmarks
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Model comparison, sequential forward feature selection, and the deployed model's held-out test results.
            </p>
          </div>
        </div>
      </div>

      {/* Deployed model summary */}
      {errors.info ? (
        <div style={{ marginBottom: 24 }}><SectionError what="the deployed model's metrics" /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard
            label="Deployed model"
            color="var(--color-primary)"
            value={loading ? "…" : `${modelInfo?.model_name || "n/a"}${modelInfo?.model_version ? ` v${modelInfo.model_version}` : ""}`}
            note={modelInfo?.calibrated ? `Calibrated, threshold ${pct(modelInfo.threshold)}` : "Decision-tree base estimators"}
          />
          <StatCard
            label="Test sensitivity / specificity"
            color="var(--color-success)"
            value={loading ? "…" : `${pct(metrics.recall)} / ${pct(metrics.specificity)}`}
            note={`Held-out test set, n=${modelInfo?.test_rows ?? "?"}${metrics.confusion ? ` (${metrics.confusion.tn + metrics.confusion.fp} negative cases)` : ""}`}
          />
          <StatCard
            label="Test ROC-AUC"
            color="#7C3AED"
            value={loading ? "…" : (metrics.roc_auc ?? "n/a")}
            note={typeof metrics.brier === "number" ? `Brier score ${metrics.brier}` : "Threshold-free ranking quality"}
          />
          <StatCard
            label="Features used"
            color="#D97706"
            value={loading ? "…" : `${modelInfo?.n_features_selected ?? "?"} of ${modelInfo?.n_features_total ?? "?"}`}
            note="Chosen by sequential forward selection"
          />
        </div>
      )}

      {/* Model comparison */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-heading)" }}>
              Model comparison
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {chartData.length || "Five"} models trained on the same training split and scored once on the same held-out test split
              {modelInfo?.test_rows ? ` (${modelInfo.test_rows} rows)` : ""}, at threshold 0.5 and without calibration.
              A single small split is noisy; the paper reports nested cross-validation instead.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#F1F5F9",
              padding: "4px",
              borderRadius: "8px",
              gap: 4
            }}>
              {[
                [true, "Selected features (SFS)"],
                [false, "All features"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  onClick={() => setUseSFS(value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: useSFS === value ? "#2563EB" : "transparent",
                    color: useSFS === value ? "#FFFFFF" : "#64748B"
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#1E293B",
                background: "#FFFFFF"
              }}
            >
              <option value="roc_auc">ROC-AUC (%)</option>
              <option value="accuracy">Accuracy (%)</option>
              <option value="precision">Precision (%)</option>
              <option value="recall">Sensitivity / Recall (%)</option>
              <option value="f1_score">F1 Score (%)</option>
            </select>
          </div>
        </div>

        {errors.comparison ? (
          <SectionError what="the model comparison" />
        ) : loading ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading…</div>
        ) : chartData.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No comparison results in this training run.</div>
        ) : (
          <>
            <div style={{ height: 280, width: "100%", marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 12 }} unit="%" />
                  <Tooltip
                    formatter={(val) => [val === null ? "n/a" : `${val}%`, selectedMetric.toUpperCase()]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                  />
                  <Bar dataKey="score" fill="#2563EB" radius={[6, 6, 0, 0]} name={selectedMetric.toUpperCase()} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 24, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#64748B" }}>
                    <th style={{ padding: "10px 12px" }}>Model</th>
                    <th style={{ padding: "10px 12px" }}>Accuracy</th>
                    <th style={{ padding: "10px 12px" }}>Precision</th>
                    <th style={{ padding: "10px 12px" }}>Sensitivity (Recall)</th>
                    <th style={{ padding: "10px 12px" }}>F1-Score</th>
                    <th style={{ padding: "10px 12px" }}>ROC-AUC</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.name} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px", fontWeight: 700, color: "#0F172A" }}>
                        {row.name === "Bagging" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB" }}>
                            <Award size={14} /> Bagging (deployed model type)
                          </span>
                        ) : (
                          row.name
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>{cell(row.accuracy)}</td>
                      <td style={{ padding: "12px" }}>{cell(row.precision)}</td>
                      <td style={{ padding: "12px" }}>{cell(row.recall)}</td>
                      <td style={{ padding: "12px" }}>{cell(row.f1)}</td>
                      <td style={{ padding: "12px" }}>{cell(row.auc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Sequential Forward Selection trace & notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <GitCommit size={18} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-heading)" }}>
              Sequential forward selection steps
            </h3>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 14px" }}>
            Each step adds the answer that most improves 5-fold cross-validated balanced accuracy on the training split.
          </p>
          {errors.elimination ? (
            <SectionError what="the feature-selection history" />
          ) : loading ? (
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {addedSteps.map((s) => (
                <div key={s.step} style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>
                    Step {s.step}: added <code>{s.feature_added}</code>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                    Balanced accuracy {pct(s.cv_score)}
                    {typeof s.improvement === "number" ? ` (+${Math.round(s.improvement * 1000) / 10} points)` : " (first feature)"}
                  </div>
                </div>
              ))}
              {stopStep && (
                <div style={{ padding: "10px 12px", background: "#FFFFFF", borderRadius: "6px", border: "1px dashed #CBD5E1", fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>Stopped at step {stopStep.step}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                    The best remaining answer (<code>{stopStep.feature_added}</code>) changed balanced accuracy by
                    {" "}{typeof stopStep.improvement === "number" ? `${Math.round(stopStep.improvement * 1000) / 10} points` : "n/a"}, below the 0.1-point minimum.
                  </div>
                </div>
              )}
              {addedSteps.length === 0 && !stopStep && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No feature-selection history in this training run.</div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} color="#7C3AED" />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-heading)" }}>
              Design notes
            </h3>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#334155", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <strong>Why a Bagging classifier?</strong>
              <div style={{ color: "#64748B", fontSize: "0.75rem" }}>
                A single decision tree has high variance on a small dataset. Bagging averages 100 trees trained on bootstrap
                samples, which reduces variance. The spread of those trees also gives the uncertainty range shown with each result.
              </div>
            </div>
            <div>
              <strong>Why sequential forward selection?</strong>
              <div style={{ color: "#64748B", fontSize: "0.75rem" }}>
                It keeps the model small and its explanations short. The trade-off is visible here: with balanced-accuracy
                scoring it kept {modelInfo?.n_features_selected ?? "a few"} answers and did not select smoking or age, which reflects
                this survey dataset rather than medical evidence.
              </div>
            </div>
            <div>
              <strong>Why prioritise sensitivity?</strong>
              <div style={{ color: "#64748B", fontSize: "0.75rem" }}>
                Missing a positive case is treated as worse than a false alarm.
                {typeof modelInfo?.threshold === "number"
                  ? ` The deployed threshold (${pct(modelInfo.threshold)}) was set for at least 90% sensitivity in cross-validation; on the test set it gives ${pct(metrics.recall)} sensitivity and ${pct(metrics.specificity)} specificity.`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
