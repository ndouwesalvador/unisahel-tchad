import { z } from 'zod'

// ========================================
// Query Parameter Schemas
// ========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  // Several list pages fetch up to 1000 records at once for client-side
  // search/filter (students-list, teachers-page, payments-page, grades-page,
  // import-export-page) - found failing with 500s (ZodError: limit too big)
  // during live verification of grades-page.tsx. 100 was too low for real usage.
  limit: z.coerce.number().int().positive().max(1000).default(10),
})

export const tenantQuerySchema = z.object({
  tenantId: z.string().cuid(),
})

export const studentQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['INSCRIT', 'PRE_INSCRIT', 'DIPLOME', 'SUSPENDU', 'ABANDON', 'TRANSFERE']).optional(),
  programId: z.string().cuid().optional(),
  levelId: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
})

export const gradeQuerySchema = paginationSchema.extend({
  studentId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  semesterId: z.string().cuid().optional(),
  teachingUnitId: z.string().cuid().optional(),
  courseElementId: z.string().cuid().optional(),
  session: z.enum(['NORMALE', 'RATTRAPAGE', 'SPECIALE']).optional(),
  tenantId: z.string().cuid().optional(),
})

export const paymentQuerySchema = paginationSchema.extend({
  studentId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  status: z.enum(['VALIDATED', 'PENDING', 'CANCELLED', 'REFUNDED']).optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tenantId: z.string().cuid().optional(),
})

export const dashboardQuerySchema = z.object({
  tenantId: z.string().cuid().optional(),
})

// ========================================
// Body Schemas - Students
// ========================================

export const createStudentSchema = z.object({
  matricule: z.string().optional(), // Auto-generated if not provided
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  gender: z.enum(['M', 'F']),
  nationality: z.string().max(50).default('Tchadienne'),
  dateOfBirth: z.string().datetime(),
  placeOfBirth: z.string().max(100),
  status: z.enum(['INSCRIT', 'PRE_INSCRIT']).default('PRE_INSCRIT'),
  currentLevelId: z.string().cuid(),
  currentProgramId: z.string().cuid(),
  bacSeries: z.string().max(50).optional(),
  bacYear: z.number().int().min(1990).max(2030).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(255).optional(),
  parentName: z.string().max(100).optional(),
  parentPhone: z.string().max(30).optional(),
  parentEmail: z.string().email().optional(),
})

export const updateStudentSchema = createStudentSchema.partial().extend({
  id: z.string().cuid(),
  totalCreditsAcquired: z.number().int().min(0).optional(),
})

// ========================================
// Body Schemas - Grades
// ========================================

export const createGradeSchema = z.object({
  studentId: z.string().cuid(),
  teachingUnitId: z.string().cuid(),
  courseElementId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  session: z.enum(['NORMALE', 'RATTRAPAGE', 'SPECIALE']).default('NORMALE'),
  ccGrade: z.number().min(0).max(20).optional(),
  examGrade: z.number().min(0).max(20).optional(),
  tpGrade: z.number().min(0).max(20).optional(),
  stageGrade: z.number().min(0).max(20).optional(),
  oralGrade: z.number().min(0).max(20).optional(),
  memoireGrade: z.number().min(0).max(20).optional(),
  projectGrade: z.number().min(0).max(20).optional(),
  isAbsent: z.boolean().default(false),
  isJustified: z.boolean().default(false),
  isDefaillant: z.boolean().default(false),
  comment: z.string().max(500).optional(),
})

export const updateGradeSchema = createGradeSchema.partial().extend({
  id: z.string().cuid(),
  isLocked: z.boolean().optional(),
})

export const bulkGradeEntrySchema = z.object({
  grades: z.array(createGradeSchema),
  academicYearId: z.string().cuid(),
  session: z.enum(['NORMALE', 'RATTRAPAGE', 'SPECIALE']).default('NORMALE'),
})

export const calculateGradeSchema = z.object({
  ccGrade: z.number().min(0).max(20).optional(),
  examGrade: z.number().min(0).max(20).optional(),
  tpGrade: z.number().min(0).max(20).optional(),
  stageGrade: z.number().min(0).max(20).optional(),
  oralGrade: z.number().min(0).max(20).optional(),
  memoireGrade: z.number().min(0).max(20).optional(),
  projectGrade: z.number().min(0).max(20).optional(),
  ccWeight: z.number().min(0).max(1).default(0.4),
  examWeight: z.number().min(0).max(1).default(0.6),
  tpWeight: z.number().min(0).max(1).default(0),
  stageWeight: z.number().min(0).max(1).default(0),
})

