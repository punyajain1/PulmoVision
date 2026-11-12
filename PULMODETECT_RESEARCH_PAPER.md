# Research Paper Plan: PulmoDetect

> This is the plan for one specific IEEE conference paper built on the current PulmoDetect system (survey model v2.1.0). It replaces the broader four-model idea in `IEEE_PAPER_PLAN.md`.
>
> **Number labels used below.** **[final]** = can go in the paper as is. **[prelim]** = real result from the current code, but from the single 56-row test split or a single run; replace it with the experiment-script result before submitting. **[TBD]** = not measured yet.
>
> Check every reference in section 13 on IEEE Xplore or Google Scholar before citing it. They were written from memory.

---

## 1. The paper in one paragraph

Many papers on the public Kaggle lung cancer survey dataset report 95–99% accuracy. We show how those numbers arise and what a trustworthy system looks like instead. First, we re-evaluate the dataset: about 11% of rows are duplicates, 86% of the rest are positive, and accuracy-scored feature selection can collapse to a single meaningless feature while still reporting 86% accuracy. Second, we build a model whose output can be trusted case by case: calibrated probabilities, a sensitivity-first screening threshold, an uncertainty range, class-conditional conformal prediction and an unusual-input check. These combine into a low-confidence flag that picks out most of the model's errors. Every prediction comes with exact SHAP values and a model-driven What-If tool. Third, we deploy the whole pipeline as a web application and evaluate it for response time and usability.

---

## 2. Title, keywords, one-line pitch

**Recommended title**

> **PulmoDetect: Calibrated, Uncertainty-Aware and Explainable Lung Cancer Risk Estimation from Survey Data, with a Re-evaluation of a Public Benchmark**

Alternatives:
1. "Beyond Accuracy: Trustworthy Lung Cancer Risk Estimation from Self-Reported Survey Data"
2. "Knowing When Not to Trust the Model: Conformal Uncertainty and Exact SHAP for Survey-Based Lung Cancer Risk Assessment"
3. "Duplicates, Imbalance and Collapsing Feature Selection: Re-evaluating Machine Learning on a Lung Cancer Survey Dataset" (use this one if the paper ends up focused on the evaluation audit)

**Keywords:** lung cancer, risk estimation, clinical decision support, calibration, conformal prediction, uncertainty quantification, explainable AI, SHAP, feature selection, bagging, data leakage

**Pitch for the cover letter or first slide:** Most survey-based lung cancer models report one inflated accuracy number. We report honest performance and give every individual prediction a calibrated probability, an uncertainty range, an exact explanation and a flag that says when not to trust it.

---

## 3. Why this topic

| Reason | Detail |
|---|---|
| It matches what is already built | The whole reliability and explainability layer is implemented, tested and deployed (v2.1.0) |
| It turns the dataset's weakness into a contribution | Reviewers reject "97% on the Kaggle survey" papers. A paper that explains why those numbers are inflated is new and defensible |
| It has a real, measurable finding | **[prelim]** On the test split, confident predictions were wrong 3.1% of the time (1/32) and flagged ones 20.8% (5/24). That is the paper's headline result once confirmed with cross-validation |
| It needs no new data or GPU | Everything runs on CPU in minutes |
| It includes a human evaluation | A small user study is feasible in 1–2 days and most student papers lack one |

---

## 4. Problem, gap and research questions

### 4.1 Problem
Survey-based risk tools could help people decide when to see a doctor. To be useful, their outputs must be honest about performance, interpretable per person and trustworthy case by case.

### 4.2 Gap in existing work (verify with the literature audit, section 12)
1. **Evaluation:** most papers on this dataset use a single random split, keep duplicate rows and report accuracy on data that is 86% positive.
2. **Probabilities:** models are rarely calibrated, and probabilities are presented as if they were real-world chances.
3. **Uncertainty:** no per-prediction uncertainty or abstention. Every output is presented as equally reliable.
4. **Explanations:** "feature importance" is often global, approximate, or not from the deployed model.
5. **Deployment:** systems are rarely deployed and evaluated with users.

### 4.3 Research questions
| RQ | Question | Answered by |
|---|---|---|
| RQ1 | How much do duplicates, single splits and accuracy-based evaluation inflate reported performance on this dataset? | E1, E2, E4 |
| RQ2 | Does forward feature selection help, and how stable are the features it selects? | E3, E5, E6 |
| RQ3 | Can calibration, a sensitivity-first threshold, conformal prediction and an unusual-input check produce a low-confidence flag that separates reliable from unreliable predictions? | E7 |
| RQ4 | Are the deployed system's explanations understandable and useful to users, and is the system usable and fast enough? | E9, E10, user study |

