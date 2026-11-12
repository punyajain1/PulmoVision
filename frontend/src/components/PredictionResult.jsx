import React, { useEffect, useMemo, useState } from "react";
import RiskGauge from "./RiskGauge.jsx";
import ClinicalReportModal from "./ClinicalReportModal.jsx";
import predictionService from "../services/predictionService.js";
import { getNextSteps } from "./nextSteps.js";
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

// The 13 yes/no survey answers the What-If simulator can change.
const SIM_FIELDS = [
  { id: "SMOKING", label: "Smoking", modifiable: true },
  { id: "ALCOHOL_CONSUMING", label: "Alcohol consumption", modifiable: true },
  { id: "PEER_PRESSURE", label: "Peer pressure", modifiable: true },
  { id: "YELLOW_FINGERS", label: "Yellow fingers" },
  { id: "ANXIETY", label: "Anxiety" },
  { id: "CHRONIC_DISEASE", label: "Chronic disease" },
  { id: "FATIGUE", label: "Fatigue" },
  { id: "ALLERGY", label: "Allergy" },
  { id: "WHEEZING", label: "Wheezing" },
  { id: "COUGHING", label: "Coughing" },
  { id: "SHORTNESS_OF_BREATH", label: "Shortness of breath" },
  { id: "SWALLOWING_DIFFICULTY", label: "Swallowing difficulty" },
  { id: "CHEST_PAIN", label: "Chest pain" },
];

function surveyAnswers(inputData = {}) {
  const answers = { GENDER: inputData.GENDER, AGE: Number(inputData.AGE) };
  SIM_FIELDS.forEach(({ id }) => { answers[id] = Number(inputData[id]) === 1 ? 1 : 0; });
  return answers;
}

// Real SHAP items have a numeric `shap`. Older records stored hand-made
// weights instead; those are not shown as model explanations.
function shapItems(result) {
  return (result.featureContributions || []).filter((item) => typeof item?.shap === "number");
}

export default function PredictionResult(props) {
  if (!props.result) return null;
  // A new key resets all state (simulator, notes) when a different result is shown.
  return <PredictionResultView key={props.result._id || "unsaved"} {...props} />;
}

