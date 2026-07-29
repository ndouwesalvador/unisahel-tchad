/**
 * Cree le premier SUPER_ADMIN de la plateforme (sans institution).
 * Il se connecte ensuite sur /login puis cree les institutions depuis
 * le tableau de bord Super Admin (chaque institution provisionne son
 * propre ADMIN_INSTITUTION avec un mot de passe temporaire).
 *
 * Usage :
 *   npx tsx scripts/bootstrap-super-admin.ts \
 *     --email super@unisahel.africa \
 *     --password "MotDePasse#2026" \
 *     --firstName Ndouwe --lastName Salvador
 *
 * Ou via variables d'environnement :
 *   BOOTSTRAP_SUPERADMIN_EMAIL, BOOTSTRAP_SUPERADMIN_PASSWORD,
 *   BOOTSTRAP_SUPERADMIN_FIRSTNAME, BOOTSTRAP_SUPERADMIN_LASTNAME
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i === -1) return undefined
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : undefined
}

async function main() {
  const email = (arg('--email') ?? process.env.BOOTSTRAP_SUPERADMIN_EMAIL ?? '').trim().toLowerCase()
  const password = arg('--password') ?? process.env.BOOTSTRAP_SUPERADMIN_PASSWORD ?? ''
  const firstName = (arg('--firstName') ?? process.env.BOOTSTRAP_SUPERADMIN_FIRSTNAME ?? '').trim()
  const lastName = (arg('--lastName') ?? process.env.BOOTSTRAP_SUPERADMIN_LASTNAME ?? '').trim()

  if (!email || !password || !firstName || !lastName) {
    console.error(
      'Usage : --email <email> --password <mdp> --firstName <prenom> --lastName <nom>\n' +
      'Ou definis BOOTSTRAP_SUPERADMIN_EMAIL / _PASSWORD / _FIRSTNAME / _LASTNAME dans .env.local'
    )
    process.exit(1)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Email invalide :', email)
    process.exit(1)
  }
  if (password.length < 12) {
    console.error('Mot de passe trop court (min 12 caracteres pour un SUPER_ADMIN).')
    process.exit(1)
  }

  const db = new PrismaClient()

  try {
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } })
    if (existing) {
      console.error(`Un compte existe deja avec l'email "${email}" (role=${existing.role}). Annulation.`)
      process.exit(1)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        tenantId: null,
        isActive: true,
        emailVerified: true,
        mustChangePassword: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    console.log('SUPER_ADMIN cree :')
    console.log(`  id    : ${user.id}`)
    console.log(`  email : ${user.email}`)
    console.log(`  nom   : ${user.firstName} ${user.lastName}`)
    console.log(`  role  : ${user.role}`)
    console.log('')
    console.log('Connecte-toi sur /login avec cet email et le mot de passe fourni.')
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('Bootstrap echoue :', err)
  process.exit(1)
})
