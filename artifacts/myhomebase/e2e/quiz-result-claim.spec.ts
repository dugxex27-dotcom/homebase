import { expect, test } from "@playwright/test";

test("claims an anonymous quiz result after homeowner registration", async ({ page }) => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Set E2E_BASE_URL to the running app URL for this full-stack test.",
  );

  const uniqueId = crypto.randomUUID();
  const email = `quiz-claim-${uniqueId}@example.com`;
  const completedAt = new Date().toISOString();

  await page.goto("/signin/homeowner?tab=register");

  const tokenResponse = await page.request.get("/api/quiz-token");
  expect(tokenResponse.ok()).toBeTruthy();
  const { token } = await tokenResponse.json();

  const resultResponse = await page.request.post("/api/quiz-result", {
    data: {
      quizToken: token,
      score: 84,
      tier: "Solid Foundation",
      completedAt,
    },
  });
  expect(resultResponse.status()).toBe(201);
  const anonymousResult = await resultResponse.json();
  expect(anonymousResult.userId).toBeNull();

  await page.evaluate((resultId) => {
    localStorage.setItem("mhb_quiz_result_id", resultId);
  }, anonymousResult.id);

  await page.getByTestId("input-first-name-homeowner").fill("Quiz");
  await page.getByTestId("input-last-name-homeowner").fill("Claim");
  await page.getByTestId("input-email-homeowner").fill(email);
  await page.getByTestId("input-register-password-homeowner").fill("QuizClaim123!");
  await page.getByTestId("input-confirm-password-homeowner").fill("QuizClaim123!");
  await page.getByTestId("input-zip-code-homeowner").fill("90210");

  const claimResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/quiz-result/claim")
      && response.request().method() === "POST",
  );
  await page.getByTestId("button-register-homeowner").click();

  const claimResponse = await claimResponsePromise;
  expect(claimResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("plan-selection-step")).toBeVisible();

  const meResponse = await page.request.get("/api/quiz-result/me");
  expect(meResponse.ok()).toBeTruthy();
  const claimedResult = await meResponse.json();

  expect(claimedResult).toMatchObject({
    id: anonymousResult.id,
    score: 84,
    tier: "Solid Foundation",
  });
  expect(claimedResult.userId).toEqual(expect.any(String));
});