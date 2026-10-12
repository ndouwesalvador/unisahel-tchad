# UniSahel RBAC and Official Documents Pipeline Implementation Plan

**Goal:** Make each institutional role expose only its real duties and data scope, then make receipts, rectorate oversight, PV and diploma exports usable without weakening official-document eligibility checks.

**Architecture:** Centralize role capabilities, keep all resource scoping server-side, and make the dashboard menu consume the same policy. Faculty and department-bound users resolve their scope from the current database record on every request. Read-only oversight roles receive purpose-built projections instead of administrator payloads. Official exports keep immutable signed artifacts and explicit eligibility diagnostics.

**Tech Stack:** Next.js App Router, TypeScript, React Query, Prisma/PostgreSQL, Vitest, Playwright CLI, Vercel.

---

## Global constraints

- Preserve tenant isolation on every query.
- Never rely on hidden buttons as authorization; every mutation is checked by its route.
- Rectorat is read-only for people and structure, with academic oversight and PV download only.
- Caisse manages payments, receipts and bursary-related finance, not academic documents.
- A maître de stage sees and evaluates only internships assigned to that account; student identity remains read-only.
- A responsable de filière is limited to the configured department until a dedicated programme assignment exists.
- Signed documents remain immutable and eligibility checks remain mandatory.
- Do not create or mutate an ONECS production account without an email explicitly supplied by the user.

## Task 1: Central role and organization scope

**Files:**
- Modify: `src/lib/auth/organization-scope.ts`
- Modify: `src/lib/auth/helpers.ts`
- Modify: `src/lib/auth/organization-policy.ts`
- Create: `src/lib/auth/role-capabilities.ts`
- Create: `src/lib/auth/role-capabilities.test.ts`
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/lib/store.ts`

**Steps:**
1. Write failing matrix tests for allowed views and organization-scoped roles.
2. Add central read/write capability helpers.
3. Extend database-backed scope to `RESPONSABLE_FILIERE` while preserving `FACULTE` and `DEPARTEMENT` manager semantics.
4. Make middleware and navigation consume the same policy.
5. Remove duplicate `Programmes` navigation when `Structure` already owns the programme tree.

## Task 2: Scoped rosters and read-only people views

**Files:**
- Modify: `src/app/api/students/route.ts`
- Modify: `src/app/api/teachers/route.ts`
- Modify: `src/app/api/structure/route.ts`
- Modify: `src/components/students/students-list.tsx`
- Modify: `src/components/teachers/teachers-page.tsx`
- Add/modify route tests beside each route.

**Steps:**
1. Write failing tests for faculty, department and filière scopes, rectorate read-only behavior, and forbidden stage/caisse roster access.
2. Apply organization scope to list, detail and transcript queries.
3. Remove `RECTORAT` from teacher mutations.
4. Hide all edit/reset/status controls from non-management roles.
5. Expose read-only structure/people screens only where the role matrix permits them.

## Task 3: Caisse year, payment student lookup and receipts

**Files:**
- Modify: `src/components/payments/payments-page.tsx`
- Modify: `src/app/api/payments/route.ts`
- Create: `src/components/payments/receipts-page.tsx`
- Modify: `src/lib/api-hooks.ts`
- Add/modify payment tests.

**Steps:**
1. Write a failing regression test for the role-dashboard `academicYear` response.
2. Resolve the active year from either the selected year or the role dashboard response.
3. Add a minimal caisse-only student lookup to the payments API instead of opening the full student roster.
4. Add a receipt-only page backed by validated payments and existing receipt rendering.
5. Remove caisse access to generic academic documents and institution-wide academic statistics.

## Task 4: Maître de stage assignment boundary

**Files:**
- Modify: `prisma/schema.prisma`
- Add: `prisma/migrations/*_internship_supervisor_scope/migration.sql`
- Modify: `src/app/api/internships/route.ts`
- Modify: `src/components/internships/internships-page.tsx`
- Add/modify internship route tests.

**Steps:**
1. Write failing tests showing one supervisor cannot read or update another supervisor's internship.
2. Add an optional `supervisorUserId` relation with indexes.
3. Require administrative creation/assignment and enforce ownership for maître-de-stage reads and evaluations.
4. Remove generic student and grade navigation from the role.
5. Keep historical unassigned stages visible only to central administration.

## Task 5: Rectorate oversight, reports and official PV access

**Files:**
- Create: `src/app/api/oversight/route.ts`
- Create: `src/app/api/oversight/route.test.ts`
- Modify: `src/components/reports/reports-page.tsx`
- Modify: `src/app/api/documents/route.ts`
- Modify: `src/app/api/documents/download/route.ts`
- Modify: `src/components/documents/documents-page.tsx`
- Modify: `src/app/api/documents/generate/route.ts`

**Steps:**
1. Write failing tests for read-only academic counts grouped by faculty, department, programme, level and status.
2. Build a compact aggregate API that does not expose payment or mutable-person fields.
3. Render rectorate reports from that endpoint and provide CSV/XLSX exports.
4. Restrict rectorate documents to finalized signed PVs and remove document generation/signing rights.
5. Keep authorized PV download, while student and teacher records remain immutable for rectorate.

## Task 6: ONECS diploma authentication foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Add: `prisma/migrations/*_onecs_diploma_authentication/migration.sql`
- Create: `src/app/api/onecs/diplomas/route.ts`
- Create: `src/app/api/onecs/diplomas/route.test.ts`
- Create: `src/components/onecs/onecs-dashboard.tsx`
- Modify: auth/store/dashboard role mappings.

**Steps:**
1. Write failing tests for a platform-level `ONECS` role that can inspect only signed diplomas across tenants.
2. Add explicit ONECS authentication state and audit fields to official diplomas.
3. Add authenticate/reject actions with reason, actor and timestamp; never expose unrelated student records.
4. Add a verification-focused dashboard and QR-status display.
5. Leave account creation pending an official ONECS email supplied by the user.

## Task 7: Pipeline diagnostics, verification and deployment

**Files:**
- Modify document eligibility error presentation where needed.
- Add targeted tests for diploma/PV failure reasons and authorized exports.

**Steps:**
1. Verify preview versus official generation separately for diploma and PV.
2. Surface every unmet prerequisite as an actionable checklist, not a generic block.
3. Run targeted Vitest suites, full tests, lint/type checks and production build.
4. Exercise caisse, responsable de filière, doyen, maître de stage, rectorat and admin in a real browser.
5. Review the complete diff, deploy once to production, then repeat the critical browser flows.

## Review focus

- IDOR through arbitrary student, teacher, internship, department, document or tenant identifiers.
- A role shown a control that its API rejects, or an API accepting a mutation hidden by the UI.
- Cross-department leakage through structure filter options.
- Rectorate or ONECS receiving operational data beyond their mandate.
- Official document download bypassing signature/finalization requirements.
- Existing historical records becoming inaccessible without an intentional migration rule.
