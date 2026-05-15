#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '../..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed`, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  return result.stdout;
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizeTarballPath(path) {
  return path.replace(/^package\//, '');
}

function assertCleanPackageFiles(files) {
  const allowed = new Set(['package.json', 'main.js', 'README.md', 'LICENSE']);
  const forbiddenPatterns = [
    /(^|\/)\.env($|[./])/i,
    /(^|\/)\.npmrc$/i,
    /(^|\/)\.git/i,
    /(^|\/)node_modules\//i,
    /(^|\/)src\//i,
    /\.tsx?$/i,
    /\.map$/i,
    /(^|\/)(tsconfig|jest|vitest|eslint|babel|vite|nx)\./i,
    /(^|\/)(pnpm-lock|package-lock|yarn\.lock)/i,
    /\.(pem|key|crt|p12|pfx)$/i,
    /(^|\/)(supabase|scripts|tools|tmp|coverage)\//i,
  ];

  for (const file of files) {
    assert(allowed.has(file), `Unexpected file in npm package: ${file}`, { files });
    for (const pattern of forbiddenPatterns) {
      assert(!pattern.test(file), `Forbidden file in npm package: ${file}`, { pattern: pattern.toString() });
    }
  }
}

function assertNoSecretLikeContent(bundle) {
  const forbiddenContent = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /npm_[A-Za-z0-9]{20,}/,
    /gh[pousr]_[A-Za-z0-9_]{30,}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/,
    /sk-[A-Za-z0-9]{32,}/,
    /\/home\/[A-Za-z0-9._-]+\//,
    /\/Users\/[A-Za-z0-9._-]+\//,
    /C:\\Users\\[A-Za-z0-9._-]+\\/i,
    /sourceMappingURL=/,
  ];

  for (const pattern of forbiddenContent) {
    assert(!pattern.test(bundle), 'Bundle contains forbidden secret-like or local-path content', {
      pattern: pattern.toString(),
    });
  }
}

const packageDir = resolve(workspaceRoot, argValue('--package-dir', 'dist/apps/cli'));
const packageJsonPath = resolve(packageDir, 'package.json');
const mainPath = resolve(packageDir, 'main.js');
const validationPath = resolve(packageDir, 'package-validation.json');

try {
  assert(existsSync(packageDir), `Package directory does not exist: ${packageDir}`);
  assert(existsSync(packageJsonPath), 'Built package.json is missing');
  assert(existsSync(mainPath), 'Built main.js is missing');

  const pkg = readJson(packageJsonPath);
  assert(pkg.name === 'lenserfight', 'Unexpected package name', { name: pkg.name });
  assert(pkg.private !== true, 'Package must not be private');
  assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version), 'Package version is not semver', {
    version: pkg.version,
  });
  assert(pkg.type === 'commonjs', 'CLI package must publish as commonjs', { type: pkg.type });
  assert(pkg.main === './main.js', 'Package main must point at ./main.js', { main: pkg.main });
  assert(pkg.bin?.lenserfight === './main.js', 'Missing lenserfight bin', { bin: pkg.bin });
  assert(pkg.bin?.lf === './main.js', 'Missing lf bin', { bin: pkg.bin });
  assert(pkg.engines?.node === '>=22', 'Package must declare Node >=22', { engines: pkg.engines });
  assert(pkg.publishConfig?.access === 'public', 'Package must publish with public access');

  const main = readFileSync(mainPath, 'utf8');
  assert(main.startsWith('#!/usr/bin/env node'), 'main.js must start with a node shebang');
  assertNoSecretLikeContent(main);

  if (process.platform !== 'win32') {
    const mode = statSync(mainPath).mode;
    assert((mode & 0o111) !== 0, 'main.js must be executable');
  }

  const versionOutput = run(process.execPath, [mainPath, '--version']).trim();
  assert(versionOutput.includes(pkg.version), '--version output does not include package version', {
    version: pkg.version,
    versionOutput,
  });

  const helpOutput = run(process.execPath, [mainPath, '--help']);
  assert(helpOutput.includes('LenserFight CLI'), '--help output does not include CLI description');

  const packOutput = run('npm', ['pack', '--dry-run', '--json', packageDir]);
  const pack = JSON.parse(packOutput)[0];
  const files = pack.files.map((file) => normalizeTarballPath(file.path)).sort();
  assertCleanPackageFiles(files);
  assert(pack.size > 0, 'Package tarball must not be empty', { size: pack.size });
  assert(pack.size < 5_000_000, 'Package tarball is unexpectedly large', { size: pack.size });
  assert(pack.unpackedSize < 20_000_000, 'Package unpacked size is unexpectedly large', {
    unpackedSize: pack.unpackedSize,
  });

  const summary = {
    package: `${pkg.name}@${pkg.version}`,
    packageDir,
    files,
    size: pack.size,
    unpackedSize: pack.unpackedSize,
    validatedAt: new Date().toISOString(),
  };

  mkdirSync(packageDir, { recursive: true });
  writeFileSync(validationPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Validated ${summary.package}`);
  console.log(`Package files: ${files.join(', ')}`);
} catch (error) {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
}
