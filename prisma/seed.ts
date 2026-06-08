import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Chadian context...');

  // 1. Create or Update Tenant
  const tenantSlug = 'unive-ndjamena';
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: "Université de N'Djamena",
      shortName: 'UNDJ',
      slug: tenantSlug,
      city: "N'Djamena",
      country: 'Tchad',
      phone: '+235 66 00 00 00',
      email: 'contact@unive-ndjamena.td',
      academicSystem: 'LMD',
      settings: {
        create: {
          defaultLanguage: 'fr',
          supportedLanguages: 'fr,ar',
          gradingScale: 20.0,
          passingGrade: 10.0,
          primaryColor: '#00205B', // Blue
          secondaryColor: '#FFC000', // Yellow
          accentColor: '#E2001A', // Red (Chad flag colors)
          receiptPrefix: 'REC-UNDJ',
          matriculePrefix: 'UNDJ',
          allowMobileMoney: true,
          allowBankPayment: true,
          allowCashPayment: true,
        },
      },
    },
  });

  console.log(`Tenant created/updated: ${tenant.name}`);

  // 2. Create Admin User
  const adminEmail = 'admin@unive-ndjamena.td';
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      login: 'admin_undj',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'Principal',
      role: 'ADMIN_INSTITUTION',
      isActive: true,
    },
  });
  console.log(`Admin user created: ${admin.email} (Password: password123)`);

  const prof = await prisma.user.upsert({
    where: { email: 'prof@unive-ndjamena.td' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'prof@unive-ndjamena.td',
      login: 'prof_undj',
      passwordHash: hashedPassword,
      firstName: 'Moussa',
      lastName: 'Hissein',
      role: 'ENSEIGNANT',
      isActive: true,
    },
  });
  console.log(`Teacher user created: ${prof.email} (Password: password123)`);

  const scolarite = await prisma.user.upsert({
    where: { email: 'scolarite@unive-ndjamena.td' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'scolarite@unive-ndjamena.td',
      login: 'scol_undj',
      passwordHash: hashedPassword,
      firstName: 'Fatime',
      lastName: 'Abakar',
      role: 'SCOLARITE',
      isActive: true,
    },
  });
  console.log(`Scolarite user created: ${scolarite.email} (Password: password123)`);

  // 3. Create Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name: '2026-2027',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-07-31'),
      isActive: true,
      isCurrent: true,
    },
  });

  console.log(`Academic year created: ${academicYear.name}`);

  // 4. Create Faculty & Department
  const faculty = await prisma.faculty.create({
    data: {
      tenantId: tenant.id,
      name: 'Faculté des Sciences Exactes et Appliquées',
      shortName: 'FSEA',
      isActive: true,
      departments: {
        create: [
          {
            tenantId: tenant.id,
            name: 'Département d\'Informatique',
            shortName: 'INFO',
            isActive: true,
          },
        ],
      },
    },
    include: { departments: true },
  });

  const departmentInfo = faculty.departments[0];
  console.log(`Faculty ${faculty.shortName} and Department ${departmentInfo.shortName} created.`);

  // 5. Create Program & Levels
  const program = await prisma.program.create({
    data: {
      tenantId: tenant.id,
      facultyId: faculty.id,
      departmentId: departmentInfo.id,
      name: 'Licence en Informatique de Gestion',
      code: 'LIG',
      cycle: 'LICENCE',
      duration: 3,
      isActive: true,
      levels: {
        create: [
          { name: 'Licence 1', code: 'L1', orderIndex: 1, isActive: true },
          { name: 'Licence 2', code: 'L2', orderIndex: 2, isActive: true },
          { name: 'Licence 3', code: 'L3', orderIndex: 3, isActive: true },
        ],
      },
    },
    include: { levels: true },
  });

  console.log(`Program ${program.name} created with 3 levels.`);

  // 6. Create Fee Structure (FCFA)
  const feeStructure = await prisma.feeStructure.create({
    data: {
      tenantId: tenant.id,
      academicYearId: academicYear.id,
      programId: program.id,
      name: 'Frais de scolarité Annuels (LIG)',
      type: 'SCOLARITE',
      amount: 250000,
      currency: 'FCFA',
      isMandatory: true,
      allowTranche: true,
      isActive: true,
    },
  });

  console.log(`Fee structure created: ${feeStructure.amount} ${feeStructure.currency}`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
