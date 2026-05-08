import consola from 'consola';
import { A, sym } from './ansi';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

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

  // Pad raw text first, then wrap in color so alignment is unaffected by escape codes.
  const header = headers
    .map((h, i) => `${A.bold}${A.brightCyan}${h.padEnd(widths[i])}${A.reset}`)
    .join('  ');

  const totalWidth = widths.reduce((s, w) => s + w, 0) + 2 * (widths.length - 1);
  const separator = `${A.gray}${'─'.repeat(totalWidth)}${A.reset}`;

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

export function printInfo(message: string, ...args: unknown[]): void {
  consola.info(message, ...args)
}

export function printWarn(message: string, ...args: unknown[]): void {
  consola.warn(message, ...args)
}

export function printError(message: string, ...args: unknown[]): void {
  consola.error(message, ...args)
}

export function printSuccess(message: string, ...args: unknown[]): void {
  consola.success(message, ...args)
}

/** Format a doctor/health check result line. The symbol carries the status color; the
 *  caller (doctor.ts) feeds this into printSuccess/printWarn/printError which adds consola
 *  chrome. The icon here reinforces the status visually without being redundant. */
export function formatCheck(status: CheckStatus, label: string, detail: string): string {
  const icon =
    status === 'pass' ? `${A.brightGreen}${sym.pass}${A.reset}` :
    status === 'warn' ? `${A.brightYellow}${sym.warn}${A.reset}` :
    status === 'skip' ? `${A.brightBlue}${sym.info}${A.reset}` :
    `${A.brightRed}${sym.fail}${A.reset}`
  return `${icon}  ${A.bold}${label}${A.reset}  ${A.gray}${detail}${A.reset}`
}

/** Print a bold section heading with a leading newline for visual breathing room. */
export function printSection(title: string): void {
  consola.log(`\n${A.bold}${A.brightCyan}${title}${A.reset}`)
}

/** Print a muted "next step" hint line, indented. */
export function printHint(message: string): void {
  consola.log(`  ${A.gray}${sym.arrow} ${message}${A.reset}`)
}

/** Print a horizontal divider. */
export function printDivider(width = 48): void {
  consola.log(`${A.gray}${'─'.repeat(width)}${A.reset}`)
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
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
