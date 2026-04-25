Project: HomeBase (Homeowner = purple theme, Contractor = blue theme)
Goal: Sweep the app for UX/UI consistency, accessibility, and micro-interaction polish. Implement a shared design-token system, unify components (especially modals, buttons, forms), tighten copy, and add clear active states + spacing rhythm across pages.
Deliverables:

New design tokens (colors, spacing, radii, shadows, typography)

Standardized Button, Card, Modal, Input, Select, Badge components

Nav active states, consistent padding/spacing, improved contrast, and ARIA/focus fixes

Terminology cleanup (“Property” everywhere; “All Status”)

Empty-state and validation patterns

QA checklist + unit tests where applicable

If stack = React (Vite/Next) + Tailwind: extend tailwind.config.js with tokens below.
If plain CSS/SCSS: create :root custom properties and migrate components to use them.
Keep both role themes (purple/blue) via data-role="homeowner|contractor" on <body> and theme maps.

Global Design Tokens (add first)

CSS custom properties (example):

:root {
  --space-0: 0;
  --space-1: .25rem;  /* 4px */
  --space-2: .5rem;   /* 8px */
  --space-3: .75rem;  /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */

  --radius-sm: .375rem;  /* 6px */
  --radius-md: .75rem;   /* 12px */
  --radius-lg: 1rem;     /* 16px */
  --radius-xl: 1.25rem;  /* 20px */

  --shadow-1: 0 1px 3px rgba(0,0,0,.08);
  --shadow-2: 0 8px 24px rgba(0,0,0,.12);

  /* Neutrals */
  --bg: #0F0540;          /* deep purple backdrop */
  --bg-contrast: #0B3E71; /* deep blue backdrop */
  --card: #FFFFFF;
  --card-weak: #F6F6F8;
  --border: rgba(0,0,0,.12);
  --muted: #6B7280;       /* gray-600 */

  /* Homeowner (purple) */
  --h-primary: #3B1B78;
  --h-primary-600: #52259F;
  --h-primary-500: #6B38D1;
  --h-primary-200: #E7DFF9;

  /* Contractor (blue) */
  --c-primary: #165C9A;
  --c-primary-600: #0D4E86;
  --c-primary-500: #1E6FB8;
  --c-primary-200: #D7E9FB;

  /* Shared status */
  --success: #16A34A;
  --warning: #F59E0B;
  --danger:  #DC2626;

  /* Text */
  --text-strong: #0F172A;
  --text: #111827;
  --text-on-dark: #FFFFFF;
  --placeholder-on-dark: rgba(255,255,255,.85); /* WCAG-friendly */
}
body[data-role="homeowner"] { --primary: var(--h-primary); --primary-500: var(--h-primary-500); --primary-600: var(--h-primary-600); --accent-200: var(--h-primary-200); }
body[data-role="contractor"] { --primary: var(--c-primary); --primary-500: var(--c-primary-500); --primary-600: var(--c-primary-600); --accent-200: var(--c-primary-200); }

Component System (build/standardize)

Buttons (Primary / Secondary / Ghost / Destructive)

Primary: background var(--primary-600), text white, hover to var(--primary-500), focus ring 2px outline-offset:2px using --accent-200.

Secondary: white bg, 1px border --border, text --primary-600, hover light tint.

Ghost: transparent, text --primary-600, subtle hover bg --accent-200 @ 24% opacity.

Destructive: bg --danger, hover #B91C1C.

Ensure disabled uses opacity:.6 and cursor:not-allowed.

Cards

Background --card, radius var(--radius-lg), shadow --shadow-1, padding var(--space-6) default.

Modals

Overlay rgba(0,0,0,.45), dialog bg:

On dark pages: use light dialog #1D124F → actually lighten to #2A1C66 OR switch to light modal (--card) for best contrast.

Dialog radius var(--radius-xl), padding var(--space-8), shadow --shadow-2.

Close button: visible focus ring + ESC closes.

Inputs / Selects / Textareas

Height 44–48px, padding 0 var(--space-3), radius var(--radius-md).