### 4.4 Hypotheses
- **H1:** Nested cross-validation on deduplicated data gives a clearly lower ROC-AUC than a single random split. **[prelim]** 0.856 vs 0.94–0.96.
- **H2:** Accuracy-scored forward selection on imbalanced data collapses to very few features with near-chance discrimination. Balanced-accuracy scoring with class weights avoids this.
- **H3:** The error rate among predictions flagged as low confidence is significantly higher than among confident predictions.
- **H4:** Participants report better understanding with SHAP explanations shown than with them hidden.

---

## 5. Contributions (final bullet list in the Introduction)

1. **A re-evaluation of a widely used lung cancer survey dataset.** It quantifies how duplicates, class imbalance and evaluation protocol inflate reported results, and documents a failure mode where accuracy-scored forward selection collapses to a single feature.
2. **A comparison of feature selection methods that reports stability,** measured by how consistently each method picks the same features across folds.
3. **A per-prediction reliability layer for a Bagging classifier.** It combines out-of-fold Platt calibration, a sensitivity-first threshold, a tree-spread uncertainty range, class-conditional conformal prediction and an unusual-input check into one low-confidence flag, evaluated for how well it identifies errors.
4. **Exact interventional SHAP explanations** computed by full subset enumeration, which is possible because selection leaves few features, plus a What-If tool that re-queries the deployed model.
5. **An open-source, deployed system** (React, Express, FastAPI) with no fallback outputs, evaluated for response time and usability (SUS score).

Only claim contributions 2 and 5 once their experiments are done.

---

## 6. Current system state (what the paper describes)

### 6.1 Architecture
```
React (Vercel) ──JWT──▶ Express API (Render) ──▶ MongoDB Atlas
                                  │
                                  └──▶ FastAPI ML service (Render, CPU)
                                        model v2.1.0: preprocessing → 4 selected features →
                                        calibrated Bagging (100 trees) → threshold, conformal, OOD
                                        → exact SHAP (16 subsets × 100 background rows)
```
- The backend has **no fallback model.** If the ML service fails, the request returns HTTP 503 and nothing is saved.
- Every saved prediction stores the model version, threshold, uncertainty, conformal set, unusual-input result and SHAP values.

### 6.2 Data
| Item | Value | Status |
|---|---|---|
| Source | Kaggle "Lung Cancer" survey dataset (`mysarahmadbhat/lung-cancer`) | [final] (check licence) |
| Rows / unique rows | 309 / 276 (33 exact duplicates) | [final] |
| Positive rate (unique rows) | 86.2% | [final] |
| Inputs | Gender, age, 13 yes/no items (smoking, yellow fingers, anxiety, peer pressure, chronic disease, fatigue, allergy, wheezing, alcohol, coughing, shortness of breath, swallowing difficulty, chest pain) | [final] |
| Deployed-model split | Stratified 80/20, seed 42: 220 train (190 pos / 30 neg), 56 test (48 / 8) | [final] |

### 6.3 Deployed model v2.1.0
| Component | Setting |
|---|---|
| Preprocessing | Age and binary items standardized, gender one-hot encoded. Columns forced to int64 so every OS gives the same features |
| Feature selection | Greedy forward selection, 5-fold CV balanced accuracy, depth-4 class-weighted decision tree, stop if gain < 0.001 |
| Selected features | ALLERGY → SWALLOWING_DIFFICULTY → PEER_PRESSURE → COUGHING. CV balanced accuracy 0.733 → 0.774 → 0.823 → 0.837; WHEEZING rejected (0.831) [final for this split] |
| Classifier | BaggingClassifier, 100 class-weighted decision trees |
| Calibration | Sigmoid (Platt) fitted on 5-fold out-of-fold predictions (`CalibratedClassifierCV`, `ensemble=False`) |
| Threshold | Highest value with out-of-fold sensitivity ≥ 0.90 → 0.6469 |
| Conformal | Class-conditional (Mondrian) cross-conformal, α = 0.20 (80% coverage per class) |
| Uncertainty | 10th–90th percentile of the 100 trees' calibrated probabilities |
| Unusual input | Age outside training 1st–99th percentile (44.4–80.6), or < 5 training rows with the same 4-answer pattern |
| Low-confidence flag | Conformal set ≠ {threshold label}, or unusual input |
| Explanation | Exact interventional SHAP: 2⁴ = 16 subsets, 100 background training rows. Additivity holds exactly; matches brute-force permutation SHAP within 6×10⁻¹⁷ |

