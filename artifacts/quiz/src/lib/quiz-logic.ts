export interface Answer {
  text: string;
  score: number;
}

export interface Question {
  text: string;
  weight: number;
  risk: string;
  riskLabel: string;
  answers: Answer[];
}

export type Tier = "Home Pro" | "Solid Foundation" | "Needs Attention" | "High Risk";

export interface QuizResult {
  score: number;
  tier: Tier;
}

export const QUESTIONS: Question[] = [
  {
    text: "How often do you clean your gutters?",
    weight: 2, risk: "medium", riskLabel: "Medium Risk",
    answers: [
      { text: "Never — I don't think about it", score: 0 },
      { text: "Once every few years", score: 1 },
      { text: "Once a year", score: 2 },
      { text: "Twice a year or more", score: 3 },
    ]
  },
  {
    text: "Do you know where your main water shutoff valve is located?",
    weight: 3, risk: "high", riskLabel: "High Risk",
    answers: [
      { text: "No idea — I've never looked", score: 0 },
      { text: "I think I know, but I'm not sure", score: 1 },
      { text: "Yes, I know where it is", score: 2 },
      { text: "Yes, and I've tested it recently", score: 3 },
    ]
  },
  {
    text: "How often do you change your HVAC air filter?",
    weight: 2.5, risk: "medium-high", riskLabel: "Medium-High Risk",
    answers: [
      { text: "I'm not sure I ever have", score: 0 },
      { text: "Once a year or less", score: 1 },
      { text: "Every 3–6 months", score: 2 },
      { text: "Every 1–2 months as recommended", score: 3 },
    ]
  },
  {
    text: "When did you last test your smoke and carbon monoxide detectors?",
    weight: 3, risk: "high", riskLabel: "High Risk",
    answers: [
      { text: "I've never tested them", score: 0 },
      { text: "A couple of years ago", score: 1 },
      { text: "Within the past year", score: 2 },
      { text: "Within the past 6 months", score: 3 },
    ]
  },
  {
    text: "When was the last time you made sure the shutoff valves under your sink and toilet were working correctly?",
    weight: 2, risk: "medium", riskLabel: "Medium Risk",
    answers: [
      { text: "I've never checked them", score: 0 },
      { text: "A few years ago — or honestly can't remember", score: 1 },
      { text: "Within the last year", score: 2 },
      { text: "Recently — I test them regularly", score: 3 },
    ]
  },
  {
    text: "Do you know how old your water heater is?",
    weight: 2.5, risk: "medium-high", riskLabel: "Medium-High Risk",
    answers: [
      { text: "No clue — it was here when I moved in", score: 0 },
      { text: "Roughly, but I'm not sure of the year", score: 1 },
      { text: "Yes, and it's under 10 years old", score: 2 },
      { text: "Yes, and I have it serviced regularly", score: 3 },
    ]
  },
  {
    text: "How often do you clean your dryer vent duct?",
    weight: 2.5, risk: "medium-high", riskLabel: "Medium-High Risk",
    answers: [
      { text: "I didn't know that was a thing", score: 0 },
      { text: "Once every few years", score: 1 },
      { text: "Once a year", score: 2 },
      { text: "Every 6 months — I know it's a fire risk", score: 3 },
    ]
  },
  {
    text: "When did you last check the caulking around your windows for cracks or gaps?",
    weight: 2.5, risk: "medium-high", riskLabel: "Medium-High Risk",
    answers: [
      { text: "Never — I didn't know I should", score: 0 },
      { text: "A few years ago, or I can't remember", score: 1 },
      { text: "Within the last year or two", score: 2 },
      { text: "Recently — I check and re-caulk as needed", score: 3 },
    ]
  },
  {
    text: "How often do you have your roof inspected?",
    weight: 2, risk: "medium", riskLabel: "Medium Risk",
    answers: [
      { text: "Never — I'll deal with it when there's a problem", score: 0 },
      { text: "Only after a major storm", score: 1 },
      { text: "Every 3–5 years", score: 2 },
      { text: "Every 1–2 years as recommended", score: 3 },
    ]
  },
  {
    text: "Do you have the name and contact info of a trusted plumber or handyman?",
    weight: 1, risk: "low", riskLabel: "Lower Risk",
    answers: [
      { text: "No — I'd have to search online in a crisis", score: 0 },
      { text: "I might have a business card somewhere", score: 1 },
      { text: "Yes, I have someone I call", score: 2 },
      { text: "Yes, and I have several trusted contacts", score: 3 },
    ]
  },
];

export const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + 3 * q.weight, 0);

export function getTier(pct: number): Tier {
  if (pct >= 80) return "Home Pro";
  if (pct >= 60) return "Solid Foundation";
  if (pct >= 40) return "Needs Attention";
  return "High Risk";
}

export function calculateScore(answerScores: number[]): number {
  if (answerScores.length !== QUESTIONS.length) {
    throw new Error(`Expected ${QUESTIONS.length} answers, got ${answerScores.length}`);
  }
  const raw = answerScores.reduce((sum, score, i) => sum + score * QUESTIONS[i].weight, 0);
  return Math.round((raw / MAX_SCORE) * 100);
}

export function calculateResult(answerScores: number[]): QuizResult {
  const score = calculateScore(answerScores);
  return { score, tier: getTier(score) };
}

export interface TierDisplay {
  emoji: string;
  badgeClass: string;
  headline: string;
  msg: string;
}

export const TIER_DISPLAY: Record<Tier, TierDisplay> = {
  "Home Pro": {
    emoji: "🏠",
    badgeClass: "result-badge good",
    headline: "You know your home — now keep it that way.",
    msg: "You're ahead of most homeowners. MyHomeBase helps you stay on top of maintenance, track your home's health over time, and connect with trusted pros when you need them.",
  },
  "Solid Foundation": {
    emoji: "👍",
    badgeClass: "result-badge good",
    headline: "Good start — a few gaps to close.",
    msg: "You're doing well, but there are a few blind spots that could cost you. MyHomeBase helps you fill them in with personalised maintenance reminders and a full picture of your home's health.",
  },
  "Needs Attention": {
    emoji: "⚠️",
    badgeClass: "result-badge improve",
    headline: "Your home may need more attention than it's getting.",
    msg: "Several key maintenance tasks are being missed. MyHomeBase gives you a personalised checklist, seasonal reminders, and a record of everything you've done — so nothing falls through the cracks.",
  },
  "High Risk": {
    emoji: "🔴",
    badgeClass: "result-badge improve",
    headline: "Your home may be at risk right now.",
    msg: "Several critical maintenance areas haven't been addressed. MyHomeBase will help you prioritise what matters most and take control of your home's health before a small problem becomes a big one.",
  },
};

export interface ResultDisplay {
  scoreText: string;
  badgeText: string;
  badgeClass: string;
  headline: string;
  msg: string;
  colorClass: "good" | "improve";
}

export function getResultDisplay(pct: number): ResultDisplay {
  const tier = getTier(pct);
  const display = TIER_DISPLAY[tier];
  return {
    scoreText: String(pct),
    badgeText: display.emoji + " " + tier,
    badgeClass: display.badgeClass,
    headline: display.headline,
    msg: display.msg,
    colorClass: pct >= 60 ? "good" : "improve",
  };
}
