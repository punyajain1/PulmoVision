"""
Generates the two schematic figures for the paper (architecture and nested
cross-validation) as vector PDFs, so they match the data figures and need no
external drawing tools.

Usage (from ml-service/):  python training/survey/paper_diagrams.py
"""

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

OUT = Path(__file__).resolve().parents[2] / "results" / "paper"
plt.rcParams.update({"font.size": 8, "font.family": "serif", "pdf.fonttype": 42})


def box(ax, x, y, w, h, text, fc="white"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.04",
                                linewidth=0.9, edgecolor="black", facecolor=fc))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=7.5)


def arrow(ax, x1, y1, x2, y2, text=None, style="-|>"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                                 mutation_scale=9, linewidth=0.9, color="black"))
    if text:
        ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 0.03, text, ha="center", va="bottom", fontsize=6.3)


def architecture():
    fig, ax = plt.subplots(figsize=(3.4, 3.0))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # left column: frontend / API / Mongo stacked; ML service full width at the bottom
    box(ax, 0.06, 0.80, 0.52, 0.15, "React frontend\n(Vercel)", "#eef3fb")
    box(ax, 0.06, 0.56, 0.52, 0.15, "Express API\n(Render)", "#eef3fb")
    box(ax, 0.06, 0.34, 0.52, 0.13, "MongoDB Atlas", "white")
    box(ax, 0.06, 0.03, 0.88, 0.20, "FastAPI ML service (Render, CPU)\n"
        "calibrated Bagging $+$ threshold,\nconformal, OOD, exact SHAP", "#f3eefb")

    # frontend -> API
    arrow(ax, 0.32, 0.80, 0.32, 0.71)
    ax.text(0.34, 0.755, "JWT", ha="left", va="center", fontsize=6.3)
    # API -> Mongo
    arrow(ax, 0.32, 0.56, 0.32, 0.47)
    ax.text(0.34, 0.515, "store", ha="left", va="center", fontsize=6.3)
    # API <-> ML routed down the right-hand side, clear of the Mongo box
    arrow(ax, 0.70, 0.56, 0.70, 0.23)
    ax.text(0.72, 0.40, "/predict", ha="left", va="center", fontsize=6.3)
    arrow(ax, 0.82, 0.23, 0.82, 0.56, style="-|>")
    ax.text(0.84, 0.40, "result\nor 503", ha="left", va="center", fontsize=6.0)
    fig.tight_layout(pad=0.3)
    fig.savefig(OUT / "fig_architecture.pdf")
    plt.close(fig)


def nested_cv():
    fig, ax = plt.subplots(figsize=(3.4, 2.2))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    ax.text(0.5, 0.95, "Outer loop: repeated stratified 5-fold CV (10 repeats)",
            ha="center", fontsize=7.5, style="italic")
    # outer fold strip
    for i in range(5):
        x = 0.04 + i * 0.185
        fc = "#d7d7d7" if i == 4 else "white"
        box(ax, x, 0.66, 0.17, 0.14, "test" if i == 4 else "train", fc)
    ax.text(0.5, 0.60, "train part of each outer fold", ha="center", fontsize=6.8)
    arrow(ax, 0.5, 0.65, 0.5, 0.52)

    box(ax, 0.08, 0.30, 0.84, 0.20,
        "Inner loop: 5-fold CV on training part only\n"
        "feature selection $\\cdot$ Platt calibration $\\cdot$\n"
        "sensitivity-first threshold $\\cdot$ conformal quantiles", "#eef3fb")
    arrow(ax, 0.5, 0.30, 0.5, 0.20)
    box(ax, 0.20, 0.02, 0.60, 0.14, "evaluate once on held-out outer fold", "#d7d7d7")
    fig.tight_layout(pad=0.3)
    fig.savefig(OUT / "fig_nested_cv.pdf")
    plt.close(fig)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    architecture()
    nested_cv()
    print(f"Saved fig_architecture.pdf and fig_nested_cv.pdf to {OUT}")
