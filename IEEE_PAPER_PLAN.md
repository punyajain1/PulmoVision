# IEEE Paper Plan: PulmoScan AI

> Every result in the paper must come from the code in `ml-service/training/` and be reproducible. Verify every reference below yourself before citing it.

---

## 1. Which paper to write

| Option | Paper | Needs | Strength | Recommended for |
|---|---|---|---|---|
| **A (main)** | Modular multimodal decision-support system: survey risk, chest X-ray nodule/mass detection, CT nodule malignancy, report extraction, deployed as one system | Four models from the upgrade plan | Broad, strong system and evaluation contribution, matches the major project | **The main paper** |
| B | Critical re-evaluation of ML on the Kaggle lung cancer survey dataset: duplicates, imbalance, leakage and feature-selection stability | Model 1 only | Short, honest, quick to finish | A second, shorter paper, or a section of A |
| C | Fusion of risk factors and low-dose CT on NLST | NLST approval | Strongest scientific contribution (true multimodal) | Only if NLST access is approved in time |

**Recommendation:** write **Option A** as the main IEEE conference paper. Use Option B's findings as one results subsection of A. If time remains after A is submitted, expand B into a separate short paper. Start the NLST application now in case Option C becomes possible later.

---

## 2. Working titles (Option A)

1. "PulmoScan AI: A Modular Multimodal Decision-Support System for Lung Cancer Screening Using Survey, Chest X-ray, CT and Radiology Report Data"
2. "An Explainable, Modality-Independent Framework for Lung Cancer Risk Assessment and Nodule Analysis"
3. "Beyond Survey-Based Prediction: A Rigorous Multimodal Pipeline for Lung Cancer Decision Support"

Option B title: "Duplicates, Imbalance and Leakage: A Critical Re-evaluation of Machine Learning on a Public Lung Cancer Survey Dataset"

---

## 3. Contributions (what the paper claims)

Write these as the final bullet list in the Introduction. Claim only what your results support.

1. **A rigorous survey-based risk model.** Nested cross-validation, imbalance handling, calibration and SHAP explanations. A comparison of six feature-selection methods, including sequential forward selection, on both performance and selection stability. A demonstration that duplicates and single random splits inflate reported accuracy on this dataset.
2. **A chest X-ray nodule/mass model** trained on NIH ChestX-ray14 with patient-level splits. External validation on JSRT, and Grad-CAM localization evaluated with the pointing game.
3. **A CT nodule malignancy model** on LIDC-IDRI with patient-level cross-validation, comparing a radiomics + ensemble baseline with 2.5D and 3D CNNs, with a sensitivity analysis on label definitions.
4. **A report-extraction module** comparing rule-based, fine-tuned transformer and LLM extraction on 300 manually annotated reports. Includes a robustness analysis under OCR noise and evidence-grounded outputs.
5. **A deployed, open-source system** that keeps modalities independent, shows provenance and explanations, and measures response time per module. It's designed around privacy, role-based access and clinician review.

---

## 4. Abstract template (≈ 200–250 words)

> Lung cancer remains a leading cause of cancer death, and early detection depends on combining risk factors with imaging findings. Many published machine-learning studies use small survey datasets and report near-perfect accuracy, which often reflects duplicated records and weak evaluation. We present PulmoScan AI, a modular decision-support system with four independently trained and validated components: (i) a survey-based risk model evaluated with nested cross-validation, calibration and SHAP explanations; (ii) a chest X-ray model for nodule and mass detection trained on NIH ChestX-ray14 and externally validated on JSRT; (iii) a CT nodule malignancy model trained on LIDC-IDRI with patient-level cross-validation; and (iv) a radiology report extractor producing evidence-grounded structured findings. On the survey dataset, removing duplicates and using nested cross-validation changed ROC-AUC from [X] to [Y], and forward selection with balanced-accuracy scoring achieved [Z] with Jaccard stability [S]. The X-ray model reached ROC-AUC [A] (95% CI [..]) for nodules on the official test split and [B] on JSRT. The 3D CNN achieved ROC-AUC [C] for nodule malignancy versus [D] for a radiomics baseline. The fine-tuned transformer extractor achieved macro-F1 [E], against [F] for rules and [G] for an LLM, and [H] after OCR degradation. The system runs each module in [T] seconds on CPU. Rather than merging modalities without paired training data, the system presents per-module outputs with provenance for clinician review. Code and model cards are publicly available.

Replace every bracket with real numbers. Don't write the abstract's numbers before the experiments are done.

