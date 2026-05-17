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
      tooltip: {
        summary: 'The GitHub repository to read from.',
        format: 'owner/repo format (e.g. lenserfight-org/lenserfight-web).',
        commonMistakes: 'Using the full URL instead of owner/repo format.',
      },
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
      tooltip: {
        summary: 'The type of GitHub resource to fetch.',
      },
    },
    {
      key: 'number',
      label: 'Issue/PR Number (optional)',
      type: 'number',
      placeholder: 'Leave empty for latest',
      min: 1,
      tooltip: {
        summary: 'The specific issue or PR number to fetch. Fetches the latest if left empty.',
        format: 'Positive integer. Supports {{variable}} interpolation.',
      },
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
      tooltip: {
        summary: 'The URL of the RSS or Atom feed to read.',
        format: 'Full HTTPS URL pointing to a valid XML feed.',
      },
    },
    {
      key: 'maxItems',
      label: 'Max Items',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 50,
      tooltip: {
        summary: 'Maximum number of feed entries to return.',
        format: 'Integer between 1 and 50.',
        executionImpact: 'The feed is fetched in full but output is limited to this count, starting from the most recent.',
      },
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
      tooltip: {
        summary: 'The Notion page ID to read content from.',
        format: 'UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). Found in the page URL.',
        whenRequired: 'Provide either Page ID or Database ID, not both.',
      },
    },
    {
      key: 'databaseId',
      label: 'Database ID (optional)',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      mono: true,
      tooltip: {
        summary: 'The Notion database ID to query. Use with queryFilter to fetch specific rows.',
        format: 'UUID format. Found in the database URL.',
        whenRequired: 'Provide either Page ID or Database ID, not both.',
      },
    },
    {
      key: 'queryFilter',
      label: 'Query Filter (JSON, optional)',
      type: 'json',
      rows: 4,
      placeholder: '{ "property": "Status", "select": { "equals": "Done" } }',
      tooltip: {
        summary: 'A Notion filter object to narrow database query results.',
        format: 'Notion filter API format: { "property": "Status", "select": { "equals": "Done" } }.',
        whenRequired: 'Only applicable when querying a database (databaseId is set).',
      },
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
      key: 'connectorRef',
      label: 'Google Account',
      type: 'connector_ref',
      required: true,
      connectorProvider: 'google',
      connectorCapability: 'sheets',
      tooltip: {
        summary: 'The Google account connection to use for this operation.',
        whenRequired: 'Add a Google Sheets connection in Settings → Connected Accounts.',
      },
    },
    {
      key: 'spreadsheetId',
      label: 'Spreadsheet ID',
      type: 'text',
      required: true,
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      mono: true,
      hint: 'Found in the spreadsheet URL.',
      tooltip: {
        summary: 'The Google Sheets spreadsheet identifier.',
        format: 'The long ID from the spreadsheet URL (between /d/ and /edit).',
      },
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      required: true,
      placeholder: 'Sheet1!A1:D10',
      mono: true,
      tooltip: {
        summary: 'The cell range to read from the spreadsheet.',
        format: 'A1 notation: SheetName!StartCell:EndCell (e.g. Sheet1!A1:D10).',
        commonMistakes: 'Omitting the sheet name, which defaults to the first sheet. Using column-only ranges (A:D) returns all rows.',
      },
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
      key: 'connectorRef',
      label: 'Google Account',
      type: 'connector_ref',
      required: true,
      connectorProvider: 'google',
      connectorCapability: 'sheets',
      tooltip: {
        summary: 'The Google account connection to use for this operation.',
        whenRequired: 'Add a Google Sheets connection in Settings → Connected Accounts.',
      },
    },
    {
      key: 'spreadsheetId',
      label: 'Spreadsheet ID',
      type: 'text',
      required: true,
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
      mono: true,
      tooltip: {
        summary: 'The Google Sheets spreadsheet identifier to write to.',
        format: 'The long ID from the spreadsheet URL (between /d/ and /edit).',
      },
    },
    {
      key: 'range',
      label: 'Range',
      type: 'text',
      required: true,
      placeholder: 'Sheet1!A1:D10',
      mono: true,
      tooltip: {
        summary: 'The cell range to write data into.',
        format: 'A1 notation: SheetName!StartCell:EndCell (e.g. Sheet1!A1:D10).',
        executionImpact: 'In append mode, data is added after the last row in the range. In overwrite mode, existing cells are replaced.',
      },
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
      tooltip: {
        summary: 'Whether to add data after existing rows (Append) or replace the specified range (Overwrite).',
        executionImpact: 'Overwrite permanently replaces cell values in the range. Append is non-destructive.',
      },
    },
  ],
  outputFields: [
    { key: 'written', type: 'boolean', description: 'Whether write succeeded' },
    { key: 'updatedRows', type: 'number', description: 'Number of rows affected' },
  ],
}
