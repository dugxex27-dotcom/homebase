import { expect, test, type Page } from "@playwright/test";

const KEYBOARD_OPEN_HEIGHT = 300;

async function openCheckoutModal(page: Page) {
  await page.addInitScript(() => {
    const viewport = new EventTarget() as EventTarget & {
      height: number;
      offsetTop: number;
      width: number;
    };
    viewport.height = window.innerHeight;
    viewport.offsetTop = 0;
    viewport.width = window.innerWidth;

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    Object.defineProperty(window, "__setVisualViewport", {
      configurable: true,
      value: (height: number, offsetTop = 0) => {
        viewport.height = height;
        viewport.offsetTop = offsetTop;
        viewport.dispatchEvent(new Event("resize"));
      },
    });
  });

  await page.goto("/e2e/checkout-harness.html");
  await expect(page.getByText("Complete your subscription")).toBeVisible();
}

async function expectPayVisibleAfterKeyboardOpens(
  page: Page,
  initialViewport: { width: number; height: number },
) {
  await page.setViewportSize(initialViewport);
  await openCheckoutModal(page);

  const payButton = page.getByRole("button", { name: "Pay", exact: true });
  await page.getByLabel("Card number").focus();
  await page.evaluate((height) => {
    (
      window as unknown as Window & {
        __setVisualViewport: (nextHeight: number, offsetTop?: number) => void;
      }
    ).__setVisualViewport(height);
  }, KEYBOARD_OPEN_HEIGHT);

  const overlay = page.locator(".checkout-overlay");
  await expect(overlay).toHaveCSS("height", `${KEYBOARD_OPEN_HEIGHT}px`);
  await expect.poll(async () => overlay.evaluate((element) => ({
    height: element.style.getPropertyValue("--vvp-height"),
    offsetTop: element.style.getPropertyValue("--vvp-offset-top"),
  }))).toEqual({
    height: `${KEYBOARD_OPEN_HEIGHT}px`,
    offsetTop: "0px",
  });

  await expect(payButton).toBeVisible();

  const bounds = await payButton.boundingBox();
  expect(bounds, "Pay button should have visible bounds").not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(KEYBOARD_OPEN_HEIGHT);
}

test("keeps Pay visible when the keyboard opens on mobile", async ({ page }) => {
  await expectPayVisibleAfterKeyboardOpens(page, { width: 375, height: 667 });
});

test("keeps Pay visible when the keyboard opens at desktop width", async ({ page }) => {
  await expectPayVisibleAfterKeyboardOpens(page, { width: 1280, height: 720 });
});