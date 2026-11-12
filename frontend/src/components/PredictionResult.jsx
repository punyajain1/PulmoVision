import React, { useState } from "react";
import RiskGauge from "./RiskGauge.jsx";
import ClinicalReportModal from "./ClinicalReportModal.jsx";
import predictionService from "../services/predictionService.js";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Cpu, 
  ArrowRight,
  ShieldCheck,
  FileSearch,
  Sliders,
  FileDown,
  Sparkles,
  TrendingDown,
  UserCheck,
  Stethoscope
} from "lucide-react";
import { Link } from "react-router-dom";

const REVIEW_FIELD_LABELS = {
  YELLOW_FINGERS: "Yellow Fingers / Nails",
  CHRONIC_DISEASE: "Chronic Respiratory / Lung Condition",
  COUGHING: "Persistent Chronic Cough",
  SHORTNESS_OF_BREATH: "Shortness of Breath (Dyspnea)",
  SWALLOWING_DIFFICULTY: "Difficulty Swallowing (Dysphagia)",
  CHEST_PAIN: "Frequent Chest Pain",
};

export default function PredictionResult({ result, onUpdate }) {
  if (!result) return null;

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  
  // What-If Simulator State
  const initialInputs = result.inputData || {};
  const [simSmoking, setSimSmoking] = useState(Number(initialInputs.SMOKING) === 1);
  const [simAlcohol, setSimAlcohol] = useState(Number(initialInputs.ALCOHOL_CONSUMING) === 1);
  const [simCough, setSimCough] = useState(Number(initialInputs.COUGHING) === 1);
  const [simDyspnea, setSimDyspnea] = useState(Number(initialInputs.SHORTNESS_OF_BREATH) === 1);
  const [simWheeze, setSimWheeze] = useState(Number(initialInputs.WHEEZING) === 1);
  
  // Doctor notes state
  const [doctorNotes, setDoctorNotes] = useState(result.clinicalNotes || "");
  const [doctorEndorsed, setDoctorEndorsed] = useState(result.doctorReviewed || false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);

  const isHigh = result.prediction === "High Risk";
  const probability = result.probability ?? 0;

  // Calculate dynamic simulated risk
  const calculateSimulatedRisk = () => {
    let base = 0.05;
    const age = Number(initialInputs.AGE) || 50;
    if (age >= 65) base += 0.18;
    else if (age >= 50) base += 0.10;
    else if (age >= 35) base += 0.04;

    if (simSmoking) base += 0.28;
    if (Number(initialInputs.CHRONIC_DISEASE) === 1) base += 0.22;
    if (simCough) base += 0.20;
    if (Number(initialInputs.CHEST_PAIN) === 1) base += 0.18;
    if (simDyspnea) base += 0.17;
    if (Number(initialInputs.SWALLOWING_DIFFICULTY) === 1) base += 0.14;
    if (simWheeze) base += 0.13;
    if (Number(initialInputs.YELLOW_FINGERS) === 1 && simSmoking) base += 0.12;
    if (simAlcohol) base += 0.10;

    return Math.min(0.98, Math.max(0.05, Math.round(base * 100) / 100));
  };

  const simulatedRisk = calculateSimulatedRisk();
  const simulatedPercent = Math.round(simulatedRisk * 100);
  const originalPercent = Math.round(probability * 100);
  const riskDelta = originalPercent - simulatedPercent;

  const handleSaveDoctorNotes = async () => {
    if (!result._id) return;
    setIsSavingNotes(true);
    try {
      const updated = await predictionService.updateDoctorReview(result._id, {
        clinicalNotes: doctorNotes,
        doctorReviewed: doctorEndorsed,
      });
      setSavedNotesSuccess(true);
      if (onUpdate) onUpdate(updated);
      setTimeout(() => setSavedNotesSuccess(false), 3000);
    } catch (err) {
      alert("Error saving review: " + err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <>
      <div 
        className="card" 
        style={{ 
          marginTop: 24, 
          border: isHigh ? "1px solid #FECDD3" : "1px solid #A7F3D0",
          background: isHigh 
            ? "linear-gradient(180deg, #FFFFFF 0%, #FFF1F2 100%)" 
            : "linear-gradient(180deg, #FFFFFF 0%, #ECFDF5 100%)"
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isHigh ? (
              <div style={{ padding: 8, borderRadius: "50%", background: "#FFE4E6", color: "var(--color-rose)" }}>
                <AlertTriangle size={24} />
              </div>
            ) : (
              <div style={{ padding: 8, borderRadius: "50%", background: "#DCFCE7", color: "var(--color-success)" }}>
                <CheckCircle size={24} />
              </div>
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: isHigh ? "var(--color-rose)" : "var(--color-success)" }}>
                {isHigh ? "Elevated Risk Stratification Detected" : "Low Risk Stratification Established"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Evaluated via Sequential Forward Selection Bagging Pipeline
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowPdfModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
              }}
            >
              <FileDown size={15} /> Clinical Dossier (PDF)
            </button>
            <span className={`badge ${isHigh ? "badge-high" : "badge-low"}`} style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
              {result.prediction}
            </span>
          </div>
        </div>

        {/* Core Risk Gauge & Action Plan */}
        <div className="grid-2" style={{ alignItems: "center", margin: "20px 0" }}>
          {/* Risk Gauge Visual */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
            <RiskGauge probability={probability} />
          </div>

          {/* Clinical Recommendations & Model Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "#FFFFFF",
              border: "1px solid var(--border-default)"
            }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 6 }}>
                {isHigh ? "Immediate Recommended Next Steps (Clinical Guidelines):" : "Preventative Wellness Advice:"}
              </div>
              <ul style={{ fontSize: "0.85rem", color: "var(--text-body)", paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
                {isHigh ? (
                  <>
                    <li>Schedule a consultation with a certified thoracic oncologist / pulmonologist.</li>
                    <li>Inquire about low-dose computed tomography (LDCT) chest screening.</li>
                    <li>Monitor progression of chronic cough or persistent chest discomfort.</li>
                  </>
                ) : (
                  <>
                    <li>Maintain smoke-free habits and avoid secondhand smoke environments.</li>
                    <li>Undergo periodic regular clinical wellness check-ups.</li>
                    <li>Engage in regular aerobic exercises to support healthy lung volume.</li>
                  </>
                )}
              </ul>
            </div>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              fontSize: "0.8rem", 
              color: "var(--text-muted)",
              padding: "0 4px"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Cpu size={14} /> Model: <strong>{result.modelName || "BaggingClassifier (SFS)"}</strong>
              </span>
              <Link to="/history" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                View in history <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Explainable AI (XAI) Attribution Breakdown */}
        {result.featureContributions && result.featureContributions.length > 0 && (
          <div style={{
            marginTop: 20,
            padding: "16px",
            borderRadius: "var(--radius-md)",
            background: "#FFFFFF",
            border: "1px solid var(--border-default)"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#7C3AED" />
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-heading)" }}>
                  Explainable AI (XAI) Biomarker Attribution
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
                SHAP-inspired Feature Contribution
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {result.featureContributions.slice(0, 6).map((item, idx) => (
                <div key={idx} style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: item.present ? "#FEF2F2" : "#F0FDF4",
                  border: item.present ? "1px solid #FECACA" : "1px solid #DCFCE7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1E293B" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748B" }}>
                      Status: {item.present ? "Positive (Active Risk)" : "Absent (Protective)"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: item.present ? "#DC2626" : "#16A34A"
                  }}>
                    {item.present ? `+${item.impact}%` : `-${Math.round(item.impact / 2)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive "What-If" Counterfactual Risk Simulator */}
        <div style={{
          marginTop: 20,
          padding: "16px",
          borderRadius: "var(--radius-md)",
          background: "#FFFFFF",
          border: "1px solid var(--border-default)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sliders size={16} color="#2563EB" />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-heading)" }}>
                Interactive "What-If" Risk Reduction Simulator
              </span>
            </div>
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              style={{
                fontSize: "0.75rem",
                color: "#2563EB",
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: "pointer"
              }}
            >
              {showSimulator ? "Collapse Simulator" : "Expand Simulator"}
            </button>
          </div>

          {showSimulator ? (
            <div style={{
              padding: "14px",
              borderRadius: "8px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0"
            }}>
              <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "0 0 12px" }}>
                Toggle patient lifestyle changes or clinical interventions below to simulate how personalized actions lower risk in real time:
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={!simSmoking} onChange={() => setSimSmoking(!simSmoking)} />
                  <span>Quit Smoking Cigarettes</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={!simAlcohol} onChange={() => setSimAlcohol(!simAlcohol)} />
                  <span>Eliminate Alcohol Intake</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={!simCough} onChange={() => setSimCough(!simCough)} />
                  <span>Treat & Resolve Chronic Cough</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={!simDyspnea} onChange={() => setSimDyspnea(!simDyspnea)} />
                  <span>Manage Dyspnea (Inhaler/Therapy)</span>
                </label>
              </div>

              {/* Dynamic Delta Bar */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: simulatedPercent < originalPercent ? "#ECFDF5" : "#FFFFFF",
                borderRadius: "6px",
                border: simulatedPercent < originalPercent ? "1px solid #A7F3D0" : "1px solid #E2E8F0"
              }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>
                    Simulated Risk Outcome: {simulatedPercent}% ({simulatedPercent >= 50 ? "High Risk" : "Low Risk"})
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    Current Baseline: {originalPercent}%
                  </div>
                </div>

                {riskDelta > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#059669", fontWeight: 700, fontSize: "0.95rem" }}>
                    <TrendingDown size={20} />
                    <span>-{riskDelta}% Risk Drop!</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#64748B" }}>
              Click expand to test how smoking cessation and symptom management directly decrease this patient's lung cancer probability.
            </div>
          )}
        </div>

        {/* Report Review Section */}
        <ReportReviewSection reportReview={result.reportReview} />

        {/* Clinician Review & Notes Panel */}
        {result._id && (
          <div style={{
            marginTop: 20,
            padding: "16px",
            borderRadius: "var(--radius-md)",
            background: "#FFFFFF",
            border: "1px solid var(--border-default)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Stethoscope size={16} color="#0D9488" />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-heading)" }}>
                Clinician Triage & Medical Notes
              </span>
            </div>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Add physician notes, recommended biopsy, or clinical follow-up instructions here..."
              rows={2}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 10
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={doctorEndorsed}
                  onChange={(e) => setDoctorEndorsed(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Mark as Clinically Verified by Attending Physician</span>
              </label>
              <button
                onClick={handleSaveDoctorNotes}
                disabled={isSavingNotes}
                style={{
                  padding: "6px 14px",
                  backgroundColor: "#0D9488",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {isSavingNotes ? "Saving..." : savedNotesSuccess ? "Saved ✓" : "Save Clinical Notes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clinical PDF Dossier Modal */}
      {showPdfModal && (
        <ClinicalReportModal
          result={result}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </>
  );
}

function ReportReviewSection({ reportReview }) {
  const entries = Object.entries(reportReview || {});
  if (entries.length === 0) return null;

  return (
    <div style={{
      marginTop: 20,
      padding: "16px",
      borderRadius: "var(--radius-md)",
      background: "#FFFFFF",
      border: "1px solid var(--border-default)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <FileSearch size={16} color="var(--color-primary)" />
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)" }}>Report OCR Review</span>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
        Automated text check of the reports you uploaded. This is informational only — it does not affect the risk score above.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map(([fieldId, review]) => (
          <ReportReviewRow key={fieldId} label={REVIEW_FIELD_LABELS[fieldId] || fieldId} review={review} />
        ))}
      </div>
    </div>
  );
}

function ReportReviewRow({ label, review }) {
  let Icon = Info;
  let color = "var(--text-muted)";
  let statusText = "";

  if (review.fileValid === false) {
    Icon = AlertTriangle;
    color = "var(--color-rose)";
    statusText = `Invalid file: ${review.reason}`;
  } else if (review.textCheckApplicable === false) {
    Icon = CheckCircle;
    color = "var(--color-success)";
    statusText = "File received and verified.";
  } else if (review.extractionSucceeded === false) {
    Icon = Info;
    color = "var(--color-amber)";
    statusText = review.note;
  } else if (review.likelyRelevant) {
    Icon = CheckCircle;
    color = "var(--color-success)";
    statusText = `This report appears to mention the condition (matched: ${review.matchedKeywords.join(", ")}).`;
  } else {
    Icon = AlertTriangle;
    color = "var(--color-amber)";
    statusText = "This report doesn't appear to mention the condition — you may want to double check it.";
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.8rem" }}>
      <Icon size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 600, color: "var(--text-heading-alt)" }}>{label}</div>
        <div style={{ color: "var(--text-body)" }}>{statusText}</div>
      </div>
    </div>
  );
}