function PredictionResultView({ result, onUpdate }) {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // What-If simulator: changed answers, re-scored by the real model
  const originalAnswers = useMemo(() => surveyAnswers(result.inputData), [result.inputData]);
  const [simAnswers, setSimAnswers] = useState(originalAnswers);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const changedFields = SIM_FIELDS.filter(({ id }) => simAnswers[id] !== originalAnswers[id]);
  const modelFeatures = result.modelFeatures || [];
  
  // Doctor notes state
  const [doctorNotes, setDoctorNotes] = useState(result.clinicalNotes || "");
  const [doctorEndorsed, setDoctorEndorsed] = useState(result.doctorReviewed || false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);

  const isHigh = result.prediction === "High Risk";
  const probability = result.probability ?? 0;
  const explanation = shapItems(result);
  const nextSteps = getNextSteps({ isHigh, lowConfidence: result.lowConfidence });

  useEffect(() => {
    if (changedFields.length === 0) {
      setSimResult(null);
      setSimError("");
      return undefined;
    }
    // Wait briefly so several quick toggles cause one request.
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSimLoading(true);
      setSimError("");
      try {
        const res = await predictionService.simulatePrediction(simAnswers);
        if (!cancelled) setSimResult(res);
      } catch (err) {
        if (!cancelled) { setSimResult(null); setSimError(err.message); }
      } finally {
        if (!cancelled) setSimLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simAnswers]);

  const toggleSim = (id) => setSimAnswers((prev) => ({ ...prev, [id]: prev[id] === 1 ? 0 : 1 }));

  const originalPercent = Math.round(probability * 1000) / 10;
  const simulatedPercent = simResult ? Math.round(simResult.probability * 1000) / 10 : null;
  const riskDelta = simulatedPercent === null ? 0 : Math.round((simulatedPercent - originalPercent) * 10) / 10;

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
            <RiskGauge probability={probability} threshold={result.threshold} lowConfidence={result.lowConfidence} />
          </div>

          {/* Next steps & Model Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: "#FFFFFF",
              border: "1px solid var(--border-default)"
            }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 6 }}>
                {nextSteps.title}
              </div>
              <ul style={{ fontSize: "0.85rem", color: "var(--text-body)", paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
                {nextSteps.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 6 }}>{nextSteps.footnote}</div>
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

        {/* Calibration, threshold, uncertainty, conformal set, unusual input */}
        <ReliabilityPanel result={result} />

        {/* SHAP explanation from the deployed model */}
        {explanation.length > 0 && (
          <ShapExplanation
            items={explanation}
            baseValue={result.baseValue}
            probability={probability}
          />
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
                What-If Simulator
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
                Change any answer to see how the same model would score it. Each change re-runs the deployed model; nothing is saved.
                {modelFeatures.length > 0 && (
                  <> The model only uses the answers marked <strong>used by model</strong>; changing the others never changes the result.</>
                )}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, marginBottom: 16 }}>
                {SIM_FIELDS.map(({ id, label, modifiable }) => {
                  const used = modelFeatures.includes(id);
                  const changed = simAnswers[id] !== originalAnswers[id];
                  return (
                    <label key={id} style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer",
                      padding: "6px 8px", borderRadius: 6,
                      background: changed ? "#EFF6FF" : "transparent",
                      border: changed ? "1px solid #BFDBFE" : "1px solid transparent",
                    }}>
                      <input type="checkbox" checked={simAnswers[id] === 1} onChange={() => toggleSim(id)} />
                      <span style={{ color: used ? "#0F172A" : "#64748B" }}>
                        {label}
                        {modifiable && <span style={{ color: "#059669", fontSize: "0.7rem" }}> · changeable</span>}
                        {used && <span style={{ color: "#7C3AED", fontSize: "0.7rem", fontWeight: 600 }}> · used by model</span>}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                background: riskDelta < 0 ? "#ECFDF5" : riskDelta > 0 ? "#FFF1F2" : "#FFFFFF",
                borderRadius: "6px",
                border: riskDelta < 0 ? "1px solid #A7F3D0" : riskDelta > 0 ? "1px solid #FECDD3" : "1px solid #E2E8F0"
              }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A" }}>
                    {changedFields.length === 0
                      ? "Change an answer above to run the model again."
                      : simLoading
                        ? "Running the model…"
                        : simError
                          ? `Could not run the model: ${simError}`
                          : simResult
                            ? `With these changes: ${simulatedPercent}% (${simResult.prediction})`
                            : ""}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    Original result: {originalPercent}% ({result.prediction})
                    {changedFields.length > 0 && ` · Changed: ${changedFields.map((f) => f.label).join(", ")}`}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {simResult && !simLoading && riskDelta !== 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: "0.9rem", color: riskDelta < 0 ? "#059669" : "#DC2626" }}>
                      {riskDelta < 0 && <TrendingDown size={18} />}
                      {riskDelta > 0 ? "+" : ""}{riskDelta} points
                    </span>
                  )}
                  {changedFields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSimAnswers(originalAnswers)}
                      style={{ fontSize: "0.75rem", color: "#2563EB", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer" }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: "0.7rem", color: "#94A3B8", margin: "10px 0 0" }}>
                This shows how the model responds, not how a real person's risk would change. The model learned from a small survey dataset.
              </p>
            </div>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#64748B" }}>
              Expand to change answers and see how the deployed model's estimate responds.
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

const pct1 = (v) => `${Math.round(v * 1000) / 10}%`;

const CONFORMAL_TEXT = {
  confident: "Clear result: the conformal check agrees with this label.",
  uncertain: "Not a clear call: at this answer pattern the model can't reliably separate high and low risk.",
  atypical: "This answer pattern is unlike the training data, so the model has no reliable label for it.",
};

function ReliabilityPanel({ result }) {
  // Older records (before model v2.1.0) have none of these fields.
  if (typeof result.threshold !== "number") return null;
  const { uncertainty, conformal, outOfDistribution: ood } = result;

  return (
    <div style={{
      marginTop: 20,
      padding: "16px",
      borderRadius: "var(--radius-md)",
      background: result.lowConfidence ? "#FFFBEB" : "#FFFFFF",
      border: result.lowConfidence ? "1px solid #FDE68A" : "1px solid var(--border-default)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {result.lowConfidence
          ? <AlertTriangle size={16} color="var(--color-amber)" />
          : <ShieldCheck size={16} color="var(--color-success)" />}
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-heading)" }}>
          {result.lowConfidence ? "Low confidence: refer to a doctor rather than rely on this result" : "How reliable is this result?"}
        </span>
      </div>
      <ul style={{ fontSize: "0.8rem", color: "var(--text-body)", paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
        <li>
          <strong>Label:</strong> {result.prediction} because the estimate {result.probability >= result.threshold ? "is at or above" : "is below"} the
          screening threshold of {pct1(result.threshold)}. The threshold was chosen so the model catches at least 90% of positive cases in cross-validation.
        </li>
        {uncertainty && (
          <li>
            <strong>Range:</strong> the model's 100 trees give {pct1(uncertainty.low)} to {pct1(uncertainty.high)}
            {" "}({uncertainty.percentiles?.[0]}th to {uncertainty.percentiles?.[1]}th percentile). A wider range means less agreement.
          </li>
        )}
        {conformal && (
          <li>
            <strong>Conformal check ({Math.round(conformal.coverageTarget * 100)}% coverage):</strong> {CONFORMAL_TEXT[conformal.status] || conformal.status}
          </li>
        )}
        {ood?.flag && ood.reasons.map((reason) => (
          <li key={reason}><strong>Unusual input:</strong> {reason}</li>
        ))}
        {result.calibrated && (
          <li>
            <strong>What the percentage means:</strong> it is calibrated to the study data, in which
            {typeof result.trainingPositiveRate === "number" ? ` ${pct1(result.trainingPositiveRate)} of` : " most"} participants
            had lung cancer. It is not your real-world chance of having lung cancer, which is far lower in the general population.
          </li>
        )}
      </ul>
    </div>
  );
}

function formatPoints(shap) {
  const pts = Math.round(shap * 1000) / 10;
  return `${pts > 0 ? "+" : ""}${pts} pts`;
}

function ShapExplanation({ items, baseValue, probability }) {
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.shap)), 0.0001);
  return (
    <div style={{
      marginTop: 20,
      padding: "16px",
      borderRadius: "var(--radius-md)",
      background: "#FFFFFF",
      border: "1px solid var(--border-default)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} color="#7C3AED" />
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-heading)" }}>
            Why the model gave this result
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600 }}>
          Exact SHAP values from the deployed model
        </span>
      </div>
      {typeof baseValue === "number" && (
        <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "0 0 12px" }}>
          The average estimate across training cases is <strong>{Math.round(baseValue * 1000) / 10}%</strong>.
          The answers below moved it to <strong>{Math.round(probability * 1000) / 10}%</strong>.
          The model uses only these {items.length} answers; your other answers don't change the result.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const up = item.shap > 0;
          const width = `${Math.round((Math.abs(item.shap) / maxAbs) * 100)}%`;
          const answer = item.value === 1 ? "Yes" : item.value === 0 ? "No" : String(item.value ?? "");
          return (
            <div key={item.encodedFeature || item.feature} style={{ display: "grid", gridTemplateColumns: "190px 1fr 80px", alignItems: "center", gap: 10, fontSize: "0.8rem" }}>
              <div>
                <span style={{ fontWeight: 600, color: "#1E293B" }}>{item.label}</span>
                <span style={{ color: "#64748B" }}> · {answer}</span>
              </div>
              <div style={{ background: "#F1F5F9", borderRadius: 4, height: 10, overflow: "hidden" }}>
                <div style={{ width, height: "100%", background: up ? "#F87171" : "#34D399" }} />
              </div>
              <span style={{ textAlign: "right", fontWeight: 700, color: up ? "#DC2626" : "#059669" }}>
                {formatPoints(item.shap)}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "0.7rem", color: "#94A3B8", margin: "10px 0 0" }}>
        Red raises the estimate, green lowers it, in percentage points. This explains the model's behaviour, not medical causes.
      </p>
    </div>
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
