// import React, { useState } from "react";
// import { 
//   User, 
//   Heart, 
//   Cigarette, 
//   Activity, 
//   Flame, 
//   CheckCircle2, 
//   RotateCcw,
//   Sparkles,
//   ShieldCheck
// } from "lucide-react";

// const LIFESTYLE_FIELDS = [
//   { id: "SMOKING", label: "Active Smoking History", desc: "Current or regular smoking habits" },
//   { id: "ALCOHOL_CONSUMING", label: "Alcohol Consumption", desc: "Frequent or heavy alcohol intake" },
//   { id: "PEER_PRESSURE", label: "Environmental / Peer Pressure", desc: "Exposure to secondhand smoke or peer triggers" },
// ];

// const SYMPTOM_FIELDS = [
//   { id: "YELLOW_FINGERS", label: "Yellow Fingers / Nails", desc: "Nicotine or pigment deposition" },
//   { id: "ANXIETY", label: "Heightened Anxiety", desc: "Persistent stress or nervous strain" },
//   { id: "CHRONIC_DISEASE", label: "Chronic Respiratory / Lung Condition", desc: "History of bronchitis, COPD or asthma" },
//   { id: "FATIGUE", label: "Unexplained Fatigue", desc: "Persistent physical lethargy or exhaustion" },
//   { id: "ALLERGY", label: "Respiratory Allergies", desc: "Chronic allergic rhinitis or sensitivities" },
//   { id: "WHEEZING", label: "Wheezing Sound in Breath", desc: "Constricted or high-pitched breathing" },
//   { id: "COUGHING", label: "Persistent Chronic Cough", desc: "Long-standing cough lasting > 3 weeks" },
//   { id: "SHORTNESS_OF_BREATH", label: "Shortness of Breath (Dyspnea)", desc: "Difficulty breathing during moderate activity" },
//   { id: "SWALLOWING_DIFFICULTY", label: "Difficulty Swallowing (Dysphagia)", desc: "Pain or discomfort while swallowing" },
//   { id: "CHEST_PAIN", label: "Frequent Chest Pain", desc: "Aching or sharp discomfort in the thoracic region" },
// ];

// const initialValues = {
//   GENDER: "M",
//   AGE: 50,
//   SMOKING: 0,
//   YELLOW_FINGERS: 0,
//   ANXIETY: 0,
//   PEER_PRESSURE: 0,
//   CHRONIC_DISEASE: 0,
//   FATIGUE: 0,
//   ALLERGY: 0,
//   WHEEZING: 0,
//   ALCOHOL_CONSUMING: 0,
//   COUGHING: 0,
//   SHORTNESS_OF_BREATH: 0,
//   SWALLOWING_DIFFICULTY: 0,
//   CHEST_PAIN: 0,
// };

// export default function PredictionForm({ onSubmit, submitting }) {
//   const [formData, setFormData] = useState(initialValues);

//   const toggleField = (field) => {
//     setFormData((prev) => ({
//       ...prev,
//       [field]: prev[field] === 1 ? 0 : 1,
//     }));
//   };

