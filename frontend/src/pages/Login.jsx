import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { Activity, ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
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
              <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "1.4rem" }}>PulmoVision</h2>
              <p style={{ color: "#BFDBFE", margin: 0, fontSize: "0.85rem" }}>
                Early-stage Pulmonary Diagnostic Model
              </p>
            </div>
          </div>

          <div style={{ maxWidth: 440 }}>
            <h1 style={{ color: "#FFFFFF", fontSize: "2.4rem", lineHeight: 1.2, marginBottom: 20 }}>
              Precision Intelligence for Early Detection
            </h1>
            <p style={{ color: "#E2E8F0", fontSize: "1.05rem", lineHeight: 1.6 }}>
              A high-accuracy Sequential Forward Elimination Bagging framework delivering fast, explainable lung cancer risk stratification.
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
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Academic & Clinical Project</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#E2E8F0", margin: 0 }}>
              Developed as a College Minor Project featuring forward feature optimization and full multi-model comparative analysis.
            </p>
          </div>
          <div style={{ marginTop: 24, fontSize: "0.75rem", color: "#94A3B8" }}>
            &copy; 2026 PulmoVision Platform. Open for Academic Review.
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)", marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.925rem" }}>
              Sign in to access your clinical dashboard & test records.
            </p>
          </div>

          <ErrorMessage message={error} />

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Work / Academic Email</label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. researcher@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label htmlFor="password" style={{ margin: 0 }}>Secure Password</label>
              </div>
              <input
                id="password"
                type="password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
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
              {submitting ? "Authenticating..." : (
                <>
                  Sign in to Workspace <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Need an account?{" "}
            <Link to="/register" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
