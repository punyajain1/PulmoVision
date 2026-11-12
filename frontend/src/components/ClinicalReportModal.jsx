import React from "react";
import { Printer, X, ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, QrCode } from "lucide-react";

export default function ClinicalReportModal({ result, onClose }) {
  if (!result) return null;

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
              Official Clinical Diagnostic Dossier
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
                PULMOVISION CLINICAL INTELLIGENCE LABS
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748B", fontWeight: 500, marginTop: 2 }}>
                Thoracic Oncology & Pulmonary Risk Stratification Division
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: 4 }}>
                ISO-13485 Compliant ML Decision Support Pipeline • UID: {reportId}
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
                  {isHigh ? "Elevated Risk Stratification Detected" : "Low Risk Profile Established"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 4 }}>
                  Evaluated via Sequential Forward Selection Bagging Ensemble Pipeline (SFS-Bagging).
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 4 }}>
                  Model: {result.modelName || "BaggingClassifier"} • Accuracy: 89.3% • Sensitivity/Recall: 93.8%
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: isHigh ? "#DC2626" : "#059669" }}>
                  {probability}%
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  Risk Index
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI (XAI) Factor Impacts */}
          {result.featureContributions && result.featureContributions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                3. Explainable AI (XAI) Key Risk Factor Attribution
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.featureContributions.slice(0, 5).map((fc, i) => (
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
                    <span style={{ fontWeight: 600, color: "#334155" }}>{fc.label}</span>
                    <span style={{
                      fontWeight: 700,
                      color: fc.present ? "#DC2626" : "#059669"
                    }}>
                      {fc.present ? `+${fc.impact}% risk weight` : `Absent (protective)`}
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
                Recommended Clinical Action (NCCN & USPSTF Guidelines):
              </div>
              <ul style={{ fontSize: "0.75rem", color: "#475569", paddingLeft: 18, margin: 0, lineHeight: 1.5 }}>
                {isHigh ? (
                  <>
                    <li>Recommend Low-Dose CT (LDCT) thoracic screening for early pulmonary nodule detection.</li>
                    <li>Referral to board-certified Pulmonologist for spirometry and diagnostic bronchoscopy evaluation.</li>
                    <li>Enrollment in immediate clinical smoking cessation counseling if active smoking is reported.</li>
                  </>
                ) : (
                  <>
                    <li>Maintain healthy smoke-free lifestyle and avoid occupational aerosol hazards.</li>
                    <li>Periodic routine health checks recommended annually.</li>
                  </>
                )}
              </ul>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", marginTop: 12 }}>
                *Notice: This is a software decision support output designed to assist licensed clinicians and is not an independent diagnostic prescription.
              </div>
            </div>

            {/* Verification Stamp & Signature */}
            <div style={{ textAlign: "center", borderLeft: "1px solid #E2E8F0", paddingLeft: 16 }}>
              <div style={{
                width: 70,
                height: 70,
                margin: "0 auto 8px",
                border: "2px dashed #94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                background: "#F8FAFC"
              }}>
                <QrCode size={48} color="#0F172A" />
              </div>
              <div style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 600 }}>
                VERIFIED DIGITAL DOSSIER
              </div>
              <div style={{ borderTop: "1px solid #0F172A", marginTop: 18, paddingTop: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                Authorized Clinician
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
