// Deterministic canned responses so the LLM-dependent flows can be run and
// tested end-to-end without a paid API key. Select with LLM_PROVIDER=mock.
async function generateText(prompt) {
  if (prompt.includes('suggestedQuestions')) {
    return JSON.stringify({
      urgency: 'Medium',
      chiefComplaint: 'Symptoms reported by patient (mock provider)',
      suggestedQuestions: [
        'When did the symptoms start?',
        'Have you taken any medication for this already?',
        'Do you have any relevant medical history?',
      ],
    });
  }
  return JSON.stringify({
    summary: 'This is a mock patient-friendly summary of your visit.',
    medicationSchedule: ['Take the prescribed medication as directed twice daily.'],
    followUpSteps: ['Rest and stay hydrated.', 'Contact the clinic if symptoms worsen.'],
  });
}

module.exports = { generateText };
