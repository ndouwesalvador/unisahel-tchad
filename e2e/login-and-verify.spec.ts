import { test, expect } from '@playwright/test'

// Golden-path E2E: login -> action -> verification.
// Requires a real, reachable database with the seeded demo tenant/user
// (see prisma/seed.ts) - run with DATABASE_URL/DIRECT_URL/NEXTAUTH_SECRET
// pointed at a real environment, e.g.:
//   set -a && source .env.local && set +a && npx playwright test

test('login redirects to the dashboard with the real session user', async ({ page }) => {
  await page.goto('/login')

  await page.getByPlaceholder('nom@universite.td').fill('admin@unive-ndjamena.td')
  await page.getByPlaceholder('Entrez votre mot de passe').fill('password123')
  await page.getByRole('button', { name: 'Connexion', exact: true }).click()

  // Greeting is time-of-day-dependent ("Bonjour"/"Bon apres-midi"/"Bonsoir",
  // see getGreeting() in dashboard-home.tsx) - match on the name only so
  // this test doesn't flake depending on when CI happens to run.
  await expect(page.getByText('Admin Principal').first()).toBeVisible({ timeout: 15_000 })
})

test('document verification reports an honest "not found" for an unknown code', async ({ page }) => {
  // Public route, no login required - exercises the real
  // GET /api/documents/verify/[code] endpoint end-to-end.
  await page.goto('/verify')

  const codeInput = page.getByPlaceholder('VER-XXX-YYYY-TYPE-NNN')
  await codeInput.fill('THIS-CODE-DOES-NOT-EXIST')
  await page.getByRole('button', { name: 'Vérifier', exact: true }).click()

  await expect(page.getByText('Document non trouvé ou invalide')).toBeVisible({ timeout: 15_000 })
})

test('scanning a QR code (arriving via ?code=) auto-verifies without manual input', async ({ page }) => {
  // Regression test for the QR auto-verify fix earlier this session: the
  // page used to ignore the ?code= query param entirely.
  await page.goto('/verify?code=ANOTHER-UNKNOWN-CODE')

  await expect(page.getByText('Document non trouvé ou invalide')).toBeVisible({ timeout: 15_000 })
})