**Keywords:** lung cancer, decision support, chest X-ray, computed tomography, nodule classification, radiology report extraction, explainable AI, feature selection, nested cross-validation.

---

## 5. Section-by-section outline

Standard IEEE conference papers are usually 6 pages (some allow 8 with extra pages). Check your venue. Approximate space per section for 6 pages:

### I. Introduction (≈ 0.6 page)
- The problem: lung cancer burden, the value of early detection, and how screening works today (risk factors → LDCT).
- The gap: many survey-based ML papers on small datasets with inflated metrics. Imaging models are rarely combined with risk tools in one honest system. Report extraction is rarely evaluated under OCR noise.
- Your approach in one paragraph.
- The contribution list (section 3).

### II. Related Work (≈ 0.7 page)
Four short paragraphs, each ending with how your work differs:
1. Risk prediction from survey and clinical data (PLCOm2012, ML on survey datasets, and their evaluation problems).
2. Chest X-ray deep learning (ChestX-ray14, CheXNet, CheXpert).
3. CT nodule analysis (LIDC-IDRI, LUNA16, radiomics, 3D CNNs, end-to-end LDCT screening by Ardila et al.).
4. Radiology report NLP (NegEx, CheXbert, clinical BERT models, LLM extraction).
Include a **comparison table** of 8–12 prior survey-dataset papers: dataset, deduplicated (Y/N), split method, metric, reported accuracy. This table supports contribution 1.

### III. Datasets (≈ 0.5 page)
A table with one row per dataset: name, modality, size (patients / images / nodules / reports), label source, split method, licence. Then one paragraph per dataset covering cleaning and label definitions (for example LIDC rating rule 1–2 vs 4–5, rating 3 excluded).

