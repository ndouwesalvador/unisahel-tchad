import { describe, expect, it } from 'vitest'
import { createJuryMemberDrafts } from './jury'

describe('jury member drafts', () => {
  it('turns the scoped jury suggestions into an editable composition for the selected session', () => {
    expect(createJuryMemberDrafts('delib-A', [
      { userId: 'jury-A', name: 'Amina Mahamat', role: 'President' },
      { userId: 'jury-B', name: 'Ali Saleh', role: 'Membre' },
    ])).toEqual([
      { id: 'delib-A-0', name: 'Amina Mahamat', role: 'President' },
      { id: 'delib-A-1', name: 'Ali Saleh', role: 'Membre' },
    ])
  })

  it('rejects an invalid suggestion without exactly one president', () => {
    expect(createJuryMemberDrafts('delib-A', [{ name: 'Ali Saleh', role: 'Membre' }])).toEqual([])
  })
})
