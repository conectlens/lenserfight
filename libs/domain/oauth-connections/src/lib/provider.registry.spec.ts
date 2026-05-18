import { describe, expect, it } from 'vitest'
import {
  getOAuthCapabilityDefinition,
  getOAuthProvider,
  listOAuthProviders,
} from './provider.registry'

describe('connector provider registry', () => {
  it('registers the connector expansion providers', () => {
    const providers = listOAuthProviders()
    expect(providers.length).toBeGreaterThanOrEqual(25)
    expect(providers.map((provider) => provider.provider)).toEqual(expect.arrayContaining([
      'notion',
      'google',
      'asana',
      'monday',
      'zapier',
      'slack',
      'github',
      'gitlab',
      'jira',
      'linear',
      'trello',
      'airtable',
      'hubspot',
      'salesforce',
      'discord',
      'microsoft_teams',
      'microsoft_outlook',
      'microsoft_onedrive',
      'microsoft_excel',
      'dropbox',
      'box',
      'calendly',
      'clickup',
      'todoist',
      'custom_http',
    ]))
  })

  it('marks priority runtime providers as experimental or available', () => {
    for (const provider of ['notion', 'asana', 'monday', 'zapier', 'slack', 'github', 'jira', 'linear', 'custom_http'] as const) {
      expect(getOAuthProvider(provider).availability).toMatch(/available|experimental/)
    }
    expect(getOAuthCapabilityDefinition('google', 'sheets')?.supportedOperations).toEqual(
      expect.arrayContaining(['read_range', 'append_row', 'update_range']),
    )
  })
})
