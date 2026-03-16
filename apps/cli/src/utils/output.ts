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
