import { AUTOMATION_OBJECT_KINDS, PERMISSION_LEVELS } from './automation-objects.types'

describe('automation object types', () => {
  it('includes the canonical automation object kinds', () => {
    expect(AUTOMATION_OBJECT_KINDS).toContain('lens')
    expect(AUTOMATION_OBJECT_KINDS).toContain('lenser')
    expect(AUTOMATION_OBJECT_KINDS).toContain('colens')
    expect(AUTOMATION_OBJECT_KINDS).toContain('battle')
    expect(AUTOMATION_OBJECT_KINDS).toContain('team')
    expect(AUTOMATION_OBJECT_KINDS).toContain('agent')
    expect(AUTOMATION_OBJECT_KINDS).toContain('workflow')
    expect(AUTOMATION_OBJECT_KINDS).toContain('private_battle')
  })

  it('includes the expected permission levels', () => {
    expect(PERMISSION_LEVELS).toContain('draft')
    expect(PERMISSION_LEVELS).toContain('external_action')
  })
})
