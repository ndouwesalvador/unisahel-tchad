# IMPLEMENTATION PLAN - UniSahel School Management System

**Based on:** AUDIT_REPORT.md  
**Date:** 2026-06-07  
**Target:** Production-ready SaaS for African universities

---

## PHASE 1: AUTHENTICATION & AUTHORIZATION FOUNDATION (Week 1)

### 1.1 Fix Middleware Authentication
- [ ] **Task 1.1.1** - Replace cookie check with `getServerSession` in middleware
  - Import `auth` from `@/lib/auth/config`
  - Call `await auth()` to get validated session
  - Extract user role, tenantId, userId from session
  - Set headers: `x-user-role`, `x-user-id`, `x-tenant-id`

- [ ] **Task 1.1.2** - Implement `hasAccess()` with real role
  - Pass actual role from session to `hasAccess()`
  - Return 403 for unauthorized routes
  - Redirect to login with callbackUrl for unauthenticated

- [ ] **Task 1.1.3** - Optimize middleware matcher
  - Exclude API routes from middleware (handle in API)
  - Only protect page routes
  - Add `/api/auth` to public routes

### 1.2 Create Auth Helpers (`src/lib/auth/helpers.ts`)
- [ ] **Task 1.2.1** - `requireAuth()` - throws if no session
- [ ] **Task 1.2.2** - `requireRole(roles: string[])` - throws if role not in list
- [ ] **Task 1.2.3** - `getSessionUser()` - returns typed user object
- [ ] **Task 1.2.4** - `getTenantId()` - extracts tenantId from session

### 1.3 API Route Protection Pattern
- [ ] **Task 1.3.1** - Create base handler wrapper with auth
- [ ] **Task 1.3.2** - Add Zod validation to all endpoints
- [ ] **Task 1.3.3** - Standardize error responses
- [ ] **Task 1.3.4** - Add request logging (audit)

**Deliverable:** All API routes protected, middleware validates real sessions

---

## PHASE 2: CORE API ROUTES - STUDENTS, GRADES, PAYMENTS (Week 1-2)

### 2.1 Students API (`/api/students`)
- [ ] **Task 2.1.1** - POST: Create student (with matricule generation)
- [ ] **Task 2.1.2** - PUT: Update student
- [ ] **Task 2.1.3** - DELETE: Soft delete (status = SUSPENDU)
- [ ] **Task 2.1.4** - GET `/api/students/[id]` - Detail with relations
- [ ] **Task 2.1.5** - GET `/api/students/[id]/transcript` - Full transcript data

### 2.2 Grades API (`/api/grades`)
- [ ] **Task 2.2.1** - POST: Create/update grade (CC, Exam, TP, Stage, Oral, Memoire, Project)
- [ ] **Task 2.2.2** - PUT: Bulk grade entry (for teachers)
- [ ] **Task 2.2.3** - POST `/api/grades/calculate` - Auto-calculate finalGrade
- [ ] **Task 2.2.4** - PUT `/api/grades/[id]/lock` - Lock/unlock grades
- [ ] **Task 2.2.5** - GET `/api/grades/stats` - Distribution, averages per UE

### 2.3 Payments API (`/api/payments`)
- [ ] **Task 2.3.1** - POST: Create payment (with receipt number generation)
- [ ] **Task 2.3.2** - PUT: Update payment status (PENDING → VALIDATED)
- [ ] **Task 2.3.3** - GET `/api/payments/stats` - Revenue by method, period
- [ ] **Task 2.3.4** - GET `/api/payments/[id]/receipt` - Receipt data for PDF
- [ ] **Task 2.3.5** - Mobile Money integration helpers (Airtel, Orange, MTN, Moov)

### 2.4 Teachers API (`/api/teachers`)
- [ ] **Task 2.4.1** - Full CRUD
- [ ] **Task 2.4.2** - GET `/api/teachers/[id]/schedule` - Teaching schedule

### 2.5 Structure API (`/api/structure`)
- [ ] **Task 2.5.1** - Faculty CRUD
- [ ] **Task 2.5.2** - Department CRUD
- [ ] **Task 2.5.3** - Program CRUD (with LMD cycle)
- [ ] **Task 2.5.4** - Level/Semester/UE/ECUE CRUD

**Deliverable:** All core CRUD APIs functional with auth + validation

---

## PHASE 3: DOCUMENT GENERATION & PDF SYSTEM (Week 2-3)

### 3.1 PDF Generation Setup
- [ ] **Task 3.1.1** - Install `@react-pdf/renderer` + `qrcode` + `pdfkit`
- [ ] **Task 3.1.2** - Create PDF template system (`src/lib/pdf/`)
- [ ] **Task 3.1.3** - Create base `DocumentTemplate` component
- [ ] **Task 3.1.4** - Add QR code generation with verification URL

