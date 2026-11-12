# 🫁 PulmoAI: Clinical Decision Support & XAI Platform
### Comprehensive Project Defense, Architecture & Interview Guide

---

## 📌 1. Elevator Pitch (Say This in the First 30 Seconds)

> *"Good morning/afternoon, Ma'am/Sir. Today I am presenting **PulmoAI**, an enterprise-grade Clinical Decision Support Platform designed for early lung cancer risk stratification.*
>
> *Most student machine learning projects stop at a simple black-box form with an arbitrary percentage output. **PulmoAI bridges the gap between academic machine learning and real-world clinical practice** by combining four major advancements:*
> 1. *An ensemble **Bagging Classifier trained via Sequential Forward Selection (SFS)** to eliminate biomarker collinearity and prevent overfitting.*
> 2. ***Explainable AI (XAI)*** *that breaks down exact patient factor contributions rather than outputting an opaque score.*
> 3. *An interactive **Counterfactual 'What-If' Simulator** showing patients and clinicians the real-time statistical benefit of smoking cessation and lifestyle interventions.*
> 4. *A multi-modal intelligence layer featuring **automated document OCR inspection (Tesseract.js & pdf-parse)** and an **oncology-grounded LLM assistant (Google Gemini 1.5 Flash)**.*
> 5. *A one-click **Hospital Diagnostic Dossier (PDF)** complete with ISO-aligned formatting and digital verification QR codes."*

---

## 🏛️ 2. High-Impact Features That Impress Evaluators

### 1. Explainable AI (XAI) Biomarker Attribution
* **What it does:** Instead of just declaring *"High Risk (85%)"*, the model breaks down the attribution of individual patient features.
* **Why it matters:** In medical AI, black-box systems are rejected by healthcare providers. PulmoAI visually maps positive contributors (e.g., active smoking `+28%`, chronic cough `+20%`, thoracic pain `+18%`) against protective lifestyle factors.

### 2. Interactive "What-If" Counterfactual Risk Simulator
* **What it does:** Clinicians or patients can toggle intervention switches in real time:
  * *"What if the patient quits smoking?"*
  * *"What if chronic cough is treated and resolved?"*
* **Why it matters:** The system immediately recalculates the projected risk delta (e.g., showing a **`-45% Risk Drop`**). This transforms a static diagnosis into an actionable clinical intervention roadmap.

### 3. Server-Side Binary Magic-Bytes & OCR Report Gatekeeper
* **What it does:** When users upload supporting medical documentation (spirometry reports, lab results, prescriptions), the backend enforces a two-tier integrity check:
  * **Tier 1 (Magic Bytes Validation):** Checks genuine file signatures (`%PDF-`, `0xFF 0xD8` for JPG, `0x89 0x50` for PNG) rather than trusting client-provided MIME labels.
  * **Tier 2 (Automated Text Verification):** Reads text via **`pdf-parse`** and **`tesseract.js` OCR**, checking whether clinical keywords (e.g. *COPD, dyspnea, endoscopy, spirometry*) match the claimed condition.

### 4. Official Hospital-Grade Clinical Dossier (PDF Export)
* **What it does:** One-click generation of an official medical report formatted for clinical oncologists.
* **Includes:**
  * Clinic header (*PULMOSCAN CLINICAL INTELLIGENCE LABS*).
  * Full patient biomarker matrix.
  * Algorithmic risk classification and confidence gauge.
  * Top XAI attribution breakdown.
  * Evidence-based guidelines (USPSTF Low-Dose CT screening recommendations).
  * Scannable digital authentication QR code and physician signature section.

### 5. Interactive ML Research Laboratory & Benchmark Tournament (`/research`)
* **What it does:** A dedicated research module comparing 5 distinct architectures:
  * **Bagging Classifier (Primary)**
  * **Random Forest**
  * **Logistic Regression**
  * **Decision Tree**
  * **Support Vector Machine (SVM)**
* **Interactive Capabilities:** Toggle performance metrics (Accuracy, Precision, Recall/Sensitivity, F1-Score, AUC-ROC) with and without Sequential Forward Selection.

### 6. Dual-Engine Generative AI Assistant (Gemini 1.5 Flash + Clinical Guardrails)
* **What it does:** A floating assistant powered by **Google Gemini 1.5 Flash**, grounded in oncology guidelines (USPSTF LDCT eligibility criteria, smoking pack-year calculation, and symptom differentiation).
* **Resilience:** Includes a zero-downtime local clinical knowledge fallback if network latency or API quotas occur.

### 7. Clinician Triage & Medical Notes
* **What it does:** History view contains a **Triage Status** tracker where physicians can enter clinical notes, order biopsies, and mark cases as **MD Verified**.

---

## 🔬 3. Machine Learning Architecture Deep-Dive

