export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET must be set in production')
  }
  return 'dev-only-insecure-secret-do-not-use-in-production'
}
