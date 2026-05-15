#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
    ...options,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed\n${output}`);
  }

  return result.stdout.trim();
}

function assertVersionOutput(label, output, version) {
  if (!output.includes(version)) {
    throw new Error(`${label} did not print ${version}: ${output}`);
  }
}

const packageDir = resolve(workspaceRoot, argValue('--package-dir', 'dist/apps/cli'));
const pkg = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
const tempRoot = mkdtempSync(join(tmpdir(), 'lf-cli-smoke-'));
const packDir = join(tempRoot, 'pack');
const localProject = join(tempRoot, 'local-project');
const globalPrefix = join(tempRoot, 'global-prefix');

mkdirSync(packDir);
mkdirSync(localProject);
mkdirSync(globalPrefix);

try {
  const packOutput = run('npm', ['pack', packageDir, '--pack-destination', packDir, '--json']);
  const pack = JSON.parse(packOutput)[0];
  const tarball = resolve(packDir, basename(pack.filename));

  const execOutput = run('npm', ['exec', '--yes', '--package', tarball, '--', 'lenserfight', '--version']);
  assertVersionOutput('npm exec lenserfight --version', execOutput, pkg.version);

  writeFileSync(
    join(localProject, 'package.json'),
    `${JSON.stringify({ name: 'lf-cli-smoke-local', private: true }, null, 2)}\n`,
  );
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: localProject });

  const localBin =
    process.platform === 'win32'
      ? join(localProject, 'node_modules', '.bin', 'lf.cmd')
      : join(localProject, 'node_modules', '.bin', 'lf');
  const localOutput = run(localBin, ['--version'], { cwd: localProject });
  assertVersionOutput('local npm exec lf --version', localOutput, pkg.version);

  run('npm', ['install', '--global', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', globalPrefix, tarball]);
  const globalBin =
    process.platform === 'win32'
      ? join(globalPrefix, 'lenserfight.cmd')
      : join(globalPrefix, 'bin', 'lenserfight');
  const globalOutput = run(globalBin, ['--version']);
  assertVersionOutput('global lenserfight --version', globalOutput, pkg.version);

  const summary = {
    package: `${pkg.name}@${pkg.version}`,
    tarball,
    checks: [
      'npm exec --package <tarball> lenserfight --version',
      'local install + npm exec lf --version',
      'global install + lenserfight --version',
    ],
    smokeTestedAt: new Date().toISOString(),
  };
  writeFileSync(resolve(packageDir, 'package-smoke.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Smoke-installed ${summary.package}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
