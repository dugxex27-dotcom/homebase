import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const MESSAGE_TONES = ["Urgent", "Friendly", "Formal"] as const;
export type MessageTone = typeof MESSAGE_TONES[number];
export const DEFAULT_MESSAGE_TONE: MessageTone = "Friendly";

export function buildDraftContractorMessageRequest(
  issueDescription: string,
  tone: MessageTone,
  houseId?: string,
  taskContext?: string,
) {
  return {
    issueDescription,
    tone,
    houseId: houseId || undefined,
    taskContext: taskContext || undefined,
  };
}

interface MessageToneControlsProps {
  tone: MessageTone;
  onToneChange: (tone: MessageTone) => void;
  onGenerate: (tone: MessageTone) => void;
  disabled: boolean;
  pending: boolean;
  testIdPrefix: "ai-compose" | "ai-draft";
}

export function MessageToneControls({
  tone,
  onToneChange,
  onGenerate,
  disabled,
  pending,
  testIdPrefix,
}: MessageToneControlsProps) {
  return (
    <>
      <div className="flex items-center gap-2" aria-label="Message tone">
        <span className="text-xs text-gray-500">Tone:</span>
        {MESSAGE_TONES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToneChange(option)}
            aria-pressed={tone === option}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              tone === option
                ? "border-transparent text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            style={tone === option ? { background: "var(--theme-accent)" } : { borderColor: "var(--theme-border)" }}
            data-testid={`button-${testIdPrefix}-tone-${option.toLowerCase()}`}
          >
            {option}
          </button>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || pending}
        onClick={() => onGenerate(tone)}
        className="text-white text-xs h-7 px-3"
        style={{ background: "var(--theme-accent)" }}
        data-testid={`button-${testIdPrefix === "ai-compose" ? "ai-generate-compose" : "ai-generate-conversation"}`}
      >
        {pending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Generating...</>
        ) : "Generate Draft"}
      </Button>
    </>
  );
}