import { defineCommand } from 'citty';
import consola from 'consola';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const CHANGELOG_LINK = 'https://docs.lenserfight.com/changelog';

/** Walk up from the CLI binary to find the repo root CHANGELOG.md. */
function findChangelog(): string | null {
  const candidates = [
    // Running from dist/ → go up two levels to repo root
    resolve(dirname(__filename), '..', '..', '..', '..', 'CHANGELOG.md'),
    // Running from source ts-node
    resolve(dirname(__filename), '..', '..', '..', '..', '..', 'CHANGELOG.md'),
    // CWD fallback
    resolve(process.cwd(), 'CHANGELOG.md'),
  ];
  return candidates.find(existsSync) ?? null;
}

interface Release {
  version: string;
  date: string;
  body: string;
}

function parseReleases(content: string, n: number): Release[] {
  const headerRe = /^## \[([^\]]+)\](?: - (\S+))?/m;
  const lines = content.split('\n');
  const releases: Release[] = [];
  let current: Release | null = null;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const m = line.match(/^## \[([^\]]+)\](?: - (\S+))?/);
    if (m) {
      if (current) {
        current.body = bodyLines.join('\n').trim();
        releases.push(current);
        bodyLines.length = 0;
        if (releases.length >= n) break;
      }
      current = { version: m[1], date: m[2] ?? '', body: '' };
    } else if (current) {
      bodyLines.push(line);
    }
  }

  if (current && releases.length < n) {
    current.body = bodyLines.join('\n').trim();
    releases.push(current);
  }

  return releases;
}

export default defineCommand({
  meta: {
    name: 'whats-new',
    description: "Show what's new in recent LenserFight releases.",
  },
  args: {
    n: {
      type: 'string',
      description: 'Number of releases to show',
      default: '1',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const count = Math.max(1, parseInt(args.n, 10) || 1);
    const changelogPath = findChangelog();

    if (!changelogPath) {
      consola.info('Full changelog: %s', CHANGELOG_LINK);
      return;
    }

    let content: string;
    try {
      content = readFileSync(changelogPath, 'utf-8');
    } catch {
      consola.info('Full changelog: %s', CHANGELOG_LINK);
      return;
    }

    const releases = parseReleases(content, count);

    if (!releases.length) {
      consola.info('No releases found in CHANGELOG.md.');
      consola.info('Full changelog: %s', CHANGELOG_LINK);
      return;
    }

    if (args.json) {
      process.stdout.write(JSON.stringify(releases, null, 2) + '\n');
      return;
    }

    for (const r of releases) {
      const header = r.date
        ? `\nv${r.version}  (${r.date})`
        : `\nv${r.version}`;
      consola.info(header);
      consola.info('─'.repeat(header.length - 1));

      // Print body, collapsing blank lines and trimming long sections
      const bodyLines = r.body.split('\n');
      let printed = 0;
      for (const line of bodyLines) {
        if (printed >= 40) {
          consola.info('  … (truncated — see full changelog)');
          break;
        }
        process.stdout.write(line + '\n');
        printed++;
      }
    }

    consola.info('');
    consola.info('Full changelog: %s', CHANGELOG_LINK);
  },
});