### 3.2 Document Templates (8 types)
| Template | File | Data Source |
|----------|------|-------------|
| Relevé de notes | `ReleveNotesPDF.tsx` | Grades API + Student |
| Attestation d'inscription | `AttestationInscriptionPDF.tsx` | Student + Program |
| Certificat de scolarité | `CertificatScolaritePDF.tsx` | Student + AcademicYear |
| Attestation de réussite | `AttestationReussitePDF.tsx` | Deliberation + Student |
| Carte étudiant | `CarteEtudiantPDF.tsx` | Student + Photo + QR |
| Reçu de paiement | `RecuPaiementPDF.tsx` | Payment + Student |
| PV de délibération | `PVDeliberationPDF.tsx` | Deliberation + Jury |
| Attestation de stage | `AttestationStagePDF.tsx` | Internship + Student |

### 3.3 Document API (`/api/documents`)
- [ ] **Task 3.3.1** - POST `/api/documents/generate` - Generate & store document
- [ ] **Task 3.3.2** - GET `/api/documents/[id]/pdf` - Stream PDF
- [ ] **Task 3.3.3** - GET `/api/documents/[id]/preview` - HTML preview
- [ ] **Task 3.3.4** - PUT `/api/documents/[id]/sign` - Digital signature
- [ ] **Task 3.3.5** - GET `/api/documents/verify/[code]` - Public verification

### 3.4 Document Verification Page
- [ ] **Task 3.4.1** - Connect verify-page.tsx to real API
- [ ] **Task 3.4.2** - QR code scanner (camera API)
- [ ] **Task 3.4.3** - Public verification endpoint (no auth)

**Deliverable:** All 8 document types generate PDFs, QR verification works

---

## PHASE 4: DELIBERATION & ACADEMIC WORKFLOWS (Week 3)

### 4.1 Deliberation API (`/api/deliberation`)
- [ ] **Task 4.1.1** - POST: Create jury session
- [ ] **Task 4.1.2** - POST: Submit decisions (ADMI, AJOURNE, REDOUBLANT, EXCLU, ADMI_DETTE, COMPENSE)
- [ ] **Task 4.1.3** - GET: Results per student/program
- [ ] **Task 4.1.4** - POST: Generate PV (Procès-Verbal) PDF
- [ ] **Task 4.1.5** - LMD Compensation rules engine

### 4.2 Inscription Pédagogique API (`/api/inscription-pedagogique`)
- [ ] **Task 4.2.1** - Student course registration
- [ ] **Task 4.2.2** - Prerequisite validation
- [ ] **Task 4.2.3** - Credit limit enforcement

### 4.3 Exam Scheduling API (`/api/exam-scheduling`)
- [ ] **Task 4.3.1** - Create exam sessions
- [ ] **Task 4.3.2** - Room assignment
- [ ] **Task 4.3.3** - Conflict detection

**Deliverable:** Full deliberation workflow with PV generation

---

## PHASE 5: MOBILE MONEY & PAYMENT INTEGRATION (Week 3-4)

### 5.1 Mobile Money Providers
- [ ] **Task 5.1.1** - Airtel Money API integration
- [ ] **Task 5.1.2** - Orange Money API integration
- [ ] **Task 5.1.3** - MTN MoMo API integration
- [ ] **Task 5.1.4** - Moov Money API integration
- [ ] **Task 5.1.5** - Unified payment interface

### 5.2 Payment Flow
- [ ] **Task 5.2.1** - Initiate payment → return transaction ref
- [ ] **Task 5.2.2** - Webhook handlers for each provider
- [ ] **Task 5.2.3** - Payment status polling
- [ ] **Task 5.2.4** - Receipt generation on validation
- [ ] **Task 5.2.5** - Refund handling

### 5.3 Fee Structure Management
- [ ] **Task 5.3.1** - Dynamic fee structures per program/level
- [ ] **Task 5.3.2** - Installment plans
- [ ] **Task 5.3.3** - Scholarship/discount application

**Deliverable:** End-to-end mobile money payments with receipts

---

## PHASE 6: REMAINING MODULES (Week 4-5)

### 6.1 Attendance API (`/api/attendance`)
- [ ] Session CRUD, marking, reports

### 6.2 Internships API (`/api/internships`)
- [ ] Convention, supervision, evaluation

### 6.3 Scholarships API (`/api/scholarships`)
- [ ] Application, selection, disbursement

### 6.4 HR API (`/api/hr`)
- [ ] Staff, contracts, payroll, leave

### 6.5 Communications API (`/api/communications`)
- [ ] Announcements, messaging, notifications

### 6.6 Alumni API (`/api/alumni`)
- [ ] Graduate tracking, employment survey

### 6.7 Room Booking API (`/api/rooms`)
- [ ] Room CRUD, booking, conflicts

### 6.8 Transport API (`/api/transport`)
- [ ] Routes, vehicles, schedules

### 6.9 Library API (`/api/library`)
- [ ] Books, loans, reservations

### 6.10 Health API (`/api/health`)
- [ ] Medical visits, records, hospitals

### 6.11 Candidature API (`/api/candidature`)
- [ ] Applications, selection, admission

### 6.12 Online Exams API (`/api/online-exams`)
- [ ] Exam creation, delivery, proctoring

### 6.13 Reports API (`/api/reports`)
- [ ] Custom reports, exports, scheduled

### 6.14 Import/Export API (`/api/import-export`)
- [ ] Excel/CSV import, data templates