### 6.4 Results available now
| Result | Value | Status |
|---|---|---|
| Original artifact (accuracy-scored SFS) | Selected only `GENDER_F`; test accuracy 0.857 = majority rate; recall 1.0; ROC-AUC **0.406** | [final] as a case study |
| Same with balanced-accuracy scoring but unweighted trees | Every candidate scored 0.5; selected only `SMOKING`; ROC-AUC 0.417 | [final] as a case study |
| Platform bug | Windows (int32) one-hot encoded the binary items into 29 features; Linux/macOS (int64) gives 16 | [final] as a reproducibility lesson |
| Single split, all features, threshold 0.5 (ROC-AUC) | LR 0.943, DT 0.906, RF 0.958, SVM 0.935, Bagging 0.944 | [prelim] |
| Nested CV (5×10 outer, SFS + tuned Bagging, uncalibrated) | ROC-AUC 0.856 ± 0.084; PR-AUC 0.968 ± 0.023; balanced accuracy 0.775 ± 0.092; recall 0.822 ± 0.073; Brier 0.137 ± 0.043 | [prelim]: one pipeline; E3 extends it |
| Calibration (out-of-fold, training split) | Brier 0.147 → 0.097; ECE 0.162 → 0.042 | [prelim] |
| Test split, deployed v2.1.0 | ROC-AUC 0.922; sensitivity 0.979 (47/48); specificity 0.375 (3/8); Brier 0.081 (uncalibrated 0.094) | [prelim] |
| Conformal on test (α = 0.2) | Coverage High 0.833, Low 1.000; 47 single-label, 9 two-label sets. At α = 0.1: 52/56 two-label sets | [prelim] |
| Confident vs flagged | 32 confident, error 3.1%; 24 flagged, error 20.8%; 5 of 6 errors flagged | [prelim] |
| Uncertainty range | Mean width 0.054 (correct) vs 0.257 (wrong) | [prelim] |
| SHAP computation | ≈ 18–27 ms per prediction in-process on a laptop CPU | [prelim]: measure on deployment in E10 |

**Open decision before final experiments:** the selected features don't include smoking or age. E3 must show whether an all-features model (or a different selector) performs as well or better. If it does, consider deploying it and say why in the paper. If the 4-feature model stays, discuss the missing risk factors openly (section 10).

---

## 7. Methodology (what the Methods section must say)

### 7.1 Data preparation
1. Normalize column names, then map 1/2 and YES/NO encodings to 0/1 with explicit int64 types.
2. **Remove exact duplicates before any split.** Report counts before and after, and check for conflicting duplicates (same answers, different label).
3. Fit any imputation inside the pipeline on training folds only. The real data has no missing values; say so.

### 7.2 Evaluation protocols (compared in E1)
| Protocol | Description |
|---|---|
| P1 | Raw data (with duplicates), single 80/20 random split |
| P2 | Deduplicated, single stratified 80/20 split |
| P3 | Deduplicated, repeated stratified 5-fold CV (10 repeats), tuning done on the same folds |
| **P4 (main)** | Deduplicated, **nested CV**: outer repeated stratified 5×10; inner stratified 5-fold for feature selection, tuning, calibration and threshold |

### 7.3 Feature selection methods (E3, E6)
None (all features); sequential forward selection (SFS); sequential backward selection; RFE (`RFECV`); L1-logistic (`SelectFromModel`); mutual information (`SelectKBest`, k tuned). All are fitted inside the inner loop only.

### 7.4 Classifiers (E3)
Logistic regression, decision tree, random forest, **Bagging (decision trees)**, SVM (RBF), and gradient boosting (XGBoost or LightGBM). Use small hyperparameter grids, because the data is small.

### 7.5 Imbalance handling (E5)
None, class weights (`class_weight="balanced"`), or SMOTE inside an `imblearn` pipeline on training folds only.

### 7.6 Reliability layer (E7), fitted on training folds only
- **Calibration:** Platt scaling on out-of-fold scores. Report Brier score, ECE (10 bins) and reliability diagrams, before and after.
- **Threshold:** highest value with out-of-fold sensitivity ≥ 0.90.
- **Uncertainty:** 10th–90th percentile of per-tree calibrated probabilities.
- **Conformal:** Mondrian cross-conformal with nonconformity 1 − p̂(y|x). Prediction set = {c : 1 − p̂(c|x) ≤ q_c}. Report α = 0.1 and 0.2.
- **Unusual input:** the age range and answer-pattern support rules from section 6.3.
- **Low-confidence flag:** conformal set ≠ {label}, or unusual input.