### IV. Methodology (≈ 1.5 pages)
- **A. System architecture:** the figure, the modularity rule (no merged score) and its justification (no paired data).
- **B. Survey model:** preprocessing, nested CV design (figure), feature-selection methods, classifiers, imbalance handling, calibration, threshold choice, SHAP.
- **C. X-ray model:** preprocessing, backbone, loss, training settings, Grad-CAM, input gate.
- **D. CT model:** HU conversion, resampling, patch extraction, radiomics baseline, 2.5D and 3D CNNs, augmentation.
- **E. Report model:** schema, annotation and kappa, three extraction approaches, evidence verification.
- **F. Implementation:** frameworks, hardware (Kaggle T4, your Mac's CPU), seeds, ONNX serving.

### V. Experimental Setup (≈ 0.3 page)
Metrics for each module, statistical tests, CI method (bootstrap with 1,000–2,000 resamples), and threshold selection.

### VI. Results (≈ 1.6 pages)
- **A. Survey model:** the effect of duplicates and evaluation protocol (table), the selector × classifier table, stability, calibration, SHAP figure.
- **B. X-ray:** per-label AUC table, external validation, comparison with published baselines, Grad-CAM examples, pointing game.
- **C. CT:** model comparison table, label-definition sensitivity, ablations.
- **D. Report extraction:** approach comparison, OCR robustness, error examples.
- **E. System evaluation:** response time per module (CPU), memory, an end-to-end example.

### VII. Discussion (≈ 0.4 page)
- What the results mean clinically and what they don't.
- Why merging modalities without paired data would be misleading.
- Where Grad-CAM failed (for example focusing on text markers).
- Accuracy versus calibration on small datasets.

### VIII. Limitations and Ethics (≈ 0.2 page)
- Survey dataset size and origin.
- NLP-derived X-ray labels.
- LIDC malignancy is a radiologist rating, not a biopsy result.
- No paired multimodal data and no prospective validation.
- Annotation done by students.
- Privacy and dataset licences. Not a medical device.

### IX. Conclusion and Future Work (≈ 0.2 page)
NLST fusion, automatic CT nodule detection, prospective study, clinician user study.

### References (≈ 25–40 entries, IEEE numeric style)

---

## 6. Tables and figures to produce

**Figures**
1. System architecture diagram.
2. Nested cross-validation diagram.
3. Survey model: ROC and PR curves for the top models, plus the calibration plot before and after calibration.
4. Survey model: SHAP beeswarm.
5. Feature-selection stability: heatmap of how often each feature was selected across outer folds, for each method.
6. X-ray: ROC curves (internal vs. JSRT) and a 2×3 grid of Grad-CAM examples (true positives, a false positive, a false negative).
7. CT: example nodule patches (benign and malignant) with 3D Grad-CAM on three planes.
8. Report extraction: F1 by approach under clean, PDF and OCR-degraded input (grouped bar chart).
9. App screenshot of the result page (optional if space allows).

**Tables**
1. Prior survey-dataset studies and their evaluation issues.
2. Dataset summary.
3. Effect of evaluation protocol on the survey dataset: rows for {with duplicates + random split, deduplicated + random split, deduplicated + nested CV}; columns for accuracy, balanced accuracy, ROC-AUC.
4. Selector × classifier results (ROC-AUC, balanced accuracy, sensitivity, specificity, Brier, number of features, Jaccard stability), mean ± SD.
5. X-ray per-label AUC with CIs (internal and external), with published baselines.
6. CT model comparison and ablations.
7. Report extraction: per-field F1 for rules, BERT and LLM, plus kappa.
8. System response time and memory per module.

---

## 7. Experiment matrix

| ID | Module | Experiment | Output |
|---|---|---|---|
| S1 | Survey | Raw vs. deduplicated data, random split vs. nested CV | Table 3 |
| S2 | Survey | 7 selectors (including none) × 6 classifiers, nested CV | Table 4 |
| S3 | Survey | Imbalance: none vs. class weights vs. SMOTE | Table 4 extra rows or text |
| S4 | Survey | Scoring for SFS: accuracy vs. balanced accuracy vs. ROC-AUC | Text and small table (shows why the original selected only GENDER_F) |
| S5 | Survey | Calibration: none vs. sigmoid vs. isotonic | Figure 3 |
| S6 | Survey | Selection stability (Jaccard) | Figure 5 |
| S7 | Survey | Subgroups by sex and age | Text or appendix |
| X1 | X-ray | DenseNet-121 vs. EfficientNet-B0 vs. ResNet-50 | Table 5 |
| X2 | X-ray | Resolution 224 vs. 320/384 | Ablation text |
| X3 | X-ray | Loss: weighted BCE vs. focal | Ablation text |
| X4 | X-ray | External test on JSRT | Table 5 |
| X5 | X-ray | Grad-CAM pointing game on bounding-box subset | Text and Figure 6 |
| X6 | X-ray | 3 seeds of the final model | Mean ± SD |
| C1 | CT | Radiomics + RF/Bagging vs. 2.5D CNN vs. 3D CNN | Table 6 |
| C2 | CT | Patch size 32 vs. 48 | Table 6 ablation |
| C3 | CT | Label rules: exclude 3 / 3 as benign / mean rating | Table 6 ablation |
| C4 | CT | Inter-reader agreement (Fleiss' kappa) as reference | Text |
| R1 | Report | Annotator agreement (Cohen's kappa) | Table 7 |
| R2 | Report | Rules vs. BERT vs. LLM | Table 7 |
| R3 | Report | Clean text vs. PDF vs. degraded OCR | Figure 8 |
| R4 | Report | Evidence-grounding rate (share of findings with a verified quote) | Text |
| T1 | System | Response time and memory per module on CPU | Table 8 |

---

## 8. Statistical reporting

- Report **95% confidence intervals** for every main metric (bootstrap, 1,000–2,000 resamples, patient-level resampling for imaging).
- For cross-validation, report **mean ± SD across outer folds**.
- Compare AUCs with the **DeLong test**. Compare paired classifiers with **McNemar's test**, and cross-validated scores with the **corrected resampled t-test** (Nadeau & Bengio).
- When you run many comparisons, apply **Holm–Bonferroni** correction or say clearly that the tests are exploratory.
- Always state the **threshold** and how it was chosen (on validation data, never on the test set).
- Report **calibration** (Brier, ECE), not only discrimination.
- Report class counts for every split.

---

## 9. Reporting checklists

Follow these and say so in the paper. Reviewers in medical AI look for them.
- **TRIPOD+AI** (Collins et al., BMJ, 2024): reporting guideline for prediction models built with ML. Use it for the survey model.
- **CLAIM** (Mongan et al., Radiology: Artificial Intelligence, 2020): Checklist for Artificial Intelligence in Medical Imaging. Use it for the X-ray and CT models.
- **Model Cards** (Mitchell et al., FAT* 2019): include them in the repo and mention them.

---

## 10. Starting references (verify each before citing)

**Datasets**
- X. Wang et al., "ChestX-ray8: Hospital-scale chest X-ray database and benchmarks…," CVPR 2017.
- S. G. Armato III et al., "The Lung Image Database Consortium (LIDC) and Image Database Resource Initiative (IDRI)…," Medical Physics, 2011.
- A. A. A. Setio et al., "Validation, comparison, and combination of algorithms for automatic detection of pulmonary nodules in CT images: the LUNA16 challenge," Medical Image Analysis, 2017.
- J. Shiraishi et al., "Development of a digital image database for chest radiographs with and without a lung nodule (JSRT)," AJR, 2000.
- D. Demner-Fushman et al., "Preparing a collection of radiology examinations for distribution and retrieval (IU X-ray / OpenI)," JAMIA, 2016.
- National Lung Screening Trial Research Team, "Reduced lung-cancer mortality with low-dose computed tomographic screening," NEJM, 2011.

**Imaging models and explainability**
- P. Rajpurkar et al., "CheXNet: Radiologist-level pneumonia detection on chest X-rays with deep learning," arXiv, 2017.
- J. Irvin et al., "CheXpert: A large chest radiograph dataset with uncertainty labels and expert comparison," AAAI 2019.
- D. Ardila et al., "End-to-end lung cancer screening with three-dimensional deep learning on low-dose chest computed tomography," Nature Medicine, 2019.
- G. Huang et al., "Densely connected convolutional networks," CVPR 2017.
- R. R. Selvaraju et al., "Grad-CAM: Visual explanations from deep networks via gradient-based localization," ICCV 2017.
- J. J. M. van Griethuysen et al., "Computational radiomics system to decode the radiographic phenotype (PyRadiomics)," Cancer Research, 2017.

**Risk prediction and screening**
- M. C. Tammemägi et al., "Selection criteria for lung-cancer screening (PLCOm2012)," NEJM, 2013.
- US Preventive Services Task Force (A. H. Krist et al.), "Screening for lung cancer: recommendation statement," JAMA, 2021.

**Machine learning methods and evaluation**
- L. Breiman, "Bagging predictors," Machine Learning, 1996.
- S. M. Lundberg and S.-I. Lee, "A unified approach to interpreting model predictions (SHAP)," NeurIPS 2017.
- S. Varma and R. Simon, "Bias in error estimation when using cross-validation for model selection," BMC Bioinformatics, 2006 (nested CV).
- N. V. Chawla et al., "SMOTE: Synthetic minority over-sampling technique," JAIR, 2002.
- E. R. DeLong et al., "Comparing the areas under two or more correlated ROC curves," Biometrics, 1988.
- C. Nadeau and Y. Bengio, "Inference for the generalization error," Machine Learning, 2003.
- L. I. Kuncheva, "A stability index for feature selection," AIAP 2007 (feature-selection stability).
- S. Kaufman et al., "Leakage in data mining: formulation, detection, and avoidance," ACM TKDD, 2012.

**Report NLP**
- W. W. Chapman et al., "A simple algorithm for identifying negated findings and diseases in discharge summaries (NegEx)," J. Biomedical Informatics, 2001.
- E. Alsentzer et al., "Publicly available clinical BERT embeddings," Clinical NLP Workshop, 2019.
- A. Smit et al., "CheXbert: Combining automatic labelers and expert annotations for accurate radiology report labeling using BERT," EMNLP 2020.
- J. Devlin et al., "BERT: Pre-training of deep bidirectional transformers for language understanding," NAACL 2019.

**Reporting**
- G. S. Collins et al., "TRIPOD+AI statement," BMJ, 2024.
- J. Mongan et al., "Checklist for Artificial Intelligence in Medical Imaging (CLAIM)," Radiology: Artificial Intelligence, 2020.
- M. Mitchell et al., "Model cards for model reporting," FAT* 2019.

**Prior survey-dataset papers (for Table 1):** search IEEE Xplore and Google Scholar for "lung cancer survey dataset machine learning", "lung cancer prediction Kaggle survey", and "lung cancer prediction feature selection bagging". Record each paper's preprocessing, split and reported accuracy.

---

## 11. Target venues

Check each venue's current call for papers, deadlines, page limits and fees on its official site, and confirm that the conference is IEEE-sponsored or technically co-sponsored with proceedings in IEEE Xplore.

| Venue | Type | Fit |
|---|---|---|
| IEEE EMBC (Engineering in Medicine & Biology Conference) | International conference | Very good: biomedical AI systems |
| IEEE ISBI (International Symposium on Biomedical Imaging) | International conference | Good for imaging-heavy versions |
| IEEE BIBM (Bioinformatics and Biomedicine) | International conference | Good: medical informatics and AI |
| IEEE ICHI (Healthcare Informatics) | International conference | Very good: systems, NLP and deployment |
| IEEE INDICON, IEEE CONECCT and other IEEE India Council or Section conferences | National/international conferences | Realistic for student work, IEEE Xplore indexed |
| IEEE Access | Open-access journal | Possible for an extended version later (charges an article processing fee) |
| IEEE Journal of Biomedical and Health Informatics (JBHI) | Journal | Hard. Only with strong results, for example NLST fusion |

---

## 12. Formatting and submission

- Use the official **IEEE conference template** (`IEEEtran` LaTeX on Overleaf, or the Word template). Don't change margins or font sizes.
- Use IEEE numeric citations, cited in order of first appearance.
- Figures must be readable in black and white with large fonts. Use vector PDFs for plots (`plt.savefig("fig.pdf")`).
- Run **IEEE PDF eXpress** if the venue requires it.
- **Double-blind venues:** remove names, the repo URL and the app URL, and use an anonymous repository link if needed.
- **AI-use disclosure:** IEEE requires that any AI-generated content in the article be disclosed in the acknowledgments section. Disclose any AI help with text, code or figures as the venue requires.
- **Data and code availability statement:** link a public GitHub repo with training scripts, configs, model cards and instructions. Don't include restricted datasets.
- **Ethics statement:** public de-identified datasets only, no human subjects, not a medical device.
- Run a plagiarism check (your institute's tool) before submission, and write every sentence in your own words.

---

## 13. Expected reviewer objections and answers

| Objection | Answer built into the paper |
|---|---|
| "The survey dataset is tiny and over-studied." | That's part of the contribution: you show inflated metrics come from duplicates and weak protocols, and report honest nested-CV results with CIs |
| "Why not fuse the modalities?" | No public paired data exists. A fusion model would be untrained guessing. Modular outputs with provenance are the safer design. NLST fusion is future work |
| "ChestX-ray14 labels are noisy." | Acknowledge it. Use the official patient-wise split, external JSRT validation and the pointing game |
| "LIDC malignancy isn't biopsy-confirmed." | State the label definition precisely, run the sensitivity analysis, and report inter-reader agreement |
| "Your AUC is lower than paper X." | Show split and protocol differences. Report CIs. Honest numbers are better than inflated ones |
| "Grad-CAM isn't proof of correct reasoning." | Agree. Report the pointing game quantitatively and show failure cases |
| "LLM extraction might hallucinate." | Evidence-substring verification, plus the share of findings that were rejected |
| "Is this clinically validated?" | No. It's stated as a limitation. Propose a prospective or reader study as future work |
| "Novelty?" | The combination: rigorous re-evaluation, stability analysis, external validation, OCR-robust grounded extraction, and an honest modular deployed system |

---

## 14. Paper timeline (alongside the 16-week build plan)

| Week | Paper work |
|---|---|
| 1–2 | Pick the venue and note deadlines. Set up the Overleaf template. Collect 30–40 references |
| 3–4 | Write Related Work and the Table 1 survey of prior papers. Draft the survey-model Methods |
| 5–8 | Write the Datasets section and the X-ray Methods. Produce survey-model figures and tables (S1–S7) |
| 9–12 | Write CT and Report Methods. Produce X-ray results (X1–X6) |
| 13–14 | Produce CT and report results (C1–C4, R1–R4) and the system response-time table (T1). Write Results |
| 15 | Write Discussion, Limitations, Introduction and Abstract (last, with real numbers) |
| 16 | Internal review by your guide, fix comments, format check, PDF eXpress, submit |

---

## 15. Option B as a second paper (outline)

**Title:** "Duplicates, Imbalance and Leakage: A Critical Re-evaluation of Machine Learning on a Public Lung Cancer Survey Dataset"

1. **Introduction:** many papers report 95–99% accuracy on the Kaggle survey dataset.
2. **Audit of prior work:** a table of 15–20 papers and their protocols.
3. **Dataset analysis:** 309 rows, about 11% exact duplicates, about 86% positive after deduplication, conflicting duplicates, majority-class baseline.
4. **Protocols compared:** raw + random split, deduplicated + random split, deduplicated + repeated stratified CV, deduplicated + nested CV.
5. **Feature selection:** SFS with accuracy vs. balanced accuracy vs. ROC-AUC scoring. Show how accuracy scoring collapses to a single feature (GENDER_F) under imbalance. Report stability across methods.
6. **Results:** the gap between reported and honest metrics, plus calibration.
7. **Recommendations:** a short checklist for future work on small tabular medical datasets.
8. **Conclusion.**

This paper reuses Model 1's experiments (S1–S7), so it needs little extra work.
