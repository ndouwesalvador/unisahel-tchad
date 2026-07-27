import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Provisions the "Espace Etudiant" self-service login (matricule + PIN) for a
// newly created student. Without this, a student enrolled through any real
// flow (manual creation, bulk import) would have no way to ever log in --
// only the demo seeder ever populated User.login/pinHash before this.
// The plaintext PIN is returned exactly once so the caller can hand it to
// the student; only its bcrypt hash is persisted.
export async function provisionStudentAccount(
  tenantId: string,
  studentId: string,
  matricule: string | null | undefined,
  firstName: string,
  lastName: string
): Promise<{ login: string; pin: string } | null> {
  if (!matricule) return null

  const loginTaken = await db.user.findUnique({ where: { login: matricule }, select: { id: true } })
  if (loginTaken) return null

  const pin = generatePin()
  const pinHash = await bcrypt.hash(pin, 12)

  const account = await db.user.create({
    data: {
      tenantId,
      login: matricule,
      pinHash,
      firstName,
      lastName,
      role: 'ETUDIANT',
    },
  })

  await db.student.update({ where: { id: studentId }, data: { userId: account.id } })

  return { login: matricule, pin }
}
