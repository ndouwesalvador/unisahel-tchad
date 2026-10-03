import { describe, expect, it } from 'vitest'
import { createProgramSchema } from './api'

describe('createProgramSchema', () => {
  it('accepts a one-year university diploma without relabeling it as a DUT or licence', () => {
    const program = createProgramSchema.parse({
      facultyId: 'cfaculty0000000000000001',
      departmentId: 'cdepartment000000000001',
      name: 'Diplôme universitaire de maintenance numérique',
      code: 'DU-MN',
      cycle: 'DU',
      diplomaType: 'Diplôme universitaire de maintenance numérique',
      duration: 1,
      creditsPerYear: 60,
    })
    expect(program).toMatchObject({ cycle: 'DU', duration: 1, creditsPerYear: 60 })
  })
})
