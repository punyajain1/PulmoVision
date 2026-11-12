// General next-step suggestions shown with a result (result page and printed
// report). They are deliberately not presented as guideline recommendations:
// the model is trained on a survey dataset and does not assess the criteria
// that screening guidelines use (age range plus pack-years of smoking).

export function getNextSteps({ isHigh, lowConfidence }) {
  const items = [];

  if (lowConfidence) {
    items.push(
      "This result is uncertain (see the reliability notes), so rely on a doctor's assessment rather than this estimate."
    );
  }

  if (isHigh) {
    items.push(
      "Discuss this result with a doctor, ideally a lung specialist (pulmonologist).",
      "Ask whether lung cancer screening, such as a low-dose CT scan, is appropriate for you. Doctors decide this from your age and smoking history (pack-years), which this model does not assess.",
      "Seek care promptly if you cough up blood, or have chest pain or unexplained weight loss."
    );
  } else {
    items.push(
      "A lower estimate does not rule out lung cancer.",
      "See a doctor if symptoms such as a cough lasting more than 3 weeks, breathlessness or chest pain continue or get worse.",
      "If you smoke, quitting is the most effective way to lower your lung cancer risk."
    );
  }

  return {
    title: "Suggested next steps",
    items,
    footnote: "General suggestions only, not medical advice or a screening guideline.",
  };
}
