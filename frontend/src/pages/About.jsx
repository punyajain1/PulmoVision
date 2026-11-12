import React, { useEffect, useState } from "react";
import modelService from "../services/modelService.js";
import ModelComparisonChart from "../components/ModelComparisonChart.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { 
  GitBranch, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  FileText, 
  BookOpen, 
  Workflow,
  Sparkles,
  Award,
  AlertTriangle
} from "lucide-react";

export default function About() {
  const [modelInfo, setModelInfo] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [featureHistory, setFeatureHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      modelService.getModelInfo().catch(() => null),
      modelService.getModelComparison().catch(() => null),
      modelService.getFeatureElimination().catch(() => null),
    ])
      .then(([info, comp, fe]) => {
        setModelInfo(info);
        setComparisonData(comp);
        setFeatureHistory(fe);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading model documentation & experimental data..." />;

  return (
    <div>
      {/* Hero Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            padding: 8,
            borderRadius: "var(--radius-md)",
            background: "var(--color-ice-blue)",
            color: "var(--color-primary)"
          }}>
            <BookOpen size={22} />
          </div>
          <h1 style={{ margin: 0 }}>System Architecture & ML Research</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Full documentation of the Machine Learning pipeline, Sequential Forward Elimination methodology, and benchmark evaluations for this college minor project.
        </p>
      </div>

      {/* Overview Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
          <Workflow size={20} color="var(--color-primary)" />
          Methodology: Forward Feature Elimination + Bagging Ensemble
        </h3>
        <p style={{ lineHeight: 1.7, marginBottom: 14 }}>
          This project focuses on resolving the high-dimensionality and collinearity challenges common in clinical survey datasets. Rather than naively utilizing every collected symptom, our pipeline executes a rigorous <strong>Sequential Forward Feature Elimination (SFE)</strong> algorithm with 5-fold cross-validation.
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: 16 }}>
          The optimal subset of clinical indicators is then trained using a <strong>Bagging Ensemble Classifier</strong> (Bootstrap Aggregating with 100 base decision tree estimators). This drastically reduces model variance and minimizes overfitting on patient survey metrics.
        </p>

        {/* 4-Step Pipeline Flow Diagram */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          padding: "18px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>Stage 1</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-heading)", marginTop: 2 }}>Data Ingestion</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Standardization of 15 survey indicators + categorical encoding.</div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>Stage 2</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-heading)", marginTop: 2 }}>Forward Selection</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Greedy search adding features that maximize CV cross-entropy.</div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>Stage 3</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-heading)", marginTop: 2 }}>Bagging Ensemble</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>100 Bootstrap Decision Trees aggregating risk probability.</div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>Stage 4</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-heading)", marginTop: 2 }}>REST Inference</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Sub-100ms FastAPI microservice delivering confidence intervals.</div>
          </div>
        </div>
      </div>

      {/* Model Benchmark Chart Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Comparative Model Benchmark Suite</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Evaluating Baseline vs Forward-Elimination Algorithms (Test Split: 20%)
            </p>
          </div>
          <span className="badge badge-blue">Experimental Data</span>
        </div>

        <ModelComparisonChart data={comparisonData} />

        <div style={{ marginTop: 16, fontSize: "0.825rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-default)", paddingTop: 12 }}>
          * Evaluated models include Logistic Regression, Single Decision Tree, Random Forest (100 estimators), Support Vector Machine (RBF kernel), and Bagging Classifier.
        </div>
      </div>

      {/* Forward Feature Selection Log Card */}
      {featureHistory && featureHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
            <Sparkles size={20} color="var(--color-amber)" />
            Forward Elimination Steps Recorded
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 14 }}>
            Demonstrating step-by-step feature introduction and Cross-Validation score impact:
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Iteration Step</th>
                  <th>Feature Evaluated</th>
                  <th>CV Validation Score</th>
                  <th>Delta Improvement</th>
                </tr>
              </thead>
              <tbody>
                {featureHistory.map((step, idx) => (
                  <tr key={idx}>
                    <td><strong>Step #{step.step}</strong></td>
                    <td><code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4 }}>{step.feature_added}</code></td>
                    <td>{(step.cv_score * 100).toFixed(2)}%</td>
                    <td>
                      <span style={{ color: step.improvement > 0 ? "var(--color-success)" : "var(--text-muted)", fontWeight: 600 }}>
                        {step.improvement === null || step.improvement === Infinity ? "Initial Base" : `+${(step.improvement * 100).toFixed(2)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* College Project Credits & Academic Disclaimer */}
      <div className="card" style={{ background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Award size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Minor Project Submission Details</h3>
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-body)", lineHeight: 1.7 }}>
          This software suite incorporates a 3-tier decoupled architecture: 
          <strong> React Single-Page Application (Frontend)</strong>, 
          <strong> Node.js & Express REST Gateway with MongoDB (Backend)</strong>, and 
          <strong> Python FastAPI & Scikit-learn (Machine Learning Microservice)</strong>. 
          Containerized with Docker Compose for seamless reproducible academic review.
        </div>
      </div>
    </div>
  );
}
