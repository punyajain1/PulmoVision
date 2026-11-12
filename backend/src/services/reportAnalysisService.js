/**
 * Reads the reports users upload and cross-checks them against what they
 * reported.
 *
 *  - PDFs: the embedded text layer is extracted directly (pdf-parse).
 *  - Images (JPG/PNG/WEBP): the text is read with OCR (tesseract.js).
 *  - The extracted text is then searched for terms that are relevant to the
 *    indicator the report was attached to (e.g. "COPD" / "asthma" for a
 *    Chronic Respiratory Condition report).
 *
 * IMPORTANT LIMITS - please keep these in mind:
 *  - This is a best-effort TEXT check. It tells you whether the uploaded
 *    document appears to discuss the condition. It does not interpret
 *    images/scans clinically and it is not a diagnostic tool.
 *  - A photo with no text (e.g. the Yellow Fingers photo) is only checked for
 *    file integrity - there is no text to read.
 *  - Scanned PDFs with no text layer, handwriting and poor-quality photos may
 *    produce no readable text. That is reported as "could not verify"
 *    (likelyRelevant: null), NOT as a mismatch.
 *  - The result is stored with the prediction for reviewers. It does not
 *    change the ML model's risk score.
 */

const path = require("path");
const { createWorker } = require("tesseract.js");
const { PDFParse } = require("pdf-parse");

const { validateReportFile } = require("../utils/fileValidation");

const OCR_TIMEOUT_MS = 45000;
const OCR_CACHE_DIR = path.join(__dirname, "../../.ocr-cache");
// Use the @tesseract.js-data/eng package installed locally via npm instead of
// letting tesseract.js fetch it from the jsdelivr CDN at runtime. This keeps
// OCR working offline / behind restrictive firewalls and avoids a slow first
// request in production.
const OCR_LANG_PATH = path.join(
  __dirname,
  "../../node_modules/@tesseract.js-data/eng/4.0.0_best_int"
);

// Terms that suggest a document is relevant to each indicator. Each entry is
// matched case-insensitively from a word boundary, so "esophag" matches
// "esophagus" but "ent" can never match inside "treatment".
const KEYWORD_VOCAB = {
  CHRONIC_DISEASE: [
    "asthma", "copd", "chronic obstructive", "bronchitis", "emphysema",
    "pulmonary function", "spirometry", "pulmonolog", "bronchial", "lung disease",
  ],
  COUGHING: [
    "cough", "bronchitis", "respiratory", "sputum", "expectoration",
    "chest x-ray", "chest xray", "x-ray chest", "ct chest", "ct thorax", "pulmonolog",
  ],
  SHORTNESS_OF_BREATH: [
    "dyspn", "shortness of breath", "breathless", "breathing", "spirometry",
    "pulmonary function", "oxygen saturation", "spo2", "respirat", "cardiac",
    "ecg", "ekg", "lung",
  ],
  SWALLOWING_DIFFICULTY: [
    "dysphagia", "swallow", "deglutition", "endoscop", "esophag", "oesophag",
    "gastroenterolog", "gastro", "otolaryngolog", "ent specialist", "ent consultation",
    "ear nose", "barium", "throat", "laryn",
  ],
  CHEST_PAIN: [
    "chest pain", "angina", "ecg", "ekg", "electrocardiogra", "echocardiogra",
    "cardiolog", "cardiac", "troponin", "chest x-ray", "chest xray", "ct chest",
    "thoracic", "pleuritic", "myocardial",
  ],
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatchedKeywords(text, vocab) {
  return vocab.filter((keyword) => new RegExp(`\\b${escapeRegex(keyword)}`, "i").test(text));
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // pdf-parse inserts "-- N of M --" page markers into the text even on
    // blank pages; strip those out before deciding whether real text exists.
    const cleaned = (result.text || "").replace(/--\s*\d+\s*of\s*\d+\s*--/g, "").trim();
    return cleaned;
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromImage(buffer) {
  const worker = await createWorker("eng", 1, {
    cachePath: OCR_CACHE_DIR,
    langPath: OCR_LANG_PATH,
    gzip: true,
  });
  try {
    const { data } = await worker.recognize(buffer);
    return (data.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts text from a validated file. Never throws: any extraction failure
 * is returned as an empty result with an error message, so a flaky OCR run
 * can never block a prediction.
 */
async function extractText(buffer, mime) {
  try {
    const text =
      mime === "application/pdf"
        ? await withTimeout(extractTextFromPdf(buffer), OCR_TIMEOUT_MS, "PDF text extraction")
        : await withTimeout(extractTextFromImage(buffer), OCR_TIMEOUT_MS, "Image OCR");
    return { text, error: null };
  } catch (err) {
    return { text: "", error: err.message };
  }
}

/**
 * Analyzes one uploaded report for one indicator.
 *
 * Result shapes:
 *  { fileValid: false, reason }                                   - corrupt / spoofed file
 *  { fileValid: true, textCheckApplicable: false }                - photo-only indicator
 *  { ..., extractionSucceeded: false, likelyRelevant: null, note } - nothing readable
 *  { ..., extractionSucceeded: true, likelyRelevant: true|false, matchedKeywords, excerpt }
 */
async function analyzeReport(fieldId, report) {
  const validation = validateReportFile(report);
  if (!validation.valid) {
    return { fieldId, fileValid: false, reason: validation.reason };
  }

  const vocab = KEYWORD_VOCAB[fieldId];
  if (!vocab) {
    return {
      fieldId,
      fileValid: true,
      textCheckApplicable: false,
      note: "File integrity verified. No text check applies to this indicator (photo only).",
    };
  }

  const { text, error } = await extractText(validation.buffer, validation.mime);

  if (!text) {
    return {
      fieldId,
      fileValid: true,
      textCheckApplicable: true,
      extractionSucceeded: false,
      likelyRelevant: null,
      note: error
        ? `Could not read this file automatically (${error}).`
        : "No readable text was found in this file (it may be a scan without a text layer, handwriting, or a low-quality photo). It could not be cross-checked automatically.",
    };
  }

  const matchedKeywords = findMatchedKeywords(text, vocab);

  return {
    fieldId,
    fileValid: true,
    textCheckApplicable: true,
    extractionSucceeded: true,
    likelyRelevant: matchedKeywords.length > 0,
    matchedKeywords,
    excerpt: text.replace(/\s+/g, " ").slice(0, 300),
  };
}

/**
 * Analyzes every active indicator that has an attached report and is one of
 * `fieldsToCheck`. Runs in parallel to keep total wait time down.
 */
async function analyzeAllReports(inputData, reports = {}, fieldsToCheck = []) {
  const results = {};

  await Promise.all(
    fieldsToCheck
      .filter((fieldId) => Number(inputData[fieldId]) === 1 && reports[fieldId])
      .map(async (fieldId) => {
        results[fieldId] = await analyzeReport(fieldId, reports[fieldId]);
      })
  );

  return results;
}

module.exports = {
  analyzeReport,
  analyzeAllReports,
  findMatchedKeywords,
  KEYWORD_VOCAB,
};
