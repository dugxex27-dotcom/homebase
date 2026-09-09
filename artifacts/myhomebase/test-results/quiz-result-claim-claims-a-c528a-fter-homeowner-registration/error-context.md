# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: quiz-result-claim.spec.ts >> claims an anonymous quiz result after homeowner registration
- Location: e2e/quiz-result-claim.spec.ts:3:1

# Error details

```
Error: page.goto: net::ERR_HTTP_RESPONSE_CODE_FAILURE at https://1b6d563c-f6b4-422c-a32f-0b12e8931ee1-00-pln3a2qeh3eq-hql8b2gz.janeway.replit.dev/signin/homeowner?tab=register
Call log:
  - navigating to "https://1b6d563c-f6b4-422c-a32f-0b12e8931ee1-00-pln3a2qeh3eq-hql8b2gz.janeway.replit.dev/signin/homeowner?tab=register", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This page isn’t working" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 1b6d563c-f6b4-422c-a32f-0b12e8931ee1-00-pln3a2qeh3eq-hql8b2gz.janeway.replit.dev
      - text: is currently unable to handle this request.
    - generic [ref=e10]: HTTP ERROR 502
  - button "Reload" [ref=e13] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("claims an anonymous quiz result after homeowner registration", async ({ page }) => {
  4  |   test.skip(
  5  |     !process.env.E2E_BASE_URL,
  6  |     "Set E2E_BASE_URL to the running app URL for this full-stack test.",
  7  |   );
  8  | 
  9  |   const uniqueId = crypto.randomUUID();
  10 |   const email = `quiz-claim-${uniqueId}@example.com`;
  11 |   const completedAt = new Date().toISOString();
  12 | 
> 13 |   await page.goto("/signin/homeowner?tab=register");
     |              ^ Error: page.goto: net::ERR_HTTP_RESPONSE_CODE_FAILURE at https://1b6d563c-f6b4-422c-a32f-0b12e8931ee1-00-pln3a2qeh3eq-hql8b2gz.janeway.replit.dev/signin/homeowner?tab=register
  14 | 
  15 |   const tokenResponse = await page.request.get("/api/quiz-token");
  16 |   expect(tokenResponse.ok()).toBeTruthy();
  17 |   const { token } = await tokenResponse.json();
  18 | 
  19 |   const resultResponse = await page.request.post("/api/quiz-result", {
  20 |     data: {
  21 |       quizToken: token,
  22 |       score: 84,
  23 |       tier: "Solid Foundation",
  24 |       completedAt,
  25 |     },
  26 |   });
  27 |   expect(resultResponse.status()).toBe(201);
  28 |   const anonymousResult = await resultResponse.json();
  29 |   expect(anonymousResult.userId).toBeNull();
  30 | 
  31 |   await page.evaluate((resultId) => {
  32 |     localStorage.setItem("mhb_quiz_result_id", resultId);
  33 |   }, anonymousResult.id);
  34 | 
  35 |   await page.getByTestId("input-first-name-homeowner").fill("Quiz");
  36 |   await page.getByTestId("input-last-name-homeowner").fill("Claim");
  37 |   await page.getByTestId("input-email-homeowner").fill(email);
  38 |   await page.getByTestId("input-register-password-homeowner").fill("QuizClaim123!");
  39 |   await page.getByTestId("input-confirm-password-homeowner").fill("QuizClaim123!");
  40 |   await page.getByTestId("input-zip-code-homeowner").fill("90210");
  41 | 
  42 |   const claimResponsePromise = page.waitForResponse(
  43 |     (response) =>
  44 |       response.url().endsWith("/api/quiz-result/claim")
  45 |       && response.request().method() === "POST",
  46 |   );
  47 |   await page.getByTestId("button-register-homeowner").click();
  48 | 
  49 |   const claimResponse = await claimResponsePromise;
  50 |   expect(claimResponse.ok()).toBeTruthy();
  51 |   await expect(page.getByTestId("plan-selection-step")).toBeVisible();
  52 | 
  53 |   const meResponse = await page.request.get("/api/quiz-result/me");
  54 |   expect(meResponse.ok()).toBeTruthy();
  55 |   const claimedResult = await meResponse.json();
  56 | 
  57 |   expect(claimedResult).toMatchObject({
  58 |     id: anonymousResult.id,
  59 |     score: 84,
  60 |     tier: "Solid Foundation",
  61 |   });
  62 |   expect(claimedResult.userId).toEqual(expect.any(String));
  63 | });
```