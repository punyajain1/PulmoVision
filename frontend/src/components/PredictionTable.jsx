import React, { useState } from "react";
import { Trash2, Calendar, Cpu, FileDown, CheckCircle2, Clock } from "lucide-react";
import ClinicalReportModal from "./ClinicalReportModal.jsx";

export default function PredictionTable({ predictions, onDelete }) {
  const [selectedReport, setSelectedReport] = useState(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "30px 0", textAlign: "center" }}>
        No historical assessments logged. Run a prediction to record patient telemetry.
      </div>
    );
  }

  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Classification</th>
              <th>Confidence Score</th>
              <th>Triage Status</th>
              <th>Engine / Estimator</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p) => {
              const isHigh = p.prediction === "High Risk";
              const isDoctorVerified = p.doctorReviewed;
              const dateStr = new Date(p.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr key={p._id || p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-heading)" }}>
                      <Calendar size={14} color="var(--text-caption)" />
                      {dateStr}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${isHigh ? "badge-high" : "badge-low"}`}>
                      {p.prediction}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 50,
                        height: 6,
                        background: "#E2E8F0",
                        borderRadius: 999,
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${Math.round(p.probability * 100)}%`,
                          height: "100%",
                          background: isHigh ? "var(--color-rose)" : "var(--color-success)"
                        }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                        {(p.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {isDoctorVerified ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        background: "#DCFCE7",
                        color: "#166534",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}>
                        <CheckCircle2 size={12} /> MD Verified
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        background: "#F1F5F9",
                        color: "#64748B",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}>
                        <Clock size={12} /> Pending Triage
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {p.modelName || "BaggingClassifier (SFS)"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        onClick={() => setSelectedReport(p)}
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.75rem",
                          color: "#2563EB",
                          borderColor: "rgba(37, 99, 235, 0.2)",
                          background: "#EFF6FF"
                        }}
                        title="View & Download PDF Dossier"
                      >
                        <FileDown size={13} />
                        PDF
                      </button>
                      {onDelete && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => onDelete(p._id || p.id)}
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            color: "var(--color-rose)",
                            borderColor: "rgba(225, 29, 72, 0.2)",
                            background: "#FFF1F2"
                          }}
                          title="Delete record"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <ClinicalReportModal
          result={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </>
  );
}
