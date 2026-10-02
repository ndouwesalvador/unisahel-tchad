export type ServiceStatus = 'PENDING_HOME' | 'PENDING_CENTRAL' | 'APPROVED' | 'REJECTED'
export type ServiceAction = 'HOME_APPROVE' | 'HOME_REJECT' | 'CENTRAL_APPROVE' | 'CENTRAL_REJECT'

export function nextServiceStatus(status: ServiceStatus, action: ServiceAction): ServiceStatus | null {
  if (status === 'PENDING_HOME') {
    if (action === 'HOME_APPROVE') return 'PENDING_CENTRAL'
    if (action === 'HOME_REJECT') return 'REJECTED'
  }
  if (status === 'PENDING_CENTRAL') {
    if (action === 'CENTRAL_APPROVE') return 'APPROVED'
    if (action === 'CENTRAL_REJECT') return 'REJECTED'
  }
  return null
}
