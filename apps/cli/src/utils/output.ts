import consola from 'consola';

export function printTable(
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): void {
  const widths =
    columnWidths ||
    headers.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => (r[i] || '').length))
    );

  const header = headers
    .map((h, i) => h.padEnd(widths[i]))
    .join('  ');

  const separator = widths.map((w) => '-'.repeat(w)).join('  ');

  consola.log(header);
  consola.log(separator);

  for (const row of rows) {
    const line = row
      .map((cell, i) => (cell || '').padEnd(widths[i]))
      .join('  ');
    consola.log(line);
  }
}

export function printJson(data: unknown): void {
  consola.log(JSON.stringify(data, null, 2));
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}

/**
 * Convert a title into a URL-friendly slug.
 * "My Battle Title!" → "my-battle-title"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Summarise long pasted text as "Pasted Text (N lines, M chars)" for display.
 * Returns null if the text is short enough to show inline (≤ 3 lines, ≤ 120 chars).
 */
export function pastedTextSummary(text: string): string | null {
  const lines = text.split('\n');
  if (lines.length <= 3 && text.length <= 120) return null;
  return `Pasted Text (${lines.length} lines, ${text.length} chars)`;
}

/**
 * Parse a human-friendly duration offset like "+2h", "+30m", "+1d" into an
 * ISO 8601 timestamp relative to now. Returns the input unchanged if it
 * doesn't match the pattern (pass-through for raw ISO strings).
 */
export function parseClosesAt(input: string): string {
  const match = input.match(/^\+(\d+)(m|h|d)$/i);
  if (!match) return input;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = unit === 'm' ? amount * 60_000
    : unit === 'h' ? amount * 3_600_000
    : amount * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}
