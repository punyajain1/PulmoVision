const axios = require("axios");
const env = require("../config/env");

const CLINICAL_SYSTEM_PROMPT = `You are the PulmoDetect Assistant, an advanced clinical oncology and pulmonary risk decision-support AI assistant built for a full-stack clinical research platform.
Your expertise covers:
1. Lung Cancer Risk Factors: Heavy tobacco smoking pack-years, nicotine staining (yellow fingers), chronic obstructive pulmonary disease (COPD/asthma), persistent coughing, dyspnea (shortness of breath), and dysphagia.
2. Clinical Screening Guidelines: USPSTF & NCCN recommendations for annual Low-Dose Computed Tomography (LDCT) screening for high-risk individuals aged 50-80 with a 20+ pack-year smoking history.
3. Machine Learning Architecture: Explainable AI (XAI) feature attribution, Sequential Forward Selection (SFS) for feature elimination, and Bagging Ensemble Classifiers that reduce variance and avoid overfitting on clinical cohorts.
4. Smoking Cessation & Rehabilitation: Evidence-based strategies for reducing lifetime thoracic mortality.

Guidelines:
- Keep answers concise (2-4 paragraphs max), professional, clear, and medically informative.
- Do not provide a formal medical prescription; always advise consulting an attending licensed pulmonologist or thoracic oncologist.`;

const KNOWLEDGE_FALLBACK = [
  {
    triggers: ["ldct", "eligible", "screening", "ct scan"],
    response:
      "According to USPSTF and NCCN guidelines, Low-Dose CT (LDCT) screening is recommended for adults aged 50–80 who have a 20+ pack-year smoking history and currently smoke or have quit within the past 15 years. LDCT detects small pulmonary nodules years before symptoms appear.",
  },
  {
    triggers: ["sfs", "forward selection", "model", "bagging", "algorithm"],
    response:
      "Our system uses Sequential Forward Selection (SFS) coupled with a Bagging Ensemble. SFS starts with an empty set and iteratively adds features that yield the highest cross-validation score gain on the training fold, minimizing colinearity and preventing overfitting.",
  },
  {
    triggers: ["symptom", "cough", "chest pain", "dyspnea", "yellow"],
    response:
      "The top predictive clinical symptoms in the survey pipeline are persistent chronic coughing (>3 weeks), thoracic chest pain, dyspnea (shortness of breath), and swallowing difficulty (dysphagia). Nicotine staining ('yellow fingers') also acts as a high-correlation lifestyle proxy for prolonged heavy tobacco exposure.",
  },
  {
    triggers: ["high", "what should i do", "reduce", "quit", "next step"],
    response:
      "If your stratification index is High, the recommended clinical pathway is: 1) Schedule a consultation with a board-certified Pulmonologist; 2) Request pulmonary function spirometry and LDCT imaging; 3) If you smoke, ask about evidence-based smoking cessation support. This tool estimates risk only and is not a diagnosis.",
  },
];

const FALLBACK_ENGINE = "PulmoDetect built-in answers";

async function generateAIResponse(userPrompt) {
  const apiKey = env.geminiApiKey;

  // 1. Try Gemini API if a key is configured
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
      const response = await axios.post(
        url,
        {
          // Kept separate from the user's text so a message can't simply
          // overwrite the instructions.
          systemInstruction: { parts: [{ text: CLINICAL_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        },
        {
          // Key in a header, not the URL, so it doesn't end up in logs.
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          timeout: 15000,
        }
      );

      const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidate) {
        return {
          response: candidate,
          engine: `Google Gemini (${env.geminiModel})`,
        };
      }
    } catch (err) {
      console.warn(
        "Gemini API call failed, using built-in answers:",
        err.response?.status || err.code || err.message
      );
    }
  }

  // 2. Fallback to built-in answers
  const lower = (userPrompt || "").toLowerCase();
  for (const item of KNOWLEDGE_FALLBACK) {
    if (item.triggers.some((t) => lower.includes(t))) {
      return { response: item.response, engine: FALLBACK_ENGINE };
    }
  }

  return {
    response:
      "PulmoDetect estimates lung cancer risk from survey answers using a Bagging classifier with sequential forward feature selection. It does not diagnose cancer. For a clinical assessment, please consult a pulmonologist or oncology specialist.",
    engine: FALLBACK_ENGINE,
  };
}

module.exports = { generateAIResponse };
