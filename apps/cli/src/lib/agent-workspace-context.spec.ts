import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

jest.mock('../config/project-config', () => ({
  getUserPreferencesPath: jest.fn(),
}))

import { getUserPreferencesPath } from '../config/project-config'
import {
  clearAgentWorkspaceContext,
  getAgentWorkspaceContext,
  resolveAgentIdentifier,
  setAgentWorkspaceContext,
  _resetAgentWorkspaceContextForTest,
} from './agent-workspace-context'

const mockPrefsPath = getUserPreferencesPath as jest.MockedFunction<typeof getUserPreferencesPath>

describe('agent-workspace-context', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lf-agent-ws-'))
    mockPrefsPath.mockReturnValue(join(dir, 'preferences.json'))
    _resetAgentWorkspaceContextForTest()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns null when no agent is selected', () => {
    expect(getAgentWorkspaceContext()).toBeNull()
    expect(resolveAgentIdentifier()).toBeNull()
  })

  it('persists and reads the selected agent workspace', () => {
    setAgentWorkspaceContext({
      aiLenserId: 'agent-1',
      handle: 'research-bot',
      displayName: 'Research Bot',
    })

    const ctx = getAgentWorkspaceContext()
    expect(ctx?.aiLenserId).toBe('agent-1')
    expect(ctx?.handle).toBe('research-bot')
    expect(resolveAgentIdentifier()).toBe('agent-1')
    expect(resolveAgentIdentifier('override')).toBe('override')
  })

  it('clears the workspace selection', () => {
    setAgentWorkspaceContext({
      aiLenserId: 'agent-1',
      handle: 'bot',
      displayName: 'Bot',
    })
    clearAgentWorkspaceContext()
    expect(getAgentWorkspaceContext()).toBeNull()
  })
})
