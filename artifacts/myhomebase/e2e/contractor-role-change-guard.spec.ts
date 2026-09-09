import { expect, test } from "@playwright/test";

test("shows the last-admin guard error without refreshing the team page", async ({ page }) => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Set E2E_BASE_URL to the running app URL for this full-stack test.",
  );

  await page.goto("/signin/contractor");
  await page.getByRole("button", { name: "Demo login" }).click();
  await expect(page).toHaveURL(/\/contractor-dashboard/);

  await page.goto("/contractor-dashboard?tab=team");

  const kaylaCard = page.locator(".dash-light-card").filter({ hasText: "Kayla Torres" });
  await expect(kaylaCard).toBeVisible();
  await kaylaCard.getByRole("button", { name: "Edit" }).click();
  await kaylaCard.getByRole("button", { name: "Field Tech" }).click();

  await page.route("**/api/contractor/team/*", async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Cannot demote the last admin or owner. The company must have at least one active admin or owner.",
      }),
    });
  });

  const roleChangeResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH"
      && response.url().includes("/api/contractor/team/"),
  );
  await kaylaCard.getByRole("button", { name: "Save Changes" }).click();
  expect((await roleChangeResponse).status()).toBe(400);

  const destructiveToast = page.getByRole("status").filter({
    hasText: "Cannot demote the last admin or owner",
  });
  await expect(destructiveToast).toBeVisible();
  await expect(destructiveToast).toHaveClass(/bg-destructive/);
  await expect(destructiveToast).toContainText("Error");
  await expect(destructiveToast).toContainText("Cannot demote the last admin or owner");
  await expect(page).toHaveURL(/\/contractor-dashboard\?tab=team$/);
});