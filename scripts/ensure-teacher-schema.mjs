import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'

// Production's DATABASE_URL is a non-readable Vercel secret. Apply this
// additive, idempotent change in the build environment before the new app
// version can become live. Never replay the repository's old migrations:
// the existing database has no Prisma migration history.
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    throw new Error('Production database connection is missing; refusing to build')
  }

  const require = createRequire(import.meta.url)
  const prismaCli = require.resolve('prisma/build/index.js')
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261002170000_teacher_scoped_workflows', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261002200000_department_governance', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261002220000_department_deliberations', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261002230000_annual_teaching_service', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261003000000_timetable_publications', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261003010000_annual_student_registration', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261004130000_institution_pdf_assets', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
  execFileSync(process.execPath, [
    prismaCli, 'db', 'execute',
    '--file', join('prisma', 'migrations', '20261004170000_document_signatories', 'migration.sql'),
    '--schema', join('prisma', 'schema.prisma'),
  ], { stdio: 'inherit' })
}
