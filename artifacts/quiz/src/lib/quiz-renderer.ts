import { getResultDisplay } from "./quiz-logic";

export interface ResultElements {
  scoreNumber: { textContent: string | null };
  ringFill: { style: { strokeDashoffset: string | number; stroke: string } };
  scoreBarFill: { style: { width: string }; className: string };
  resultBadge: { textContent: string | null; className: string };
  resultHeadline: { textContent: string | null };
  resultMsg: { textContent: string | null };
  quizWrap: { style: { display: string } };
  resultsCard: { style: { display: string } };
}

export const RING_CIRCUMFERENCE = 301.6;
export const RING_COLOR_GOOD = "#2E7D5A";
export const RING_COLOR_IMPROVE = "#C05C1A";

export function applyResultsToDOM(pct: number, elements: ResultElements): void {
  const display = getResultDisplay(pct);
  const circ = RING_CIRCUMFERENCE;

  elements.quizWrap.style.display = "none";
  elements.resultsCard.style.display = "block";

  elements.scoreNumber.textContent = display.scoreText;
  elements.ringFill.style.strokeDashoffset = circ - (circ * pct) / 100;
  elements.ringFill.style.stroke =
    display.colorClass === "good" ? RING_COLOR_GOOD : RING_COLOR_IMPROVE;
  elements.scoreBarFill.style.width = pct + "%";
  elements.scoreBarFill.className = "score-bar-fill " + display.colorClass;

  elements.resultBadge.textContent = display.badgeText;
  elements.resultBadge.className = display.badgeClass;
  elements.resultHeadline.textContent = display.headline;
  elements.resultMsg.textContent = display.msg;
}
