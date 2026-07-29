const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'

// Generates a random temporary password for a freshly-provisioned account
// (tenant admin, staff). The account is created with mustChangePassword:
// true, so this value is only ever shown once, right after creation.
export function generateTempPassword(length = 14): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return out
}