//   const handleReset = () => {
//     setFormData(initialValues);
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     onSubmit({
//       ...formData,
//       AGE: Number(formData.AGE),
//     });
//   };

//   const activeSymptomCount = Object.keys(formData).filter(
//     (k) => k !== "GENDER" && k !== "AGE" && formData[k] === 1
//   ).length;

//   return (
//     <form onSubmit={handleSubmit}>
//       {/* Top bar: Summary counter */}
//       <div style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         padding: "14px 18px",
//         background: "var(--color-ice-blue)",
//         border: "1px solid #BFDBFE",
//         borderRadius: "var(--radius-md)",
//         marginBottom: "24px"
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <Sparkles size={20} color="var(--color-primary)" />
//           <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: 600 }}>
//             Active Indicators Checked: <strong>{activeSymptomCount} / 13</strong>
//           </span>
//         </div>
//         <button
//           type="button"
//           onClick={handleReset}
//           style={{
//             display: "inline-flex",
//             alignItems: "center",
//             gap: 6,
//             background: "transparent",
//             border: "none",
//             color: "var(--text-muted)",
//             fontSize: "0.825rem",
//             cursor: "pointer",
//             fontWeight: 500
//           }}
//         >
//           <RotateCcw size={14} /> Reset Values
//         </button>
//       </div>

//       {/* Group 1: Demographics */}
//       <div style={{ marginBottom: 30 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
//           <User size={18} color="var(--color-primary)" />
//           <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Demographics</h3>
//         </div>

//         <div className="grid-2">
//           <div className="field">
//             <label htmlFor="gender">Biological Sex</label>
//             <select
//               id="gender"
//               value={formData.GENDER}
//               onChange={(e) => setFormData({ ...formData, GENDER: e.target.value })}
//             >
//               <option value="M">Male</option>
//               <option value="F">Female</option>
//             </select>
//           </div>

//           <div className="field">
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//               <label htmlFor="age" style={{ margin: 0 }}>Age (Years)</label>
//               <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-primary)" }}>
//                 {formData.AGE} yrs
//               </span>
//             </div>
//             <input
//               id="age"
//               type="range"
//               min="18"
//               max="95"
//               value={formData.AGE}
//               onChange={(e) => setFormData({ ...formData, AGE: e.target.value })}
//               style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
//             />
//             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-caption)", marginTop: 4 }}>
//               <span>18 yrs</span>
//               <span>55 yrs</span>
//               <span>95 yrs</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Group 2: Lifestyle & Habits */}
//       <div style={{ marginBottom: 30 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
//           <Cigarette size={18} color="var(--color-amber)" />
//           <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Lifestyle & Habits</h3>
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
//           {LIFESTYLE_FIELDS.map((item) => {
//             const isActive = formData[item.id] === 1;
//             return (
//               <div
//                 key={item.id}
//                 className={`toggle-switch-card ${isActive ? "active" : ""}`}
//                 onClick={() => toggleField(item.id)}
//               >
//                 <div>
//                   <div className="toggle-label">{item.label}</div>
//                   <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
//                     {item.desc}
//                   </div>
//                 </div>
//                 <div className="toggle-pill" />
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Group 3: Clinical Symptoms */}
//       <div style={{ marginBottom: 32 }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
//           <Activity size={18} color="var(--color-rose)" />
//           <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Reported Symptoms & Conditions</h3>
//         </div>

//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
//           {SYMPTOM_FIELDS.map((item) => {
//             const isActive = formData[item.id] === 1;
//             return (
//               <div
//                 key={item.id}
//                 className={`toggle-switch-card ${isActive ? "active" : ""}`}
//                 onClick={() => toggleField(item.id)}
//               >
//                 <div>
//                   <div className="toggle-label">{item.label}</div>
//                   <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
//                     {item.desc}
//                   </div>
//                 </div>
//                 <div className="toggle-pill" />
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* Submit Action */}
//       <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 20, display: "flex", justifyContent: "flex-end" }}>
//         <button
//           type="submit"
//           className="btn btn-primary"
//           disabled={submitting}
//           style={{ minWidth: 220, padding: "12px 28px", fontSize: "0.975rem" }}
//         >
//           {submitting ? (
//             <>
//               <div style={{
//                 width: 18,
//                 height: 18,
//                 border: "2px solid #FFFFFF",
//                 borderTopColor: "transparent",
//                 borderRadius: "50%",
//                 animation: "spin 0.8s linear infinite"
//               }} />
//               Calculating Model Risk...
//             </>
//           ) : (
//             <>
//               <ShieldCheck size={18} />
//               Compute Risk Assessment
//             </>
//           )}
//         </button>
//       </div>
      
//       <style>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//       `}</style>
//     </form>
//   );
// }







import React, { useState } from "react";
import {
  User,
  Cigarette,
  Activity,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  UploadCloud,
  Paperclip,
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil
} from "lucide-react";

const LIFESTYLE_FIELDS = [
  { id: "SMOKING", label: "Active Smoking History", desc: "Current or regular smoking habits" },
  { id: "ALCOHOL_CONSUMING", label: "Alcohol Consumption", desc: "Frequent or heavy alcohol intake" },
  { id: "PEER_PRESSURE", label: "Environmental / Peer Pressure", desc: "Exposure to secondhand smoke or peer triggers" },
];

const SYMPTOM_FIELDS = [
  { id: "YELLOW_FINGERS", label: "Yellow Fingers / Nails", desc: "Nicotine or pigment deposition" },
  { id: "ANXIETY", label: "Heightened Anxiety", desc: "Persistent stress or nervous strain" },
  { id: "CHRONIC_DISEASE", label: "Chronic Respiratory / Lung Condition", desc: "History of bronchitis, COPD or asthma" },
  { id: "FATIGUE", label: "Unexplained Fatigue", desc: "Persistent physical lethargy or exhaustion" },
  { id: "ALLERGY", label: "Respiratory Allergies", desc: "Chronic allergic rhinitis or sensitivities" },
  { id: "WHEEZING", label: "Wheezing Sound in Breath", desc: "Constricted or high-pitched breathing" },
  { id: "COUGHING", label: "Persistent Chronic Cough", desc: "Long-standing cough lasting > 3 weeks" },
  { id: "SHORTNESS_OF_BREATH", label: "Shortness of Breath (Dyspnea)", desc: "Difficulty breathing during moderate activity" },
  { id: "SWALLOWING_DIFFICULTY", label: "Difficulty Swallowing (Dysphagia)", desc: "Pain or discomfort while swallowing" },
  { id: "CHEST_PAIN", label: "Frequent Chest Pain", desc: "Aching or sharp discomfort in the thoracic region" },
];

