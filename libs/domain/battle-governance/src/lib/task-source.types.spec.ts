import {
  TASK_SOURCES,
  TASK_SOURCE_LABEL,
  TASK_SOURCE_DESCRIPTION,
  TASK_SOURCE_HELP_PATH,
  isExperimentalTaskSource,
} from './task-source.types'

describe('task-source.types', () => {
  it('defines exactly 3 task sources', () => {
    expect(TASK_SOURCES).toHaveLength(3)
    expect(TASK_SOURCES).toContain('lens')
    expect(TASK_SOURCES).toContain('workflow')
    expect(TASK_SOURCES).toContain('challenge')
  })

  it('provides labels for every task source', () => {
    for (const source of TASK_SOURCES) {
      expect(TASK_SOURCE_LABEL[source]).toBeTruthy()
    }
  })

  it('provides descriptions for every task source', () => {
    for (const source of TASK_SOURCES) {
      expect(TASK_SOURCE_DESCRIPTION[source]).toBeTruthy()
    }
  })

  it('provides help paths for every task source', () => {
    for (const source of TASK_SOURCES) {
      expect(TASK_SOURCE_HELP_PATH[source]).toMatch(/^\//)
    }
  })

  it('marks challenge as experimental', () => {
    expect(isExperimentalTaskSource('challenge')).toBe(true)
  })

  it('marks lens and workflow as non-experimental', () => {
    expect(isExperimentalTaskSource('lens')).toBe(false)
    expect(isExperimentalTaskSource('workflow')).toBe(false)
  })
})
