import { describe, expect, it } from "vitest";
import { isConversationParticipant } from "./conversation-access";

const conversation = {
  homeownerId: "homeowner-1",
  contractorId: "contractor-1",
};

describe("isConversationParticipant", () => {
  it("allows the conversation homeowner", () => {
    expect(isConversationParticipant(conversation, "homeowner-1", "homeowner")).toBe(true);
  });

  it("allows the conversation contractor", () => {
    expect(isConversationParticipant(conversation, "contractor-1", "contractor")).toBe(true);
  });

  it("rejects a different homeowner or contractor", () => {
    expect(isConversationParticipant(conversation, "homeowner-2", "homeowner")).toBe(false);
    expect(isConversationParticipant(conversation, "contractor-2", "contractor")).toBe(false);
  });

  it("rejects every unrelated role even when its id matches a party", () => {
    expect(isConversationParticipant(conversation, "homeowner-1", "agent")).toBe(false);
    expect(isConversationParticipant(conversation, "contractor-1", "admin")).toBe(false);
  });
});