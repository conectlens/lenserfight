#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

// Extract the changelog entry for a specific version from a CHANGELOG.md file.
function latestChangelogEntry(changelogPath, version) {
  if (!existsSync(changelogPath)) return '';
  const changelog = readFileSync(changelogPath, 'utf8');
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^##? .*${escapedVersion}.*$`, 'm');
  const match = heading.exec(changelog);
  if (!match) return changelog.split(/^##? /m)[0].trim();
  const start = match.index;
  const rest = changelog.slice(start);
  const next = rest.slice(match[0].length).search(/\n##? /);
  return (next === -1 ? rest : rest.slice(0, match[0].length + next)).trim();
}

// Normalise an Nx-generated changelog entry into clean release-note prose.
// Drops: version/date heading, "Thank You" section, emoji decorators.
// Keeps: Features, Fixes, Breaking Changes, and any other named sections.
function formatEntry(raw) {
  return raw
    // Drop the version/date heading — GitHub already displays the tag name
    .replace(/^##? .+\n/, '')
    // Drop the entire "Thank You" section (any emoji prefix, any content below it)
    .replace(/### [^\n]*Thank You[\s\S]*?(?=\n### |\n## |$)/g, '')
    // Normalise emoji-decorated section headings to plain text
    .replace(/### [^\w\n]*(Features?)/gi, '### $1')
    .replace(/### [^\w\n]*(Fix(?:es)?)/gi, '### $1')
    .replace(/### [^\w\n]*(Breaking Changes?)/gi, '### $1')
    .replace(/### [^\w\n]*(Docs?(?:umentation)?)/gi, '### $1')
    .replace(/### [^\w\n]*(Chore|Refactor|Maintenance|Performance)/gi, '### $1')
    // Drop leftover empty sections (heading + blank lines only, no content)
    .replace(/### [^\n]+\n+(?=### |$)/g, '')
    .trim();
}

// Fallback: read git commits between the previous CLI tag and the current one,
// and format them as a "Changes" section. Used when the changelog says
// "version bump only" (commits weren't in conventional format).
function gitChangesFallback(projectName, version, cliPath) {
  try {
    const currentTag = `${projectName}@${version}`;
    const tagList = execSync(
      `git tag -l "${projectName}@*" --sort=-version:refname`,
      { encoding: 'utf8', cwd: workspaceRoot, stdio: ['pipe', 'pipe', 'ignore'] },
    ).trim().split('\n').filter(Boolean);

    const currentIdx = tagList.indexOf(currentTag);
    // If the current tag exists, the previous tag is the next item; otherwise use the newest known tag.
    const prevTag = currentIdx !== -1 ? tagList[currentIdx + 1] : tagList[0];
    if (!prevTag) return '';

    const rawLog = execSync(
      `git log "${prevTag}..${currentTag}" --pretty=format:"%s" -- ${cliPath}`,
      { encoding: 'utf8', cwd: workspaceRoot, stdio: ['pipe', 'pipe', 'ignore'] },
    ).trim();
    if (!rawLog) return '';

    const lines = rawLog
      .split('\n')
      .filter(Boolean)
      // Skip release/changelog bot commits
      .filter(l => !/^chore\(release\)|^chore\(changelog\)|^\[skip ci\]/i.test(l));

    if (!lines.length) return '';

    // Group by conventional-commit type when recognisable, else put in "Changes".
    const features = [];
    const fixes = [];
    const breaking = [];
    const other = [];

    for (const line of lines) {
      if (/^.+!:/.test(line)) {
        breaking.push(line.replace(/^[^:]+!:\s*/, ''));
      } else if (/^feat(\([^)]*\))?:\s*/i.test(line)) {
        features.push(line.replace(/^feat(\([^)]*\))?:\s*/i, ''));
      } else if (/^fix(\([^)]*\))?:\s*/i.test(line)) {
        fixes.push(line.replace(/^fix(\([^)]*\))?:\s*/i, ''));
      } else {
        other.push(line);
      }
    }

    const sections = [];
    if (breaking.length) sections.push(`### Breaking Changes\n\n${breaking.map(l => `- ${l}`).join('\n')}`);
    if (features.length) sections.push(`### Features\n\n${features.map(l => `- ${l}`).join('\n')}`);
    if (fixes.length) sections.push(`### Fixes\n\n${fixes.map(l => `- ${l}`).join('\n')}`);
    if (other.length) sections.push(`### Changes\n\n${other.map(l => `- ${l}`).join('\n')}`);

    return sections.join('\n\n');
  } catch {
    return '';
  }
}

const packageDir = resolve(workspaceRoot, argValue('--package-dir', 'dist/apps/cli'));
const outputPath = resolve(workspaceRoot, argValue('--output', 'dist/apps/cli/release-notes.md'));
const pkg = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
const projectName = 'cli';
const changelogPath = resolve(workspaceRoot, 'apps/cli/CHANGELOG.md');

const rawEntry = latestChangelogEntry(changelogPath, pkg.version);
let body = formatEntry(rawEntry);

const isVersionBumpOnly = !body || /version bump only/i.test(body);

// When the changelog has no meaningful content, fall back to git log so
// features/changes are always visible even if commit messages weren't
// formatted as conventional commits.
if (isVersionBumpOnly) {
  body = gitChangesFallback(projectName, pkg.version, 'apps/cli/');
}

const notes = body
  ? `${body}

---

\`npm install -g ${pkg.name}@${pkg.version}\` · [npm](https://www.npmjs.com/package/${pkg.name}/v/${pkg.version}) · [Changelog](https://github.com/conectlens/lenserfight/blob/main/apps/cli/CHANGELOG.md)`
  : `Dependency alignment bump — no CLI changes in this release.\n\n\`npm install -g ${pkg.name}@${pkg.version}\``;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, notes, 'utf8');
console.log(`Wrote ${outputPath}`);
