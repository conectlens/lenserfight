jest.mock('../config/project-config', () => ({
  getEffectiveMode: jest.fn(),
}))

import { getEffectiveMode } from '../config/project-config'
import { assertSupabaseLocalForSync } from '../lib/workspace-sync'

const mockGetEffectiveMode = getEffectiveMode as jest.MockedFunction<typeof getEffectiveMode>

describe('sync mode guard', () => {
  it('assertSupabaseLocalForSync rejects cloud effective mode', () => {
    mockGetEffectiveMode.mockReturnValue({ mode: 'cloud', source: 'default' })
    expect(() => assertSupabaseLocalForSync()).toThrow(/Supabase local/)
  })

  it('assertSupabaseLocalForSync passes when mode is local', () => {
    mockGetEffectiveMode.mockReturnValue({ mode: 'local', source: 'project' })
    expect(() => assertSupabaseLocalForSync()).not.toThrow()
  })
})
