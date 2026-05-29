import { isFileWorkspaceCommand, FILE_WORKSPACE_COMMANDS } from './runtime-backends'

describe('runtime-backends', () => {
  it('lists file-workspace commands', () => {
    expect(FILE_WORKSPACE_COMMANDS.has('validate')).toBe(true)
    expect(FILE_WORKSPACE_COMMANDS.has('import')).toBe(true)
  })

  it('isFileWorkspaceCommand identifies validate', () => {
    expect(isFileWorkspaceCommand('validate')).toBe(true)
    expect(isFileWorkspaceCommand('battle')).toBe(false)
  })
})
