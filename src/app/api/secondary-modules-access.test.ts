import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: {} }))

import { POST as createAnnouncement } from './announcements/route'
import { POST as createScholarship } from './scholarships/route'
import { POST as createAlumni } from './alumni/route'
import { POST as createStaff } from './hr/route'
import { POST as createInternship } from './internships/route'
import { POST as createAdvising } from './advising/route'
import { POST as createLibraryResource } from './library/route'
import { POST as createScheduledExam } from './exam-scheduling/route'
import { POST as createTransportEntity } from './transport/route'
import { POST as createCandidature } from './candidature/route'
import { POST as createRoomReservation } from './rooms/route'
import { GET as readStatistics } from './statistics/route'

function request(path: string, method: 'GET' | 'POST' = 'POST') {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? '{}' : undefined,
  })
}

describe('secondary module access control', () => {
  beforeEach(() => {
    authMock.mockReset()
    authMock.mockResolvedValue({
      user: {
        id: 'student-user',
        role: 'ETUDIANT',
        tenantId: 'tenant-A',
        firstName: 'Awa',
        lastName: 'Test',
      },
    })
  })

  it.each([
    ['announcements', createAnnouncement],
    ['scholarships', createScholarship],
    ['alumni', createAlumni],
    ['human resources', createStaff],
    ['internships', createInternship],
    ['advising', createAdvising],
    ['library', createLibraryResource],
    ['exam scheduling', createScheduledExam],
    ['transport', createTransportEntity],
    ['applications', createCandidature],
    ['room reservations', createRoomReservation],
  ])('prevents a student from writing to %s', async (name, handler) => {
    const response = await handler(request(`/api/${name}`))
    expect(response.status).toBe(403)
  })

  it('prevents a student from reading institution-wide statistics', async () => {
    const response = await readStatistics(request('/api/statistics', 'GET'))
    expect(response.status).toBe(403)
  })
})