State that the conformal guarantee is approximate. It is cross-conformal on out-of-fold predictions, not split conformal with a separate calibration set.

### 7.7 Explanations
- **Exact interventional SHAP.** For k selected features, compute v(S) = mean over background rows b of f(x_S, b_rest) for all 2^k subsets, then the Shapley formula. Additivity is exact: base + Σφ = f(x).
- **What-If.** Re-query the deployed model with changed answers, showing which answers the model actually uses.
- State clearly that explanations describe the model's behaviour, not medical causes.

### 7.8 Metrics and statistics
- **Discrimination:** ROC-AUC, PR-AUC (compare against the positive rate of 0.86).
- **Threshold metrics:** sensitivity, specificity, balanced accuracy, PPV, NPV, F1, MCC.
- **Calibration:** Brier score, ECE, reliability diagram.
- **Reliability:** conformal coverage per class, set-size distribution, share of predictions flagged, error rate in each group, interval width in correct vs wrong predictions.
- **Uncertainty of results:** mean ± SD over outer folds, plus a 95% bootstrap CI (2,000 resamples) on pooled out-of-fold predictions.
- **Tests:**
  - DeLong for AUC differences
  - Nadeau–Bengio corrected resampled t-test for CV metrics
  - Fisher's exact test for flagged vs confident error rates
  - Wilcoxon signed-rank for user-study comparisons
  - Holm correction when there are many comparisons

---

## 8. Experiments

All experiments go in one script, `ml-service/training/survey/paper_experiments.py`, writing to `ml-service/results/paper/`. Fix every random seed and record library versions in `results/paper/run_info.json`.

| ID | Experiment | Output files | Paper item |
|---|---|---|---|
| E1 | Protocols P1–P4 × {Bagging, LR, RF}, all features | `e1_protocols.csv` | **Table III** |
| E2 | Majority-class and logistic-regression baselines under P4 | rows in `e1_protocols.csv` | Table III |
| E3 | 6 selectors × 6 classifiers under P4, class weights | `e3_grid.csv` | **Table IV** |
| E4 | SFS scored by accuracy / balanced accuracy / ROC-AUC, with and without class weights | `e4_sfs_scoring.csv` (+ selected features per fold) | Table V (small) |
| E5 | Imbalance: none / class weights / SMOTE for Bagging and LR | `e5_imbalance.csv` | Table IV extra rows or text |
| E6 | Selection stability: pairwise Jaccard over the 50 outer folds; how often each feature is selected | `e6_stability.csv`, `fig_stability.pdf` | **Fig. 4** |
| E7 | Full reliability layer inside P4: calibration, threshold, conformal (α = 0.1, 0.2), unusual input, flag error rates, interval width | `e7_reliability.csv`, `fig_reliability.pdf`, `fig_flag_errors.pdf` | **Table VI, Fig. 3, Fig. 5** |
| E8 | Subgroups: sex; age < 60 / 60–69 / ≥ 70 (sensitivity, specificity, AUC with CI) | `e8_subgroups.csv` | Text or appendix table |
| E9 | SHAP: global mean \|SHAP\| over out-of-fold predictions; per-patient example; What-If summary (average change when each changeable answer is switched) | `e9_shap.csv`, `fig_shap.pdf` | **Fig. 6** |
| E10 | Deployed response time: 500 requests to `/api/predictions` and `/predict`, warm and after a cold start; median, p95, max | `e10_latency.csv` | **Table VII** |

**Expected size of the work:** writing the script takes about half a day, and running it on Colab CPU about 1–2 hours. Lower the outer repeats from 10 to 5 if it runs too long.

### Table layouts to fill

**Table III — Effect of evaluation protocol** (ROC-AUC / balanced accuracy, mean ± SD; CI in brackets)

| Protocol | Majority | LR | RF | Bagging |
|---|---|---|---|---|
| P1 raw, single split | | | | |
| P2 dedup, single split | | | | |
| P3 dedup, repeated CV | | | | |
| P4 dedup, nested CV | | | | |

**Table IV — Feature selection × classifier (P4)** (ROC-AUC, balanced accuracy, sensitivity, specificity, Brier, number of features, Jaccard). One row per selector–classifier pair, best per column in bold.

**Table VI — Reliability layer (P4, pooled out-of-fold)**

| | α = 0.1 | α = 0.2 |
|---|---|---|
| Coverage High / Low | | |
| Single-label / two-label / empty sets (%) | | |
| Flagged (%) | | |
| Error rate, confident | | |
| Error rate, flagged | | |
| Fisher p-value | | |
| Brier before → after calibration | | |
| ECE before → after calibration | | |

