export function appendFollowUpQuestion(draft: string, question: string) {
  return `${draft.trimEnd()}\n\n${question}`.trimStart();
}

interface FollowUpQuestionChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  testIdSuffix: "compose" | "conversation";
}

export function FollowUpQuestionChips({
  questions,
  onSelect,
  testIdSuffix,
}: FollowUpQuestionChipsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5" data-testid={`follow-up-questions-${testIdSuffix}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggested questions</p>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((question, index) => (
          <button
            key={`${question}-${index}`}
            type="button"
            onClick={() => onSelect(question)}
            className="rounded-full border px-2.5 py-1 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            style={{ borderColor: "var(--theme-border)", color: "var(--theme-accent)" }}
            data-testid={`follow-up-question-${testIdSuffix}-${index}`}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}