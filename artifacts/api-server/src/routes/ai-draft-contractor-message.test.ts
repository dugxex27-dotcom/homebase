import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCompletionCreate } = vi.hoisted(() => ({
  mockCompletionCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCompletionCreate } };
  },
}));

import {
  MESSAGE_TONE_GUIDANCE,
  createDraftContractorMessageHandler,
} from "./ai-draft-contractor-message";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { user: { id: "homeowner-1" } };
    next();
  });
  app.post(
    "/api/ai/draft-contractor-message",
    createDraftContractorMessageHandler({ getHouse: vi.fn().mockResolvedValue(null) }),
  );
  return app;
}

describe("AI contractor message tone API", () => {
  beforeEach(() => {
    mockCompletionCreate.mockReset().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "Could you please provide an estimate?",
            followUpQuestions: ["When are you available?", "What does the estimate include?"],
          }),
        },
      }],
    });
  });

  it.each(Object.entries(MESSAGE_TONE_GUIDANCE))(
    "adds the matching %s guidance to the prompt",
    async (tone, guidance) => {
      const response = await request(createApp())
        .post("/api/ai/draft-contractor-message")
        .send({ issueDescription: "The furnace is making a loud noise", tone });

      expect(response.status).toBe(200);
      const prompt = mockCompletionCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain(`Selected tone: ${tone}`);
      expect(prompt).toContain(`Tone guidance: ${guidance}`);
    },
  );

  it("returns 400 for an unsupported tone without calling OpenAI", async () => {
    const response = await request(createApp())
      .post("/api/ai/draft-contractor-message")
      .send({ issueDescription: "The furnace is noisy", tone: "Sarcastic" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid request body" });
    expect(mockCompletionCreate).not.toHaveBeenCalled();
  });

  it("returns the draft and 2-3 follow-up questions from one AI call", async () => {
    const followUpQuestions = [
      "When are you available?",
      "What does the estimate include?",
      "Do you warranty this repair?",
    ];
    mockCompletionCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            message: "The furnace is making a loud noise. Could you provide an estimate?",
            followUpQuestions,
          }),
        },
      }],
    });

    const response = await request(createApp())
      .post("/api/ai/draft-contractor-message")
      .send({ issueDescription: "The furnace is making a loud noise", tone: "Friendly" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "The furnace is making a loud noise. Could you provide an estimate?",
      followUpQuestions,
    });
    expect(response.body.followUpQuestions).toHaveLength(3);
    expect(mockCompletionCreate).toHaveBeenCalledTimes(1);
  });
});