### 6.15 Settings API (`/api/settings`)
- [ ] Tenant settings, user preferences

**Deliverable:** All 44 views backed by functional APIs

---

## PHASE 7: FRONTEND INTEGRATION (Week 4-5)

### 7.1 Replace Demo Data with API Calls
- [ ] **Task 7.1.1** - Create React Query hooks for each API
- [ ] **Task 7.1.2** - Update DashboardShell to fetch real data
- [ ] **Task 7.1.3** - Update StudentsList + StudentDetail
- [ ] **Task 7.1.4** - Update GradesPage (entry + display)
- [ ] **Task 7.1.5** - Update DeliberationPage
- [ ] **Task 7.1.6** - Update DocumentsPage (generate, preview, download)
- [ ] **Task 7.1.7** - Update PaymentsPage (create, receipt PDF)
- [ ] **Task 7.1.8** - Update VerifyPage (real verification)
- [ ] **Task 7.1.9** - Update SettingsPage (save to API)
- [ ] **Task 7.1.10** - Update all remaining 30+ views

### 7.2 Form Handling & Validation
- [ ] **Task 7.2.1** - React Hook Form + Zod on all forms
- [ ] **Task 7.2.2** - Toast notifications for success/errors
- [ ] **Task 7.2.3** - Loading states & optimistic updates

### 7.3 Real-time Features
- [ ] **Task 7.3.1** - WebSocket for notifications
- [ ] **Task 7.3.2** - Live grade updates
- [ ] **Task 7.3.3** - Payment status updates

**Deliverable:** Fully functional frontend connected to backend

---

## PHASE 8: TESTING, QA & DEPLOYMENT (Week 5-6)

### 8.1 Testing
- [ ] **Task 8.1.1** - Unit tests for auth helpers
- [ ] **Task 8.1.2** - API integration tests
- [ ] **Task 8.1.3** - E2E tests (Playwright): auth, student CRUD, grade entry, payment, document generation
- [ ] **Task 8.1.4** - PDF generation tests

### 8.2 DevOps
- [ ] **Task 8.2.1** - Create `vercel.ts` config
- [ ] **Task 8.2.2** - GitHub Actions CI/CD
- [ ] **Task 8.2.3** - Database migration strategy
- [ ] **Task 8.2.4** - Environment variable management
- [ ] **Task 8.2.5** - Health check endpoint

### 8.3 Monitoring
- [ ] **Task 8.3.1** - Error tracking (Sentry)
- [ ] **Task 8.3.2** - Performance monitoring
- [ ] **Task 8.3.3** - Audit logging

### 8.4 Documentation
- [ ] **Task 8.4.1** - API documentation (OpenAPI/Swagger)
- [ ] **Task 8.4.2** - User guides per role
- [ ] **Task 8.4.3** - Deployment guide

---

## DEPENDENCY GRAPH

```
Phase 1 (Auth) 
    │
    ├─→ Phase 2 (Core APIs) ──→ Phase 7 (Frontend Integration)
    │                              │
    │                              └─→ Phase 8 (Testing/Deploy)
    │
    ├─→ Phase 3 (PDF/Docs) ───────┤
    │                              │
    ├─→ Phase 4 (Deliberation) ───┤
    │                              │
    ├─→ Phase 5 (Payments) ───────┤
    │                              │
    └─→ Phase 6 (Other Modules) ──┘
```

---

## TEAM ALLOCATION (2 Developers)

| Developer | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 |
|-----------|--------|--------|--------|--------|--------|--------|
| **Dev 1** | Phase 1 | Phase 2 | Phase 3 | Phase 6 | Phase 7 | Phase 8 |
| **Dev 2** | Phase 1 | Phase 2 | Phase 4 | Phase 5 | Phase 7 | Phase 8 |

---

## DEFINITION OF DONE

### Per API Route
- [ ] GET/POST/PUT/DELETE implemented
- [ ] Zod validation on all inputs
- [ ] Auth + role checks
- [ ] Error handling with proper codes
- [ ] TypeScript types exported
- [ ] React Query hook created

### Per Frontend View
- [ ] Connected to API (no demo data)
- [ ] Forms validate + submit
- [ ] Loading/error/empty states
- [ ] Toast feedback
- [ ] Role-based UI visibility
- [ ] Responsive design verified

### Per Document Type
- [ ] PDF generates correctly
- [ ] QR code verifiable
- [ ] Digital signature applied
- [ ] Template matches official format
- [ ] Download/preview works

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mobile Money API access denied | Medium | High | Start sandbox applications Week 1; have cash fallback |
| PDF rendering differences | Low | Medium | Test on multiple browsers; use `@react-pdf/renderer` |
| Prisma performance at scale | Low | High | Add indexes; use connection pooling; monitor |
| Auth session issues | Medium | High | Thorough testing; use NextAuth debug mode |
| Scope creep | High | Medium | Strict phase gates; weekly review |

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| PDF Generation Time | < 3s |
| Mobile Money Success Rate | > 95% |
| Document Verification Uptime | 99.9% |
| Test Coverage | > 80% |
| Zero Critical Bugs | At launch |

---

*Implementation Plan v1.0 - 2026-06-07*