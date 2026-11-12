import React from "react";
import { Link } from "react-router-dom";
import { 
  Activity, 
  ShieldCheck, 
  Cpu, 
  CheckCircle, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  BarChart, 
  Lock,
  Stethoscope
} from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-page)" }}>
      {/* Top Public Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 48px",
        borderBottom: "1px solid var(--border-default)",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--color-primary), var(--color-sky-accent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
          }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-heading)", letterSpacing: "-0.02em" }}>
              PulmoVision
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Pulmonary Risk Assessment
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/login" className="btn btn-secondary" style={{ padding: "8px 18px", fontSize: "0.875rem" }}>
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: "8px 20px", fontSize: "0.875rem" }}>
            Get Started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero Section with requested Hero Tint Wash */}
      <section style={{
        background: "linear-gradient(180deg, var(--bg-hero-from) 0%, var(--bg-hero-to) 100%)",
        padding: "80px 24px 70px",
        textAlign: "center",
        position: "relative"
      }} className="dot-matrix-bg">
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-ice-blue)",
            color: "var(--color-primary)",
            fontWeight: 700,
            fontSize: "0.85rem",
            marginBottom: 24,
            border: "1px solid #BFDBFE",
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.08)"
          }}>
            <Sparkles size={16} />
            <span>Academic Minor Project 2026 &bull; AI Diagnostic Support</span>
          </div>

          <h1 style={{
            fontSize: "3.2rem",
            fontWeight: 800,
            color: "var(--text-heading)",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: 20
          }}>
            Predicting Lung Cancer Risk with{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-sky-accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Optimized Ensemble AI
            </span>
          </h1>

          <p style={{
            fontSize: "1.15rem",
            color: "var(--text-body)",
            lineHeight: 1.6,
            maxWidth: 680,
            margin: "0 auto 36px"
          }}>
            Leveraging Sequential Forward Feature Elimination and Bagging Decision Tree Ensembles to evaluate patient survey symptoms and deliver actionable risk stratification in milliseconds.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              to="/register"
              className="btn btn-primary"
              style={{ padding: "14px 32px", fontSize: "1.05rem", gap: 8, boxShadow: "var(--shadow-glow)" }}
            >
              <Stethoscope size={20} />
              Launch Assessment Portal
            </Link>
            <Link
              to="/login"
              className="btn btn-secondary"
              style={{ padding: "14px 28px", fontSize: "1.05rem" }}
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Key Pillars Bento Grid */}
      <section style={{ padding: "70px 24px", maxWidth: 1160, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: "2rem", marginBottom: 8 }}>Engineered for Academic & Clinical Excellence</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            Key technological highlights integrated into this full-stack medical prediction system.
          </p>
        </div>

        <div className="grid-3">
          <div className="card card-hoverable" style={{ padding: 32 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--color-ice-blue)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20
            }}>
              <Cpu size={26} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 10 }}>Forward Feature Selection</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
              Greedy forward elimination isolates the most statistically predictive symptoms, eliminating collinearity and maximizing held-out test accuracy.
            </p>
          </div>

          <div className="card card-hoverable" style={{ padding: 32 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--color-teal-bg)",
              color: "var(--color-teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20
            }}>
              <Layers size={26} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 10 }}>Bagging Tree Ensembles</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
              Aggregating 100 bootstrap decision trees reduces predictive variance, producing well-calibrated confidence probabilities for each patient profile.
            </p>
          </div>

          <div className="card card-hoverable" style={{ padding: 32 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--color-success-bg)",
              color: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20
            }}>
              <ShieldCheck size={26} />
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 10 }}>Decoupled Microservice</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
              FastAPI ML backend combined with Node.js & Express REST gateway and MongoDB persistent session storage for clean software engineering separation.
            </p>
          </div>
        </div>
      </section>

      {/* Modern Dark Footer matching specs */}
      <footer style={{
        marginTop: "auto",
        backgroundColor: "var(--bg-dark-footer)",
        color: "var(--text-slate-light)",
        padding: "48px 24px 32px",
      }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 30, marginBottom: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF"
              }}>
                <Activity size={18} />
              </div>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#FFFFFF" }}>PulmoVision</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-caption)", maxWidth: 360, lineHeight: 1.6 }}>
              A high-precision minor project system developed to evaluate machine learning algorithms in early thoracic disease risk detection.
            </p>
          </div>

          <div style={{ display: "flex", gap: 40 }}>
            <div>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#FFFFFF", fontWeight: 700, marginBottom: 12 }}>
                Navigation
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem" }}>
                <Link to="/login" style={{ color: "var(--text-caption)", textDecoration: "none" }}>Portal Login</Link>
                <Link to="/register" style={{ color: "var(--text-caption)", textDecoration: "none" }}>Create Account</Link>
                <Link to="/about" style={{ color: "var(--text-caption)", textDecoration: "none" }}>Model Documentation</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#FFFFFF", fontWeight: 700, marginBottom: 12 }}>
                Compliance
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem", color: "var(--text-caption)" }}>
                <span>Minor Project 2026</span>
                <span>Academic Non-Commercial</span>
                <span>HIPAA-Inspired Design</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 1160,
          margin: "0 auto",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          fontSize: "0.8rem",
          color: "var(--text-caption)"
        }}>
          <div>&copy; 2026 PulmoVision Platform. All academic rights reserved.</div>
          <div>Built with React, Express, MongoDB & FastAPI</div>
        </div>
      </footer>
    </div>
  );
}
