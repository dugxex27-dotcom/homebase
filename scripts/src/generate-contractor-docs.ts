/**
 * Contractor Module Developer Reference — Markdown Generator
 *
 * Reads live source files and programmatically produces exports/contractor-module.md.
 * Run: pnpm --filter @workspace/scripts run generate-contractor-docs
 *
 * Sources read:
 *   artifacts/api-server/src/routes/routes.ts     — route registrations, plan defs, middleware
 *   lib/db/src/schema/schema.ts                   — Drizzle table definitions
 *   artifacts/myhomebase/src/pages/contractor-dashboard.tsx
 *   artifacts/myhomebase/src/pages/contractor-crm.tsx
 *   artifacts/myhomebase/src/pages/contractor-onboarding.tsx
 *   artifacts/myhomebase/src/components/proposals.tsx
 *   artifacts/myhomebase/src/components/stripe-connect-onboarding.tsx
 *   artifacts/myhomebase/src/components/contractor-feature-gate.tsx
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "exports", "contractor-module.md");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

function lines(src: string): string[] {
  return src.split("\n");
}

/** Extract a range of lines from a source string (1-indexed, inclusive) */
function extractLines(src: string, from: number, to: number): string {
  return lines(src).slice(from - 1, to).join("\n");
}

/**
 * Extract a "block" starting at `fromLine` until a matching closing context.
 * Stops when the brace depth (from the first { found after fromLine) returns to 0.
 */
function extractBlock(src: string, fromLine: number, maxLines = 120): string {
  const ls = lines(src);
  const buf: string[] = [];
  let depth = 0;
  let started = false;
  for (let i = fromLine - 1; i < Math.min(ls.length, fromLine - 1 + maxLines); i++) {
    const l = ls[i];
    buf.push(l);
    for (const ch of l) {
      if (ch === "{") { depth++; started = true; }
      if (ch === "}") depth--;
    }
    if (started && depth === 0) break;
  }
  return buf.join("\n");
}

// ─── Route extraction ─────────────────────────────────────────────────────────

interface Route {
  method: string;
  path: string;
  auth: string[];
  lineNum: number;
}

const ROUTE_RE = /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/;
const MIDDLEWARE_TOKENS = [
  "isAuthenticated",
  "requireRole",
  "requireContractorSubscription",
  "requireHomeownerSubscription",
  "requireCompanyRole",
  "requireNotSuspended",
  "requireSameCompany",
  "requireAdmin",
  "uploadLimiter",
  "authLimiter",
  "aiChatLimiter",
];

function extractContractorRoutes(routesSrc: string): Route[] {
  const ls = lines(routesSrc);
  const routes: Route[] = [];

  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const m = l.match(ROUTE_RE);
    if (!m) continue;
    const routePath = m[2];
    if (
      !routePath.startsWith("/api/contractor") &&
      !routePath.startsWith("/api/proposals") &&
      !routePath.startsWith("/api/crm/")
    ) continue;

    // Collect auth tokens from this line + up to 2 continuation lines
    const segment = ls.slice(i, Math.min(i + 3, ls.length)).join(" ");
    const auth = MIDDLEWARE_TOKENS.filter((t) => segment.includes(t));

    routes.push({ method: m[1].toUpperCase(), path: routePath, auth, lineNum: i + 1 });
  }
  return routes;
}

function extractPublicContractorRoutes(routesSrc: string): Route[] {
  const ls = lines(routesSrc);
  const routes: Route[] = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const m = l.match(ROUTE_RE);
    if (!m) continue;
    const routePath = m[2];
    if (!routePath.startsWith("/api/contractors")) continue;
    const segment = ls.slice(i, Math.min(i + 3, ls.length)).join(" ");
    const auth = MIDDLEWARE_TOKENS.filter((t) => segment.includes(t));
    routes.push({ method: m[1].toUpperCase(), path: routePath, auth, lineNum: i + 1 });
  }
  return routes;
}

