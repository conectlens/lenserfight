import { mapProfileToAuthProfileGate } from './lenserRepository'

describe('mapProfileToAuthProfileGate', () => {
  it('maps active profiles to active', () => {
    expect(
      mapProfileToAuthProfileGate({ status: 'active', deletion_requested_at: null })
    ).toEqual({ kind: 'active', status: 'active' })
  })

  it('maps missing profile rows to new', () => {
    expect(mapProfileToAuthProfileGate(null)).toEqual({ kind: 'new' })
  })

  it('maps recoverable profiles before restore', () => {
    expect(
      mapProfileToAuthProfileGate({
        status: 'pending_deletion',
        deletion_requested_at: '2026-03-19T10:00:00.000Z',
        deletion_deadline_at: '2026-04-18T10:00:00.000Z',
      })
    ).toEqual({
      kind: 'recoverable',
      status: 'pending_deletion',
      deletionDeadlineAt: '2026-04-18T10:00:00.000Z',
    })
  })

  it('maps deleted profiles to deleted', () => {
    expect(
      mapProfileToAuthProfileGate({ status: 'deleted', deletion_requested_at: null })
    ).toEqual({ kind: 'deleted', status: 'deleted', deletionDeadlineAt: null })
  })

  it('maps deactivated profiles to recoverable', () => {
    expect(
      mapProfileToAuthProfileGate({ status: 'deactivated', deletion_requested_at: null })
    ).toEqual({ kind: 'recoverable', status: 'deactivated', deletionDeadlineAt: null })
  })

  it('maps active profiles with stale deletion flags to recoverable', () => {
    expect(
      mapProfileToAuthProfileGate({
        status: 'active',
        deletion_requested_at: '2026-03-19T10:00:00.000Z',
        deletion_deadline_at: '2026-04-18T10:00:00.000Z',
      })
    ).toEqual({
      kind: 'recoverable',
      status: 'active',
      deletionDeadlineAt: '2026-04-18T10:00:00.000Z',
    })
  })
})
