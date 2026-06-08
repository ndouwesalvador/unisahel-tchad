import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const { auth } = await import('@/lib/auth/config')
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Check if data already exists
    const existingTenant = await db.tenant.findFirst({
      where: { slug: 'univ-ndjamena' },
    })

    if (existingTenant) {
      const counts = {
        tenants: await db.tenant.count({ where: { slug: 'univ-ndjamena' } }),
        faculties: await db.faculty.count({ where: { tenantId: existingTenant.id } }),
        departments: await db.department.count({ where: { tenantId: existingTenant.id } }),
        programs: await db.program.count({ where: { tenantId: existingTenant.id } }),
        levels: await db.level.count({ where: { program: { tenantId: existingTenant.id } } }),
        semesters: await db.semester.count(),
        teachingUnits: await db.teachingUnit.count(),
        courseElements: await db.courseElement.count(),
        academicYears: await db.academicYear.count({ where: { tenantId: existingTenant.id } }),
        examSessions: await db.examSession.count(),
        teachers: await db.teacher.count({ where: { tenantId: existingTenant.id } }),
        students: await db.student.count({ where: { tenantId: existingTenant.id } }),
        grades: await db.grade.count(),
        payments: await db.payment.count({ where: { tenantId: existingTenant.id } }),
        announcements: await db.announcement.count({ where: { tenantId: existingTenant.id } }),
        hospitals: await db.hospital.count({ where: { tenantId: existingTenant.id } }),
        clinicalDepartments: await db.clinicalDepartment.count(),
      }
      return NextResponse.json({
        message: 'Data already exists. Skipping seed.',
        tenantId: existingTenant.id,
        counts,
      })
    }

    // ========================================
    // a) Create Tenant
    // ========================================
    const tenant = await db.tenant.create({
      data: {
        name: "Université de N'Djaména",
        shortName: 'UND',
        slug: 'univ-ndjamena',
        country: 'Tchad',
        city: "N'Djaména",
        ministry: 'Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique',
        rectorName: 'Pr. Abakar Moussa Youssouf',
        rectorTitle: 'Recteur',
        academicSystem: 'LMD',
        matriculeFormat: 'UNSH-{YEAR}-{LEVEL}-{SEQ}',
        loginFormat: 'UNSH-{YEAR}-{LEVEL}-{SEQ}',
        isActive: true,
        subscriptionPlan: 'PRO',
        phone: '+235 22 52 17 17',
        email: 'contact@univ-ndjamena.td',
        website: 'https://www.univ-ndjamena.td',
        address: 'BP 1117, N\'Djaména, Tchad',
        motto: 'Savoir, Travail, Progrès',
      },
    })

    // ========================================
    // b) Create TenantSettings
    // ========================================
    await db.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        defaultLanguage: 'fr',
        supportedLanguages: 'fr,en,ar',
        gradingScale: 20.0,
        passingGrade: 10.0,
        eliminationGrade: 0.0,
        compensationEnabled: true,
        catchUpSessionEnabled: true,
        ccWeight: 0.4,
        examWeight: 0.6,
        tpWeight: 0.0,
        stageWeight: 0.0,
        creditsPerSemester: 30,
        creditsPerYear: 60,
        maxAbsencesAllowed: 3,
        pinLength: 4,
        studentAuthMode: 'LOGIN_PIN',
        emailVerification: true,
        twoFactorEnabled: false,
        documentAutoSign: false,
        receiptPrefix: 'REC',
        matriculePrefix: 'UNSH',
        allowMobileMoney: true,
        allowBankPayment: true,
        allowCashPayment: true,
        smsNotifications: false,
        emailNotifications: true,
        whatsappNotifications: false,
        pwaEnabled: false,
        offlineMode: false,
        primaryColor: '#1a2744',
        secondaryColor: '#2d7a4f',
        accentColor: '#c9a84c',
      },
    })

    // ========================================
    // c) Create Users (with password hashes)
    // ========================================
    const passwordHash = await bcrypt.hash('password123', 12)
    const pinHash = await bcrypt.hash('123456', 12)

    await db.user.createMany({
      data: [
        {
          tenantId: tenant.id,
          email: 'admin@unisahel.africa',
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          isActive: true,
          emailVerified: true,
        },
        {
          tenantId: tenant.id,
          email: 'admin@univ-ndjamena.td',
          passwordHash,
          firstName: 'Admin',
          lastName: 'Demo',
          role: 'ADMIN_INSTITUTION',
          isActive: true,
          emailVerified: true,
        },
        {
          tenantId: tenant.id,
          email: 'prof@univ-ndjamena.td',
          passwordHash,
          firstName: 'Moussa',
          lastName: 'Hissein',
          role: 'ENSEIGNANT',
          isActive: true,
          emailVerified: true,
        },
        {
          tenantId: tenant.id,
          email: 'scolarite@univ-ndjamena.td',
          passwordHash,
          firstName: 'Fatime',
          lastName: 'Abakar',
          role: 'SCOLARITE',
          isActive: true,
          emailVerified: true,
        },
        {
          tenantId: tenant.id,
          login: 'UNSH-2024-L1-000030',
          pinHash,
          firstName: 'Abakar',
          lastName: 'Moussa',
          role: 'ETUDIANT',
          isActive: true,
          emailVerified: true,
        },
      ],
    })

    // ========================================
    // d) Create Faculties
    // ========================================
    const facultyDroit = await db.faculty.create({
      data: {
        tenantId: tenant.id,
        name: 'Faculté de Droit et Sciences Politiques',
        shortName: 'FDSP',
        deanName: 'Pr. Mahamat Seid Ibrahim',
        deanTitle: 'Doyen',
        isActive: true,
      },
    })

    const facultySciences = await db.faculty.create({
      data: {
        tenantId: tenant.id,
        name: 'Faculté des Sciences Exactes et Appliquées',
        shortName: 'FSEA',
        deanName: 'Dr. Khadidja Aboubakar Hissein',
        deanTitle: 'Doyenne',
        isActive: true,
      },
    })

    const facultyLettres = await db.faculty.create({
      data: {
        tenantId: tenant.id,
        name: 'Faculté des Lettres, Langues et Sciences Humaines',
        shortName: 'FLLSH',
        deanName: 'Pr. Adoum Bichara Mallah',
        deanTitle: 'Doyen',
        isActive: true,
      },
    })

    // ========================================
    // d) Create Departments
    // ========================================
    const deptDroitPrive = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultyDroit.id,
        name: 'Droit Privé',
        shortName: 'DP',
        headName: 'Dr. Fatimé Hassan Abakar',
        isActive: true,
      },
    })

    const deptDroitPublic = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultyDroit.id,
        name: 'Droit Public',
        shortName: 'DPU',
        headName: 'Dr. Mahamat Adam Bachar',
        isActive: true,
      },
    })

    const deptMaths = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultySciences.id,
        name: 'Mathématiques',
        shortName: 'MATH',
        headName: 'Dr. Abdoulaye Adoum Moussa',
        isActive: true,
      },
    })

    const deptPhysique = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultySciences.id,
        name: 'Physique',
        shortName: 'PHY',
        headName: 'Dr. Youssouf Mahamat Nour',
        isActive: true,
      },
    })

    const deptInfo = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultySciences.id,
        name: 'Informatique',
        shortName: 'INFO',
        headName: 'Dr. Zakaria Doumngar Yaya',
        isActive: true,
      },
    })

    const deptLettresModernes = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultyLettres.id,
        name: 'Lettres Modernes',
        shortName: 'LM',
        headName: 'Dr. Amina Djibrine Hissein',
        isActive: true,
      },
    })

    const deptHistoire = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultyLettres.id,
        name: 'Histoire',
        shortName: 'HIST',
        headName: 'Dr. Halimé Ngarndmi Khamis',
        isActive: true,
      },
    })

    const deptPhilosophie = await db.department.create({
      data: {
        tenantId: tenant.id,
        facultyId: facultyLettres.id,
        name: 'Philosophie',
        shortName: 'PHIL',
        headName: 'Dr. Fadoul Abdallah Ramadane',
        isActive: true,
      },
    })

    // ========================================
    // e) Create Programs
    // ========================================
    const programs = await Promise.all([
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultyDroit.id,
          departmentId: deptDroitPrive.id,
          name: 'Licence Droit',
          code: 'LIC-DROIT',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultyDroit.id,
          departmentId: deptDroitPublic.id,
          name: 'Master Droit',
          code: 'MAS-DROIT',
          cycle: 'MASTER',
          diplomaType: 'Master',
          duration: 2,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultySciences.id,
          departmentId: deptMaths.id,
          name: 'Licence Mathématiques',
          code: 'LIC-MATH',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultySciences.id,
          departmentId: deptPhysique.id,
          name: 'Licence Physique',
          code: 'LIC-PHY',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultySciences.id,
          departmentId: deptInfo.id,
          name: 'Licence Informatique',
          code: 'LIC-INFO',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultySciences.id,
          departmentId: deptInfo.id,
          name: 'Master Informatique',
          code: 'MAS-INFO',
          cycle: 'MASTER',
          diplomaType: 'Master',
          duration: 2,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultyLettres.id,
          departmentId: deptLettresModernes.id,
          name: 'Licence Lettres Modernes',
          code: 'LIC-LM',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultyLettres.id,
          departmentId: deptHistoire.id,
          name: 'Licence Histoire',
          code: 'LIC-HIST',
          cycle: 'LICENCE',
          diplomaType: 'Licence Professionnelle',
          duration: 3,
          isActive: true,
        },
      }),
      db.program.create({
        data: {
          tenantId: tenant.id,
          facultyId: facultyLettres.id,
          departmentId: deptHistoire.id,
          name: 'Master Histoire',
          code: 'MAS-HIST',
          cycle: 'MASTER',
          diplomaType: 'Master',
          duration: 2,
          isActive: true,
        },
      }),
    ])

    const [progLicDroit, progMasterDroit, progLicMath, progLicPhy, progLicInfo, progMasterInfo, progLicLM, progLicHist, progMasterHist] = programs

    // ========================================
    // f) Create Levels for each program
    // ========================================
    // Helper: create levels for a program
    const createLicenceLevels = async (programId: string) => {
      const l1 = await db.level.create({ data: { programId, name: 'Licence 1', code: 'L1', orderIndex: 1, isActive: true } })
      const l2 = await db.level.create({ data: { programId, name: 'Licence 2', code: 'L2', orderIndex: 2, isActive: true } })
      const l3 = await db.level.create({ data: { programId, name: 'Licence 3', code: 'L3', orderIndex: 3, isActive: true } })
      return { l1, l2, l3 }
    }

    const createMasterLevels = async (programId: string) => {
      const m1 = await db.level.create({ data: { programId, name: 'Master 1', code: 'M1', orderIndex: 1, isActive: true } })
      const m2 = await db.level.create({ data: { programId, name: 'Master 2', code: 'M2', orderIndex: 2, isActive: true } })
      return { m1, m2 }
    }

    const levelsLicDroit = await createLicenceLevels(progLicDroit.id)
    const levelsMasterDroit = await createMasterLevels(progMasterDroit.id)
    const levelsLicMath = await createLicenceLevels(progLicMath.id)
    const levelsLicPhy = await createLicenceLevels(progLicPhy.id)
    const levelsLicInfo = await createLicenceLevels(progLicInfo.id)
    const levelsMasterInfo = await createMasterLevels(progMasterInfo.id)
    const levelsLicLM = await createLicenceLevels(progLicLM.id)
    const levelsLicHist = await createLicenceLevels(progLicHist.id)
    const levelsMasterHist = await createMasterLevels(progMasterHist.id)

    // ========================================
    // g) Create Semesters for each level
    // ========================================
    const createSemestersForLevel = async (levelId: string, startSem: number) => {
      const s1 = await db.semester.create({ data: { levelId, name: `Semestre ${startSem}`, code: `S${startSem}`, orderIndex: 1 } })
      const s2 = await db.semester.create({ data: { levelId, name: `Semestre ${startSem + 1}`, code: `S${startSem + 1}`, orderIndex: 2 } })
      return { s1, s2 }
    }

    // Licence Droit semesters
    const semLicDroitL1 = await createSemestersForLevel(levelsLicDroit.l1.id, 1)
    await createSemestersForLevel(levelsLicDroit.l2.id, 3)
    await createSemestersForLevel(levelsLicDroit.l3.id, 5)
    // Master Droit semesters
    await createSemestersForLevel(levelsMasterDroit.m1.id, 1)
    await createSemestersForLevel(levelsMasterDroit.m2.id, 3)
    // Licence Maths semesters
    await createSemestersForLevel(levelsLicMath.l1.id, 1)
    await createSemestersForLevel(levelsLicMath.l2.id, 3)
    await createSemestersForLevel(levelsLicMath.l3.id, 5)
    // Licence Physique semesters
    await createSemestersForLevel(levelsLicPhy.l1.id, 1)
    await createSemestersForLevel(levelsLicPhy.l2.id, 3)
    await createSemestersForLevel(levelsLicPhy.l3.id, 5)
    // Licence Info semesters
    const semLicInfoL1 = await createSemestersForLevel(levelsLicInfo.l1.id, 1)
    await createSemestersForLevel(levelsLicInfo.l2.id, 3)
    await createSemestersForLevel(levelsLicInfo.l3.id, 5)
    // Master Info semesters
    await createSemestersForLevel(levelsMasterInfo.m1.id, 1)
    await createSemestersForLevel(levelsMasterInfo.m2.id, 3)
    // Licence LM semesters
    const semLicLML1 = await createSemestersForLevel(levelsLicLM.l1.id, 1)
    await createSemestersForLevel(levelsLicLM.l2.id, 3)
    await createSemestersForLevel(levelsLicLM.l3.id, 5)
    // Licence Histoire semesters
    await createSemestersForLevel(levelsLicHist.l1.id, 1)
    await createSemestersForLevel(levelsLicHist.l2.id, 3)
    await createSemestersForLevel(levelsLicHist.l3.id, 5)
    // Master Histoire semesters
    await createSemestersForLevel(levelsMasterHist.m1.id, 1)
    await createSemestersForLevel(levelsMasterHist.m2.id, 3)

    // ========================================
    // j) Create Teachers FIRST (needed for UE/ECUE)
    // ========================================
    const teacherData = [
      { firstName: 'Mahamat', lastName: 'Seid', grade: 'Professeur Titulaire', specialization: 'Droit Civil', departmentId: deptDroitPrive.id, employeeId: 'ENS-001' },
      { firstName: 'Fatimé', lastName: 'Hassan', grade: 'Maître de Conférences', specialization: 'Droit Privé', departmentId: deptDroitPrive.id, employeeId: 'ENS-002' },
      { firstName: 'Mahamat', lastName: 'Adam', grade: 'Professeur Titulaire', specialization: 'Droit Public', departmentId: deptDroitPublic.id, employeeId: 'ENS-003' },
      { firstName: 'Khadidja', lastName: 'Aboubakar', grade: 'Maître de Conférences', specialization: 'Sciences Politiques', departmentId: deptDroitPublic.id, employeeId: 'ENS-004' },
      { firstName: 'Abdoulaye', lastName: 'Adoum', grade: 'Professeur Titulaire', specialization: 'Analyse Numérique', departmentId: deptMaths.id, employeeId: 'ENS-005' },
      { firstName: 'Youssouf', lastName: 'Mahamat', grade: 'Maître de Conférences', specialization: 'Physique Théorique', departmentId: deptPhysique.id, employeeId: 'ENS-006' },
      { firstName: 'Zakaria', lastName: 'Doumngar', grade: 'Maître de Conférences', specialization: 'Intelligence Artificielle', departmentId: deptInfo.id, employeeId: 'ENS-007' },
      { firstName: 'Amina', lastName: 'Djibrine', grade: 'Professeur Titulaire', specialization: 'Littérature Africaine', departmentId: deptLettresModernes.id, employeeId: 'ENS-008' },
      { firstName: 'Halimé', lastName: 'Ngarndmi', grade: 'Maître de Conférences', specialization: 'Histoire Contemporaine', departmentId: deptHistoire.id, employeeId: 'ENS-009' },
      { firstName: 'Fadoul', lastName: 'Abdallah', grade: 'Maître de Conférences', specialization: 'Philosophie Politique', departmentId: deptPhilosophie.id, employeeId: 'ENS-010' },
      { firstName: 'Ibrahim', lastName: 'Seid', grade: 'Maître-Assistant', specialization: 'Droit Commercial', departmentId: deptDroitPrive.id, employeeId: 'ENS-011' },
      { firstName: 'Hawa', lastName: 'Bichara', grade: 'Maître-Assistant', specialization: 'Algèbre', departmentId: deptMaths.id, employeeId: 'ENS-012' },
      { firstName: 'Moussa', lastName: 'Yaya', grade: 'Maître-Assistant', specialization: 'Réseaux & Systèmes', departmentId: deptInfo.id, employeeId: 'ENS-013' },
      { firstName: 'Djimé', lastName: 'Mallah', grade: 'Maître-Assistant', specialization: 'Physique Nucléaire', departmentId: deptPhysique.id, employeeId: 'ENS-014' },
      { firstName: 'Meriam', lastName: 'Haroun', grade: 'Maître-Assistant', specialization: 'Linguistique', departmentId: deptLettresModernes.id, employeeId: 'ENS-015' },
      { firstName: 'Clément', lastName: 'Tchéré', grade: 'Professeur Titulaire', specialization: 'Géographie', departmentId: deptHistoire.id, employeeId: 'ENS-016' },
    ]

    const teachers = await Promise.all(
      teacherData.map((t) =>
        db.teacher.create({
          data: {
            tenantId: tenant.id,
            departmentId: t.departmentId,
            employeeId: t.employeeId,
            grade: t.grade,
            specialization: t.specialization,
            maxHoursPerWeek: 20,
            currentHours: 0,
            isActive: true,
          },
        })
      )
    )

    // ========================================
    // h) Create TeachingUnits and CourseElements
    //     for Licence Droit S1, S2
    //     and Licence Info S1
    //     and Licence LM S1
    // ========================================

    // --- Licence Droit S1 ---
    const ueDroitS1_1 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s1.id,
        code: 'DRO101',
        name: 'Introduction au Droit',
        credits: 6,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[0].id,
        orderIndex: 1,
      },
    })

    const ueDroitS1_2 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s1.id,
        code: 'DRO102',
        name: 'Droit Constitutionnel',
        credits: 5,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[2].id,
        orderIndex: 2,
      },
    })

    const ueDroitS1_3 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s1.id,
        code: 'ECO101',
        name: 'Économie Politique',
        credits: 4,
        type: 'COMPLEMENTAIRE',
        compensable: true,
        orderIndex: 3,
      },
    })

    const ueDroitS1_4 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s1.id,
        code: 'METH101',
        name: 'Méthodologie du Travail Universitaire',
        credits: 3,
        type: 'TRANSVERSALE',
        compensable: true,
        orderIndex: 4,
      },
    })

    // ECUEs for DRO101
    await Promise.all([
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_1.id,
          code: 'DRO101-1',
          name: 'Notions fondamentales du droit',
          coefficient: 2.0,
          hoursCM: 30,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[0].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_1.id,
          code: 'DRO101-2',
          name: 'Sources du droit',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[1].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_2.id,
          code: 'DRO102-1',
          name: 'Institutions constitutionnelles',
          coefficient: 2.0,
          hoursCM: 30,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[2].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_2.id,
          code: 'DRO102-2',
          name: 'Droits fondamentaux',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[3].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_3.id,
          code: 'ECO101-1',
          name: 'Microéconomie',
          coefficient: 1.5,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 0,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_3.id,
          code: 'ECO101-2',
          name: 'Macroéconomie',
          coefficient: 1.5,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 0,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS1_4.id,
          code: 'METH101-1',
          name: 'Techniques de rédaction',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[10].id,
          orderIndex: 1,
        },
      }),
    ])

    // --- Licence Droit S2 ---
    const ueDroitS2_1 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s2.id,
        code: 'DRO201',
        name: 'Droit Civil',
        credits: 6,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[0].id,
        orderIndex: 1,
      },
    })

    const ueDroitS2_2 = await db.teachingUnit.create({
      data: {
        semesterId: semLicDroitL1.s2.id,
        code: 'DRO202',
        name: 'Droit Pénal Général',
        credits: 5,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[10].id,
        orderIndex: 2,
      },
    })

    await Promise.all([
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS2_1.id,
          code: 'DRO201-1',
          name: 'Personnes et famille',
          coefficient: 2.0,
          hoursCM: 30,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[0].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS2_1.id,
          code: 'DRO201-2',
          name: 'Régimes matrimoniaux',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[1].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueDroitS2_2.id,
          code: 'DRO202-1',
          name: 'Infractions et peines',
          coefficient: 2.0,
          hoursCM: 30,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[10].id,
          orderIndex: 1,
        },
      }),
    ])

    // --- Licence Info S1 ---
    const ueInfoS1_1 = await db.teachingUnit.create({
      data: {
        semesterId: semLicInfoL1.s1.id,
        code: 'INF101',
        name: 'Algorithmique et Programmation',
        credits: 6,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[6].id,
        orderIndex: 1,
      },
    })

    const ueInfoS1_2 = await db.teachingUnit.create({
      data: {
        semesterId: semLicInfoL1.s1.id,
        code: 'MAT101',
        name: 'Mathématiques pour Informaticiens',
        credits: 5,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[4].id,
        orderIndex: 2,
      },
    })

    const ueInfoS1_3 = await db.teachingUnit.create({
      data: {
        semesterId: semLicInfoL1.s1.id,
        code: 'INF102',
        name: 'Architecture des Ordinateurs',
        credits: 4,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[12].id,
        orderIndex: 3,
      },
    })

    await Promise.all([
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_1.id,
          code: 'INF101-1',
          name: 'Algorithmique',
          coefficient: 2.0,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 20,
          teacherId: teachers[6].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_1.id,
          code: 'INF101-2',
          name: 'Programmation C',
          coefficient: 2.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 25,
          teacherId: teachers[12].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_2.id,
          code: 'MAT101-1',
          name: 'Algèbre linéaire',
          coefficient: 2.0,
          hoursCM: 30,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[4].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_2.id,
          code: 'MAT101-2',
          name: 'Analyse',
          coefficient: 1.5,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[11].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_3.id,
          code: 'INF102-1',
          name: 'Circuits logiques',
          coefficient: 1.5,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 10,
          teacherId: teachers[12].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueInfoS1_3.id,
          code: 'INF102-2',
          name: 'Systèmes d\'exploitation',
          coefficient: 1.5,
          hoursCM: 20,
          hoursTD: 10,
          hoursTP: 10,
          teacherId: teachers[6].id,
          orderIndex: 2,
        },
      }),
    ])

    // --- Licence LM S1 ---
    const ueLMS1_1 = await db.teachingUnit.create({
      data: {
        semesterId: semLicLML1.s1.id,
        code: 'FRA101',
        name: 'Grammaire Française',
        credits: 5,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[7].id,
        orderIndex: 1,
      },
    })

    const ueLMS1_2 = await db.teachingUnit.create({
      data: {
        semesterId: semLicLML1.s1.id,
        code: 'FRA102',
        name: 'Littérature Africaine',
        credits: 5,
        type: 'FONDAMENTALE',
        compensable: true,
        responsibleId: teachers[7].id,
        orderIndex: 2,
      },
    })

    await Promise.all([
      db.courseElement.create({
        data: {
          teachingUnitId: ueLMS1_1.id,
          code: 'FRA101-1',
          name: 'Morphologie et syntaxe',
          coefficient: 2.0,
          hoursCM: 25,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[7].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueLMS1_1.id,
          code: 'FRA101-2',
          name: 'Stylistique',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[14].id,
          orderIndex: 2,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueLMS1_2.id,
          code: 'FRA102-1',
          name: 'Roman africain francophone',
          coefficient: 2.0,
          hoursCM: 25,
          hoursTD: 15,
          hoursTP: 0,
          teacherId: teachers[7].id,
          orderIndex: 1,
        },
      }),
      db.courseElement.create({
        data: {
          teachingUnitId: ueLMS1_2.id,
          code: 'FRA102-2',
          name: 'Poésie et théâtre africains',
          coefficient: 1.0,
          hoursCM: 15,
          hoursTD: 10,
          hoursTP: 0,
          teacherId: teachers[14].id,
          orderIndex: 2,
        },
      }),
    ])

    // ========================================
    // i) Create AcademicYear with ExamSessions
    // ========================================
    const academicYear = await db.academicYear.create({
      data: {
        tenantId: tenant.id,
        name: '2024-2025',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2025-07-15'),
        isActive: true,
        isCurrent: true,
      },
    })

    await Promise.all([
      db.examSession.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Session Normale Semestre 1',
          type: 'NORMALE',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-02-15'),
          isActive: true,
        },
      }),
      db.examSession.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Session Normale Semestre 2',
          type: 'NORMALE',
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-07-01'),
          isActive: true,
        },
      }),
      db.examSession.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Session de Rattrapage S1',
          type: 'RATTRAPAGE',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-03-15'),
          isActive: true,
        },
      }),
      db.examSession.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Session de Rattrapage S2',
          type: 'RATTRAPAGE',
          startDate: new Date('2025-07-15'),
          endDate: new Date('2025-07-30'),
          isActive: true,
        },
      }),
    ])

    // ========================================
    // k) Create 30+ Students
    // ========================================
    const studentData = [
      { firstName: 'Adam', lastName: 'Hassane', middleName: 'Abakar', gender: 'M', levelId: levelsLicDroit.l1.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000001', credits: 28, bacSeries: 'Série D', bacYear: 2023 },
      { firstName: 'Fatimé', lastName: 'Khamis', middleName: null, gender: 'F', levelId: levelsLicDroit.l2.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000002', credits: 56, bacSeries: 'Série A', bacYear: 2022 },
      { firstName: 'Mahamat', lastName: 'Adam', middleName: 'Bachar', gender: 'M', levelId: levelsLicDroit.l1.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000003', credits: 12, bacSeries: 'Série D', bacYear: 2023 },
      { firstName: 'Khadidja', lastName: 'Aboubakar', middleName: 'Hissein', gender: 'F', levelId: levelsLicDroit.l3.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000004', credits: 108, bacSeries: 'Série A', bacYear: 2021 },
      { firstName: 'Amina', lastName: 'Djibrine', middleName: null, gender: 'F', levelId: levelsLicDroit.l1.id, programId: progLicDroit.id, status: 'PRE_INSCRIT', matricule: 'UNSH-2024-L1-000005', credits: 0, bacSeries: 'Série D', bacYear: 2024 },
      { firstName: 'Youssouf', lastName: 'Mahamat', middleName: 'Nour', gender: 'M', levelId: levelsMasterDroit.m1.id, programId: progMasterDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000006', credits: 178, bacSeries: 'Série A', bacYear: 2019 },
      { firstName: 'Halimé', lastName: 'Ngarndmi', middleName: null, gender: 'F', levelId: levelsMasterDroit.m2.id, programId: progMasterDroit.id, status: 'DIPLOME', matricule: 'UNSH-2024-L1-000007', credits: 240, bacSeries: 'Série A', bacYear: 2018 },
      { firstName: 'Zakaria', lastName: 'Doumngar', middleName: 'Yaya', gender: 'M', levelId: levelsLicInfo.l3.id, programId: progLicInfo.id, status: 'DIPLOME', matricule: 'UNSH-2024-L1-000008', credits: 180, bacSeries: 'Série C', bacYear: 2021 },
      { firstName: 'Mariam', lastName: 'Hissein', middleName: null, gender: 'F', levelId: levelsLicInfo.l1.id, programId: progLicInfo.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000009', credits: 24, bacSeries: 'Série C', bacYear: 2023 },
      { firstName: 'Ibrahim', lastName: 'Seid', middleName: 'Ahmat', gender: 'M', levelId: levelsLicInfo.l2.id, programId: progLicInfo.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000010', credits: 52, bacSeries: 'Série D', bacYear: 2022 },
      { firstName: 'Khadija', lastName: 'Adam', middleName: null, gender: 'F', levelId: levelsLicMath.l2.id, programId: progLicMath.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000011', credits: 48, bacSeries: 'Série C', bacYear: 2022 },
      { firstName: 'Abdoulaye', lastName: 'Adoum', middleName: 'Moussa', gender: 'M', levelId: levelsLicMath.l1.id, programId: progLicMath.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000012', credits: 20, bacSeries: 'Série C', bacYear: 2023 },
      { firstName: 'Hawa', lastName: 'Bichara', middleName: null, gender: 'F', levelId: levelsLicPhy.l1.id, programId: progLicPhy.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000013', credits: 24, bacSeries: 'Série D', bacYear: 2023 },
      { firstName: 'Djimé', lastName: 'Mallah', middleName: null, gender: 'M', levelId: levelsLicPhy.l2.id, programId: progLicPhy.id, status: 'PRE_INSCRIT', matricule: 'UNSH-2024-L1-000014', credits: 0, bacSeries: 'Série D', bacYear: 2022 },
      { firstName: 'Moussa', lastName: 'Yaya', middleName: 'Ramadane', gender: 'M', levelId: levelsLicInfo.l3.id, programId: progLicInfo.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000015', credits: 98, bacSeries: 'Série C', bacYear: 2021 },
      { firstName: 'Zara', lastName: 'Ramadane', middleName: null, gender: 'F', levelId: levelsLicLM.l1.id, programId: progLicLM.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000016', credits: 24, bacSeries: 'Série A', bacYear: 2023 },
      { firstName: 'Mahamat Nour', lastName: 'Issa', middleName: null, gender: 'M', levelId: levelsLicLM.l2.id, programId: progLicLM.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000017', credits: 44, bacSeries: 'Série A', bacYear: 2022 },
      { firstName: 'Achta', lastName: 'Ahmat', middleName: 'Abdou', gender: 'F', levelId: levelsLicHist.l1.id, programId: progLicHist.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000018', credits: 20, bacSeries: 'Série A', bacYear: 2023 },
      { firstName: 'Oumar', lastName: 'Hamid', middleName: null, gender: 'M', levelId: levelsLicHist.l2.id, programId: progLicHist.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000019', credits: 48, bacSeries: 'Série A', bacYear: 2022 },
      { firstName: 'Métine', lastName: 'Djimé', middleName: null, gender: 'F', levelId: levelsMasterHist.m1.id, programId: progMasterHist.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000020', credits: 176, bacSeries: 'Série A', bacYear: 2020 },
      { firstName: 'Fadoul', lastName: 'Abdallah', middleName: 'Ramadane', gender: 'M', levelId: levelsLicLM.l1.id, programId: progLicLM.id, status: 'PRE_INSCRIT', matricule: 'UNSH-2024-L1-000021', credits: 0, bacSeries: 'Série A', bacYear: 2024 },
      { firstName: 'Meriam', lastName: 'Haroun', middleName: null, gender: 'F', levelId: levelsLicInfo.l2.id, programId: progLicInfo.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000022', credits: 60, bacSeries: 'Série C', bacYear: 2022 },
      { firstName: 'Clément', lastName: 'Tchéré', middleName: null, gender: 'M', levelId: levelsMasterInfo.m2.id, programId: progMasterInfo.id, status: 'DIPLOME', matricule: 'UNSH-2024-L1-000023', credits: 300, bacSeries: 'Série C', bacYear: 2018 },
      { firstName: 'Adoum', lastName: 'Moussa', middleName: null, gender: 'M', levelId: levelsLicMath.l3.id, programId: progLicMath.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000024', credits: 112, bacSeries: 'Série C', bacYear: 2021 },
      { firstName: 'Hassana', lastName: 'Saleh', middleName: null, gender: 'F', levelId: levelsLicDroit.l3.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000025', credits: 104, bacSeries: 'Série A', bacYear: 2021 },
      { firstName: 'Ali', lastName: 'Bachar', middleName: null, gender: 'M', levelId: levelsLicDroit.l2.id, programId: progLicDroit.id, status: 'SUSPENDU', matricule: 'UNSH-2024-L1-000026', credits: 28, bacSeries: 'Série D', bacYear: 2022 },
      { firstName: 'Kaltouma', lastName: 'Néguié', middleName: null, gender: 'F', levelId: levelsLicPhy.l3.id, programId: progLicPhy.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000027', credits: 108, bacSeries: 'Série D', bacYear: 2021 },
      { firstName: 'Issa', lastName: 'Mallah', middleName: 'Djimé', gender: 'M', levelId: levelsLicHist.l3.id, programId: progLicHist.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000028', credits: 96, bacSeries: 'Série A', bacYear: 2021 },
      { firstName: 'Falmata', lastName: 'Yaya', middleName: null, gender: 'F', levelId: levelsLicLM.l3.id, programId: progLicLM.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000029', credits: 104, bacSeries: 'Série A', bacYear: 2021 },
      { firstName: 'Abakar', lastName: 'Moussa', middleName: 'Youssouf', gender: 'M', levelId: levelsLicDroit.l1.id, programId: progLicDroit.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000030', credits: 16, bacSeries: 'Série D', bacYear: 2023 },
      { firstName: 'Hassan', lastName: 'Abakar', middleName: null, gender: 'M', levelId: levelsLicMath.l1.id, programId: progLicMath.id, status: 'PRE_INSCRIT', matricule: 'UNSH-2024-L1-000031', credits: 0, bacSeries: 'Série C', bacYear: 2024 },
      { firstName: 'Djibrine', lastName: 'Adam', middleName: null, gender: 'M', levelId: levelsLicInfo.l1.id, programId: progLicInfo.id, status: 'INSCRIT', matricule: 'UNSH-2024-L1-000032', credits: 28, bacSeries: 'Série C', bacYear: 2023 },
    ]

    const students = await Promise.all(
      studentData.map((s) =>
        db.student.create({
          data: {
            tenantId: tenant.id,
            matricule: s.matricule,
            firstName: s.firstName,
            lastName: s.lastName,
            middleName: s.middleName,
            gender: s.gender,
            nationality: 'Tchadienne',
            dateOfBirth: new Date(2000 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            placeOfBirth: "N'Djaména",
            status: s.status,
            currentLevelId: s.levelId,
            currentProgramId: s.programId,
            totalCreditsAcquired: s.credits,
            bacSeries: s.bacSeries,
            bacYear: s.bacYear,
            phone: `+235 6${Math.floor(Math.random() * 9)} ${String(Math.floor(Math.random() * 900000 + 100000)).slice(0, 2)} ${String(Math.floor(Math.random() * 900000 + 100000)).slice(0, 2)} ${String(Math.floor(Math.random() * 9000 + 1000))}`,
            email: `${s.firstName.toLowerCase().replace(/\s+/g, '.')}.${s.lastName.toLowerCase()}@univ-ndjamena.td`,
            address: "N'Djaména, Tchad",
          },
        })
      )
    )

    // ========================================
    // l) Create some Grades for students
    // ========================================
    // Get the first few students and course elements for S1 Droit
    const courseElements = await db.courseElement.findMany({
      where: {
        teachingUnit: {
          semester: { id: semLicDroitL1.s1.id },
        },
      },
    })

    // Get students in L1 Droit
    const l1DroitStudents = students.filter(
      (s) => s.currentLevelId === levelsLicDroit.l1.id
    )

    const gradePromises: Promise<unknown>[] = []
    for (const student of l1DroitStudents.slice(0, 5)) {
      for (const ce of courseElements) {
        const ccGrade = Math.round((8 + Math.random() * 10) * 100) / 100
        const examGrade = Math.round((6 + Math.random() * 12) * 100) / 100
        const finalGrade = Math.round((ccGrade * 0.4 + examGrade * 0.6) * 100) / 100
        gradePromises.push(
          db.grade.create({
            data: {
              studentId: student.id,
              teachingUnitId: ce.teachingUnitId,
              courseElementId: ce.id,
              academicYearId: academicYear.id,
              session: 'NORMALE',
              ccGrade,
              examGrade,
              finalGrade,
              isAbsent: false,
              isJustified: false,
              isDefaillant: false,
              isLocked: Math.random() > 0.3,
            },
          })
        )
      }
    }
    await Promise.all(gradePromises)

    // Also create some grades for Info S1 students
    const infoCourseElements = await db.courseElement.findMany({
      where: {
        teachingUnit: {
          semester: { id: semLicInfoL1.s1.id },
        },
      },
    })
    const l1InfoStudents = students.filter(
      (s) => s.currentLevelId === levelsLicInfo.l1.id
    )
    const infoGradePromises: Promise<unknown>[] = []
    for (const student of l1InfoStudents.slice(0, 3)) {
      for (const ce of infoCourseElements) {
        const ccGrade = Math.round((7 + Math.random() * 11) * 100) / 100
        const examGrade = Math.round((5 + Math.random() * 13) * 100) / 100
        const finalGrade = Math.round((ccGrade * 0.4 + examGrade * 0.6) * 100) / 100
        infoGradePromises.push(
          db.grade.create({
            data: {
              studentId: student.id,
              teachingUnitId: ce.teachingUnitId,
              courseElementId: ce.id,
              academicYearId: academicYear.id,
              session: 'NORMALE',
              ccGrade,
              examGrade,
              finalGrade,
              isAbsent: false,
              isJustified: false,
              isDefaillant: false,
              isLocked: Math.random() > 0.3,
            },
          })
        )
      }
    }
    await Promise.all(infoGradePromises)

    // ========================================
    // m) Create some Payments
    // ========================================
    await db.feeStructure.create({
      data: {
        tenantId: tenant.id,
        academicYearId: academicYear.id,
        name: 'Frais de scolarité Licence',
        type: 'SCOLARITE',
        amount: 175000,
        currency: 'FCFA',
        isMandatory: true,
        allowTranche: true,
        isActive: true,
      },
    })

    const paymentMethods = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER']
    const paymentStatuses = ['VALIDATED', 'PENDING', 'PENDING', 'VALIDATED', 'VALIDATED']

    const paymentPromises = students.slice(0, 15).map((student, i) => {
      const amount = i % 3 === 0 ? 175000 : i % 3 === 1 ? 87500 : 100000
      return db.payment.create({
        data: {
          tenantId: tenant.id,
          studentId: student.id,
          academicYearId: academicYear.id,
          amount,
          currency: 'FCFA',
          paymentMethod: paymentMethods[i % paymentMethods.length] as 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER',
          mobileMoneyProvider: paymentMethods[i % paymentMethods.length] === 'MOBILE_MONEY' ? 'AIRTEL' : null,
          transactionRef: `TRX-${String(Date.now()).slice(-6)}-${String(i + 1).padStart(4, '0')}`,
          receiptNumber: `REC-2024-${String(i + 1).padStart(5, '0')}`,
          status: paymentStatuses[i % paymentStatuses.length] as 'VALIDATED' | 'PENDING',
          validationDate: paymentStatuses[i % paymentStatuses.length] === 'VALIDATED' ? new Date() : null,
          validatedBy: paymentStatuses[i % paymentStatuses.length] === 'VALIDATED' ? 'Caissier Principal' : null,
        },
      })
    })
    await Promise.all(paymentPromises)

    // ========================================
    // n) Create some Announcements
    // ========================================
    await Promise.all([
      db.announcement.create({
        data: {
          tenantId: tenant.id,
          title: 'Rentrée académique 2024-2025',
          content: 'La rentrée académique pour l\'année 2024-2025 est fixée au 1er octobre 2024. Tous les étudiants sont priés de compléter leur inscription avant le 15 octobre 2024. Les cours débuteront le 21 octobre 2024.',
          type: 'IMPORTANT',
          target: 'ALL',
          isPublished: true,
          publishedAt: new Date('2024-09-15'),
          publishedBy: 'Administration',
        },
      }),
      db.announcement.create({
        data: {
          tenantId: tenant.id,
          title: 'Calendrier des examens S1',
          content: 'Les examens du Semestre 1 auront lieu du 15 janvier au 15 février 2025. Les emplois du temps seront affichés sur les panneaux de chaque faculté et disponibles en ligne.',
          type: 'EXAMEN',
          target: 'ALL',
          isPublished: true,
          publishedAt: new Date('2024-12-20'),
          publishedBy: 'Scolarité',
        },
      }),
      db.announcement.create({
        data: {
          tenantId: tenant.id,
          title: 'Inscription en Master 2024-2025',
          content: 'Les candidatures pour les formations de Master sont ouvertes du 1er au 30 septembre 2024. Les dossiers sont à déposer au secrétariat de la faculté concernée.',
          type: 'INSCRIPTION',
          target: 'ALL',
          isPublished: true,
          publishedAt: new Date('2024-09-01'),
          publishedBy: 'Scolarité',
        },
      }),
      db.announcement.create({
        data: {
          tenantId: tenant.id,
          title: 'Bourse d\'étude - Ambassade de France',
          content: 'L\'Ambassade de France au Tchad offre des bourses d\'études pour l\'année 2024-2025. Date limite de soumission : 30 novembre 2024. Plus d\'informations au service de coopération.',
          type: 'INFO',
          target: 'ALL',
          isPublished: true,
          publishedAt: new Date('2024-10-15'),
          publishedBy: 'Direction Académique',
        },
      }),
      db.announcement.create({
        data: {
          tenantId: tenant.id,
          title: 'Journée portes ouvertes',
          content: 'L\'Université de N\'Djaména organise une journée portes ouvertes le 15 mars 2025. Au programme : visites des laboratoires, présentations des formations, échanges avec les enseignants.',
          type: 'EVENT',
          target: 'ALL',
          isPublished: true,
          publishedAt: new Date('2025-02-15'),
          publishedBy: 'Communication',
        },
      }),
    ])

    // ========================================
    // o) Create Hospital with Clinical Departments
    // ========================================
    const hospital = await db.hospital.create({
      data: {
        tenantId: tenant.id,
        name: 'Hôpital Général de Référence de N\'Djaména',
        type: 'CHR',
        address: 'Avenue Charles de Gaulle, N\'Djaména',
        city: "N'Djaména",
        partner: true,
        isActive: true,
      },
    })

    await Promise.all([
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Médecine Interne', isActive: true },
      }),
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Chirurgie Générale', isActive: true },
      }),
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Pédiatrie', isActive: true },
      }),
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Gynécologie-Obstétrique', isActive: true },
      }),
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Urgences', isActive: true },
      }),
      db.clinicalDepartment.create({
        data: { hospitalId: hospital.id, name: 'Laboratoire d\'Analyses', isActive: true },
      }),
    ])

    // ========================================
    // Return summary
    // ========================================
    const counts = {
      tenants: 1,
      faculties: 3,
      departments: 8,
      programs: programs.length,
      levels: await db.level.count({ where: { program: { tenantId: tenant.id } } }),
      semesters: await db.semester.count(),
      teachingUnits: await db.teachingUnit.count(),
      courseElements: await db.courseElement.count(),
      academicYears: 1,
      examSessions: 4,
      teachers: teachers.length,
      students: students.length,
      grades: await db.grade.count(),
      payments: 15,
      announcements: 5,
      hospitals: 1,
      clinicalDepartments: 6,
      feeStructures: 1,
    }

    return NextResponse.json({
      message: 'Seed completed successfully!',
      tenantId: tenant.id,
      counts,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Seed error:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
