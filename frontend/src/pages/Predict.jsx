import React, { useState } from "react";
import PredictionForm from "../components/PredictionForm.jsx";
import PredictionResult from "../components/PredictionResult.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import predictionService from "../services/predictionService.js";
import { AlertCircle, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";

export default function Predict() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData) {
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const prediction = await predictionService.createPrediction(formData);
      setResult(prediction);
      // Auto-scroll down to results for smooth UX
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            padding: 8,
            borderRadius: "var(--radius-md)",
            background: "var(--color-ice-blue)",
            color: "var(--color-primary)"
          }}>
            <Stethoscope size={22} />
          </div>
          <h1 style={{ margin: 0 }}>New Patient Evaluation</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Supply patient demographics, lifestyle habits, and observed thoracic symptoms to compute algorithmic risk.
        </p>
      </div>

      {/* Clinical Disclaimer Notice */}
      <div className="clinical-alert">
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Academic & Clinical Project Disclaimer:</strong> This machine learning prediction interface is designed for academic evaluation, minor project demonstrations, and research benchmarking. It does not replace professional diagnostic imaging, biopsies, or clinical judgment.
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Main Assessment Form */}
      <div className="card">
        <PredictionForm onSubmit={handleSubmit} submitting={submitting} />
      </div>

      {/* Dynamic Animated Prediction Result */}
      <PredictionResult result={result} />
    </div>
  );
}
