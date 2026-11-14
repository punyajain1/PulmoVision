import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { Activity, ShieldCheck, ArrowRight } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-split-container">
      {/* Left Branding Hero Panel */}
      <div className="auth-hero-panel dot-matrix-bg">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
            }}>
              <Activity size={26} />
            </div>
            <div>
              <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "1.4rem" }}>PulmoDetect</h2>
              <p style={{ color: "#BFDBFE", margin: 0, fontSize: "0.85rem" }}>
                Lung Cancer Risk Assessment
              </p>
            </div>
          </div>

          <div style={{ maxWidth: 440 }}>
            <h1 style={{ color: "#FFFFFF", fontSize: "2.4rem", lineHeight: 1.2, marginBottom: 20 }}>
              Join the Clinical Intelligence Portal
            </h1>
            <p style={{ color: "#E2E8F0", fontSize: "1.05rem", lineHeight: 1.6 }}>
              Set up your research account to run risk assessments, review cross-validated baseline models, and save a history of past assessments.
            </p>
          </div>
        </div>

        <div>
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            maxWidth: 440
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <ShieldCheck size={20} color="#6EE7B7" />
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Safe & Private Data Handling</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#E2E8F0", margin: 0 }}>
              Stored records are partitioned by your user session with full cryptographic hashing.
            </p>
          </div>
          <div style={{ marginTop: 24, fontSize: "0.75rem", color: "#94A3B8" }}>
            &copy; 2026 PulmoDetect Platform. Built for Minor Project Evaluation.
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)", marginBottom: 6 }}>
              Create an account
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.925rem" }}>
              Get started with patient evaluations and analytics.
            </p>
          </div>

          <ErrorMessage message={error} />

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Dr. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="e.g. alex@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password (min 6 chars)</label>
              <input
                id="password"
                type="password"
                minLength={6}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: "12px", marginTop: 8, fontSize: "0.95rem" }}
            >
              {submitting ? "Registering..." : (
                <>
                  Create Clinical Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Already registered?{" "}
            <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