**Table VII — System response time**

| Endpoint | Warm median | Warm p95 | Cold start |
|---|---|---|---|
| ML `/predict` (with SHAP) | | | |
| ML `/predict?explain=false` | | | |
| Backend `POST /api/predictions` | | | |
| Backend `POST /api/predictions/simulate` | | | |

### Figures
1. **Fig. 1** — System architecture (redraw section 6.1 as a clean diagram)
2. **Fig. 2** — Nested cross-validation diagram (outer and inner loops, what is fitted where)
3. **Fig. 3** — Reliability diagrams before and after calibration
4. **Fig. 4** — Feature selection frequency heatmap (selectors × features)
5. **Fig. 5** — Error rate for confident vs flagged predictions (bar chart with CIs), and interval width vs correctness
6. **Fig. 6** — SHAP global importance plus one per-patient waterfall
7. **Fig. 7** — App screenshot: result page with reliability panel, SHAP chart and What-If (optional if space allows)

Save plots as vector PDF, readable in black and white, with fonts of at least 8 pt at column width.

---

## 9. User study

### 9.1 Design
- **Participants:** 20–30 adults (students and staff). No patients and no real medical data. Participants answer the survey with **made-up or provided persona answers**, never their own health information.
- **Design:** within-subject. Each participant sees 4 provided personas: 2 with explanations and reliability information shown, 2 with them hidden. Randomize which personas get which condition and the order.
- **Task per persona:** read the result, then answer:
  1. Which answers most affected the result? (score against the SHAP top features)
  2. Should this person rely on this result or see a doctor? (correct answer: see a doctor when the result is flagged)
  3. Likert 1–7: "I understand why the system gave this result", "I trust this result", "The information was useful".
- **After the session:** the 10-item SUS questionnaire, plus 2 open questions (what was confusing, what was useful).
- **Time:** about 15 minutes per participant.

### 9.2 Ethics and consent
- Ask your department whether this needs ethics approval. A minimal-risk usability study with no health data is often exempt, but the institution decides.
- Use a one-paragraph consent text: purpose, voluntary, anonymous, no health data, can stop any time.
- Store only anonymous responses (Google Forms without email collection).

### 9.3 Analysis
- **SUS:** compute the 0–100 score; report mean ± SD and compare against the commonly cited average of 68.
- **Understanding:** top-feature identification accuracy, explanations shown vs hidden (Wilcoxon signed-rank or McNemar).
- **Appropriate reliance:** share of flagged cases where participants chose "see a doctor", shown vs hidden.
- **Likert items:** median (IQR), Wilcoxon signed-rank.

### 9.4 Optional clinician check
If 2–5 doctors are available, ask them to rate 10 personas' explanations and next-step text for clinical sensibility (1–5) and add free comments. Report it as a small qualitative evaluation, not as validation.

---

## 10. Section-by-section writing guide (6-page IEEE conference format)