Border 1px solid var(--border), focus 2px ring in --primary-500.

Placeholder on dark: --placeholder-on-dark (increase contrast).

Error state: border --danger, helper text --danger.

Badges (Priority / Status)

High: text #7A1C1C, bg #FEE2E2.

Medium: text #8A5A0A, bg #FEF3C7.

Low: text #065F46, bg #D1FAE5.

Include small icon glyphs so priority isn’t color-only.

UX/UI Fixes & Enhancements (action list)
A. Navigation

Add active page indicator in top nav (underline + color):

Active link: font-weight 600, underline offset 6px, color --primary-600.

Consistent nav structure across roles (order + labels):

Maintenance Schedule | Find Contractors | Products | Messages | Achievements | Account

Contractor analogue: Dashboard | Manage Team | Messages | My Profile.

Role badge: convert “Homeowner/Contractor Demo” + “Sign Out” into an Account menu with dropdown (Profile, Switch Role, Billing, Sign Out).

Keyboard navigation: ensure Tab order follows visual order; visible focus outline on all nav links/buttons.

B. Terminology & Microcopy

Unify “Property vs House vs Home” → “Property” throughout.

“Add New House” → “Add Property”

“Set as default property” stays.

“All Statuses” → “All Status” on filters.

Button text consistency:

“Add First Service Record” → “Add Service Record” on empty state CTA (short, consistent).

“Create one” → “Create Account” on sign-in screen.

Empty states should include one-line value prop + primary CTA + secondary doc link (if any).

C. Buttons & CTAs

Normalize all primary button colors/hover/disabled across app.

Replace mixed shapes/sizes so all primary CTAs are 48px tall with consistent icon sizing (20–24px).

Add loading states for network actions (aria-busy, spinner, text swap “Saving…”).

D. Cards & Spacing

Adopt a spacing scale: 8/16/24/32px. No one-off paddings.

Increase vertical rhythm between stacked cards to 24px.

Ensure section headers (e.g., “Quick Actions”) have 16px margin-bottom and 24px margin-top.

Align icons + text baselines inside card headers (use flex with items-center gap-2).

E. Modals (critical consistency)

Use one modal component across roles. Current blue vs purple modals differ in padding/field density.

Contrast fix on dark modals: lighten modal bg or use light dialog everywhere. Placeholder color must meet WCAG (use --placeholder-on-dark).

Standardize footer buttons: primary on the right, secondary “Cancel” on the left; sticky footer if content scrolls.

Add ESC to close, trap focus inside modal, and return focus to the trigger on close.

Ensure mobile modal max-height with internal scroll and overscroll-behavior: contain.

F. Forms & Validation

Inputs: consistent height, padding, radius, and focus ring (see tokens).

Inline validation: show error below field with icon + ARIA aria-describedby linking to helper text.

Add required asterisks and aria-required="true"—don’t rely on error after submit.

Date inputs: consistent mask/format (mm/dd/yyyy) and matching calendar picker across roles.

Multi-column forms: maintain 24px column gap; on <=768px, stack fields 1-column.

Add success toasts (top-right) for create/update actions; auto-dismiss after 4s.

G. Accessibility

Check all text on purple/blue surfaces for contrast ≥ 4.5:1; bump weights or lighten surfaces as needed.

Ensure icons aren’t meaning-only; pair with text or aria-label.

Add skip-to-content link at top.

Ensure all interactive elements have :focus-visible rings (don’t remove outlines).

Use role=”status” for loading announcements, role=”alert” for errors.

H. Lists, Filters, Empty States

Find Contractors page: add a clear “0 results” explanation with suggested actions (increase distance, broaden services, clear rating).

Add Reset Filters next to “Apply Filters.”

Persist last-used filters in query string or localStorage.

I. Dashboard Touch-ups

Contractor Dashboard

Add a small action in “Proposals” empty state: “Create Proposal.”

“Quick Actions” cards: increase top/bottom padding to var(--space-6), icon left, label right; add hover elevation.

Service Records (contractor + homeowner views)

Unify the list/table style; same chip styling for “Status.”

Search bar and “All Status” filter share the same height and border.

