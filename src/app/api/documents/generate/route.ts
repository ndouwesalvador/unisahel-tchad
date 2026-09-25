import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth/config'
import { renderPDF } from '@/lib/pdf/templates'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole, resolveOwnStudentId } from '@/lib/auth/student-scope'

const SIGNING_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE', 'JURY'])
const GENERATING_ROLES = new Set([...SIGNING_ROLES, 'ETUDIANT', 'ETUDIANT_SANTE'])

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const sessionUser = session.user as SessionUser

    const body = await request.json()
    const { type, studentId, tenantId, academicYearId, deliberationId, data, sign } = body

    if (!type || !tenantId) {
      return NextResponse.json({ error: 'Type et tenant requis' }, { status: 400 })
    }

    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (!GENERATING_ROLES.has(sessionUser.role) || (sessionUser.role === 'JURY' && type !== 'PV_DELIBERATION')) {
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
    if (['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE', 'DIPLOME'].includes(type) && !studentId) {
      return NextResponse.json({ error: 'Étudiant requis' }, { status: 400 })
    }

    // Fetch real tenant data
    const tenantDb = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, shortName: true, address: true, city: true, phone: true, email: true, logo: true, rectorName: true, rectorTitle: true, motto: true },
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
      phone: tenantDb.phone || '',
      email: tenantDb.email || '',
      logo: tenantDb.logo || '',
      rectorName: tenantDb.rectorName || '',
      rectorTitle: tenantDb.rectorTitle || 'Recteur',
      motto: tenantDb.motto || '',
    }

    // Fetch real student data
    let student = null
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

    const docNumber = `${type}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
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

    switch (type) {
      case 'RELEVE_NOTES': {
        const { ReleveNotesPDF } = await import('@/lib/pdf/templates')
        if (!acYearId) {
          return NextResponse.json({ error: 'Année académique requise pour le relevé' }, { status: 409 })
        }
        const academicYear = requestedYear?.name || ''
        let semester = ''
        let ueGrades: Array<{ ue: string; code: string; credits: number; notes: Array<{ ec: string; coef: number; cc?: number; exam?: number; final?: number }>; moyenne?: number }> = []

        if (studentId) {
          const grades = await db.grade.findMany({
            where: {
              studentId,
              academicYearId: acYearId,
              student: { tenantId },
              teachingUnit: { semester: { level: { program: { tenantId } } } },
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
          if ((sign || isStudentSelfRole(sessionUser.role)) && grades.some((grade) => !grade.isLocked)) {
            return NextResponse.json({ error: 'Toutes les notes du relevé doivent être verrouillées avant publication' }, { status: 409 })
          }
          const semesterIds = [...new Set(grades.map(g => g.teachingUnit?.semester?.id).filter(Boolean))] as string[]
          if (semesterIds.length > 0) {
            const semesters = await db.semester.findMany({
              where: { id: { in: semesterIds }, level: { program: { tenantId } } },
              include: { level: { include: { program: true } } },
            })
            if (semesters[0]) {
              semester = semesters[0].name
            }
          }

          const ueMap = new Map<string, { ue: string; code: string; credits: number; notes: Array<{ ec: string; coef: number; cc?: number; exam?: number; final?: number }>; moyenne?: number }>()
          for (const g of grades) {
            if (!g.teachingUnit) continue
            const key = g.teachingUnit.id
            if (!ueMap.has(key)) {
              ueMap.set(key, { ue: g.teachingUnit.name, code: g.teachingUnit.code || '', credits: g.teachingUnit.credits, notes: [] })
            }
            const entry = ueMap.get(key)!
            entry.notes.push({
              ec: g.courseElement?.name || 'EC',
              coef: g.courseElement?.coefficient || 1,
              cc: g.ccGrade ?? undefined,
              exam: g.examGrade ?? undefined,
              final: g.finalGrade ?? undefined,
            })
          }
          ueGrades = Array.from(ueMap.values())
        }

        DocumentComponent = React.createElement(ReleveNotesPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '', program: '', level: '' },
          semester, ueGrades, academicYear, docNumber, verificationCode, qrCodeDataUrl,
        })
        documentData = { semester, ueGrades, academicYear }
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
        const academicYear = reg.academicYear.name

        DocumentComponent = React.createElement(AttestationInscriptionPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, docNumber, verificationCode, qrCodeDataUrl,
        })
        documentData = { registrationId: reg.id, academicYear }
        break
      }

      case 'DIPLOME': {
        return NextResponse.json({ error: 'La génération du diplôme exige une décision de diplomation vérifiée et n’est pas encore disponible' }, { status: 501 })
      }

      case 'PV_DELIBERATION': {
        const { PVDeliberationPDF } = await import('@/lib/pdf/templates')
        if (!deliberationId) {
          return NextResponse.json({ error: 'Délibération requise pour le PV' }, { status: 400 })
        }
        const members = data?.members || []

        const delib = await db.deliberation.findFirst({
          where: { id: deliberationId, tenantId },
          include: { decisions: true },
        })
        if (!delib) {
          return NextResponse.json({ error: 'Délibération introuvable dans cet établissement' }, { status: 404 })
        }
        if (!delib.isLocked) {
          return NextResponse.json({ error: 'Le PV exige une délibération verrouillée' }, { status: 409 })
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

        function mapDecision(d: string): string {
          switch (d) {
            case 'ADMI': return 'ADMIS'
            case 'ADMI_DETTE': return 'ADMIS_CHANCE'
            case 'COMPENSE': return 'ADMIS'
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

        DocumentComponent = React.createElement(PVDeliberationPDF, {
          tenant, session, members, students, academicYear, docNumber, verificationCode, qrCodeDataUrl,
        })
        documentData = { deliberationId, session, members, students, academicYear }
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
        const academicYear = reg.academicYear.name

        DocumentComponent = React.createElement(CertificatScolaritePDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, docNumber, verificationCode, qrCodeDataUrl,
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
        content: JSON.stringify({ type, tenant, student, academicYearId: acYearId, ...documentData }),
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