function routeTable(routes: Route[]): string {
  if (routes.length === 0) return "_No routes found._\n";
  const rows = routes.map((r) => {
    const auth = r.auth.length ? r.auth.join(", ") : "none";
    return `| \`${r.method}\` | \`${r.path}\` | ${auth} |`;
  });
  return [
    "| Method | Path | Auth Middleware |",
    "|--------|------|-----------------|",
    ...rows,
  ].join("\n") + "\n";
}

// ─── Schema extraction ────────────────────────────────────────────────────────

interface TableDef {
  name: string;
  sqlName: string;
  columns: ColumnDef[];
}

interface ColumnDef {
  field: string;
  type: string;
  notes: string;
}

/** Parse a pgTable block from schema.ts */
function parseTable(schemaSrc: string, startLine: number): TableDef | null {
  const ls = lines(schemaSrc);
  const headerLine = ls[startLine - 1] || "";

  const nameMatch = headerLine.match(/export const (\w+)\s*=\s*pgTable\s*\(\s*["']([^"']+)["']/);
  if (!nameMatch) return null;

  const block = extractBlock(schemaSrc, startLine, 100);
  const blockLines = block.split("\n");
  const columns: ColumnDef[] = [];

  for (const bl of blockLines) {
    // Match: fieldName: someType(...)  or  fieldName: text("sql_name")
    const colMatch = bl.match(/^\s{2,4}(\w+)\s*:/);
    if (!colMatch) continue;
    const field = colMatch[1];
    if (["id", "createdAt", "updatedAt"].includes(field)) {
      columns.push({ field, type: bl.includes("timestamp") ? "timestamp" : "uuid/varchar", notes: "auto" });
      continue;
    }
    // Type detection
    let type = "text";
    if (bl.includes("integer(") || bl.includes("int(")) type = "int";
    else if (bl.includes("decimal(") || bl.includes("numeric(")) type = "decimal";
    else if (bl.includes("boolean(") || bl.includes(".defaultBoolean")) type = "bool";
    else if (bl.includes("timestamp(")) type = "timestamp";
    else if (bl.includes("jsonb(")) type = "jsonb";
    else if (bl.includes("varchar(")) type = "varchar";
    else if (bl.includes("uuid(")) type = "uuid";
    else if (bl.includes("array(") || bl.includes(".array()")) type = "text[]";
    else if (bl.includes("text(")) type = "text";

    // Notes
    const notes: string[] = [];
    if (bl.includes("primaryKey") || bl.includes(".primaryKey")) notes.push("PK");
    if (bl.includes("references(") || bl.includes(".references(")) {
      const refMatch = bl.match(/references.*?(\w+)\./);
      notes.push(`FK → ${refMatch ? refMatch[1] : "other"}`);
    }
    if (bl.includes(".notNull()") || bl.includes("notNull()")) notes.push("not null");
    if (bl.includes(".unique()")) notes.push("unique");
    if (bl.includes(".default(")) {
      const defMatch = bl.match(/\.default\(([^)]{0,30})\)/);
      if (defMatch) notes.push(`default: ${defMatch[1]}`);
    }

    columns.push({ field, type, notes: notes.join(", ") });
  }

  return { name: nameMatch[1], sqlName: nameMatch[2], columns };
}

function tableToMarkdown(t: TableDef): string {
  const rows = t.columns.map(
    (c) => `| \`${c.field}\` | ${c.type} | ${c.notes} |`
  );
  return [
    `### \`${t.sqlName}\` (\`${t.name}\`)`,
    "",
    "| Column | Type | Notes |",
    "|--------|------|-------|",
    ...rows,
    "",
  ].join("\n");
}

// ─── Frontend file inspection ─────────────────────────────────────────────────

function extractImports(src: string): string[] {
  return lines(src)
    .filter((l) => l.startsWith("import "))
    .slice(0, 20)
    .join("\n")
    .split("\n");
}

function extractExportedFunctions(src: string): string[] {
  return lines(src)
    .filter((l) => /^export (default function|function|const|class)/.test(l))
    .slice(0, 20);
}

function extractInterfaces(src: string): string[] {
  return lines(src)
    .filter((l) => /^interface\s+\w+/.test(l))
    .slice(0, 15);
}

