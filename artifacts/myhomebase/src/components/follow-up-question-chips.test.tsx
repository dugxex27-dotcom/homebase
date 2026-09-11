import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendFollowUpQuestion,
  FollowUpQuestionChips,
} from "./follow-up-question-chips";

const questions = [
  "When are you available?",
  "What does the estimate include?",
];

function ComposerHarness({ suffix }: { suffix: "compose" | "conversation" }) {
  const [draft, setDraft] = useState("My furnace is making a loud noise.");
  return (
    <>
      <textarea aria-label={`${suffix} draft`} value={draft} readOnly />
      <FollowUpQuestionChips
        questions={questions}
        onSelect={(question) => setDraft((current) => appendFollowUpQuestion(current, question))}
        testIdSuffix={suffix}
      />
    </>
  );
}

afterEach(cleanup);

describe.each([
  ["new-conversation composer", "compose"],
  ["active-conversation composer", "conversation"],
] as const)("%s", (_label, suffix) => {
  it("renders every AI follow-up suggestion", () => {
    render(<ComposerHarness suffix={suffix} />);

    expect(screen.getByTestId(`follow-up-questions-${suffix}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: questions[0] })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: questions[1] })).toBeInTheDocument();
  });

  it("appends a selected suggestion without replacing the existing draft", () => {
    render(<ComposerHarness suffix={suffix} />);

    fireEvent.click(screen.getByTestId(`follow-up-question-${suffix}-1`));

    expect(screen.getByLabelText(`${suffix} draft`)).toHaveValue(
      `My furnace is making a loud noise.\n\n${questions[1]}`,
    );
  });
});