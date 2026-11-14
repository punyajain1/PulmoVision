"""
Response-time test (paper experiment E10).

Sends N sequential requests to the ML service's /predict endpoint, with and
without SHAP explanations, and writes median / p95 / max latency to
results/paper/e10_latency_<label>.json.

Usage (from ml-service/):
    python training/survey/latency_test.py http://127.0.0.1:8000 local
    python training/survey/latency_test.py https://<your-ml-service>.onrender.com render

Wake a sleeping free-tier service first (open /health) unless you want to
measure the cold start; the first request is reported separately.
"""

import json
import statistics
import sys
import time
from pathlib import Path

import httpx

N = 500
PAYLOAD = {
    "GENDER": "M", "AGE": 62, "SMOKING": 1, "YELLOW_FINGERS": 0, "ANXIETY": 0, "PEER_PRESSURE": 1,
    "CHRONIC_DISEASE": 0, "FATIGUE": 1, "ALLERGY": 1, "WHEEZING": 0, "ALCOHOL_CONSUMING": 0,
    "COUGHING": 1, "SHORTNESS_OF_BREATH": 0, "SWALLOWING_DIFFICULTY": 0, "CHEST_PAIN": 0,
}


def measure(client, url, explain):
    times = []
    for _ in range(N):
        t = time.perf_counter()
        r = client.post(url, json=PAYLOAD, params={"explain": str(explain).lower()})
        r.raise_for_status()
        times.append((time.perf_counter() - t) * 1000)
    times_sorted = sorted(times)
    return {
        "explain": explain, "n": N,
        "first_ms": round(times[0], 1),
        "median_ms": round(statistics.median(times), 1),
        "p95_ms": round(times_sorted[int(0.95 * N) - 1], 1),
        "max_ms": round(times_sorted[-1], 1),
    }


def main():
    base = sys.argv[1].rstrip("/")
    label = sys.argv[2] if len(sys.argv) > 2 else "run"
    with httpx.Client(timeout=120) as client:
        t = time.perf_counter()
        client.get(f"{base}/health").raise_for_status()
        wake_ms = (time.perf_counter() - t) * 1000
        results = {
            "base_url": base, "label": label, "health_first_request_ms": round(wake_ms, 1),
            "with_shap": measure(client, f"{base}/predict", True),
            "without_shap": measure(client, f"{base}/predict", False),
        }
    out = Path(__file__).resolve().parents[2] / "results" / "paper" / f"e10_latency_{label}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