function firstNLines(src: string, n: number): string {
  return lines(src).slice(0, n).join("\n");
}

// ─── Extract plan constants ───────────────────────────────────────────────────

function extractContractorPlans(routesSrc: string): string {
  const ls = lines(routesSrc);
  const start = ls.findIndex((l) => l.includes("const CONTRACTOR_PLANS"));
  if (start === -1) return "// CONTRACTOR_PLANS not found";
  return extractBlock(routesSrc, start + 1, 60);
}

function extractSubscriptionMiddleware(routesSrc: string): string {
  const ls = lines(routesSrc);
  const start = ls.findIndex((l) => l.includes("const requireContractorSubscription"));
  if (start === -1) return "// middleware not found";
  return extractBlock(routesSrc, start + 1, 60);
}

function extractGrandfatheredEmails(routesSrc: string): string {
  const ls = lines(routesSrc);
  const l = ls.find((line) => line.includes("GRANDFATHERED_EMAILS"));
  return l?.trim() || "// not found";
}

function extractStripeInit(routesSrc: string): string {
  const ls = lines(routesSrc);
  const start = ls.findIndex((l) => l.includes("const stripe ="));
  if (start === -1) return "// not found";
  return ls.slice(start, start + 3).join("\n");
}

function extractRequireAdmin(routesSrc: string): string {
  const ls = lines(routesSrc);
  const start = ls.findIndex((l) => l.includes("const requireAdmin"));
  if (start === -1) return "// not found";
  return extractBlock(routesSrc, start + 1, 15);
}

// ─── Main document builder ────────────────────────────────────────────────────

