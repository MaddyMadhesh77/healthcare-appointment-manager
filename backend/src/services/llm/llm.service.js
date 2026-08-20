const env = require('../../config/env');
const anthropicProvider = require('./providers/anthropic');
const openaiProvider = require('./providers/openai');
const mockProvider = require('./providers/mock');

// Every caller in this app only ever needs generateText(prompt, opts) -> string,
// so swapping providers is a one-line change in .env (LLM_PROVIDER) and never
// touches the modules that consume summaries. "mock" needs no API key and is
// useful for local development/testing.
const PROVIDERS = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  mock: mockProvider,
};

function selectProvider() {
  const provider = PROVIDERS[env.llmProvider];
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER: ${env.llmProvider}`);
  }
  return provider;
}

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in LLM response');
  }
  return JSON.parse(match[0]);
}

async function callForJson(prompt) {
  const provider = selectProvider();
  const raw = await provider.generateText(prompt, { timeoutMs: env.llmTimeoutMs });
  return extractJson(raw);
}

async function generatePreVisitSummary(symptoms) {
  const prompt = [
    'Analyse these symptoms and return a JSON object with exactly these keys:',
    '"urgency" (one of "Low", "Medium", "High"), "chiefComplaint" (a short string),',
    'and "suggestedQuestions" (an array of exactly 3 short questions the doctor should ask the patient).',
    'Respond with ONLY the JSON object — no markdown, no explanation.',
    '',
    `Symptoms: ${symptoms}`,
  ].join('\n');

  const parsed = await callForJson(prompt);
  if (!parsed.urgency || !parsed.chiefComplaint || !Array.isArray(parsed.suggestedQuestions)) {
    throw new Error('Malformed pre-visit summary from LLM');
  }
  return parsed;
}

async function generatePostVisitSummary(notes) {
  const prompt = [
    'Convert these clinical notes into a JSON object with exactly these keys:',
    '"summary" (a short patient-friendly paragraph explaining the visit in plain language),',
    '"medicationSchedule" (an array of strings, each describing one medication and when to take it),',
    'and "followUpSteps" (an array of short follow-up instructions).',
    'Respond with ONLY the JSON object — no markdown, no explanation.',
    '',
    `Clinical notes: ${notes}`,
  ].join('\n');

  const parsed = await callForJson(prompt);
  if (!parsed.summary) {
    throw new Error('Malformed post-visit summary from LLM');
  }
  return parsed;
}

module.exports = { generatePreVisitSummary, generatePostVisitSummary };