| Section | Pages | What to write |
|---|---|---|
| Abstract | — | 200–250 words; write last (template in section 11) |
| I. Introduction | 0.6 | Lung cancer burden; why survey tools; the inflated-accuracy problem; trust needs per-case reliability; RQs; contribution list |
| II. Related Work | 0.7 | (a) ML on this dataset, with the audit table; (b) calibration; (c) conformal prediction in medicine; (d) SHAP/XAI in clinical decision support; (e) deployed medical ML systems. End each paragraph with how this work differs |
| III. Dataset | 0.4 | Columns, encoding, duplicates, class balance, conflicting rows, ages. State plainly that it is not a clinical cohort |
| IV. Methods | 1.4 | Protocols (Fig. 2), selectors, classifiers, imbalance handling, reliability layer, exact SHAP, What-If, system (Fig. 1), metrics and statistics |
| V. Results | 1.8 | RQ1: Table III, the collapse case study. RQ2: Table IV, Fig. 4. RQ3: Table VI, Fig. 3, Fig. 5. RQ4: Table VII, SUS, user-study results, Fig. 6 |
| VI. Discussion | 0.5 | Why accuracy misleads at 86% prevalence; the calibrated probability is not a real-world risk; the low-confidence flag as a "refer to a doctor" mechanism; what the selected features mean (and don't); the cost of the sensitivity-first threshold (low specificity) |
| VII. Limitations & Ethics | 0.3 | See section 11.3 |
| VIII. Conclusion | 0.2 | Three-sentence summary plus a short checklist for future work on small medical datasets |
| References | 0.5 | 25–35 entries, IEEE numeric style |

### Key messages for the Discussion
1. **Accuracy is the wrong headline metric here.** A model that always says "positive" scores 86%.
2. **The calibrated probability is calibrated to the dataset, not to reality.** About 86% of training participants had cancer; real-world prevalence is far lower. The app says so to users.
3. **The threshold trade-off is deliberate.** **[prelim]** Sensitivity 0.83 → 0.98 and specificity 1.00 → 0.375 on the test split. Say plainly that this means more false alarms.
4. **The missing risk factors.** If the final model still excludes smoking and age, explain that this reflects the dataset's associations, not medical evidence, and that the What-If tool makes it visible to users rather than hiding it.
5. **Why 80% conformal coverage.** At 90%, almost every case got both labels, which is uninformative. With only 4 binary inputs, many positive and negative participants share the same answer pattern.

### Wording rules
| Use | Avoid |
|---|---|
| "estimates risk", "risk estimation", "decision support" | "detects cancer", "diagnoses", "diagnostic accuracy" |
| "calibrated to the study data" | "probability of having cancer" |
| "the model relies on" | "causes", "biomarkers" (they are survey answers) |
| "low confidence; refer to a doctor" | "the AI is sure" |
| "research prototype" | "clinically validated", "certified" |

---

## 11. Drafts to adapt

### 11.1 Abstract template
> Machine-learning studies on a widely used public lung cancer survey dataset frequently report accuracy above 95%. We show that duplicated records, an 86% positive rate and single-split evaluation inflate these figures: under nested cross-validation on deduplicated data, ROC-AUC falls from [X] to [Y], and accuracy-scored forward feature selection can collapse to a single feature with near-chance discrimination while still reporting 86% accuracy. We then present PulmoDetect, a deployed decision-support system that attaches four reliability signals to every prediction: out-of-fold Platt calibration, a sensitivity-first threshold, a bootstrap-tree uncertainty range and class-conditional conformal prediction, together with an unusual-input check. Combined into a single low-confidence flag, they identified [Z]% of errors: the error rate was [A]% for confident predictions versus [B]% for flagged ones (p = [p]). Each prediction is explained with exact SHAP values computed by full subset enumeration and can be explored with a model-driven What-If tool. Calibration reduced the Brier score from [C] to [D]. In a study with [N] participants the system achieved a SUS score of [S], and explanations improved identification of the most influential answers from [E]% to [F]%. Code and model documentation are publicly available.

### 11.2 Data and code availability
> The dataset is publicly available on Kaggle ([citation]). All code for data preparation, training, evaluation, the reliability layer and the web application is available at [anonymous repository link for review / GitHub link after acceptance]. Every reported number is produced by the scripts in `ml-service/training/` with fixed random seeds; library versions are recorded with the results.

### 11.3 Limitations paragraph
> The dataset is small (276 unique rows), self-reported and of unclear provenance; it is not a clinical or screening cohort, and 86% of participants are positive. Results may therefore not transfer to real populations, and no external validation was possible. Calibrated probabilities reflect the study's prevalence, not real-world risk. The conformal guarantees are approximate because they come from cross-validated predictions rather than a separate calibration set. The selected features exclude established risk factors such as smoking and age, reflecting associations in this dataset rather than medical evidence. The user study used provided personas and non-clinical participants. PulmoDetect is a research prototype and is not intended for clinical use.

### 11.4 Ethics statement
> This work uses a public, de-identified dataset. The user study collected no health information; participants used provided example answers and gave informed consent [and the study was reviewed/exempted by …]. The application displays a disclaimer that it does not diagnose disease and directs users to qualified clinicians, especially when a prediction is flagged as low confidence.

### 11.5 AI-use disclosure (if the venue requires it)
> [State which AI tools were used for code, text or figures, and that the authors reviewed and take responsibility for all content.] Follow the venue's exact wording.

---

## 12. Literature audit (Person C)

### 12.1 Search
Search IEEE Xplore, Google Scholar and Springer for:
- "lung cancer" survey dataset machine learning
- "lung cancer prediction" Kaggle
- "lung cancer" "feature selection" bagging OR "random forest" symptoms
- "lung cancer" risk prediction questionnaire machine learning

Target: 15–20 papers that use **this** dataset (look for the 309-row, 16-column description), plus 5–8 on calibration, conformal prediction and XAI in clinical ML.

### 12.2 Audit table template
| # | Paper (authors, year, venue) | Deduplicated? | Split / CV | Class imbalance handled? | Metrics reported | Best reported result | Calibration / uncertainty? | Explanations? | Deployed? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | Y / N / unclear | single split / k-fold / nested | | | | | | |

Summarize it in the paper as one table (Table I) plus 2–3 sentences, for example: "x of y studies used a single random split; none reported calibration."

---

## 13. Reference starter list (verify every entry)

**Dataset and screening context**
- Kaggle, "Lung Cancer" dataset by mysarahmadbhat (cite the dataset page and access date).
- H. Sung et al., "Global cancer statistics 2020: GLOBOCAN estimates…," *CA: A Cancer Journal for Clinicians*, 2021.
- A. H. Krist et al. (USPSTF), "Screening for lung cancer: US Preventive Services Task Force recommendation statement," *JAMA*, 2021.
- M. C. Tammemägi et al., "Selection criteria for lung-cancer screening," *NEJM*, 2013 (PLCOm2012).

**Evaluation, leakage and model selection**
- S. Varma and R. Simon, "Bias in error estimation when using cross-validation for model selection," *BMC Bioinformatics*, 2006.
- G. C. Cawley and N. L. C. Talbot, "On over-fitting in model selection and subsequent selection bias in performance evaluation," *JMLR*, 2010.
- S. Kapoor and A. Narayanan, "Leakage and the reproducibility crisis in machine-learning-based science," *Patterns*, 2023.
- C. Nadeau and Y. Bengio, "Inference for the generalization error," *Machine Learning*, 2003.
- E. R. DeLong et al., "Comparing the areas under two or more correlated ROC curves," *Biometrics*, 1988.

**Feature selection and stability**
- I. Guyon and A. Elisseeff, "An introduction to variable and feature selection," *JMLR*, 2003.
- L. I. Kuncheva, "A stability index for feature selection," *AIAP*, 2007.
- S. Nogueira, K. Sechidis and G. Brown, "On the stability of feature selection algorithms," *JMLR*, 2018.

**Models and imbalance**
- L. Breiman, "Bagging predictors," *Machine Learning*, 1996.
- N. V. Chawla et al., "SMOTE: Synthetic minority over-sampling technique," *JAIR*, 2002.

**Calibration**
- J. Platt, "Probabilistic outputs for support vector machines and comparisons to regularized likelihood methods," 1999.
- A. Niculescu-Mizil and R. Caruana, "Predicting good probabilities with supervised learning," *ICML*, 2005.
- C. Guo et al., "On calibration of modern neural networks," *ICML*, 2017.

**Conformal prediction**
- V. Vovk, A. Gammerman and G. Shafer, *Algorithmic Learning in a Random World*, Springer, 2005.
- V. Vovk, "Conditional validity of inductive conformal predictors," *ACML*, 2012 (class-conditional / Mondrian).
- A. N. Angelopoulos and S. Bates, "A gentle introduction to conformal prediction and distribution-free uncertainty quantification," *Foundations and Trends in ML*, 2023 (arXiv 2021).

**Explanations**
- L. S. Shapley, "A value for n-person games," 1953.
- S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions," *NeurIPS*, 2017.
- E. Štrumbelj and I. Kononenko, "Explaining prediction models and individual predictions with feature contributions," *Knowledge and Information Systems*, 2014.
- S. Wachter, B. Mittelstadt and C. Russell, "Counterfactual explanations without opening the black box," *Harvard JOLT*, 2017.

**Usability and reporting**
- J. Brooke, "SUS: A 'quick and dirty' usability scale," 1996.
- A. Bangor, P. Kortum and J. Miller, "Determining what individual SUS scores mean," *Journal of Usability Studies*, 2009.
- G. S. Collins et al., "TRIPOD+AI statement," *BMJ*, 2024.
- M. Mitchell et al., "Model cards for model reporting," *FAT\**, 2019.

---

## 14. Venue

Check each candidate's official call for papers for deadline, page limit, review type (single- or double-blind), fees, and that proceedings appear in **IEEE Xplore**.

| Type | Examples | Fit |
|---|---|---|
| IEEE health informatics / biomedical conferences | IEEE EMBC, IEEE ICHI, IEEE BIBM, IEEE BHI | Best topical fit; harder |
| IEEE Section / Council conferences in India | IEEE INDICON, IEEE CONECCT and other IEEE-sponsored regional conferences | Realistic for student work |
| Journal (extended version later) | IEEE Access | Requires a publication fee and a fuller study |

Avoid events that only claim to be "IEEE indexed" without IEEE sponsorship. Ask your guide which conferences your department trusts.

---

## 15. Expected reviewer questions and prepared answers

| Question | Answer (and where it is in the paper) |
|---|---|
| "This dataset is tiny and over-studied." | That is the point of RQ1: we quantify the inflation and report honest, nested-CV results with CIs (Table III) |
| "Your AUC is lower than prior work." | Prior results used single splits, kept duplicates and reported accuracy. Our protocol table shows the same model's score under both (Table III) |
| "Why does the model ignore smoking?" | Forward selection follows this dataset's associations; we report selection stability (Fig. 4), show the effect with the What-If tool, and [compare with the all-features model, Table IV] |
| "Calibrated to what?" | To the study's 86% prevalence, stated in Methods, Discussion and the app itself |
| "Conformal guarantees need exchangeability and a held-out calibration set." | We state the cross-conformal approximation and report empirical coverage under nested CV (Table VI) |
| "Why 80% coverage?" | At 90% the sets were nearly always both labels; we report both levels (Table VI) |
| "Specificity of 0.375 is poor." | It's the cost of the sensitivity-first rule; we report the full trade-off and the flag routes uncertain cases to a doctor |
| "SHAP is not causal." | Agreed and stated; explanations describe model behaviour |
| "Is it clinically validated?" | No; stated as a limitation. The user study tests understanding and usability, not clinical outcome |
| "Novelty?" | The combination: evaluation audit with a documented collapse, per-prediction reliability flag evaluated on error detection, exact SHAP, and a deployed, user-evaluated system without fallback outputs |

---

## 16. Team plan (7 days)

| Day | Person A (ML) | Person B (App) | Person C (Research) |
|---|---|---|---|
| 1 | Run `paper_experiments.py` (once written) on Colab; check E1–E4 | Verify deployment (v2.1.0 live, env vars set, old predictions deleted); reword remaining "diagnostic" UI text | Literature search; start audit table; set up the Overleaf IEEE template |
| 2 | E5–E9; decide final model (section 6.4 decision); retrain if changed | Build the 4 study personas in the app; take screenshots; run E10 latency test | Finish audit table; write Related Work; finalize the user-study form and consent text |
| 3 | Produce final figures (vector PDF) and tables (CSV → LaTeX) | Fix anything found in a 2-person study pilot | Pilot the study with 2 people; recruit 20–30 participants |
| 4 | Write Methods (ML parts) and Results RQ1–RQ3 | Write System section and Results RQ4 (latency) | Run user study sessions |
| 5 | Statistical tests; check every number against `results/paper/` | Analyse user study (SUS, Wilcoxon) with C | Finish study; write Dataset section and user-study Results |
| 6 | Review C's sections for technical accuracy | Repo clean-up: README, model card, reproduce instructions | Write Introduction, Discussion, Limitations; then Abstract with real numbers |
| 7 | Everyone: full read-through; format check (page limit, IEEE template, PDF eXpress if required); plagiarism check; AI-use disclosure; guide review | | |

---

## 17. Pre-submission checklist

**Numbers**
- [ ] Every number in the paper comes from a file in `ml-service/results/paper/` (no hand-typed values)
- [ ] All **[prelim]** values from section 6.4 replaced with experiment results
- [ ] Main metrics have mean ± SD and 95% CIs
- [ ] Majority-class baseline included
- [ ] Threshold, coverage level and how each was chosen are stated

**Methods**
- [ ] Deduplication before splitting is stated
- [ ] Everything fitted inside training folds (selection, tuning, calibration, threshold, conformal) is stated
- [ ] Seeds, library versions and hardware are listed
- [ ] The cross-conformal approximation is stated
- [ ] SHAP background set and size are stated

**Honesty**
- [ ] No "diagnose", "detect cancer", "clinically validated" claims
- [ ] The calibration caveat (study prevalence) appears in Methods and Discussion
- [ ] Low specificity is reported, not hidden
- [ ] Missing risk factors (if the 4-feature model stays) are discussed
- [ ] Limitations and ethics paragraphs included

**Format**
- [ ] Official IEEE template, unchanged margins and fonts
- [ ] Within the page limit
- [ ] Figures readable in black and white
- [ ] References in IEEE style, each one checked
- [ ] Anonymized if double-blind (no names, no repo URL, no app URL)
- [ ] PDF eXpress check passed (if required)
- [ ] AI-use disclosure added (if required)
- [ ] Plagiarism check done

**Reproducibility**
- [ ] Repository has instructions to regenerate every table and figure
- [ ] Model card (`ml-service/README.md`) matches the deployed model
- [ ] The dataset is not committed (it's public on Kaggle; link it instead). Remove `ml-service.zip` from the repository.
