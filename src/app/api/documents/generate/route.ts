import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { renderPDF } from '@/lib/pdf/templates'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const sessionUser = session.user as SessionUser

    const body = await request.json()
    const { type, studentId, tenantId, academicYearId, deliberationId, data } = body

    if (!type || !tenantId) {
      return NextResponse.json({ error: 'Type et tenant requis' }, { status: 400 })
    }

    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch real tenant data
    const tenantDb = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, shortName: true, address: true, city: true, phone: true, email: true, logo: true, rectorName: true, rectorTitle: true, motto: true },
    })

    const tenant = tenantDb ? {
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
    } : data?.tenant || { name: 'Université', shortName: '', address: '', city: '', phone: '', email: '', rectorName: '', rectorTitle: 'Recteur' }

    // Fetch real student data
    let student = data?.student || null
    if (studentId && !student) {
      const studentDb = await db.student.findFirst({
        where: { id: studentId, tenantId },
        include: { currentLevel: { select: { name: true } }, currentProgram: { select: { name: true } } },
      })
      if (studentDb) {
        student = {
          id: studentDb.id,
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
    }

    const docNumber = data?.docNumber || `${type}-${Date.now()}`
    const verificationCode = data?.verificationCode || generateCode()
    const acYearId = academicYearId || data?.academicYearId || null

    const { default: React } = await import('react')

    let DocumentComponent: React.ReactElement | null = null

    switch (type) {
      case 'RELEVE_NOTES': {
        const { ReleveNotesPDF } = await import('@/lib/pdf/templates')

        let academicYear = data?.academicYear || ''
        let semester = data?.semester || ''
        let ueGrades = data?.ueGrades || []

        // Fetch grades from DB if studentId available
        if (studentId) {
          const grades = await db.grade.findMany({
            where: { studentId },
            include: {
              teachingUnit: { include: { semester: true } },
              courseElement: true,
            },
          })

          if (grades.length > 0) {
            const semesterIds = [...new Set(grades.map(g => g.teachingUnit?.semester?.id).filter(Boolean))] as string[]
            if (semesterIds.length > 0) {
              const semesters = await db.semester.findMany({
                where: { id: { in: semesterIds } },
                include: { level: { include: { program: true } } },
              })
              if (semesters[0]) {
                semester = semesters[0].name
                const level = semesters[0].level
                if (level?.program) academicYear = level.program.name
              }
            }

            const ueMap = new Map<string, { ue: string; code: string; credits: number; notes: Array<Record<string, unknown>>; moyenne?: number }>()
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
                cc: g.ccGrade,
                exam: g.examGrade,
                final: g.finalGrade,
              })
            }
            ueGrades = Array.from(ueMap.values())
          }
        }

        DocumentComponent = React.createElement(ReleveNotesPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '', program: '', level: '' },
          semester, ueGrades, academicYear, docNumber, verificationCode,
        })
        break
      }

      case 'ATTESTATION_INSCRIPTION': {
        const { AttestationInscriptionPDF } = await import('@/lib/pdf/templates')

        let academicYear = data?.academicYear || ''
        if (studentId) {
          const reg = await db.administrativeRegistration.findFirst({
            where: { studentId, tenantId },
            orderBy: { createdAt: 'desc' },
            include: { academicYear: { select: { name: true } } },
          })
          if (reg?.academicYear) academicYear = reg.academicYear.name
        }

        DocumentComponent = React.createElement(AttestationInscriptionPDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, docNumber, verificationCode,
        })
        break
      }

      case 'DIPLOME': {
        const { DiplomePDF } = await import('@/lib/pdf/templates')
        let diploma = data?.diploma || { title: '', mention: '', date: '' }
        DocumentComponent = React.createElement(DiplomePDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          diploma, docNumber, verificationCode,
        })
        break
      }

      case 'PV_DELIBERATION': {
        const { PVDeliberationPDF } = await import('@/lib/pdf/templates')
        let session = data?.session || { name: '', date: '', type: '' }
        let members = data?.members || []
        let students = data?.students || []
        let academicYear = data?.academicYear || ''

        // Fetch deliberation data from DB if deliberationId provided
        if (deliberationId) {
          const delib = await db.deliberation.findFirst({
            where: { id: deliberationId, tenantId },
            include: { decisions: true },
          })

          if (delib) {
            session = { name: delib.name, date: delib.date.toISOString().split('T')[0], type: delib.type }
            academicYear = (await db.academicYear.findUnique({ where: { id: delib.academicYearId } }))?.name || academicYear

            const decisionStudents = await db.student.findMany({
              where: { id: { in: delib.decisions.map(d => d.studentId) } },
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

            students = delib.decisions.map(d => {
              const s = studentMap.get(d.studentId)
              return {
                name: s ? `${s.firstName} ${s.lastName}` : '',
                matricule: s?.matricule || '',
                moy: d.average || 0,
                decision: mapDecision(d.decision),
                mention: d.average && d.average >= 16 ? 'Très Bien' : d.average && d.average >= 14 ? 'Bien' : d.average && d.average >= 12 ? 'Assez Bien' : d.average && d.average >= 10 ? 'Passable' : undefined,
              }
            })
          }
        }

        DocumentComponent = React.createElement(PVDeliberationPDF, {
          tenant, session, members, students, academicYear, docNumber, verificationCode,
        })
        break
      }

      case 'CERTIFICAT_SCOLARITE': {
        const { CertificatScolaritePDF } = await import('@/lib/pdf/templates')
        let academicYear = data?.academicYear || ''
        if (studentId) {
          const reg = await db.administrativeRegistration.findFirst({
            where: { studentId, tenantId },
            orderBy: { createdAt: 'desc' },
            include: { academicYear: { select: { name: true } } },
          })
          if (reg?.academicYear) academicYear = reg.academicYear.name
        }

        DocumentComponent = React.createElement(CertificatScolaritePDF, {
          tenant, student: student || { firstName: '', lastName: '', matricule: '' },
          academicYear, docNumber, verificationCode,
        })
        break
      }

      case 'LISTE_ETUDIANTS': {
        const { ListeEtudiantsPDF } = await import('@/lib/pdf/templates')
        let studentsList = data?.students || []
        let program = data?.program || ''
        let level = data?.level || ''
        let acYear = data?.academicYear || ''

        // Fetch students by program/level from DB
        if (!studentsList.length && (data?.programId || data?.levelId)) {
          const filters: Record<string, string> = { tenantId }
          if (data?.programId) filters.currentProgramId = data.programId
          if (data?.levelId) filters.currentLevelId = data.levelId
          const dbStudents = await db.student.findMany({
            where: filters,
            select: { firstName: true, lastName: true, matricule: true, currentLevel: { select: { name: true } }, currentProgram: { select: { name: true } } },
          })
          studentsList = dbStudents.map(s => ({
            name: `${s.firstName} ${s.lastName}`,
            matricule: s.matricule || '',
            level: s.currentLevel?.name || '',
            program: s.currentProgram?.name || '',
          }))
          if (dbStudents[0]?.currentProgram?.name) program = dbStudents[0].currentProgram.name
          if (dbStudents[0]?.currentLevel?.name) level = dbStudents[0].currentLevel.name
        }

        DocumentComponent = React.createElement(ListeEtudiantsPDF, {
          tenant, students: studentsList, program, level, academicYear: acYear,
        })
        break
      }

      default:
        return NextResponse.json({ error: `Type de document inconnu: ${type}` }, { status: 400 })
    }

    if (!DocumentComponent) {
      return NextResponse.json({ error: 'Erreur de génération du document' }, { status: 500 })
    }

    const pdfBuffer = await renderPDF(DocumentComponent)

    // Save to database for verification
    await db.officialDocument.create({
      data: {
        tenantId,
        studentId: student?.id || null,
        type,
        number: docNumber,
        academicYearId: acYearId,
        content: JSON.stringify({ type, tenant, student, data }),
        verificationCode,
        status: 'GENERATED',
        generatedBy: tenantId,
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
