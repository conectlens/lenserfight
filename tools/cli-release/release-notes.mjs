#!/usr/bin/env node
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

const packageDir = resolve(workspaceRoot, argValue('--package-dir', 'dist/apps/cli'));
const outputPath = resolve(workspaceRoot, argValue('--output', 'dist/apps/cli/release-notes.md'));
const pkg = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
const changelogPath = resolve(workspaceRoot, 'apps/cli/CHANGELOG.md');
const changelogEntry = latestChangelogEntry(changelogPath, pkg.version);

const notes = `# ${pkg.name}@${pkg.version}

${changelogEntry || 'Automated CLI release generated from the current release workflow.'}

## Install

\`\`\`bash
npm install -g ${pkg.name}@${pkg.version}
npx ${pkg.name}@${pkg.version} --version
\`\`\`

## Verification

- Package validation: \`pnpm nx run cli:validate-package\`
- Install smoke tests: \`pnpm nx run cli:smoke-install\`
- Provenance: npm publish runs with \`--provenance\` from GitHub Actions OIDC

## Rollback

Npm packages are immutable. To stop new installs, move the relevant dist-tag back to the previous known-good version:

\`\`\`bash
npm dist-tag add ${pkg.name}@<previous-version> latest
npm deprecate ${pkg.name}@${pkg.version} "Superseded by <previous-version>; see the GitHub release notes."
\`\`\`
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, notes, 'utf8');
console.log(`Wrote ${outputPath}`);
