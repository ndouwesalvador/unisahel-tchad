import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth/config'
import { renderPDF } from '@/lib/pdf/templates'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole, resolveOwnStudentId } from '@/lib/auth/student-scope'
import { AwardEligibilityError, getValidatedDiplomaAward, getValidatedLevelAward } from '@/lib/documents/eligibility'
import { computeGradeReadiness } from '@/lib/deliberations/readiness'
import { getOrganizationScope, isOrganizationManager } from '@/lib/auth/organization-scope'
import { parseJuryMembers } from '@/lib/deliberations/jury'
import { buildPvMatrix, expectedPvSheetCount, PvMatrixError, type PvSection } from '@/lib/pdf/pv-matrix'
import { countPdfPages } from '@/lib/pdf/utils'
import { renderArabicHeader } from '@/lib/pdf/arabic-header'

const SIGNING_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE', 'JURY', 'FACULTE', 'DEPARTEMENT'])
const GENERATING_ROLES = new Set([...SIGNING_ROLES, 'ETUDIANT', 'ETUDIANT_SANTE'])

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const sessionUser = session.user as SessionUser

    const body = await request.json()
    const { type, studentId, tenantId, academicYearId, deliberationId, data, sign, pageFormat } = body
    if (pageFormat !== undefined && !['A3', 'A4'].includes(pageFormat)) {
      return NextResponse.json({ error: 'Format de PV invalide' }, { status: 400 })
    }
    const pvPageFormat: 'A3' | 'A4' = pageFormat === 'A4' ? 'A4' : 'A3'

    if (!type || !tenantId) {
      return NextResponse.json({ error: 'Type et tenant requis' }, { status: 400 })
    }
    if (sign !== undefined && typeof sign !== 'boolean') {
      return NextResponse.json({ error: 'Option de validation invalide' }, { status: 400 })
    }

    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (!GENERATING_ROLES.has(sessionUser.role) ||
        (['JURY', 'FACULTE', 'DEPARTEMENT'].includes(sessionUser.role) && type !== 'PV_DELIBERATION')) {
      return NextResponse.json({ error: 'Génération non autorisée pour ce rôle' }, { status: 403 })
    }

    // A student account may only ever generate a document about themselves --
    // without this, any studentId in the body would let them pull anyone's transcript.
    const ownStudentId = await resolveOwnStudentId(sessionUser)
    if (isStudentSelfRole(sessionUser.role) && (!ownStudentId || studentId !== ownStudentId || sign)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (isStudentSelfRole(sessionUser.role) && !['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE'].includes(type)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (sign && !SIGNING_ROLES.has(sessionUser.role)) {
      return NextResponse.json({ error: 'Signature non autorisée pour ce rôle' }, { status: 403 })
    }
    if (['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE', 'ATTESTATION_NIVEAU', 'DIPLOME'].includes(type) && !studentId) {
      return NextResponse.json({ error: 'Étudiant requis' }, { status: 400 })
    }
    if (['ATTESTATION_NIVEAU', 'DIPLOME'].includes(type) && !sign) {
      return NextResponse.json({ error: 'Ce document exige une validation par un responsable habilité' }, { status: 409 })
    }

    // Fetch real tenant data
    const tenantDb = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, shortName: true, address: true, city: true, country: true, ministry: true, phone: true, email: true, logo: true, stamp: true, signature: true, headerLanguageMode: true, arabicCountry: true, arabicName: true, arabicMinistry: true, rectorName: true, rectorTitle: true, motto: true },
    })

    if (!tenantDb) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 })
    }
    const tenant = {
      id: tenantDb.id,
      name: tenantDb.name,
      shortName: tenantDb.shortName || '',
      address: tenantDb.address || '',
      city: tenantDb.city || '',
      country: tenantDb.country || '',
      ministry: tenantDb.ministry || '',
      phone: tenantDb.phone || '',
      email: tenantDb.email || '',
      logo: tenantDb.logo || '',
      stamp: tenantDb.stamp || '',
      signature: tenantDb.signature || '',
      arabicName: tenantDb.arabicName || '',
      arabicMinistry: tenantDb.arabicMinistry || '',
      arabicCountry: tenantDb.arabicCountry || '',
      headerLanguageMode: tenantDb.headerLanguageMode,
      arabicHeaderImage: renderArabicHeader({ headerLanguageMode: tenantDb.headerLanguageMode, arabicCountry: tenantDb.arabicCountry || '', arabicMinistry: tenantDb.arabicMinistry || '', arabicName: tenantDb.arabicName || '' }),
      rectorName: tenantDb.rectorName || '',
      rectorTitle: tenantDb.rectorTitle || 'Recteur',
      motto: tenantDb.motto || '',
    }

    // Fetch real student data
    let student: {
      firstName: string; lastName: string; matricule: string; dateOfBirth: string;
      placeOfBirth: string; gender: string; nationality: string; phone: string;
      email: string; program: string; level: string;
    } | null = null
    if (studentId) {
      const studentDb = await db.student.findFirst({
        where: { id: studentId, tenantId },
        include: { currentLevel: { select: { name: true } }, currentProgram: { select: { name: true } } },
      })
      if (!studentDb) {
        return NextResponse.json({ error: 'Étudiant introuvable dans cet établissement' }, { status: 404 })
      }
      student = {
        firstName: studentDb.firstName,
        lastName: studentDb.lastName,
        matricule: studentDb.matricule || '',
        dateOfBirth: studentDb.dateOfBirth?.toISOString() || '',
        placeOfBirth: studentDb.placeOfBirth || '',
        gender: studentDb.gender || '',
        nationality: studentDb.nationality || '',
        phone: studentDb.phone || '',
        email: studentDb.email || '',
        program: studentDb.currentProgram?.name || '',
        level: studentDb.currentLevel?.name || '',
      }
    }

    const registeredContext = async (registration: { programId: string; levelId: string }) => {
      const [program, level] = await Promise.all([
        db.program.findFirst({ where: { id: registration.programId, tenantId }, select: { name: true, departmentId: true } }),
        db.level.findFirst({ where: { id: registration.levelId, programId: registration.programId, program: { tenantId } }, select: { name: true } }),
      ])
      return student && program && level
        ? { student: { ...student, program: program.name, level: level.name }, departmentId: program.departmentId }
        : null
    }

    const docNumber = `${type}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
    const issuedAt = new Date().toISOString()
    const verificationCode = generateCode()
    const requestedYear = academicYearId
      ? await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true, name: true } })
      : await db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true, name: true } })
    if (academicYearId && !requestedYear) {
      return NextResponse.json({ error: 'Année académique introuvable dans cet établissement' }, { status: 404 })
    }
    let acYearId = requestedYear?.id ?? null

    const { getVerificationUrl } = await import('@/lib/pdf/utils')
    const QRCode = await import('qrcode')
    const qrCodeDataUrl = await QRCode.toDataURL(getVerificationUrl(verificationCode), {
      width: 200,
      margin: 1,
      color: { dark: '#1a2744', light: '#ffffff' },
    })

    const { default: React } = await import('react')

    let DocumentComponent: React.ReactElement | null = null
    let documentData: Record<string, unknown> = {}
    let pvSections: PvSection[] | null = null

    switch (type) {
      case 'RELEVE_NOTES': {
        const { ReleveNotesPDF } = await import('@/lib/pdf/templates')
        if (!acYearId) {
          return NextResponse.json({ error: 'Année académique requise pour le relevé' }, { status: 409 })
        }
        const registration = await db.administrativeRegistration.findFirst({
          where: { tenantId, studentId, academicYearId: acYearId, status: 'INSCRIT' },
          select: { id: true, programId: true, levelId: true },
        })
        if (!registration) {
          return NextResponse.json({ error: 'Inscription administrative annuelle non validée : relevé indisponible' }, { status: 409 })
        }
        const annualContext = await registeredContext(registration)
        if (!annualContext) {
          return NextResponse.json({ error: 'Programme ou niveau de cette inscription introuvable' }, { status: 409 })
        }
        student = annualContext.student
        const academicYear = requestedYear?.name || ''
        let semester = ''
        let ueGrades: Array<{ ue: string; code: string; credits: number; notes: Array<{ ec: string; code?: string; coef: number; cc?: number; tp?: number; exam?: number; final?: number }>; moyenne?: number }> = []
        let jury: { average: number; creditsAcquired: number; decision: string; date: string } | undefined

        if (studentId) {
          const grades = await db.grade.findMany({
            where: {
              studentId,
              academicYearId: acYearId,
              session: 'NORMALE',
              student: { tenantId },
              teachingUnit: {
                semester: { level: { program: { tenantId } } },
                pedagogicalRegistrations: { some: { studentId, academicYearId: acYearId, status: 'ACTIVE' } },
              },
              OR: [
                { courseElementId: null },
                { courseElement: { teachingUnit: { semester: { level: { program: { tenantId } } } } } },
              ],
            },
            include: {
              teachingUnit: { include: { semester: true } },
              courseElement: true,
            },
          })
          if (grades.length === 0) {
            return NextResponse.json({ error: 'Aucune note disponible pour cette année académique' }, { status: 409 })
          }
          const gradeKeys = grades.map((grade) => `${grade.teachingUnitId}:${grade.courseElementId}`)
          if (grades.some((grade) => !grade.courseElementId || grade.courseElement?.teachingUnitId !== grade.teachingUnitId) ||
              new Set(gradeKeys).size !== gradeKeys.length) {
            return NextResponse.json({ error: 'Notes incohérentes ou en double : corrigez le dossier avant de générer un relevé' }, { status: 409 })
          }
          if ((sign || isStudentSelfRole(sessionUser.role)) && grades.some((grade) => !grade.isLocked)) {
            return NextResponse.json({ error: 'Toutes les notes du relevé doivent être verrouillées avant publication' }, { status: 409 })
          }
          if (sign) {
            const registrations = await db.pedagogicalRegistration.findMany({
              where: { studentId, academicYearId: acYearId, status: 'ACTIVE', teachingUnit: { semester: { level: { program: { tenantId } } } } },
              include: { teachingUnit: { include: { courseElements: { select: { id: true } } } } },
            })
            const completeGrades = new Set(grades.filter((grade) => grade.isLocked && grade.finalGrade !== null).map((grade) => grade.courseElementId))
            if (registrations.length === 0 || registrations.some((registration) =>
              registration.teachingUnit.courseElements.length === 0 ||
              registration.teachingUnit.courseElements.some((element) => !completeGrades.has(element.id)))) {
              return NextResponse.json({ error: 'Relevé incomplet : toutes les matières inscrites doivent avoir une note définitive verrouillée' }, { status: 409 })
            }
          }
          const semesterIds = [...new Set(grades.map(g => g.teachingUnit?.semester?.id).filter(Boolean))] as string[]
          if (semesterIds.length > 0) {
            const semesters = await db.semester.findMany({
              where: { id: { in: semesterIds }, level: { program: { tenantId } } },
              include: { level: { include: { program: true } } },
            })
            semester = semesters.length === 1 ? semesters[0].name : 'Plusieurs semestres'
          }

          const ueMap = new Map<string, { ue: string; code: string; credits: number; notes: Array<{ ec: string; code?: string; coef: number; cc?: number; tp?: number; exam?: number; final?: number }>; moyenne?: number }>()
          // Keep the transcript in curriculum order, not database insertion order.
          const orderedGrades = [...grades].sort((a, b) =>
            (a.teachingUnit?.semester?.orderIndex ?? 0) - (b.teachingUnit?.semester?.orderIndex ?? 0) ||
            (a.teachingUnit?.orderIndex ?? 0) - (b.teachingUnit?.orderIndex ?? 0) ||
            (a.courseElement?.orderIndex ?? 0) - (b.courseElement?.orderIndex ?? 0) ||
            (a.teachingUnit?.code ?? '').localeCompare(b.teachingUnit?.code ?? '')
          )
          for (const g of orderedGrades) {
            if (!g.teachingUnit) continue
            const key = g.teachingUnit.id
            if (!ueMap.has(key)) {
              ueMap.set(key, { ue: g.teachingUnit.name, code: g.teachingUnit.code || '', credits: g.teachingUnit.credits, notes: [] })
            }
            const entry = ueMap.get(key)!
            entry.notes.push({
              ec: g.courseElement?.name || 'EC',
              code: g.courseElement?.code || undefined,
              coef: g.courseElement?.coefficient || 1,
              cc: g.ccGrade ?? undefined,
              tp: g.tpGrade ?? undefined,
              exam: g.examGrade ?? undefined,
              final: g.finalGrade ?? undefined,
            })
          }
          ueGrades = Array.from(ueMap.values()).map((unit) => {
            const graded = unit.notes.filter((note) => note.final !== undefined && note.coef > 0)
            const weight = graded.reduce((sum, note) => sum + note.coef, 0)
            return { ...unit, moyenne: weight > 0 && graded.length === unit.notes.length
              ? Math.round((graded.reduce((sum, note) => sum + note.final! * note.coef, 0) / weight + Number.EPSILON) * 100) / 100
              : undefined }
          })
        }

        if (annualContext.departmentId) {
          const juryRows = await db.deliberationDecision.findMany({
            where: { studentId: studentId!, deliberation: {
              tenantId, academicYearId: acYearId, departmentId: annualContext.departmentId,
              status: 'TERMINEE', isLocked: true,
            } },
            select: { average: true, creditsAcquired: true, decision: true,
              deliberation: { select: { date: true } } },
          })
          const latest = juryRows.sort((a, b) => b.deliberation.date.getTime() - a.deliberation.date.getTime())[0]
          if (latest && latest.average !== null) jury = {
            average: latest.average, creditsAcquired: latest.creditsAcquired,
            decision: latest.decision, date: latest.deliberation.date.toISOString(),
          }
        }

        DocumentComponent = React.createElement(ReleveNotesPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '', program: '', level: '' },
          semester, ueGrades, academicYear, jury, docNumber, verificationCode, qrCodeDataUrl, isSigned: Boolean(sign),
        })
        documentData = { semester, ueGrades, academicYear, jury }
        break
      }

      case 'ATTESTATION_INSCRIPTION': {
        const { AttestationInscriptionPDF } = await import('@/lib/pdf/templates')
        if (!acYearId) {
          return NextResponse.json({ error: 'Année académique requise pour l’attestation' }, { status: 409 })
        }
        const reg = await db.administrativeRegistration.findFirst({
          where: { studentId, tenantId, academicYearId: acYearId, status: 'INSCRIT' },
          include: { academicYear: { select: { name: true } } },
        })
        if (!reg) {
          return NextResponse.json({ error: 'Aucune inscription administrative validée pour cette année' }, { status: 409 })
        }
        const annualContext = await registeredContext(reg)
        if (!annualContext) {
          return NextResponse.json({ error: 'Programme ou niveau de cette inscription introuvable' }, { status: 409 })
        }
        student = annualContext.student
        const academicYear = reg.academicYear.name

        DocumentComponent = React.createElement(AttestationInscriptionPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, issuedAt, docNumber, verificationCode, qrCodeDataUrl, isSigned: Boolean(sign),
        })
        documentData = { registrationId: reg.id, academicYear }
        break
      }

      case 'ATTESTATION_NIVEAU': {
        const { AttestationNiveauPDF } = await import('@/lib/pdf/templates')
        if (!acYearId || !studentId || !student) {
          return NextResponse.json({ error: 'Étudiant et année académique requis' }, { status: 409 })
        }
        const registrations = await db.administrativeRegistration.findMany({
          where: { tenantId, studentId, academicYearId: acYearId, status: 'INSCRIT' },
          select: { programId: true, levelId: true }, take: 2,
        })
        if (registrations.length !== 1) {
          return NextResponse.json({ error: 'Inscription au niveau introuvable ou ambiguë pour cette année' }, { status: 409 })
        }
        const registration = registrations[0]
        const [program, level] = await Promise.all([
          db.program.findFirst({ where: { id: registration.programId, tenantId }, select: { id: true, name: true } }),
          db.level.findFirst({ where: { id: registration.levelId, programId: registration.programId, program: { tenantId } }, select: { id: true, name: true } }),
        ])
        if (!program || !level) {
          return NextResponse.json({ error: 'Programme ou niveau de cette inscription introuvable' }, { status: 409 })
        }
        const validatedAward = await getValidatedLevelAward({
          tenantId, studentId, academicYearId: acYearId, programId: program.id, levelId: level.id,
        })
        const award = {
          credits: validatedAward.creditsAcquired, level: level.name, program: program.name,
          juryDate: validatedAward.juryDate.toISOString(),
        }
        DocumentComponent = React.createElement(AttestationNiveauPDF, {
          tenant, student: { ...student, program: program.name, level: level.name },
          academicYear: requestedYear?.name || '', award, docNumber, verificationCode, qrCodeDataUrl,
        })
        documentData = {
          award, academicYear: requestedYear?.name || '', programId: program.id, levelId: level.id,
          deliberationId: validatedAward.deliberationId, decisionId: validatedAward.decisionId,
        }
        break
      }

      case 'DIPLOME': {
        const { DiplomePDF } = await import('@/lib/pdf/templates')
        if (!acYearId || !studentId || !student) {
          return NextResponse.json({ error: 'Étudiant et année de diplomation requis' }, { status: 409 })
        }
        const diplomaAward = await getValidatedDiplomaAward({ tenantId, studentId, academicYearId: acYearId })
        const diploma = {
          title: diplomaAward.program.diplomaType,
          program: diplomaAward.program.name,
          date: diplomaAward.finalDecision.juryDate.toISOString(),
          credits: diplomaAward.creditsRequired,
          mention: diplomaAward.finalDecision.average >= 16 ? 'Très bien' :
            diplomaAward.finalDecision.average >= 14 ? 'Bien' :
            diplomaAward.finalDecision.average >= 12 ? 'Assez bien' : 'Passable',
        }
        DocumentComponent = React.createElement(DiplomePDF, {
          tenant, student: { ...student, program: diplomaAward.program.name, level: diplomaAward.finalLevel.name },
          diploma, docNumber, verificationCode, qrCodeDataUrl, isSigned: true,
        })
        documentData = {
          diploma, programId: diplomaAward.program.id, levelId: diplomaAward.finalLevel.id,
          awards: diplomaAward.awards.map((award) => ({
            academicYearId: award.academicYearId, levelId: award.levelId, deliberationId: award.deliberationId,
            decisionId: award.decisionId, creditsAcquired: award.creditsAcquired,
          })),
        }
        break
      }

      case 'PV_DELIBERATION': {
        const { PVDeliberationPDF } = await import('@/lib/pdf/templates')
        if (!sign) {
          return NextResponse.json({ error: 'Un PV officiel doit être validé par un membre habilité' }, { status: 409 })
        }
        if (!deliberationId) {
          return NextResponse.json({ error: 'Délibération requise pour le PV' }, { status: 400 })
        }
        const delib = await db.deliberation.findFirst({
          where: { id: deliberationId, tenantId },
          include: { decisions: true },
        })
        if (!delib) {
          return NextResponse.json({ error: 'Délibération introuvable dans cet établissement' }, { status: 404 })
        }
        const validatedMembers = parseJuryMembers(delib.juryMembers)
        if (!validatedMembers) {
          return NextResponse.json({ error: 'Composition du jury non enregistrée lors de la validation' }, { status: 409 })
        }
        if (validatedMembers.some((member) => !member.signature)) {
          return NextResponse.json({ error: 'Chaque membre du jury doit avoir une signature scannée avant l’émission du PV officiel.' }, { status: 409 })
        }
        if (!delib.departmentId) {
          return NextResponse.json({ error: 'Ce PV historique n’est pas rattaché à un département' }, { status: 409 })
        }
        const department = await db.department.findFirst({
          where: { id: delib.departmentId, tenantId }, select: { id: true, name: true, headName: true },
        })
        if (!department) return NextResponse.json({ error: 'Département introuvable' }, { status: 409 })
        if (isOrganizationManager(sessionUser.role)) {
          const scope = await getOrganizationScope(sessionUser, tenantId)
          if (!scope?.departmentIds.includes(department.id)) {
            return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
          }
        }
        if (!delib.isLocked || delib.status !== 'TERMINEE') {
          return NextResponse.json({ error: 'Le PV exige une délibération finale verrouillée' }, { status: 409 })
        }
        if (delib.decisions.length === 0) {
          return NextResponse.json({ error: 'Aucune décision de jury à publier' }, { status: 409 })
        }
        const readiness = await computeGradeReadiness(
          tenantId, delib.academicYearId, delib.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE', department.id
        )
        if (!readiness.ready) {
          return NextResponse.json({ error: 'Le PV officiel exige toutes les notes définitives verrouillées', readiness }, { status: 409 })
        }
        const decisionIds = delib.decisions.map((decision) => decision.studentId)
        const registeredStudentIds = new Set(readiness.studentIds)
        if (new Set(decisionIds).size !== decisionIds.length ||
            decisionIds.length !== registeredStudentIds.size ||
            decisionIds.some((id) => !registeredStudentIds.has(id))) {
          return NextResponse.json({ error: 'Les décisions du jury ne couvrent pas exactement les étudiants inscrits' }, { status: 409 })
        }
        const delibYear = await db.academicYear.findFirst({ where: { id: delib.academicYearId, tenantId }, select: { id: true, name: true } })
        if (!delibYear) {
          return NextResponse.json({ error: 'Année académique de la délibération introuvable' }, { status: 409 })
        }
        acYearId = delibYear.id
        const session = { name: delib.name, date: delib.date.toISOString().split('T')[0], type: delib.type }
        const academicYear = delibYear.name

        const decisionStudents = await db.student.findMany({
          where: { id: { in: delib.decisions.map(d => d.studentId) }, tenantId },
          select: { id: true, firstName: true, lastName: true, matricule: true },
        })
        const studentMap = new Map(decisionStudents.map(s => [s.id, s]))

        const [annualRegistrations, pedagogicalRegistrations, gradeRows] = await Promise.all([
          db.administrativeRegistration.findMany({
            where: { tenantId, academicYearId: acYearId, status: 'INSCRIT', studentId: { in: decisionIds } },
            select: { studentId: true, programId: true, levelId: true },
          }),
          db.pedagogicalRegistration.findMany({
            where: { academicYearId: acYearId, status: 'ACTIVE', studentId: { in: decisionIds }, student: { tenantId } },
            select: { studentId: true, teachingUnitId: true, teachingUnit: { select: {
              id: true, code: true, name: true, orderIndex: true,
              semester: { select: { levelId: true, orderIndex: true } },
              courseElements: { select: { id: true, code: true, name: true, coefficient: true, orderIndex: true } },
            } } },
          }),
          db.grade.findMany({
            where: { studentId: { in: decisionIds }, academicYearId: acYearId,
              session: delib.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE', student: { tenantId } },
            select: { studentId: true, teachingUnitId: true, courseElementId: true, finalGrade: true, isLocked: true },
          }),
        ])
        const [programs, levels] = await Promise.all([
          db.program.findMany({ where: { id: { in: annualRegistrations.map(r => r.programId) }, tenantId, departmentId: department.id },
            select: { id: true, name: true } }),
          db.level.findMany({ where: { id: { in: annualRegistrations.map(r => r.levelId) }, program: { tenantId, departmentId: department.id } },
            select: { id: true, programId: true, name: true, orderIndex: true } }),
        ])
        const programById = new Map(programs.map(p => [p.id, p]))
        const levelById = new Map(levels.map(l => [l.id, l]))
        if (annualRegistrations.length !== decisionIds.length || annualRegistrations.some(r =>
          !programById.has(r.programId) || levelById.get(r.levelId)?.programId !== r.programId)) {
          return NextResponse.json({ error: 'Inscriptions annuelles incohérentes avec les filières du département' }, { status: 409 })
        }
        let sections
        try {
          sections = buildPvMatrix({
            registrations: annualRegistrations.map(r => ({ ...r, program: programById.get(r.programId)!, level: levelById.get(r.levelId)! })),
            pedagogicalRegistrations, grades: gradeRows, students: decisionStudents, decisions: delib.decisions,
          })
        } catch (error) {
          if (error instanceof PvMatrixError) return NextResponse.json({ error: error.message }, { status: 409 })
          throw error
        }
        pvSections = sections

        function mapDecision(d: string): string {
          switch (d) {
            case 'ADMI': return 'ADMIS'
            case 'ADMI_DETTE': return 'ADMIS AVEC DETTE'
            case 'COMPENSE': return 'ADMIS PAR COMPENSATION'
            default: return d
          }
        }

        const students = delib.decisions.map(d => {
          const s = studentMap.get(d.studentId)
          return {
            name: s ? `${s.firstName} ${s.lastName}` : '',
            matricule: s?.matricule || '',
            moy: d.average || 0,
            decision: mapDecision(d.decision),
            mention: d.average && d.average >= 16 ? 'Très Bien' : d.average && d.average >= 14 ? 'Bien' : d.average && d.average >= 12 ? 'Assez Bien' : d.average && d.average >= 10 ? 'Passable' : undefined,
          }
        })
        if (decisionStudents.length !== delib.decisions.length) {
          return NextResponse.json({ error: 'Décisions de jury incohérentes avec les étudiants de cet établissement' }, { status: 409 })
        }

        DocumentComponent = React.createElement(PVDeliberationPDF, {
          tenant, departmentName: department.name, departmentHeadName: department.headName || undefined,
          session, members: validatedMembers, students, sections, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned: true, pageFormat: pvPageFormat,
        })
        documentData = { deliberationId, departmentId: department.id, departmentName: department.name,
          departmentHeadName: department.headName, session, members: validatedMembers, students, sections, academicYear, pageFormat: pvPageFormat }
        break
      }

      case 'CERTIFICAT_SCOLARITE': {
        const { CertificatScolaritePDF } = await import('@/lib/pdf/templates')
        if (!acYearId) {
          return NextResponse.json({ error: 'Année académique requise pour le certificat' }, { status: 409 })
        }
        const reg = await db.administrativeRegistration.findFirst({
          where: { studentId, tenantId, academicYearId: acYearId, status: 'INSCRIT' },
          include: { academicYear: { select: { name: true } } },
        })
        if (!reg) {
          return NextResponse.json({ error: 'Aucune inscription administrative validée pour cette année' }, { status: 409 })
        }
        const annualContext = await registeredContext(reg)
        if (!annualContext) {
          return NextResponse.json({ error: 'Programme ou niveau de cette inscription introuvable' }, { status: 409 })
        }
        student = annualContext.student
        const academicYear = reg.academicYear.name

        DocumentComponent = React.createElement(CertificatScolaritePDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, issuedAt, docNumber, verificationCode, qrCodeDataUrl, isSigned: Boolean(sign),
        })
        documentData = { registrationId: reg.id, academicYear }
        break
      }

      case 'LISTE_ETUDIANTS': {
        const { ListeEtudiantsPDF } = await import('@/lib/pdf/templates')
        const filters: Record<string, string> = { tenantId }
        if (data?.programId) filters.currentProgramId = data.programId
        if (data?.levelId) filters.currentLevelId = data.levelId
        const dbStudents = await db.student.findMany({
          where: filters,
          select: { firstName: true, lastName: true, matricule: true, gender: true, currentLevel: { select: { name: true } }, currentProgram: { select: { name: true } } },
        })
        const studentsList = dbStudents.map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          matricule: s.matricule || '',
          gender: s.gender || '',
          level: s.currentLevel?.name || '',
          program: s.currentProgram?.name || '',
        }))
        const program = dbStudents[0]?.currentProgram?.name || ''
        const level = dbStudents[0]?.currentLevel?.name || ''
        const acYear = requestedYear?.name || ''

        DocumentComponent = React.createElement(ListeEtudiantsPDF, {
          tenant, students: studentsList, program, level, academicYear: acYear,
        })
        documentData = { students: studentsList, program, level, academicYear: acYear }
        break
      }

      default:
        return NextResponse.json({ error: `Type de document inconnu: ${type}` }, { status: 400 })
    }

    if (!DocumentComponent) {
      return NextResponse.json({ error: 'Erreur de génération du document' }, { status: 500 })
    }

    const pdfBuffer = await renderPDF(DocumentComponent)
    if (type === 'RELEVE_NOTES' && countPdfPages(pdfBuffer) !== 1) {
      return NextResponse.json({ error: 'Le relevé dépasse une page : vérifiez les libellés et la maquette avant émission.' }, { status: 409 })
    }
    if (pvSections && countPdfPages(pdfBuffer) !== expectedPvSheetCount(pvSections, pvPageFormat)) {
      return NextResponse.json({ error: `Le PV déborde du format ${pvPageFormat} prévu : corrigez les libellés avant émission.` }, { status: 409 })
    }

    // "Signing" certifies the document as officially validated -- a student
    // generating their own document can never self-certify it, only staff can.
    const isSigned = Boolean(sign)

    // Save to database for verification
    await db.officialDocument.create({
      data: {
        tenantId,
        studentId: studentId || null,
        type,
        number: docNumber,
        academicYearId: acYearId,
        content: JSON.stringify({ type, tenant, student, academicYearId: acYearId, issuedAt, ...documentData }),
        verificationCode,
        status: 'GENERATED',
        generatedBy: sessionUser.id,
        validatedBy: isSigned ? sessionUser.id : undefined,
        validatedAt: isSigned ? new Date() : undefined,
      },
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}_${docNumber}.pdf"`,
        'X-Doc-Number': docNumber,
        'X-Verification-Code': verificationCode,
      },
    })
  } catch (error) {
    if (error instanceof AwardEligibilityError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    // eslint-disable-next-line no-console
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du document', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

function generateCode(): string {
  return randomBytes(8).toString('hex').toUpperCase()
}