const TOGGLE_FIELDS = [...LIFESTYLE_FIELDS, ...SYMPTOM_FIELDS];

const initialValues = {
  GENDER: "M",
  AGE: 50,
  SMOKING: 0,
  YELLOW_FINGERS: 0,
  ANXIETY: 0,
  PEER_PRESSURE: 0,
  CHRONIC_DISEASE: 0,
  FATIGUE: 0,
  ALLERGY: 0,
  WHEEZING: 0,
  ALCOHOL_CONSUMING: 0,
  COUGHING: 0,
  SHORTNESS_OF_BREATH: 0,
  SWALLOWING_DIFFICULTY: 0,
  CHEST_PAIN: 0,
};

const MAX_REPORT_SIZE_MB = 5;
const ACCEPTED_REPORT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/* ---------------------------------------------------------------------- */
/* Per-indicator clinical follow-up schema                                */
/* ---------------------------------------------------------------------- */
const FOLLOWUP_SCHEMAS = {
  SMOKING: {
    upload: { label: "Previous smoking-related medical records (optional)" },
    questions: [
      { id: "smokerType", label: "Current smoker or former smoker?", type: "select", options: ["Current smoker", "Former smoker"] },
      { id: "productType", label: "Type", type: "select", options: ["Cigarette", "Bidi", "Cigar", "Hookah", "Other"] },
      { id: "perDay", label: "Cigarettes/bidis per day", type: "number" },
      { id: "yearsSmoked", label: "Number of years smoked", type: "number" },
      { id: "ageStarted", label: "Age when started", type: "number" },
      { id: "ageStopped", label: "If stopped, age/year stopped", type: "text", optional: true },
      { id: "quitAttempts", label: "Any previous quit attempts?", type: "yesno" },
    ],
  },
  ALCOHOL_CONSUMING: {
    upload: { label: "Medical/liver-related reports, if relevant (optional)" },
    questions: [
      { id: "type", label: "Type", type: "select", options: ["Beer", "Wine", "Spirits", "Other"] },
      { id: "amount", label: "Amount consumed per occasion", type: "text" },
      { id: "frequency", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Occasionally"] },
      { id: "duration", label: "Duration of consumption", type: "text" },
      { id: "currentOrFormer", label: "Current or former use", type: "select", options: ["Current use", "Former use"] },
      { id: "heavyHistory", label: "Any history of heavy drinking?", type: "yesno" },
    ],
  },
  PEER_PRESSURE: {
    upload: { label: "Workplace exposure documentation / occupational health report (optional)" },
    questions: [
      { id: "exposureType", label: "What type of exposure?", type: "multiselect", options: ["Secondhand cigarette smoke", "Bidi smoke", "Hookah", "Workplace exposure", "Household exposure", "Air pollution", "Occupational chemicals/dust"] },
      { id: "hoursExposure", label: "Hours of exposure per day/week", type: "text" },
      { id: "yearsExposure", label: "Years of exposure", type: "number" },
      { id: "indoorOutdoor", label: "Indoor or outdoor exposure", type: "select", options: ["Indoor", "Outdoor", "Both"] },
      { id: "workplace", label: "Workplace/occupation", type: "text", optional: true },
      { id: "householdSmoker", label: "Does anyone at home smoke?", type: "yesno" },
    ],
  },
  YELLOW_FINGERS: {
    upload: {
      label: "Clear photo of the affected fingers/nails in good lighting",
      note: "This image alone is not used to determine a diagnosis.",
      required: true,
    },
    questions: [
      { id: "duration", label: "How long have you noticed it?", type: "text" },
      { id: "handsAffected", label: "One hand or both?", type: "select", options: ["One hand", "Both hands"] },
      { id: "location", label: "Fingers, nails, or both?", type: "select", options: ["Fingers", "Nails", "Both"] },
      { id: "worsening", label: "Is the discoloration getting worse?", type: "yesno" },
      { id: "smokingStatus", label: "Do you currently smoke or have you smoked previously?", type: "select", options: ["Currently smoke", "Smoked previously", "Never smoked"] },
      { id: "otherSymptoms", label: "Any pain, swelling, or nail changes?", type: "yesno" },
    ],
  },
  ANXIETY: {
    upload: { label: "Previous mental-health assessment/report (optional)" },
    questions: [
      { id: "duration", label: "How long have you experienced it?", type: "text" },
      { id: "frequency", label: "How frequently does it occur?", type: "text" },
      { id: "severity", label: "Severity", type: "select", options: ["Mild", "Moderate", "Severe"] },
      { id: "interferesSleep", label: "Does it interfere with sleep or daily activities?", type: "yesno" },
      { id: "triggers", label: "Any identifiable triggers?", type: "text", optional: true },
      { id: "diagnosed", label: "Has a healthcare professional diagnosed an anxiety disorder?", type: "yesno" },
      { id: "inTreatment", label: "Are you currently receiving treatment?", type: "yesno" },
    ],
  },
  CHRONIC_DISEASE: {
    upload: {
      label: "Pulmonologist/doctor's report stating the diagnosed condition (e.g. Asthma, COPD, chronic bronchitis)",
      required: true,
    },
    questions: [
      { id: "condition", label: "Which condition?", type: "select", options: ["Asthma", "COPD", "Chronic bronchitis", "Emphysema", "Other"] },
      { id: "diagnosedWhen", label: "When were you diagnosed?", type: "text" },
      { id: "severity", label: "Current severity/stage, if known", type: "text", optional: true },
      { id: "medications", label: "Current medications/inhalers", type: "text", optional: true },
      { id: "symptomFrequency", label: "How frequently do symptoms occur?", type: "text" },
      { id: "hospitalizations", label: "Any hospitalizations?", type: "yesno" },
      { id: "priorLungTest", label: "Any previous lung function testing?", type: "yesno" },
    ],
  },
  FATIGUE: {
    upload: { label: "CBC, thyroid tests, recent blood-work, or doctor's evaluation, if available (optional)" },
    questions: [
      { id: "duration", label: "How long has it been occurring?", type: "text" },
      { id: "pattern", label: "Constant or intermittent?", type: "select", options: ["Constant", "Intermittent"] },
      { id: "severity", label: "Severity", type: "select", options: ["Mild", "Moderate", "Severe"] },
      { id: "interferesActivities", label: "Does it interfere with normal activities?", type: "yesno" },
      { id: "weightLoss", label: "Any unexplained weight loss?", type: "yesno" },
      { id: "nightSweats", label: "Fever/night sweats?", type: "yesno" },
      { id: "sleepProblems", label: "Sleep problems?", type: "yesno" },
      { id: "recentIllness", label: "Any recent illness?", type: "yesno" },
      { id: "knownConditions", label: "Any known medical conditions?", type: "text", optional: true },
    ],
  },
  ALLERGY: {
    upload: { label: "Allergy test result or previous respiratory evaluation, if available (optional)" },
    questions: [
      { id: "triggers", label: "What triggers the allergy?", type: "multiselect", options: ["Dust", "Pollen", "Smoke", "Pets", "Chemicals", "Other"] },
      { id: "frequency", label: "How frequently do symptoms occur?", type: "text" },
      { id: "symptoms", label: "Symptoms", type: "multiselect", options: ["Sneezing", "Runny nose", "Nasal congestion", "Cough", "Wheezing", "Breathing difficulty"] },
      { id: "duration", label: "How long have you had them?", type: "text" },
      { id: "diagnosed", label: "Any allergy diagnosis?", type: "yesno" },
      { id: "medication", label: "Current medication?", type: "text", optional: true },
    ],
  },
  WHEEZING: {
    upload: { label: "Spirometry/PFT, chest X-ray/CT, or doctor's respiratory evaluation (optional)" },
    questions: [
      { id: "duration", label: "How long?", type: "text" },
      { id: "frequency", label: "How frequently?", type: "text" },
      { id: "timing", label: "At rest or during exercise?", type: "select", options: ["At rest", "During exercise", "Both"] },
      { id: "nighttime", label: "Does it occur at night?", type: "yesno" },
      { id: "withCough", label: "Is it associated with cough?", type: "yesno" },
      { id: "shortnessOfBreath", label: "Any shortness of breath?", type: "yesno" },
      { id: "historyAsthmaCopd", label: "History of asthma/COPD?", type: "yesno" },
      { id: "smokingHistory", label: "Smoking history?", type: "yesno" },
      { id: "triggers", label: "Does anything trigger it?", type: "text", optional: true },
    ],
  },
  COUGHING: {
    upload: {
      label: "Doctor's/respiratory consultation report (chest X-ray or CT may also be requested depending on clinical assessment)",
      required: true,
    },
    questions: [
      { id: "duration", label: "How long has the cough lasted?", type: "text" },
      { id: "type", label: "Dry or with mucus?", type: "select", options: ["Dry", "With mucus"] },
      { id: "frequency", label: "How frequently?", type: "text" },
      { id: "worsening", label: "Is it getting worse?", type: "yesno" },
      { id: "bloodInSputum", label: "Any blood in sputum?", type: "yesno" },
      { id: "chestPain", label: "Chest pain?", type: "yesno" },
      { id: "shortnessOfBreath", label: "Shortness of breath?", type: "yesno" },
      { id: "fever", label: "Fever?", type: "yesno" },
      { id: "weightLoss", label: "Unexplained weight loss?", type: "yesno" },
      { id: "smokingHistory", label: "Smoking history?", type: "yesno" },
      { id: "knownRespiratoryDisease", label: "Any known respiratory disease?", type: "yesno" },
    ],
  },
  SHORTNESS_OF_BREATH: {
    upload: {
      label: "Physician assessment report",
      required: true,
    },
    questions: [
      { id: "when", label: "When does it occur?", type: "multiselect", options: ["At rest", "Walking", "Climbing stairs", "Exercise", "At night"] },
      { id: "duration", label: "How long has it been happening?", type: "text" },
      { id: "worsening", label: "Has it been getting worse?", type: "yesno" },
      { id: "severity", label: "Severity", type: "select", options: ["Mild", "Moderate", "Severe"] },
      { id: "chestPain", label: "Any chest pain?", type: "yesno" },
      { id: "wheezing", label: "Any wheezing?", type: "yesno" },
      { id: "cough", label: "Any cough?", type: "yesno" },
      { id: "knownCondition", label: "Any known heart/lung condition?", type: "yesno" },
      { id: "smokingHistory", label: "Smoking history?", type: "yesno" },
      { id: "walkTolerance", label: "How far can you walk before you need to stop because of breathing difficulty?", type: "text" },
    ],
  },
  SWALLOWING_DIFFICULTY: {
    upload: {
      label: "ENT / Gastroenterology evaluation report",
      required: true,
    },
    questions: [
      { id: "duration", label: "How long has it been happening?", type: "text" },
      { id: "difficultyWith", label: "Difficulty with", type: "select", options: ["Solid food", "Liquids", "Both"] },
      { id: "painWhileSwallowing", label: "Pain while swallowing?", type: "yesno" },
      { id: "foodStuckFeeling", label: "Feeling that food gets stuck?", type: "yesno" },
      { id: "worsening", label: "Is it getting progressively worse?", type: "yesno" },
      { id: "weightLoss", label: "Any unexplained weight loss?", type: "yesno" },
      { id: "hoarseness", label: "Hoarseness?", type: "yesno" },
      { id: "coughWhileEating", label: "Persistent cough while eating?", type: "yesno" },
      { id: "priorCondition", label: "Any previous throat/esophageal condition?", type: "text", optional: true },
    ],
  },
  CHEST_PAIN: {
    upload: {
      label: "Physician/cardiology/respiratory evaluation report (ECG or chest imaging when clinically indicated)",
      required: true,
    },
    urgentNotice: "If you are currently experiencing severe chest pain along with breathing difficulty, fainting, sweating, or pain spreading to your arm, jaw, or back, please seek urgent medical care now rather than continuing with this form.",
    questions: [
      { id: "location", label: "Where exactly is the pain?", type: "text" },
      { id: "onset", label: "When did it start?", type: "text" },
      { id: "frequency", label: "How often does it occur?", type: "text" },
      { id: "episodeDuration", label: "Duration of each episode", type: "text" },
      { id: "severity", label: "Severity (1-10)", type: "number", min: 1, max: 10 },
      { id: "type", label: "Type", type: "select", options: ["Sharp", "Dull", "Burning", "Pressure/tightness"] },
      { id: "activityRelated", label: "Does it occur during activity or at rest?", type: "select", options: ["During activity", "At rest", "Both"] },
      { id: "radiates", label: "Does it spread to the arm, shoulder, back, neck, or jaw?", type: "yesno" },
      { id: "affectedByBreathing", label: "Does breathing or coughing affect it?", type: "yesno" },
      { id: "shortnessOfBreath", label: "Any shortness of breath?", type: "yesno" },
      { id: "associatedSymptoms", label: "Any sweating, dizziness, or nausea?", type: "yesno" },
      { id: "priorDiagnosis", label: "Previous heart/lung diagnosis?", type: "text", optional: true },
    ],
  },
};

function isAnswered(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function getMissingRequired(schema, answers = {}) {
  return schema.questions.filter((q) => !q.optional && !isAnswered(answers[q.id]));
}

// A field is only complete once its required questions are answered AND,
// for indicators whose upload is mandatory, a report has been attached.
function isFieldComplete(schema, answers, report) {
  const missingQuestions = getMissingRequired(schema, answers);
  const missingUpload = !!schema.upload?.required && !report;
  return missingQuestions.length === 0 && !missingUpload;
}

function buildMissingMessage(schema, answers, report) {
  const missingQuestions = getMissingRequired(schema, answers);
  const missingUpload = !!schema.upload?.required && !report;

  const parts = [];
  if (missingQuestions.length > 0) {
    parts.push(`answer ${missingQuestions.map((q) => q.label).join(", ")}`);
  }
  if (missingUpload) {
    parts.push(`attach the required report (${schema.upload.label})`);
  }

  return parts.length > 0 ? `Please ${parts.join(" and ")}.` : "";
}

export default function PredictionForm({ onSubmit, submitting }) {
  const [formData, setFormData] = useState(initialValues);
  // details: { [fieldId]: { [questionId]: answer } }
  const [details, setDetails] = useState({});
  // reports: { [fieldId]: { fileName, fileType, fileSize, dataUrl } }
  const [reports, setReports] = useState({});
  // ids of fields whose follow-up card is currently open
  const [expandedFields, setExpandedFields] = useState([]);
  // per-field validation message shown inside an open card
  const [cardErrors, setCardErrors] = useState({});
  const [formError, setFormError] = useState("");

  const handleTogglePill = (item) => {
    const isActive = formData[item.id] === 1;

    if (isActive) {
      const hasData =
        Object.values(details[item.id] || {}).some(isAnswered) || !!reports[item.id];
      if (hasData) {
        const confirmed = window.confirm(
          `Remove "${item.label}" and clear its saved details?`
        );
        if (!confirmed) return;
      }
      setFormData((prev) => ({ ...prev, [item.id]: 0 }));
      setDetails((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setReports((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setExpandedFields((prev) => prev.filter((id) => id !== item.id));
      setCardErrors((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } else {
      setFormError("");
      setFormData((prev) => ({ ...prev, [item.id]: 1 }));
      setExpandedFields((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
  };

  const handleBodyClick = (item) => {
    if (formData[item.id] !== 1) {
      handleTogglePill(item);
      return;
    }
    setExpandedFields((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  const handleAnswerChange = (fieldId, questionId, value) => {
    setDetails((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], [questionId]: value },
    }));
  };

  const handleUploadChange = (fieldId, fileData) => {
    setReports((prev) => ({ ...prev, [fieldId]: fileData }));
  };

  const handleRemoveUpload = (fieldId) => {
    setReports((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleDone = (item) => {
    const schema = FOLLOWUP_SCHEMAS[item.id];
    const message = buildMissingMessage(schema, details[item.id], reports[item.id]);
    if (message) {
      setCardErrors((prev) => ({ ...prev, [item.id]: message }));
      return;
    }
    setCardErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setExpandedFields((prev) => prev.filter((id) => id !== item.id));
  };

  const handleReset = () => {
    setFormData(initialValues);
    setDetails({});
    setReports({});
    setExpandedFields([]);
    setCardErrors({});
    setFormError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const activeFields = TOGGLE_FIELDS.filter((f) => formData[f.id] === 1);
    const incomplete = activeFields.find(
      (f) => !isFieldComplete(FOLLOWUP_SCHEMAS[f.id], details[f.id], reports[f.id])
    );

    if (incomplete) {
      const schema = FOLLOWUP_SCHEMAS[incomplete.id];
      setCardErrors((prev) => ({
        ...prev,
        [incomplete.id]: buildMissingMessage(schema, details[incomplete.id], reports[incomplete.id]),
      }));
      setFormError(
        `Please complete the required follow-up details for "${incomplete.label}" before continuing.`
      );
      setExpandedFields((prev) =>
        prev.includes(incomplete.id) ? prev : [...prev, incomplete.id]
      );
      setTimeout(() => {
        document
          .getElementById(`indicator-${incomplete.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setFormError("");
    onSubmit({
      ...formData,
      AGE: Number(formData.AGE),
      details,
      reports,
    });
  };

  const activeSymptomCount = TOGGLE_FIELDS.filter((f) => formData[f.id] === 1).length;
  const completedCount = TOGGLE_FIELDS.filter(
    (f) => formData[f.id] === 1 && isFieldComplete(FOLLOWUP_SCHEMAS[f.id], details[f.id], reports[f.id])
  ).length;

  const renderToggleGroup = (fields) =>
    fields.map((item) => {
      const isActive = formData[item.id] === 1;
      const isExpanded = expandedFields.includes(item.id);

      if (isActive && isExpanded) {
        return (
          <FollowUpCard
            key={item.id}
            item={item}
            schema={FOLLOWUP_SCHEMAS[item.id]}
            answers={details[item.id] || {}}
            report={reports[item.id]}
            error={cardErrors[item.id]}
            onAnswerChange={(qid, val) => handleAnswerChange(item.id, qid, val)}
            onUploadChange={(fileData) => handleUploadChange(item.id, fileData)}
            onRemoveUpload={() => handleRemoveUpload(item.id)}
            onDone={() => handleDone(item)}
            onTogglePill={() => handleTogglePill(item)}
          />
        );
      }

      return (
        <ToggleCard
          key={item.id}
          item={item}
          isActive={isActive}
          isComplete={
            isActive &&
            isFieldComplete(FOLLOWUP_SCHEMAS[item.id], details[item.id], reports[item.id])
          }
          report={reports[item.id]}
          onBodyClick={() => handleBodyClick(item)}
          onPillClick={() => handleTogglePill(item)}
        />
      );
    });

  return (
    <form onSubmit={handleSubmit}>
      {/* Top bar: Summary counter */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        background: "var(--color-ice-blue)",
        border: "1px solid #BFDBFE",
        borderRadius: "var(--radius-md)",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={20} color="var(--color-primary)" />
          <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: 600 }}>
            Active Indicators Checked: <strong>{activeSymptomCount} / 13</strong>
            {activeSymptomCount > 0 && (
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                {" "}· Details Completed: <strong style={{ color: "var(--color-primary)" }}>{completedCount} / {activeSymptomCount}</strong>
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.825rem",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          <RotateCcw size={14} /> Reset Values
        </button>
      </div>

      {/* Group 1: Demographics */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <User size={18} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Demographics</h3>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="gender">Biological Sex</label>
            <select
              id="gender"
              value={formData.GENDER}
              onChange={(e) => setFormData({ ...formData, GENDER: e.target.value })}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label htmlFor="age" style={{ margin: 0 }}>Age (Years)</label>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-primary)" }}>
                {formData.AGE} yrs
              </span>
            </div>
            <input
              id="age"
              type="range"
              min="18"
              max="95"
              value={formData.AGE}
              onChange={(e) => setFormData({ ...formData, AGE: e.target.value })}
              style={{ width: "100%", accentColor: "var(--color-primary)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-caption)", marginTop: 4 }}>
              <span>18 yrs</span>
              <span>55 yrs</span>
              <span>95 yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Group 2: Lifestyle & Habits */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Cigarette size={18} color="var(--color-amber)" />
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Lifestyle & Habits</h3>
        </div>

        <div className="toggle-grid">
          {renderToggleGroup(LIFESTYLE_FIELDS)}
        </div>
      </div>

      {/* Group 3: Clinical Symptoms */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Activity size={18} color="var(--color-rose)" />
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Reported Symptoms & Conditions</h3>
        </div>

        <div className="toggle-grid">
          {renderToggleGroup(SYMPTOM_FIELDS)}
        </div>
      </div>

      {/* Submit Action */}
      {formError && (
        <div style={{
          background: "var(--color-rose-bg)",
          color: "var(--color-rose)",
          border: "1px solid #FECDD3",
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          fontSize: "0.85rem",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <Info size={15} style={{ flexShrink: 0 }} />
          {formError}
        </div>
      )}
      <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ minWidth: 220, padding: "12px 28px", fontSize: "0.975rem" }}
        >
          {submitting ? (
            <>
              <div style={{
                width: 18,
                height: 18,
                border: "2px solid #FFFFFF",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
              Calculating Model Risk...
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              Compute Risk Assessment
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Toggle card: compact Yes/No indicator (inactive, or active & collapsed) */
/* ---------------------------------------------------------------------- */
function ToggleCard({ item, isActive, isComplete, report, onBodyClick, onPillClick }) {
  return (
    <div className={`toggle-switch-card ${isActive ? "active" : ""}`} id={`indicator-${item.id}`}>
      <div style={{ flex: 1, cursor: "pointer" }} onClick={onBodyClick}>
        <div className="toggle-label">{item.label}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
          {item.desc}
        </div>

        {isActive && (
          <div className="toggle-summary-row">
            <span className={`toggle-summary-chip ${isComplete ? "complete" : "incomplete"}`}>
              {isComplete ? (
                <><CheckCircle2 size={12} /> Details added</>
              ) : (
                <><Info size={12} /> Details incomplete</>
              )}
            </span>
            {report && (
              <span className="report-chip">
                <Paperclip size={12} />
                <span className="report-chip-name" title={report.fileName}>{report.fileName}</span>
              </span>
            )}
            <button
              type="button"
              className="toggle-edit-link"
              onClick={(e) => { e.stopPropagation(); onBodyClick(); }}
            >
              <Pencil size={11} /> Edit
            </button>
          </div>
        )}
      </div>
      <div
        className="toggle-pill"
        onClick={(e) => { e.stopPropagation(); onPillClick(); }}
        style={{ cursor: "pointer", flexShrink: 0 }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Follow-up card: clinical questions + optional report, shown when a     */
/* Yes indicator is expanded for editing                                  */
/* ---------------------------------------------------------------------- */
function FollowUpCard({ item, schema, answers, report, error, onAnswerChange, onUploadChange, onRemoveUpload, onDone, onTogglePill }) {
  return (
    <div className="followup-card" id={`indicator-${item.id}`}>
      <div className="followup-card-header">
        <div>
          <div className="toggle-label">{item.label}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
        </div>
        <div
          className="toggle-pill"
          onClick={onTogglePill}
          style={{ cursor: "pointer", flexShrink: 0 }}
          title="Turn off this indicator"
        />
      </div>

      {schema.urgentNotice && (
        <div className="urgent-banner">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{schema.urgentNotice}</span>
        </div>
      )}

      <div className="followup-grid">
        {schema.questions.map((q) => (
          <QuestionField
            key={q.id}
            fieldId={item.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onAnswerChange(q.id, val)}
          />
        ))}
      </div>

      {item.id === "SMOKING" && answers.perDay && answers.yearsSmoked && (
        <div className="pack-years-note">
          Estimated pack-years: <strong>{((Number(answers.perDay) / 20) * Number(answers.yearsSmoked)).toFixed(1)}</strong>
          <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
            {" "}(cigarettes/bidis per day ÷ 20 × years smoked)
          </span>
        </div>
      )}

      <UploadField
        label={schema.upload.label}
        note={schema.upload.note}
        required={!!schema.upload.required}
        report={report}
        onChange={onUploadChange}
        onRemove={onRemoveUpload}
      />

      {error && <div className="followup-error">{error}</div>}

      <div className="followup-actions">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          <CheckCircle2 size={16} /> Done
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Generic renderer for one follow-up question, by type                   */
/* ---------------------------------------------------------------------- */
function QuestionField({ fieldId, question, value, onChange }) {
  const inputId = `${fieldId}-${question.id}`;

  return (
    <div className="field followup-field">
      <label htmlFor={inputId}>
        {question.label}
        {!question.optional && <span className="qf-required">*</span>}
      </label>

      {question.type === "text" && (
        <input
          id={inputId}
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "number" && (
        <input
          id={inputId}
          type="number"
          min={question.min}
          max={question.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "select" && (
        <select id={inputId} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>Select...</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {question.type === "yesno" && (
        <div className="qf-radio-row">
          {["Yes", "No"].map((opt) => (
            <label key={opt} className="qf-radio-option">
              <input
                type="radio"
                name={inputId}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.type === "multiselect" && (
        <div className="qf-checkbox-grid">
          {question.options.map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(opt);
            return (
              <label key={opt} className="qf-checkbox-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((v) => v !== opt) : [...arr, opt];
                    onChange(next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Optional supporting-report upload widget used inside a follow-up card  */
/* ---------------------------------------------------------------------- */
function UploadField({ label, note, required, report, onChange, onRemove }) {
  const [localError, setLocalError] = useState("");

  const processFile = (selected) => {
    setLocalError("");
    if (!selected) return;

    if (!ACCEPTED_REPORT_TYPES.includes(selected.type)) {
      setLocalError("Unsupported file. Please upload a JPG, PNG, WEBP image or a PDF.");
      return;
    }
    if (selected.size > MAX_REPORT_SIZE_MB * 1024 * 1024) {
      setLocalError(`File is too large. Maximum allowed size is ${MAX_REPORT_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        fileName: selected.name,
        fileType: selected.type,
        fileSize: selected.size,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => setLocalError("Could not read this file. Please try again.");
    reader.readAsDataURL(selected);
  };

  return (
    <div className={`upload-field ${required ? "upload-field-required" : ""}`}>
      <div className="upload-field-label">
        <UploadCloud size={14} /> {label}
        {required && <span className="qf-required">*</span>}
      </div>
      {note && <div className="upload-field-note">{note}</div>}
      {required && !report && (
        <div className="upload-field-required-note">
          This report is required before this indicator can be submitted.
        </div>
      )}

      {report ? (
        <div className="report-chip">
          <Paperclip size={12} />
          <span className="report-chip-name" title={report.fileName}>{report.fileName}</span>
          <button type="button" className="report-chip-action" onClick={onRemove}>Remove</button>
        </div>
      ) : (
        <label className="upload-dropzone-small">
          <span>
            {required ? "Click to attach the required report" : "Click to attach a file (optional)"}
            {" "}(JPG, PNG, WEBP or PDF, up to {MAX_REPORT_SIZE_MB}MB)
          </span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => processFile(e.target.files?.[0])}
            hidden
          />
        </label>
      )}

      {localError && <div className="upload-field-error">{localError}</div>}
    </div>
  );
}