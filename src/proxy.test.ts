import { describe, expect, it } from 'vitest'
import { isPublicPath } from './proxy'

describe('public authentication routes', () => {
  it.each(['/', '/login', '/student-login', '/signup'])('allows %s without a session', (path) => {
    expect(isPublicPath(path)).toBe(true)
  })

  it('keeps application pages protected', () => {
    expect(isPublicPath('/dashboard')).toBe(false)
  })
})
