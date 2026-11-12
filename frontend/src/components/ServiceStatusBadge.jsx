import React, { useEffect, useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, XCircle } from "lucide-react";
import api from "../services/api.js";

// Shows the real status of the backend and the ML model service.
// Free hosting puts services to sleep, so "unavailable" is retried a few times
// (shown as "starting up") before it's reported as down.
const ONLINE_RECHECK_MS = 60000;
const RETRY_MS = 15000;
const RETRIES_BEFORE_DOWN = 6; // about 90 s, longer than a typical cold start

const STYLES = {
  checking: { text: "Checking model service…", Icon: Loader2, color: "#64748B", bg: "#F1F5F9", border: "#E2E8F0" },
  online: { text: "Model service online", Icon: ShieldCheck, color: "var(--color-success)", bg: "var(--color-success-bg)", border: "#A7F3D0" },
  starting: { text: "Model service starting up…", Icon: Loader2, color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
  no_model: { text: "Model not loaded", Icon: AlertTriangle, color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
  down: { text: "Model service unavailable", Icon: XCircle, color: "var(--color-rose)", bg: "#FFF1F2", border: "#FECDD3" },
  server_down: { text: "Server unreachable", Icon: XCircle, color: "var(--color-rose)", bg: "#FFF1F2", border: "#FECDD3" },
};

export default function ServiceStatusBadge() {
  const [state, setState] = useState("checking");
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    let failures = 0;

    async function check() {
      let next;
      try {
        const { data } = await api.get("/health", { timeout: 30000 });
        const ml = data?.data?.ml || {};
        if (ml.status === "ok") {
          failures = 0;
          next = "online";
          if (!cancelled) setVersion(ml.modelVersion || null);
        } else if (ml.status === "no_model") {
          next = "no_model";
        } else {
          failures += 1;
          next = failures >= RETRIES_BEFORE_DOWN ? "down" : "starting";
        }
      } catch {
        failures += 1;
        next = failures >= RETRIES_BEFORE_DOWN ? "server_down" : "starting";
      }
      if (cancelled) return;
      setState(next);
      timer = setTimeout(check, next === "online" ? ONLINE_RECHECK_MS : RETRY_MS);
    }

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const s = STYLES[state];
  const spinning = state === "checking" || state === "starting";

  return (
    <div
      title={state === "online" && version ? `Survey model v${version}` : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        background: s.bg,
        color: s.color,
        borderRadius: "var(--radius-full)",
        fontSize: "0.8rem",
        fontWeight: 600,
        border: `1px solid ${s.border}`,
      }}
    >
      <s.Icon size={14} className={spinning ? "spin" : undefined} />
      {s.text}
      {state === "online" && version && <span style={{ fontWeight: 500, opacity: 0.8 }}>· v{version}</span>}
    </div>
  );
}