// ========================================
// Body Schemas - Payments
// ========================================

export const createPaymentSchema = z.object({
  studentId: z.string().cuid(),
  academicYearId: z.string().cuid(),
  feeStructureId: z.string().cuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('FCFA'),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD']),
  mobileMoneyProvider: z.enum(['AIRTEL', 'ORANGE', 'MTN', 'MOOV']).optional(),
  mobileMoneyPhone: z.string().max(20).optional(),
  transactionRef: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  receiptNumber: z.string().max(50).optional(),
  status: z.enum(['VALIDATED', 'PENDING', 'CANCELLED']).default('PENDING'),
  validatedBy: z.string().max(100).optional(),
})

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string().cuid(),
  validationDate: z.string().datetime().optional(),
})

// ========================================
// Body Schemas - Teachers
// ========================================

export const createTeacherSchema = z.object({
  employeeId: z.string().max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  grade: z.enum(['PROFESSEUR_TITULAIRE', 'MAITRE_CONFERENCES', 'MAITRE_ASSISTANT', 'ASSISTANT', 'VACATAIRE']),
  specialization: z.string().max(200),
  departmentId: z.string().cuid(),
  maxHoursPerWeek: z.number().int().positive().default(20),
  // Required: becomes the login identifier for the teacher's own account.
  email: z.string().email(),
  phone: z.string().max(30).optional(),
})

export const updateTeacherSchema = createTeacherSchema.partial().extend({
  id: z.string().cuid(),
  currentHours: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

// ========================================
// Body Schemas - Structure
// ========================================

export const createFacultySchema = z.object({
  name: z.string().min(1).max(200),
  shortName: z.string().max(20),
  deanName: z.string().max(100).optional(),
  deanTitle: z.string().max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().default(true),
})

export const createDepartmentSchema = z.object({
  facultyId: z.string().cuid(),
  name: z.string().min(1).max(200),
  shortName: z.string().max(20),
  headName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().default(true),
})

export const createProgramSchema = z.object({
  facultyId: z.string().cuid(),
  departmentId: z.string().cuid(),
  name: z.string().min(1).max(200),
  code: z.string().max(20),
  cycle: z.enum(['LICENCE', 'MASTER', 'DOCTORAT', 'INGENIEUR', 'DUT', 'BTS']),
  diplomaType: z.string().max(100),
  duration: z.number().int().positive(),
  creditsPerYear: z.number().int().positive().default(60),
  isActive: z.boolean().default(true),
})

export const createLevelSchema = z.object({
  programId: z.string().cuid(),
  name: z.string().min(1).max(100),
  code: z.string().max(20),
  orderIndex: z.number().int().positive(),
  isActive: z.boolean().default(true),
})

export const createSemesterSchema = z.object({
  levelId: z.string().cuid(),
  name: z.string().min(1).max(100),
  code: z.string().max(20),
  orderIndex: z.number().int().positive(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const createTeachingUnitSchema = z.object({
  semesterId: z.string().cuid(),
  code: z.string().max(20),
  name: z.string().min(1).max(200),
  credits: z.number().int().positive(),
  type: z.enum(['FONDAMENTALE', 'COMPLEMENTAIRE', 'TRANSVERSALE', 'METHODE', 'LANGUE', 'STAGE', 'MEMOIRE']),
  compensable: z.boolean().default(true),
  responsibleId: z.string().cuid().optional(),
  orderIndex: z.number().int().positive(),
})

export const createCourseElementSchema = z.object({
  teachingUnitId: z.string().cuid(),
  code: z.string().max(20),
  name: z.string().min(1).max(200),
  coefficient: z.number().positive(),
  hoursCM: z.number().int().min(0).default(0),
  hoursTD: z.number().int().min(0).default(0),
  hoursTP: z.number().int().min(0).default(0),
  teacherId: z.string().cuid().optional(),
  orderIndex: z.number().int().positive(),
})

// ========================================
// Validation Helpers
// ========================================

export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return schema.parse(params)
}

export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> {
  return schema.parse(body)
}

// ========================================
// Error Formatting
// ========================================

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ')
}

export class ValidationError extends Error {
  constructor(public errors: z.ZodIssue[]) {
    super(formatZodError(new z.ZodError(errors)))
    this.name = 'ValidationError'
  }
}