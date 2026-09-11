import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDraftContractorMessageRequest,
  DEFAULT_MESSAGE_TONE,
  MESSAGE_TONES,
  MessageToneControls,
  type MessageTone,
} from "./message-tone-controls";

function ToneHarness({
  prefix,
  onGenerate,
}: {
  prefix: "ai-compose" | "ai-draft";
  onGenerate: (tone: MessageTone) => void;
}) {
  const [tone, setTone] = useState<MessageTone>(DEFAULT_MESSAGE_TONE);
  return (
    <MessageToneControls
      tone={tone}
      onToneChange={setTone}
      onGenerate={onGenerate}
      disabled={false}
      pending={false}
      testIdPrefix={prefix}
    />
  );
}

afterEach(cleanup);

describe.each([
  ["new-conversation AI panel", "ai-compose"],
  ["active-conversation AI panel", "ai-draft"],
] as const)("%s", (_label, prefix) => {
  it("selects Friendly by default", () => {
    render(<ToneHarness prefix={prefix} onGenerate={vi.fn()} />);
    expect(screen.getByTestId(`button-${prefix}-tone-friendly`)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId(`button-${prefix}-tone-urgent`)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId(`button-${prefix}-tone-formal`)).toHaveAttribute("aria-pressed", "false");
  });

  it.each(MESSAGE_TONES)("sends the selected %s tone when generating", (tone) => {
    const onGenerate = vi.fn();
    render(<ToneHarness prefix={prefix} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByTestId(`button-${prefix}-tone-${tone.toLowerCase()}`));
    fireEvent.click(screen.getByRole("button", { name: "Generate Draft" }));

    expect(onGenerate).toHaveBeenCalledWith(tone);
  });
});

describe("draft request payload", () => {
  it.each(MESSAGE_TONES)("preserves the selected %s tone in the API body", (tone) => {
    expect(buildDraftContractorMessageRequest("Leaking faucet", tone, "", "")).toEqual({
      issueDescription: "Leaking faucet",
      tone,
      houseId: undefined,
      taskContext: undefined,
    });
  });
});