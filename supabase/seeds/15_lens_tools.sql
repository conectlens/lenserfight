-- =============================================================================
-- 15. LENS TOOLS (lenses.tools seed — "lenses" theme)
-- =============================================================================
-- These rows are the canonical tool definitions for lens parameter types.
-- ON CONFLICT (key) DO NOTHING ensures idempotency across reseeds.
-- =============================================================================

INSERT INTO lenses.tools (
  key, label, description, category, type,
  required, min_length, max_length,
  placeholder, help_text,
  sort_order, is_system, icon, color
) VALUES
  (
    'text',
    'Short Text',
    'A single-line text input for short values like names, titles, or keywords.',
    'input', 'text',
    true, 1, 500,
    'Enter text...',
    'A brief single-line text value.',
    0, true, 'type', '#6366f1'
  ),
  (
    'textarea',
    'Long Text',
    'A multi-line text area for longer content such as paragraphs, prompts, or descriptions.',
    'input', 'textarea',
    true, 10, 10000,
    'Enter longer text...',
    'Multi-line text content.',
    1, true, 'align-left', '#818cf8'
  ),
  (
    'number',
    'Number',
    'Any numeric value including decimals.',
    'input', 'number',
    true, 0, 10000,
    'e.g. 42',
    'A numeric value.',
    2, true, 'hash', '#f59e0b'
  ),
  (
    'integer',
    'Integer',
    'A whole number without decimals.',
    'input', 'integer',
    true, 0, 10000,
    'e.g. 5',
    'Whole number only.',
    3, true, 'binary', '#fbbf24'
  ),
  (
    'boolean_toggle',
    'Toggle',
    'A true/false boolean switch.',
    'input', 'boolean',
    true, 0, 10000,
    NULL,
    'On or off.',
    4, true, 'toggle-left', '#a855f7'
  ),
  (
    'select_option',
    'Select',
    'Choose one value from a predefined list of options.',
    'input', 'select',
    true, 0, 10000,
    'Choose an option...',
    'Select from a list.',
    5, true, 'list', '#14b8a6'
  ),
  (
    'url_link',
    'URL',
    'A valid URL for a web address or resource link.',
    'input', 'url',
    true, 7, 2048,
    'https://example.com',
    'A fully qualified URL.',
    6, true, 'link', '#06b6d4'
  ),
  (
    'json_data',
    'JSON',
    'Structured JSON data for complex configuration or payload inputs.',
    'input', 'json',
    true, 2, 10000,
    '{"key": "value"}',
    'Valid JSON object or array.',
    7, true, 'braces', '#f97316'
  ),
  (
    'date_input',
    'Date',
    'A calendar date value (YYYY-MM-DD).',
    'input', 'date',
    true, 0, 10000,
    'YYYY-MM-DD',
    'A date value.',
    8, true, 'calendar', '#f43f5e'
  ),
  (
    'datetime_input',
    'Date & Time',
    'A date and time value (ISO 8601).',
    'input', 'datetime',
    true, 0, 10000,
    'YYYY-MM-DDTHH:MM',
    'A date and time value.',
    9, true, 'calendar-clock', '#fb7185'
  ),
  (
    'media_file',
    'File Upload',
    'Upload a file such as an image, PDF, or document.',
    'media', 'file',
    false, 0, 10000,
    NULL,
    'Attach a file.',
    10, true, 'paperclip', '#64748b'
  ),
  (
    'multiselect_option',
    'Multi-Select',
    'Choose multiple values from a predefined list.',
    'input', 'multiselect',
    true, 0, 10000,
    'Choose options...',
    'Select one or more options.',
    11, true, 'list-checks', '#0ea5e9'
  )
ON CONFLICT (key) DO NOTHING;
