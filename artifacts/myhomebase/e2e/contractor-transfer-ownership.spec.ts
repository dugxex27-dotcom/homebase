import { expect, test, type Page, type Route } from "@playwright/test";

type TeamMember = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyRole: "owner" | "admin" | "tech";
  status: "active" | "pending_invite";
};

const owner: TeamMember = {
  id: "owner-e2e",
  email: "owner-e2e@example.com",
  firstName: "Olivia",
  lastName: "Owner",
  companyRole: "owner",
  status: "active",
};

const successor: TeamMember = {
  id: "successor-e2e",
  email: "successor-e2e@example.com",
  firstName: "Alex",
  lastName: "Admin",
  companyRole: "admin",
  status: "active",
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockContractorDashboard(
  page: Page,
  teamMembers: TeamMember[],
) {
  page.on("pageerror", (error) => {
    console.error("Dashboard page error:", error.message);
  });
  let actorRole: "owner" | "admin" | null = "owner";
  let actorCompanyId: string | null = "company-e2e";
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = request.postDataJSON?.();
    calls.push({ method, path, body });

    if (path === "/api/auth/user") {
      return json(route, {
        ...owner,
        role: "contractor",
        companyRole: actorRole,
        companyId: actorCompanyId,
        subscriptionStatus: "active",
        isDemoAccount: false,
      });
    }

    if (path === "/api/contractor/team") {
      const acceptedTeamCount = teamMembers.filter(
        (member) => member.status === "active",
      ).length;
      const pendingInviteCount = teamMembers.filter(
        (member) => member.status === "pending_invite",
      ).length;
      return json(route, {
        teamMembers,
        acceptedTeamCount,
        reservedTeamCount: acceptedTeamCount + pendingInviteCount,
        pendingInviteCount,
        billedTeamSeatCount: acceptedTeamCount,
        includedTeamSeats: 3,
        teamSeatLimit: 10,
        seatUsageAlertThreshold: 80,
      });
    }

    if (path === "/api/contractor/transfer-ownership" && method === "POST") {
      if (body?.newOwnerId !== successor.id) {
        return json(route, { message: "Active team member not found" }, 404);
      }
      actorRole = "admin";
      successor.companyRole = "owner";
      return json(route, { message: "Ownership transferred successfully." });
    }

    if (path === "/api/contractor/leave-company" && method === "POST") {
      if (actorRole !== "admin") {
        return json(
          route,
          { message: "Transfer ownership before leaving the company" },
          400,
        );
      }
      actorRole = null;
      actorCompanyId = null;
      return json(route, { message: "You have left the company." });
    }

    if (
      path.includes("subscription")
      || path.includes("contractor-profile")
    ) {
      return json(route, {
        subscriptionStatus: "active",
        needsSubscription: false,
        isInTrial: false,
        trialExpired: false,
        hasDivisions: false,
        hasBulkImport: false,
        seatInfo: {
          reservedTeamCount: teamMembers.length,
          teamSeatLimit: 10,
          additionalTeamSeatPrice: 5,
        },
      });
    }

    return json(route, []);
  });

  return { calls, getActorRole: () => actorRole };
}

test("owner transfers ownership, becomes admin, and can leave the company", async ({
  page,
}) => {
  const backend = await mockContractorDashboard(page, [owner, successor]);

  await page.goto("/contractor-dashboard?tab=team");
  await page.getByRole("button", { name: "Leave company", exact: true }).click();
  await page.getByRole("button", { name: "Leave company", exact: true }).last().click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Transfer ownership before leaving the company",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Transfer ownership" }).click();

  await expect(
    page.getByText("Choose an active team member to become the new company owner."),
  ).toBeVisible();
  await page.getByRole("combobox").nth(1).selectOption(successor.id);
  await expect(
    page.getByText("Alex Admin will become the company owner."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Transfer Ownership", exact: true }).click();
  await expect.poll(backend.getActorRole).toBe("admin");
  await expect(page.getByRole("button", { name: "Transfer ownership" })).toHaveCount(0);

  expect(
    backend.calls.some(
      (call) =>
        call.method === "POST"
        && call.path === "/api/contractor/transfer-ownership"
        && (call.body as { newOwnerId?: string })?.newOwnerId === successor.id,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Leave company", exact: true }).click();
  await page.getByRole("button", { name: "Leave company", exact: true }).last().click();
  await expect.poll(() =>
    backend.calls.filter(
      (call) =>
        call.method === "POST"
        && call.path === "/api/contractor/leave-company",
    ).length,
  ).toBe(2);
  expect(backend.getActorRole()).toBeNull();
});

test("owner with no eligible member sees the empty disabled state", async ({
  page,
}) => {
  const pendingMember: TeamMember = {
    ...successor,
    id: "pending-e2e",
    status: "pending_invite",
  };
  const backend = await mockContractorDashboard(page, [owner, pendingMember]);

  await page.goto("/contractor-dashboard?tab=team");
  await page.getByRole("button", { name: "Transfer ownership" }).click();

  await expect(
    page.getByText(
      "You have 1 pending invite. Once a member accepts their invite, you can transfer ownership to them.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Transfer Ownership", exact: true }),
  ).toBeDisabled();
  expect(
    backend.calls.some(
      (call) =>
        call.method === "POST"
        && call.path === "/api/contractor/transfer-ownership",
    ),
  ).toBe(false);
});