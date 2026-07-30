import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'
import { paymentQuerySchema, createPaymentSchema, updatePaymentSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'
import { Prisma } from '@prisma/client'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

async function getPaymentsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(paymentQuerySchema, searchParams)

    const ownStudentId = await resolveOwnStudentId(user)
    if (ownStudentId && validatedQuery.studentId && validatedQuery.studentId !== ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { academicYearId, status, paymentMethod, startDate, endDate, page, limit } = validatedQuery
    const studentId = ownStudentId ?? validatedQuery.studentId
    const skip = (page - 1) * limit

    const where: Prisma.PaymentWhereInput = {
      tenantId,
    }

    if (studentId) {
      where.studentId = studentId
    }

    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    if (status) {
      where.status = status
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              email: true,
              currentProgram: { select: { name: true, code: true } },
              currentLevel: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.payment.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function createPaymentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createPaymentSchema, body)

    // Verify student belongs to tenant
    const student = await db.student.findFirst({ where: { id: validatedBody.studentId, tenantId } })
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found in this tenant' },
        { status: 404 }
      )
    }

    // Verify academic year belongs to tenant
    const academicYear = await db.academicYear.findFirst({ where: { id: validatedBody.academicYearId, tenantId } })
    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found in this tenant' },
        { status: 404 }
      )
    }

    // Verify fee structure if provided
    if (validatedBody.feeStructureId) {
      const feeStructure = await db.feeStructure.findFirst({ where: { id: validatedBody.feeStructureId, tenantId } })
      if (!feeStructure) {
        return NextResponse.json(
          { error: 'Fee structure not found in this tenant' },
          { status: 404 }
        )
      }
    }

    // Generate receipt number if not provided
    let receiptNumber = validatedBody.receiptNumber
    if (!receiptNumber) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
      const prefix = settings?.receiptPrefix || 'REC'
      const year = new Date().getFullYear()
      const count = await db.payment.count({ where: { tenantId } })
      const seq = String(count + 1).padStart(6, '0')
      receiptNumber = `${prefix}-${year}-${seq}`
    }

    // Check receipt number uniqueness
    const existingReceipt = await db.payment.findFirst({ where: { receiptNumber, tenantId } })
    if (existingReceipt) {
      return NextResponse.json(
        { error: 'Receipt number already exists' },
        { status: 409 }
      )
    }

    // If payment is VALIDATED, set validation date and validated by
    const paymentData: Prisma.PaymentCreateInput = {
      ...validatedBody,
      receiptNumber,
      tenantId,
      student: { connect: { id: validatedBody.studentId } },
      academicYearId: validatedBody.academicYearId,
      validatedBy: validatedBody.status === 'VALIDATED' ? user.id : undefined,
      validationDate: validatedBody.status === 'VALIDATED' ? new Date() : undefined,
    }

    // createPaymentSchema accepts `description` and `mobileMoneyPhone` for the
    // UI, but the Payment model stores the note as `comment` and has no phone
    // column. Map/drop them so Prisma doesn't reject unknown arguments -- this
    // is what broke every payment where the cashier filled the Description
    // field or a Mobile Money phone.
    if ((paymentData as any).description !== undefined) {
      paymentData.comment = (paymentData as any).description
    }
    delete (paymentData as any).description
    delete (paymentData as any).mobileMoneyPhone

    // Remove fields not in Prisma model
    delete (paymentData as any).feeStructureId
    delete (paymentData as any).studentId
    delete (paymentData as any).academicYear

    const payment = await db.payment.create({
      data: paymentData,
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            email: true,
            currentProgram: { select: { name: true, code: true } },
            currentLevel: { select: { name: true, code: true } },
          },
        },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ receiptNumber: payment.receiptNumber, amount: payment.amount, studentId: payment.studentId }),
      },
    })

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    console.error('Create payment error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function updatePaymentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(updatePaymentSchema, body)
    // `description` maps to the model's `comment`; `mobileMoneyPhone` and
    // `feeStructureId` have no column -- keep them out of the Prisma update.
    const { id, validationDate, feeStructureId, description, mobileMoneyPhone, ...data } = validatedBody

    // Verify payment belongs to tenant
    const existing = await db.payment.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Prisma.PaymentUpdateInput = {
      ...data,
      ...(description !== undefined ? { comment: description } : {}),
    }

    // If status is changing to VALIDATED, set validation date and validated by
    if (data.status === 'VALIDATED' && existing.status !== 'VALIDATED') {
      updateData.validatedBy = user.id
      updateData.validationDate = new Date()
    } else if (validationDate) {
      updateData.validationDate = new Date(validationDate)
    }

    const payment = await db.payment.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            email: true,
            currentProgram: { select: { name: true, code: true } },
            currentLevel: { select: { name: true, code: true } },
          },
        },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ receiptNumber: payment.receiptNumber, amount: payment.amount, status: payment.status }),
      },
    })

    // Payment just transitioned to VALIDATED - notify the tenant team and,
    // best-effort, email the student a receipt. Neither ever fails the update itself.
    if (data.status === 'VALIDATED' && existing.status !== 'VALIDATED') {
      const amountLabel = `${payment.amount.toLocaleString('fr-FR')} ${payment.currency}`

      await createNotification(tenantId, {
        type: 'success',
        category: 'Paiement',
        title: `Paiement validé - ${amountLabel}`,
        description: `${payment.student.firstName} ${payment.student.lastName} - Reçu N° ${payment.receiptNumber}`,
        link: `/dashboard/payments?paymentId=${payment.id}`,
      })

      if (payment.student?.email) {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: payment.student.email,
          subject: `Reçu de paiement ${payment.receiptNumber}`,
          html: `
            <p>Bonjour ${payment.student.firstName},</p>
            <p>Votre paiement a été validé.</p>
            <ul>
              <li>Reçu N° : ${payment.receiptNumber}</li>
              <li>Montant : ${amountLabel}</li>
              <li>Date de validation : ${new Date().toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>— UniSahel</p>
          `,
        })
      }
    }

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Update payment error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function deletePaymentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Verify payment belongs to tenant
    const existing = await db.payment.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Soft delete - change status to CANCELLED
    const payment = await db.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'DELETE',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ receiptNumber: payment.receiptNumber, amount: payment.amount }),
      },
    })

    return NextResponse.json({ data: { id: payment.id, status: payment.status } })
  } catch (error) {
    console.error('Delete payment error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getPaymentReceiptHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    const ownStudentId = await resolveOwnStudentId(user)
    const payment = await db.payment.findFirst({
      where: ownStudentId ? { id, tenantId, studentId: ownStudentId } : { id, tenantId },
      include: {
        student: {
          include: {
            currentProgram: { select: { id: true, name: true, code: true } },
            currentLevel: { select: { id: true, name: true, code: true } },
            tenant: { select: { name: true, shortName: true, logo: true, address: true, city: true, phone: true, email: true, rectorName: true, rectorTitle: true } },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Get fee structures for this student's program/level if available
    const feeStructures = await db.feeStructure.findMany({
      where: {
        tenantId,
        OR: [
          { programId: payment.student.currentProgramId || undefined },
          { levelId: payment.student.currentLevelId || undefined },
        ],
      },
    })

    return NextResponse.json({
      data: {
        payment,
        feeStructures,
        tenant: payment.student.tenant,
      },
    })
  } catch (error) {
    console.error('Get payment receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment receipt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getPaymentStatsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.PaymentWhereInput = { tenantId }

    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [totalAmount, validatedAmount, pendingAmount, cancelledAmount, countByStatus, countByMethod] = await Promise.all([
      db.payment.aggregate({ where, _sum: { amount: true } }),
      db.payment.aggregate({ where: { ...where, status: 'VALIDATED' }, _sum: { amount: true } }),
      db.payment.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true } }),
      db.payment.aggregate({ where: { ...where, status: 'CANCELLED' }, _sum: { amount: true } }),
      db.payment.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { amount: true } }),
      db.payment.groupBy({ by: ['paymentMethod'], where, _count: { id: true }, _sum: { amount: true } }),
    ])

    const recentPayments = await db.payment.findMany({
      where,
      include: {
        student: { select: { matricule: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      data: {
        summary: {
          totalAmount: totalAmount._sum.amount || 0,
          validatedAmount: validatedAmount._sum.amount || 0,
          pendingAmount: pendingAmount._sum.amount || 0,
          cancelledAmount: cancelledAmount._sum.amount || 0,
        },
        byStatus: countByStatus.map(s => ({
          status: s.status,
          count: s._count.id,
          amount: s._sum.amount || 0,
        })),
        byMethod: countByMethod.map(m => ({
          method: m.paymentMethod,
          count: m._count.id,
          amount: m._sum.amount || 0,
        })),
        recentPayments,
      },
    })
  } catch (error) {
    console.error('Get payment stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment statistics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ========================================
// Mobile Money Helpers
// ========================================

// Sends a real reminder for a pending payment: an email to the student (if an
// address is on file) plus a tenant audit-trail notification. There is no
// per-user notification target in the schema, so this cannot page just the
// student in-app - the email is the only channel that actually reaches them.
async function remindPaymentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId } = body
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
    }

    const payment = await db.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { student: { select: { firstName: true, lastName: true, email: true } } },
    })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Ce paiement n\'est pas en attente' }, { status: 409 })
    }

    const studentName = `${payment.student.firstName} ${payment.student.lastName}`
    let emailSent = false
    if (payment.student.email) {
      const result = await sendEmail({
        to: payment.student.email,
        subject: 'Rappel de paiement en attente',
        html: `<p>Bonjour ${payment.student.firstName},</p><p>Votre paiement de <strong>${payment.amount.toLocaleString('fr-FR')} ${payment.currency}</strong> est toujours en attente de validation. Merci de finaliser ce paiement ou de contacter la caisse pour toute question.</p>`,
      })
      emailSent = result.success
    }

    await createNotification(tenantId, {
      type: 'warning',
      category: 'Paiement',
      title: 'Relance de paiement envoyee',
      description: `Relance envoyee a ${studentName} pour un paiement de ${payment.amount.toLocaleString('fr-FR')} ${payment.currency} en attente${emailSent ? '' : ' (email non envoye - adresse manquante ou non configuree)'}.`,
    })

    return NextResponse.json({ ok: true, emailSent })
  } catch (error) {
    console.error('Remind payment error:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}

// No Mobile Money provider (Airtel/Orange/MTN/Moov) is configured yet - there
// are no API credentials for any of them. Rather than faking a successful
// initiation (which used to silently flip the payment to PENDING with a
// fabricated transaction reference), these endpoints report the real state:
// not available yet. Wire up a real provider here once credentials exist.
async function initiateMobileMoneyPayment(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, provider, phoneNumber } = body

    if (!paymentId || !provider || !phoneNumber) {
      return NextResponse.json(
        { error: 'paymentId, provider, and phoneNumber are required' },
        { status: 400 }
      )
    }

    const payment = await db.payment.findFirst({ where: { id: paymentId, tenantId } })
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'MOBILE_MONEY_NOT_CONFIGURED',
        message: `L'intégration ${provider} Money n'est pas encore disponible. Enregistrez ce paiement manuellement en attendant.`,
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Mobile money initiate error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate mobile money payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function checkMobileMoneyStatus(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // The GET dispatcher below routes here based on `id` + mobileMoneyStatus=true
    // (see `export const GET`) - must read the same param name, not `paymentId`.
    const paymentId = searchParams.get('id')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const ownStudentId = await resolveOwnStudentId(user)
    const payment = await db.payment.findFirst({
      where: ownStudentId ? { id: paymentId, tenantId, studentId: ownStudentId } : { id: paymentId, tenantId },
    })
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'MOBILE_MONEY_NOT_CONFIGURED',
        message: "L'intégration Mobile Money n'est pas encore disponible.",
      },
      { status: 501 }
    )
  } catch (error) {
    console.error('Mobile money status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check mobile money status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function mobileMoneyWebhookHandler(tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    // This is a generic webhook handler for mobile money callbacks
    // In production, verify signature and process based on provider

    const { transactionRef, status, provider, phoneNumber, amount } = body

    if (!transactionRef) {
      return NextResponse.json({ error: 'transactionRef is required' }, { status: 400 })
    }

    const payment = await db.payment.findFirst({
      where: { transactionRef, tenantId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    let newStatus = payment.status
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      newStatus = 'VALIDATED'
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      newStatus = 'CANCELLED'
    }

    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        validatedBy: newStatus === 'VALIDATED' ? 'MOBILE_MONEY_WEBHOOK' : undefined,
        validationDate: newStatus === 'VALIDATED' ? new Date() : undefined,
        comment: `Webhook ${provider}: ${JSON.stringify(body)}`,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: 'MOBILE_MONEY_WEBHOOK',
        action: 'MOBILE_MONEY_WEBHOOK',
        entity: 'Payment',
        entityId: payment.id,
        details: JSON.stringify({ provider, status, newStatus, body }),
      },
    })

    return NextResponse.json({ data: updatedPayment })
  } catch (error) {
    console.error('Mobile money webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const receipt = searchParams.get('receipt')
  const stats = searchParams.get('stats')

  if (stats === 'true') {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    return getPaymentStatsHandler(user, tenantId, request)
  }
  if (id && receipt === 'true') {
    return getPaymentReceiptHandler(user, tenantId, request)
  }
  if (id && searchParams.get('mobileMoneyStatus') === 'true') {
    return checkMobileMoneyStatus(user, tenantId, request)
  }
  return getPaymentsHandler(user, tenantId, request)
})

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'mobile-money-initiate') {
    return initiateMobileMoneyPayment(user, tenantId, request)
  }
  if (action === 'mobile-money-webhook') {
    return mobileMoneyWebhookHandler(tenantId, request)
  }
  if (action === 'remind') {
    return remindPaymentHandler(user, tenantId, request)
  }
  return createPaymentHandler(user, tenantId, request)
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'CAISSE', 'SCOLARITE'])

export const PUT = withTenantAuth(updatePaymentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'CAISSE', 'SCOLARITE'])

export const DELETE = withTenantAuth(deletePaymentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'CAISSE'])