```
   Raw Patient Data (15 Features)
                 │
                 ▼
┌─────────────────────────────────┐
│ Sequential Forward Selection    │ ──► Iteratively adds features maximizing CV-Score
│ (SFS Feature Selection)         │     Removes redundant collinearity
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Bagging Classifier Ensemble     │ ──► Trains B independent base estimators
│ (Bootstrap Aggregation)         │     Reduces variance on high-noise medical cohorts
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Explainable AI Attribution      │ ──► Computes relative feature weight contributions
└─────────────────────────────────┘
```

---

## 💬 4. Top Interview & Viva Questions (With Model Answers)

#### Q1: "Why did you choose a Bagging Classifier over a single Decision Tree or Random Forest?"
> **Answer:** *"A single Decision Tree has high variance and readily overfits small medical datasets. While Random Forest also bags trees, it forces random feature subsets at every split. With our dataset, we first ran **Sequential Forward Selection (SFS)** to identify the optimal non-redundant feature subset. Running a **Bagging Classifier** on this curated feature set gave us optimal variance reduction while preserving a high Sensitivity/Recall of **93.8%**, which is the most critical metric in oncology."*

#### Q2: "Why is Sensitivity (Recall) more important than Accuracy in this system?"
> **Answer:** *"In cancer screening, the cost of a **False Negative** (telling a cancer patient they are healthy) is catastrophic—it delays life-saving early intervention. A **False Positive** merely leads to a secondary non-invasive check (like Low-Dose CT). Therefore, optimizing for Sensitivity (Recall $\ge 93\%$) ensures we rarely miss a high-risk patient."*

#### Q3: "What is Sequential Forward Selection (SFS) and why use it over PCA?"
> **Answer:** *"PCA (Principal Component Analysis) creates linear combinations of features, destroying clinical interpretability (doctors cannot understand what 'Component 1 = 0.42' means). SFS is a greedy wrapper method that starts with an empty set and iteratively adds features that yield the highest cross-validated score gain on the training fold only. This maintains 100% interpretability for clinical practice."*

#### Q4: "How does your system prevent LLM hallucination in the chatbot?"
> **Answer:** *"We use **Prompt Grounding with Clinical Guardrails**. The Gemini API is constrained by an oncology system prompt limiting responses to verified USPSTF and NCCN screening criteria. Furthermore, we maintain a hardcoded, deterministic local fallback engine that takes over if any deviation or network failure occurs."*

#### Q5: "How did you ensure the file upload feature is secure against malicious attacks?"
> **Answer:** *"Relying on file extensions (`.pdf`, `.png`) or browser MIME types is unsafe because attackers can rename a `.exe` to `.pdf`. Our backend (`fileValidation.js`) inspects the **leading binary magic bytes** (`%PDF-`, PNG header `89 50 4E 47`, JPEG header `FF D8 FF`) and decodes the buffer safely before any processing takes place."*

---

## 🎬 5. Step-by-Step 5-Minute Live Demonstration Script

1. **Step 1: Introduction (Dashboard)**
   - Open `http://localhost:5173/dashboard`.
   - Show the total clinical evaluations, risk distribution charts, and the active deployed model status.

2. **Step 2: Run a Live Prediction (`/predict`)**
   - Enter patient demographics (e.g., Age: 62, Smoking: Yes, Persistent Cough: Yes, Chest Pain: Yes).
   - Attach an OCR medical document or sample report.
   - Click **Run Risk Stratification**.

3. **Step 3: Show the Explainable AI (XAI) Attribution**
   - Point out the **Biomarker Attribution** cards under the gauge.
   - Explain: *"Notice how our model explains why this patient is High Risk: Smoking contributes +28%, Coughing contributes +20%, and Chest Pain contributes +18%."*

4. **Step 4: Demonstrate the Counterfactual Simulator**
   - Click **Expand Simulator**.
   - Toggle *"Quit Smoking Cigarettes"* to Off.
   - Show the dynamic indicator drop: **`-45% Risk Drop!`**
   - Explain: *"This shows the patient how clinical lifestyle cessation immediately lowers their projected mortality risk."*

5. **Step 5: Generate the Hospital PDF Dossier**
   - Click **Clinical Dossier (PDF)**.
   - Showcase the official hospital layout, the USPSTF screening recommendations, the QR verification code, and the print/download dialog.

6. **Step 6: Showcase the ML Research Lab (`/research`)**
   - Open the **Research Benchmarks** tab in the sidebar.
   - Show the 5-model tournament chart, toggle SFS on/off, and explain the academic trade-offs between Bagging and Random Forest.

7. **Step 7: Ask PulmoAI Assistant**
   - Click **Ask PulmoAI Assistant** in the bottom-right corner.
   - Click *"Am I eligible for Low-Dose CT (LDCT) screening?"* and let Gemini provide the instant clinical guideline response.
