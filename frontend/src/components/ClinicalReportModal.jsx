import React, { useEffect, useState } from "react";
import { Printer, X, FileCheck } from "lucide-react";
import modelService from "../services/modelService.js";
import { getNextSteps } from "./nextSteps.js";

function pct(value) {
  return typeof value === "number" ? `${Math.round(value * 1000) / 10}%` : "n/a";
}

export default function ClinicalReportModal(props) {
  if (!props.result) return null;
  return <ClinicalReportView {...props} />;
}

function ClinicalReportView({ result, onClose }) {
  // Metrics come from the deployed model's metadata, never from hardcoded numbers.
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoError, setModelInfoError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    modelService.getModelInfo()
      .then((info) => { if (!cancelled) setModelInfo(info); })
      .catch(() => { if (!cancelled) setModelInfoError(true); });
    return () => { cancelled = true; };
  }, []);

  const metrics = modelInfo?.test_metrics;
  const nextSteps = getNextSteps({ isHigh: result.prediction === "High Risk", lowConfidence: result.lowConfidence });
  const hasReliability = typeof result.threshold === "number";
  const explanation = (result.featureContributions || []).filter((item) => typeof item?.shap === "number");

  const handlePrint = () => {
    window.print();
  };

  const isHigh = result.prediction === "High Risk";
  const probability = Math.round((result.probability ?? 0) * 100);
  const dateStr = result.createdAt ? new Date(result.createdAt).toLocaleString() : new Date().toLocaleString();
  const reportId = result._id ? `PLC-${result._id.slice(-8).toUpperCase()}` : `PLC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const inputData = result.inputData || {};

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      overflowY: "auto"
    }}>
      <div style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "800px",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Action Header (hidden in print) */}
        <div className="no-print" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "#F8FAFC",
          borderBottom: "1px solid #E2E8F0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileCheck size={20} color="#2563EB" />
            <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "1rem" }}>
              Risk Assessment Report
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer"
              }}
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              <X size={18} color="#64748B" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div id="printable-report" style={{
          padding: "36px 40px",
          overflowY: "auto",
          color: "#1E293B",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          {/* Hospital / Clinic Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0F172A",
            paddingBottom: 20,
            marginBottom: 24
          }}>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em" }}>
                PULMODETECT
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748B", fontWeight: 500, marginTop: 2 }}>
                Lung Cancer Risk Assessment Report (survey-based)
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: 4 }}>
                Research prototype, not a certified medical device • Report ID: {reportId}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "4px",
                background: isHigh ? "#FEE2E2" : "#DCFCE7",
                color: isHigh ? "#991B1B" : "#166534",
                fontWeight: 800,
                fontSize: "0.8rem",
                textTransform: "uppercase"
              }}>
                {result.prediction}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 6 }}>
                Issued: <strong>{dateStr}</strong>
              </div>
            </div>
          </div>

          {/* Patient Biomarkers Grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              1. Patient Demographics & Reported Biomarkers
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              background: "#F8FAFC",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              fontSize: "0.8rem"
            }}>
              <div><strong>Age:</strong> {inputData.AGE || "N/A"} years</div>
              <div><strong>Gender:</strong> {inputData.GENDER === "M" ? "Male" : "Female"}</div>
              <div><strong>Smoking History:</strong> {Number(inputData.SMOKING) === 1 ? "Active / Past Smoker" : "Non-smoker"}</div>
              <div><strong>Chronic Lung Condition:</strong> {Number(inputData.CHRONIC_DISEASE) === 1 ? "Reported (Yes)" : "None"}</div>
              <div><strong>Persistent Cough:</strong> {Number(inputData.COUGHING) === 1 ? "Yes" : "No"}</div>
              <div><strong>Dyspnea (Shortness of Breath):</strong> {Number(inputData.SHORTNESS_OF_BREATH) === 1 ? "Yes" : "No"}</div>
              <div><strong>Thoracic Chest Pain:</strong> {Number(inputData.CHEST_PAIN) === 1 ? "Yes" : "No"}</div>
              <div><strong>Difficulty Swallowing:</strong> {Number(inputData.SWALLOWING_DIFFICULTY) === 1 ? "Yes" : "No"}</div>
              <div><strong>Nicotine Staining / Yellow Fingers:</strong> {Number(inputData.YELLOW_FINGERS) === 1 ? "Yes" : "No"}</div>
            </div>
          </div>

          {/* Diagnostic Assessment */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              2. Algorithmic Risk Stratification Assessment
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px",
              borderRadius: "8px",
              border: isHigh ? "2px solid #FECDD3" : "2px solid #A7F3D0",
              background: isHigh ? "#FFF1F2" : "#ECFDF5"
            }}>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isHigh ? "#991B1B" : "#166534" }}>
                  {isHigh ? "Higher estimated risk" : "Lower estimated risk"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 4 }}>
                  Bagging classifier with sequential forward feature selection.
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 4 }}>
                  Model: {result.modelName || "unknown"}
                  {result.modelVersion && ` v${result.modelVersion}`}
                  {metrics
                    ? ` • Held-out test set (n=${modelInfo.test_rows ?? "?"}): ROC-AUC ${metrics.roc_auc ?? "n/a"}, sensitivity ${pct(metrics.recall)}` +
                      (typeof metrics.specificity === "number" ? `, specificity ${pct(metrics.specificity)}` : "") +
                      `, accuracy ${pct(metrics.accuracy)}`
                    : modelInfoError
                      ? " • Model metrics unavailable"
                      : " • Loading model metrics…"}
                </div>
                {hasReliability && (
                  <div style={{ fontSize: "0.75rem", color: result.lowConfidence ? "#92400E" : "#64748B", marginTop: 4 }}>
                    Screening threshold {pct(result.threshold)}
                    {result.uncertainty && ` • Tree range ${pct(result.uncertainty.low)}–${pct(result.uncertainty.high)}`}
                    {result.conformal && ` • Conformal check: ${result.conformal.status}`}
                    {result.lowConfidence && " • LOW CONFIDENCE"}
                    {result.outOfDistribution?.flag && ` • Unusual input: ${result.outOfDistribution.reasons.join(" ")}`}
                  </div>
                )}
                {result.calibrated && (
                  <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: 4 }}>
                    Probability calibrated to the study data
                    {typeof result.trainingPositiveRate === "number" && ` (${pct(result.trainingPositiveRate)} of participants had lung cancer)`};
                    it is not a real-world chance of having lung cancer.
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: isHigh ? "#DC2626" : "#059669" }}>
                  {probability}%
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  Estimated probability
                </div>
              </div>
            </div>
          </div>

          {/* SHAP explanation from the deployed model */}
          {explanation.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                3. What drove this estimate (SHAP)
              </div>
              {typeof result.baseValue === "number" && (
                <div style={{ fontSize: "0.75rem", color: "#64748B", marginBottom: 8 }}>
                  Average estimate across training cases: {pct(result.baseValue)}. The model uses only the {explanation.length} answers listed.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {explanation.map((fc, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#F8FAFC",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    fontSize: "0.8rem"
                  }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>
                      {fc.label} ({fc.value === 1 ? "Yes" : fc.value === 0 ? "No" : fc.value})
                    </span>
                    <span style={{
                      fontWeight: 700,
                      color: fc.shap > 0 ? "#DC2626" : "#059669"
                    }}>
                      {fc.shap > 0 ? "+" : ""}{Math.round(fc.shap * 1000) / 10} percentage points
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Directives & Sign-off */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 180px",
            gap: 20,
            marginTop: 30,
            paddingTop: 20,
            borderTop: "1px solid #CBD5E1"
          }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                {nextSteps.title}:
              </div>
              <ul style={{ fontSize: "0.75rem", color: "#475569", paddingLeft: 18, margin: 0, lineHeight: 1.5 }}>
                {nextSteps.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", marginTop: 6 }}>{nextSteps.footnote}</div>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", marginTop: 12 }}>
                *Notice: This is a risk estimate from self-reported survey answers, produced by a research prototype. It is not a diagnosis and must be interpreted by a qualified clinician.
              </div>
            </div>

            {/* Clinician review status and signature line */}
            <div style={{ textAlign: "center", borderLeft: "1px solid #E2E8F0", paddingLeft: 16 }}>
              <div style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 600, marginTop: 8 }}>
                {result.doctorReviewed ? "Marked as reviewed" : "Not yet reviewed by a clinician"}
              </div>
              {result.clinicalNotes && (
                <div style={{ fontSize: "0.7rem", color: "#334155", marginTop: 6, textAlign: "left", whiteSpace: "pre-wrap" }}>
                  {result.clinicalNotes}
                </div>
              )}
              <div style={{ borderTop: "1px solid #0F172A", marginTop: 40, paddingTop: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                Clinician signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