J. Achievements / Notifications

Nav bell shows “3” — add notifications panel with keyboard support and clear read/unread states; aria-live="polite" for new messages.

Mark-all-as-read control.

K. Copywriting Tweaks (examples)

Sign-in screen:

Subhead: “Welcome back! Sign in to continue.” (drop “Please”)

Divider label: “or continue with email” (sentence case)

Home hub banner: tighten to a 12–15 word value prop; keep the AI CTA line but reduce adjectives (“instant, expert guidance” is enough).

L. Visual Polish

Reduce heading weight on dark hero areas to avoid “blooms”; consider text-shadow: 0 1px 0 rgba(0,0,0,.25) or lighten the hero gradient a touch.

Standardize card header icons (24px) and color them with --primary-600 at 80% opacity.

Normalize border radii: cards radius-lg, modals radius-xl, inputs/buttons radius-md.

M. Performance & Responsiveness

Audit images/illustrations; ensure loading="lazy" on non-critical media.

Set container max-widths (max-w-screen-xl) and consistent gutters on desktop; on mobile, keep 16px side padding app-wide.

Prevent layout shift on nav by reserving width for role badge/CTA area.

N. Theming Architecture

Move color usage to tokens; in components, reference only --primary* and neutral tokens.

Toggle theme per role with data-role attribute on <body>.

Add automated visual regression set for both roles (even a simple Playwright screenshot diff).

O. Badges & Labels

Add icon + text for Priority (🔥 High, ⏳ Medium, 🌱 Low) so it’s not color-only.

Use rounded pills; font-weight 600; ensure min-touch target height 28–32px.

P. Search & Sort

Ensure consistent sort control component (label + chevron) with 44px height.

When searching, show a short inline result count and what filters are applied (chips with “×” to clear).

Q. Messaging

Messages list: show read/unread weight difference, time stamps, and 2-line preview; maintain 12px gutters inside each cell; keyboard navigation with aria-selected.

R. Forms: Examples to Update

“Add Service Record” (purple & blue versions) should be the same component with theme vars only.

Reorder fields: Type → Area → Description → Date → Cost → Contractor/Company → Warranty → Next Service Due → Notes.

Button copy: “Add Service Record” (primary) + “Cancel” (secondary). Primary aligned right.

S. QA & Tests

Add unit tests for Button, Input, Select, Modal accessibility (focus trap, ESC close).

Add e2e smoke tests for: sign-in (email flow), add property, create custom task, add service record, contractor proposals empty → create.

Copy Decisions (single source of truth)

Entity: “Property” (never House/Home).

Filters: “All Status” (singular label).

Primary CTAs: “Add Property,” “Add Service Record,” “Create Task,” “Apply Filters,” “Reset Filters.”

Empty state CTAs: “Create Proposal,” “Add Service Record,” “Add Property,” “Find Contractors.”

Sign-in divider: “or continue with email.”

Tailwind/Utility Hints (if using Tailwind)

Primary button: class="inline-flex h-12 px-5 items-center justify-center rounded-md bg-[var(--primary-600)] text-white hover:bg-[var(--primary-500)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-200)] disabled:opacity-60 disabled:cursor-not-allowed"

Card: rounded-lg bg-[var(--card)] shadow-[var(--shadow-1)] p-6

Input: h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-[var(--text)] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent

Dark-modal input: add placeholder:text-[var(--placeholder-on-dark)] and ensure background contrast is sufficient.

Acceptance Criteria (quick checklist)

 Design tokens control all brand colors; switching data-role flips theme without component edits

 Every page shows an active nav state

 All primary CTAs look/behave consistently (hover, disabled, loading)

 Modals are visually consistent; pass contrast checks; trap focus; ESC closes

 Form validation is inline, accessible, and uses ARIA relationships

 Terminology is unified to Property; labels updated; no “Statuses” typos

 Empty states include a helpful CTA and guidance

 Priority badges include icons (not color-only)

 Keyboard navigation works end-to-end; focus rings visible

 Mobile spacing/gutters are uniform; no clipped content at 320–375px widths