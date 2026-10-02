import { describe, expect, it } from 'vitest'
import { nextServiceStatus } from './teaching-service'

describe('annual teaching-service decisions', () => {
  it('requires home approval before central arbitration', () => {
    expect(nextServiceStatus('PENDING_HOME', 'CENTRAL_APPROVE')).toBeNull()
    expect(nextServiceStatus('PENDING_HOME', 'HOME_APPROVE')).toBe('PENDING_CENTRAL')
    expect(nextServiceStatus('PENDING_CENTRAL', 'CENTRAL_APPROVE')).toBe('APPROVED')
  })
  it('allows rejection at either review stage and freezes final decisions', () => {
    expect(nextServiceStatus('PENDING_HOME', 'HOME_REJECT')).toBe('REJECTED')
    expect(nextServiceStatus('PENDING_CENTRAL', 'CENTRAL_REJECT')).toBe('REJECTED')
    expect(nextServiceStatus('APPROVED', 'HOME_REJECT')).toBeNull()
    expect(nextServiceStatus('REJECTED', 'CENTRAL_APPROVE')).toBeNull()
  })
})
