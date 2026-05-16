/**
 * CQ — Integration node config descriptors.
 *
 * Covers: github_read, rss_feed, notion_read, google_sheets_read, google_sheets_write.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const githubReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'github_read',
  displayName: 'GitHub Read',
  category: 'integration',
  fields: [
    {
      key: 'repo',
      label: 'Repository (owner/repo)',
      type: 'text',
      required: true,
      placeholder: 'lenserfight-org/lenserfight-web',
      mono: true,
    },
    {
      key: 'resourceType',
      label: 'Resource Type',
      type: 'select',
      defaultValue: 'issue',
      options: [
        { value: 'issue', label: 'Issue' },
        { value: 'pull_request', label: 'Pull Request' },
        { value: 'release', label: 'Release' },
      ],
    },
    {
      key: 'number',
      label: 'Issue/PR Number (optional)',
      type: 'number',
      placeholder: 'Leave empty for latest',
      min: 1,
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'GitHub resource data' },
  ],
}

export const rssFeedDescriptor: RunnerConfigDescriptor = {
  nodeType: 'rss_feed',
  displayName: 'RSS Feed',
  category: 'integration',
  fields: [
    {
      key: 'feedUrl',
      label: 'Feed URL',
      type: 'text',
      required: true,
      placeholder: 'https://example.com/feed.xml',
    },
    {
      key: 'maxItems',
      label: 'Max Items',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 50,
    },
  ],
  outputFields: [
    { key: 'items', type: 'array', description: 'Feed entries' },
    { key: 'count', type: 'number', description: 'Number of items returned' },
  ],
}

export const notionReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'notion_read',
  displayName: 'Notion Read',
  category: 'integration',
  fields: [
    {
      key: 'pageId',
      label: 'Page ID (optional)',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      mono: true,
      hint: 'Provide either Page ID or Database ID.',
    },
    {
      key: 'databaseId',
      label: 'Database ID (optional)',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      mono: true,
    },
    {
      key: 'queryFilter',
      label: 'Query Filter (JSON, optional)',
      type: 'json',
      rows: 4,
      placeholder: '{ "property": "Status", "select": { "equals": "Done" } }',
    },
  ],
  validate: (values) => {
    const errors: Record<string, string> = {}
    if (!values['pageId'] && !values['databaseId']) {
      errors['pageId'] = 'Either Page ID or Database ID is required'
    }
    return errors
  },
  outputFields: [
    { key: 'data', type: 'object', description: 'Notion page or database content' },
  ],
}

export const googleSheetsReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'google_sheets_read',
  displayName: 'Google Sheets Read',
  category: 'integration',
  fields: [
    {
      key: 'spreadsheetId',
      label: 'Spreadsheet ID',
      type: 'text',
      required: true,
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      mono: true,
      hint: 'Found in the spreadsheet URL.',
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      required: true,
      placeholder: 'Sheet1!A1:D10',
      mono: true,
    },
  ],
  outputFields: [
    { key: 'rows', type: 'array', description: 'Spreadsheet rows' },
    { key: 'count', type: 'number', description: 'Number of rows' },
  ],
}

export const googleSheetsWriteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'google_sheets_write',
  displayName: 'Google Sheets Write',
  category: 'integration',
  fields: [
    {
      key: 'spreadsheetId',
      label: 'Spreadsheet ID',
      type: 'text',
      required: true,
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      mono: true,
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      required: true,
      placeholder: 'Sheet1!A1:D10',
      mono: true,
    },
    {
      key: 'mode',
      label: 'Write Mode',
      type: 'select',
      defaultValue: 'append',
      options: [
        { value: 'append', label: 'Append' },
        { value: 'overwrite', label: 'Overwrite' },
      ],
    },
  ],
  outputFields: [
    { key: 'written', type: 'boolean', description: 'Whether write succeeded' },
    { key: 'updatedRows', type: 'number', description: 'Number of rows affected' },
  ],
}