async function main() {
  console.log("Reading source files...");

  const routesSrc = readFile("artifacts/api-server/src/routes/routes.ts");
  const schemaSrc = readFile("lib/db/src/schema/schema.ts");
  const dashSrc   = readFile("artifacts/myhomebase/src/pages/contractor-dashboard.tsx");
  const crmSrc    = readFile("artifacts/myhomebase/src/pages/contractor-crm.tsx");
  const onbSrc    = readFile("artifacts/myhomebase/src/pages/contractor-onboarding.tsx");
  const propSrc   = readFile("artifacts/myhomebase/src/components/proposals.tsx");
  const stripeSrc = readFile("artifacts/myhomebase/src/components/stripe-connect-onboarding.tsx");
  const gateSrc   = readFile("artifacts/myhomebase/src/components/contractor-feature-gate.tsx");

  console.log("Extracting routes...");
  const contractorRoutes   = extractContractorRoutes(routesSrc);
  const contractorsPubRoutes = extractPublicContractorRoutes(routesSrc);
  const crmRoutes          = contractorRoutes.filter((r) => r.path.startsWith("/api/crm/"));
  const proposalRoutes     = contractorRoutes.filter((r) => r.path.startsWith("/api/proposals"));
  const mgmtRoutes         = contractorRoutes.filter(
    (r) => r.path.startsWith("/api/contractor") && !r.path.startsWith("/api/contractors")
  );

  console.log("Extracting schema tables...");
  // Table start lines from schema.ts (verified via grep)
  const SCHEMA_TABLES: Array<{ line: number }> = [
    { line: 78 },   // companies
    { line: 126 },  // companyInviteCodes
    { line: 230 },  // contractors
    { line: 601 },  // contractorReviews
    { line: 683 },  // proposals
    { line: 757 },  // contractorBoosts
    { line: 1771 }, // crmClients
    { line: 1805 }, // crmJobs
    { line: 1847 }, // crmQuotes
    { line: 1885 }, // crmInvoices
  ];

  const tables: TableDef[] = SCHEMA_TABLES
    .map((t) => parseTable(schemaSrc, t.line))
    .filter((t): t is TableDef => t !== null);

  console.log(`  Found ${tables.length} tables`);

  // ─── Build markdown ──────────────────────────────────────────────────────────

  const now = new Date().toISOString().slice(0, 10);
  const routesVersion = (() => {
    const m = routesSrc.match(/NEW CODE VERSION ([^\s']+)/);
    return m ? m[1] : "unknown";
  })();
  const schemaTotalLines = lines(schemaSrc).length;
  const routesTotalLines = lines(routesSrc).length;

  const doc: string[] = [];

  const h = (level: number, text: string) => "#".repeat(level) + " " + text;
  const code = (lang: string, src: string) => "```" + lang + "\n" + src.trim() + "\n```";
  const fence = (src: string) => code("typescript", src);

  // ─── Header ──────────────────────────────────────────────────────────────────
  doc.push(`# MyHomeBase™ — Contractor Module`);
  doc.push(`## Developer Reference: Architecture, API, Schema & Annotated Code`);
  doc.push(``);
  doc.push(`> **Generated:** ${now}  `);
  doc.push(`> **Routes version:** ${routesVersion}  `);
  doc.push(`> **Source sizes:** routes.ts ${routesTotalLines.toLocaleString()} lines, schema.ts ${schemaTotalLines.toLocaleString()} lines  `);
  doc.push(`> **Stack:** React 18 + TypeScript (Vite), Express 5 + Drizzle ORM (PostgreSQL)  `);
  doc.push(`> **Monorepo:** pnpm workspaces — \`@workspace/myhomebase\` (frontend), \`@workspace/api-server\` (backend), \`@workspace/db\` (schema)`);
  doc.push(``);
  doc.push(`---`);
  doc.push(``);

  // ─── TOC ─────────────────────────────────────────────────────────────────────
  doc.push(`## Table of Contents`);
  doc.push(``);
  const sections = [
    "1. [Module Overview](#1-module-overview)",
    "2. [Subscription Tiers (from live source)](#2-subscription-tiers)",
    "3. [Authentication & Authorization](#3-authentication--authorization)",
    "4. [File Map](#4-file-map)",
    "5. [Frontend Architecture](#5-frontend-architecture)",
    "6. [API Reference — Public /api/contractors](#6-api-reference--public-apicontractors)",
    "7. [API Reference — /api/contractor Management](#7-api-reference--apicontractor-management)",
    "8. [API Reference — CRM /api/crm/*](#8-api-reference--crm-apicrm)",
    "9. [API Reference — /api/proposals](#9-api-reference--apiproposals)",
    "10. [Database Schema (from live schema.ts)](#10-database-schema)",
    "11. [Annotated Code Walkthroughs](#11-annotated-code-walkthroughs)",
    "12. [Integration Points](#12-integration-points)",
    "13. [Key Patterns & Gotchas](#13-key-patterns--gotchas)",
  ];
  sections.forEach((s) => doc.push(s));
  doc.push(``);
  doc.push(`---`);
  doc.push(``);

  // ─── 1. Module Overview ───────────────────────────────────────────────────────
  doc.push(h(2, "1. Module Overview"));
  doc.push(``);
  doc.push(`The contractor module is a B2B vertical within MyHomeBase™ serving three role types:`);
  doc.push(``);
  doc.push(`| Role | \`companyRole\` value | Capabilities |`);
  doc.push(`|------|---------------------|--------------|`);
  doc.push(`| **Owner** | \`'owner'\` | Full profile, billing, team management, all CRM |`);
  doc.push(`| **Admin** | \`'admin'\` | Company-level admin; most owner rights except billing |`);
  doc.push(`| **Tech** | \`'tech'\` | Invoice upload, own job history only |`);
  doc.push(``);
  doc.push(`**Routes extracted from live source:** ${contractorRoutes.length + contractorsPubRoutes.length} contractor endpoints total.`);
  doc.push(``);
  doc.push(`The module covers:`);
  doc.push(`- **Profile & Discovery** — public-facing listing, reviews, ratings`);
  doc.push(`- **Lead Capture** — homeowner messaging, proposals, connection codes`);
  doc.push(`- **Team Management** — invite/suspend/remove techs; seat limits enforced server-side`);
  doc.push(`- **CRM (Pro only)** — clients, jobs, quotes, invoices, Stripe payment links`);
  doc.push(`- **Stripe Connect** — direct payout onboarding; charges-enabled check before invoicing`);
  doc.push(`- **Boost** — paid geo-radius visibility boosts (Stripe charge at purchase)`);
  doc.push(`- **Personal Home** — contractors may track one personal property`);
  doc.push(``);

  // ─── 2. Subscription Tiers ───────────────────────────────────────────────────
  doc.push(h(2, "2. Subscription Tiers"));
  doc.push(``);
  doc.push(`**Source: \`artifacts/api-server/src/routes/routes.ts\` — \`CONTRACTOR_PLANS\` constant (auto-seeded to \`subscription_plans\` table at startup)**`);
  doc.push(``);
  doc.push(fence(extractContractorPlans(routesSrc)));
  doc.push(``);
  doc.push(`### Grandfathered Emails (from live source)`);
  doc.push(``);
  doc.push(fence(extractGrandfatheredEmails(routesSrc)));
  doc.push(``);
  doc.push(`### Trial / Subscription State Machine`);
  doc.push(``);
  doc.push(`The \`users.subscriptionStatus\` field drives access:`);
  doc.push(``);
  doc.push("```");
  doc.push(`trialing  →  active      (Stripe webhook: checkout.session.completed)`);
  doc.push(`trialing  →  past_due    (trial ended, no payment)`);
  doc.push(`active    →  past_due    (invoice.payment_failed)`);
  doc.push(`past_due  →  canceled    (after grace period)`);
  doc.push(`any       →  grandfathered (manual admin override; bypasses all checks)`);
  doc.push("```");
  doc.push(``);

  // ─── 3. Auth & Authorization ──────────────────────────────────────────────────
  doc.push(h(2, "3. Authentication & Authorization"));
  doc.push(``);
  doc.push(`### Session Shape`);
  doc.push(``);
  doc.push(`Express-session populated on login (Replit OIDC → \`replitAuth.ts\`, Google OAuth → \`googleAuth.ts\`, email/password → \`storage.ts\`).`);
  doc.push(``);
  doc.push(fence(`// req.session.user
{
  id: string;          // users.id
  email: string;
  role: 'contractor' | 'homeowner' | 'agent';
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'tech';
  firstName?: string;
  lastName?: string;
  subscriptionStatus?: string;
  trialEndsAt?: Date;
}`));
  doc.push(``);

  doc.push(`### Middleware Chain`);
  doc.push(``);
  doc.push("```");
  doc.push(`isAuthenticated            — session check; 401 if missing`);
  doc.push(`requireRole('contractor')  — role check; 403 if mismatch`);
  doc.push(`requireContractorSubscription — trial/active check`);
  doc.push(`requireCompanyRole(roles)  — checks req.session.user.companyRole`);
  doc.push(`requireNotSuspended()      — checks suspendedUserIds Set`);
  doc.push(`requireSameCompany         — cross-company data isolation`);
  doc.push("```");
  doc.push(``);

  doc.push(`### \`requireContractorSubscription\` (from live source)`);
  doc.push(``);
  doc.push(fence(extractSubscriptionMiddleware(routesSrc)));
  doc.push(``);

  doc.push(`### \`requireAdmin\` (from live source)`);
  doc.push(``);
  doc.push(`Reads \`ADMIN_EMAILS\` env var (comma-separated). Protects \`/api/admin/*\` routes.`);
  doc.push(``);
  doc.push(fence(extractRequireAdmin(routesSrc)));
  doc.push(``);

  // ─── 4. File Map ─────────────────────────────────────────────────────────────
  doc.push(h(2, "4. File Map"));
  doc.push(``);
  doc.push(`### Backend (\`artifacts/api-server/src/\`)`);
  doc.push(``);
  doc.push("```");
  const backendFiles = [
    ["routes/routes.ts", `All Express route registrations (${routesTotalLines.toLocaleString()} lines)`],
    ["replitAuth.ts", "Replit OIDC setup + isAuthenticated, requireRole, etc."],
    ["googleAuth.ts", "Google OAuth setup"],
    ["storage.ts", "IStorage interface + DatabaseStorage implementation"],
    ["objectStorage.ts", "Replit Object Storage wrapper"],
    ["invoice-analysis-service.ts", "OpenAI-powered PDF invoice extraction"],
    ["geocoding-service.ts", "Nominatim + haversine distance"],
    ["security-audit.ts", "auditLogger, sessionManager"],
    ["email-service.ts", "SendGrid wrapper"],
    ["sms-service.ts", "Twilio wrapper"],
    ["notification-orchestrator.ts", "Fan-out: push, email, SMS"],
    ["db.ts", "Drizzle + pg Pool singleton"],
  ];
  backendFiles.forEach(([f, d]) => doc.push(`${f.padEnd(36)} — ${d}`));
  doc.push("```");
  doc.push(``);

  doc.push(`### Database (\`lib/db/src/\`)`);
  doc.push(``);
  doc.push("```");
  doc.push(`schema/schema.ts   — All Drizzle table definitions (${schemaTotalLines.toLocaleString()} lines)`);
  doc.push(`index.ts           — Re-exports all tables and types`);
  doc.push("```");
  doc.push(``);

  doc.push(`### Frontend (\`artifacts/myhomebase/src/\`)`);
  doc.push(``);
  const feFiles = [
    ["pages/contractor-dashboard.tsx", `${lines(dashSrc).length} lines — Main contractor hub`],
    ["pages/contractor-crm.tsx", `${lines(crmSrc).length} lines — Full CRM UI`],
    ["pages/contractor-onboarding.tsx", `${lines(onbSrc).length} lines — 4-step registration wizard`],
    ["components/proposals.tsx", `${lines(propSrc).length} lines — Proposal CRUD + e-signature`],
    ["components/stripe-connect-onboarding.tsx", `${lines(stripeSrc).length} lines — Stripe Connect setup`],
    ["components/contractor-feature-gate.tsx", `${lines(gateSrc).length} lines — Pro-tier paywall gate`],
  ];
  doc.push("```");
  feFiles.forEach(([f, d]) => doc.push(`${f.padEnd(48)} — ${d}`));
  doc.push("```");
  doc.push(``);

  // ─── 5. Frontend Architecture ─────────────────────────────────────────────────
  doc.push(h(2, "5. Frontend Architecture"));
  doc.push(``);
  doc.push(`### contractor-dashboard.tsx — Exported identifiers`);
  doc.push(``);
  doc.push(fence(extractExportedFunctions(dashSrc).join("\n")));
  doc.push(``);

  doc.push(`### contractor-crm.tsx — Interfaces (type contracts)`);
  doc.push(``);
  doc.push(fence(extractInterfaces(crmSrc).join("\n")));
  doc.push(``);

  doc.push(`### contractor-onboarding.tsx — Form steps and services list (head)`);
  doc.push(``);
  doc.push(fence(firstNLines(onbSrc, 55)));
  doc.push(``);

  doc.push(`### contractor-feature-gate.tsx — Feature keys (from live source)`);
  doc.push(``);
  // Extract the featureLabels object
  const gateLines = lines(gateSrc);
  const featureLabelsStart = gateLines.findIndex((l) => l.includes("featureLabels"));
  const featureLabelsBlock = featureLabelsStart >= 0
    ? extractBlock(gateSrc, featureLabelsStart + 1, 20)
    : "// not found";
  doc.push(fence(featureLabelsBlock));
  doc.push(``);

  doc.push(`### stripe-connect-onboarding.tsx — Status interface (from live source)`);
  doc.push(``);
  const stripeLines = lines(stripeSrc);
  const statusStart = stripeLines.findIndex((l) => l.includes("interface StripeConnectStatus"));
  const statusBlock = statusStart >= 0 ? extractBlock(stripeSrc, statusStart + 1, 10) : "// not found";
  doc.push(fence(statusBlock));
  doc.push(``);

  // ─── 6. API — Public /api/contractors ────────────────────────────────────────
  doc.push(h(2, "6. API Reference — Public /api/contractors"));
  doc.push(``);
  doc.push(`> Extracted from \`routes.ts\` — ${contractorsPubRoutes.length} routes`);
  doc.push(``);
  doc.push(routeTable(contractorsPubRoutes));

  // ─── 7. API — /api/contractor management ─────────────────────────────────────
  doc.push(h(2, "7. API Reference — /api/contractor Management"));
  doc.push(``);
  doc.push(`> Extracted from \`routes.ts\` — ${mgmtRoutes.length} routes`);
  doc.push(``);
  doc.push(routeTable(mgmtRoutes));

  // ─── 8. API — CRM ────────────────────────────────────────────────────────────
  doc.push(h(2, "8. API Reference — CRM /api/crm/*"));
  doc.push(``);
  doc.push(`> Extracted from \`routes.ts\` — ${crmRoutes.length} routes`);
  doc.push(``);
  doc.push(routeTable(crmRoutes));

  // ─── 9. API — /api/proposals ─────────────────────────────────────────────────
  doc.push(h(2, "9. API Reference — /api/proposals"));
  doc.push(``);
  doc.push(`> Extracted from \`routes.ts\` — ${proposalRoutes.length} routes`);
  doc.push(``);
  doc.push(routeTable(proposalRoutes));
  doc.push(``);
  doc.push(`### Proposal Status Flow`);
  doc.push(``);
  doc.push("```");
  doc.push(`draft  →  sent  →  accepted  →  (contract uploaded)  →  (contract signed)`);
  doc.push(`                →  rejected`);
  doc.push(`                →  expired`);
  doc.push("```");
  doc.push(``);

  // ─── 10. Database Schema ──────────────────────────────────────────────────────
  doc.push(h(2, "10. Database Schema"));
  doc.push(``);
  doc.push(`> Extracted from \`lib/db/src/schema/schema.ts\` — ${tables.length} tables`);
  doc.push(``);
  tables.forEach((t) => {
    doc.push(tableToMarkdown(t));
  });

  // ─── 11. Annotated Code Walkthroughs ─────────────────────────────────────────
  doc.push(h(2, "11. Annotated Code Walkthroughs"));
  doc.push(``);

  doc.push(h(3, "11.1 Stripe Connect Initialization (from routes.ts)"));
  doc.push(``);
  doc.push(fence(extractStripeInit(routesSrc)));
  doc.push(``);
  doc.push(`> Stripe instance is \`null\` when \`STRIPE_SECRET_KEY\` is absent. All Stripe routes must null-check before use.`);
  doc.push(``);

  doc.push(h(3, "11.2 Proposal Component — Signature Flow"));
  doc.push(``);
  const propLines = lines(propSrc);
  const sigStart = propLines.findIndex((l) => l.includes("signatureMutation"));
  if (sigStart >= 0) {
    doc.push(fence(extractBlock(propSrc, sigStart + 1, 25)));
  }
  doc.push(``);

  doc.push(h(3, "11.3 Stripe Connect Component — State Machine"));
  doc.push(``);
  doc.push(`Three display states driven by \`StripeConnectStatus\`:`);
  doc.push(``);
  doc.push("```");
  doc.push(`!hasAccount              → show "Connect with Stripe" CTA`);
  doc.push(`hasAccount && !charges   → show "Complete Setup" (incomplete onboarding)`);
  doc.push(`hasAccount && charges    → show Connected + Stripe Express dashboard link`);
  doc.push("```");
  doc.push(``);
  const stripeHasAccount = stripeLines.findIndex((l) => l.includes("if (!status?.hasAccount)"));
  if (stripeHasAccount >= 0) {
    doc.push(fence(stripeLines.slice(stripeHasAccount, stripeHasAccount + 5).join("\n")));
  }
  doc.push(``);

  doc.push(h(3, "11.4 Feature Gate — hasCrmAccess Logic"));
  doc.push(``);
  const gateExport = gateLines.findIndex((l) => l.includes("export function ContractorFeatureGate"));
  if (gateExport >= 0) {
    doc.push(fence(extractBlock(gateSrc, gateExport + 1, 20)));
  }
  doc.push(``);

  // ─── 12. Integration Points ──────────────────────────────────────────────────
  doc.push(h(2, "12. Integration Points"));
  doc.push(``);
  doc.push(`| Integration | Used by | Config env var |`);
  doc.push(`|---|---|---|`);
  doc.push(`| **Stripe Connect** | \`/api/contractor/stripe-connect/*\` | \`STRIPE_SECRET_KEY\` |`);
  doc.push(`| **Stripe Payment Links** | \`/api/crm/invoices/:id/payment-link\` | \`STRIPE_SECRET_KEY\` |`);
  doc.push(`| **Stripe Subscriptions** | Webhooks at \`/api/stripe/webhook\` | \`STRIPE_WEBHOOK_SECRET\` |`);
  doc.push(`| **SendGrid** | Quote/invoice send, invite emails | \`SENDGRID_API_KEY\` |`);
  doc.push(`| **Twilio** | Job notifications, quote/invoice SMS | \`TWILIO_ACCOUNT_SID\`, \`TWILIO_AUTH_TOKEN\` |`);
  doc.push(`| **OpenAI** | Invoice PDF analysis (GPT-4o Vision) | \`OPENAI_API_KEY\` |`);
  doc.push(`| **Replit Object Storage** | Logos, photos, proposal attachments | managed |`);
  doc.push(``);

  // ─── 13. Key Patterns & Gotchas ──────────────────────────────────────────────
  doc.push(h(2, "13. Key Patterns & Gotchas"));
  doc.push(``);

  const gotchas = [
    ["Company vs. Contractor Duality",
     `Two tables exist: \`contractors\` (individual) and \`companies\` (team entity). Profile PUT auto-creates a company when \`companyId\` is null. Homeowner-facing queries prefer company data (logo, reviews) over individual contractor data.`],
    ["Proposal Creation Restricted to Conversations",
     `The Create Proposal \`<DialogTrigger>\` in \`proposals.tsx\` is inside \`{false && ...}\` — intentionally hidden. Proposal creation only surfaces in the Messages tab, scoped to active conversations, preventing cold spam.`],
    ["Tech Role Reduced Capabilities",
     `Techs (\`companyRole === 'tech'\`) see \`<TechDashboard>\` instead of the full dashboard. Techs can upload invoices and view their own history only.`],
    ["CRM Subscription Gap",
     `\`GET /api/crm/clients\` requires \`requireContractorSubscription\`, but individual \`GET/PATCH/DELETE /api/crm/clients/:id\` only have \`isAuthenticated\`. Expired contractors can still read/modify individual records they already created.`],
    ["No Pagination on List Endpoints",
     `All list endpoints return full unbounded sets. Cursor-based pagination is needed before contractor/CRM data grows large.`],
    ["Emergency Reset Endpoint",
     `\`POST /api/admin/emergency-reset\` still exists in routes.ts (search for \`emergency-reset\`). \`EMERGENCY_RESET_SECRET\` has been removed from production env (returns 404), but the dead code should be removed in a future cleanup pass.`],
    ["Stripe API Version Pinned",
     `\`apiVersion: '2025-08-27.basil'\` is pinned in routes.ts. Any Stripe SDK upgrade must be checked against this version's breaking changes.`],
    ["Rate Limits",
     `authLimiter: 100/15min. uploadLimiter: 10/hour. aiChatLimiter: 20/hour. All applied per-IP.`],
  ];

  gotchas.forEach(([title, body], i) => {
    doc.push(`### ${i + 1}. ${title}`);
    doc.push(``);
    doc.push(body);
    doc.push(``);
  });

  doc.push(`---`);
  doc.push(``);
  doc.push(`*Generated ${now} from live source — routes.ts v${routesVersion}*  `);
  doc.push(`*MyHomeBase™ · gotohomebase.com · © 2026 CodeStation AI*`);

  // ─── Write output ─────────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const content = doc.join("\n");
  fs.writeFileSync(OUT, content, "utf-8");

  const mdLines = lines(content).length;
  const mdSize = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`✓ Markdown generated: ${OUT}`);
  console.log(`  ${mdLines} lines, ${mdSize} KB`);
  console.log(`  Routes extracted: ${contractorRoutes.length + contractorsPubRoutes.length}`);
  console.log(`  Tables extracted: ${tables.length}`);
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
