import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync } from 'node:child_process';
import { configExists, loadConfig } from '../config/project-config';

function checkCommand(cmd: string): string | null {
  try {
    return execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function checkVersion(cmd: string): string | null {
  try {
    return execSync(`${cmd} --version`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

export default defineCommand({
  meta: {
    name: 'doctor',
    description: 'Validate environment: Node, Supabase CLI, DB, config.',
  },
  async run() {
    let hasError = false;

    // Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.replace('v', ''), 10);
    if (nodeMajor >= 20) {
      consola.success('Node.js %s', nodeVersion);
    } else {
      consola.error('Node.js %s (requires >= 20)', nodeVersion);
      hasError = true;
    }

    // Supabase CLI
    const supabasePath = checkCommand('supabase');
    if (supabasePath) {
      const version = checkVersion('supabase') || 'unknown';
      consola.success('Supabase CLI: %s', version);
    } else {
      consola.error('Supabase CLI not found. Install: npm i -g supabase');
      hasError = true;
    }

    // Docker
    const dockerPath = checkCommand('docker');
    if (dockerPath) {
      try {
        execSync('docker info', { stdio: 'ignore' });
        consola.success('Docker: running');
      } catch {
        consola.error('Docker installed but not running. Start Docker Desktop.');
        hasError = true;
      }
    } else {
      consola.error('Docker not found. Install Docker Desktop.');
      hasError = true;
    }

    // Config file
    if (configExists()) {
      const config = loadConfig();
      consola.success('Config: .lenserfight.json (mode: %s)', config.mode);

      if (config.mode === 'local') {
        // Check if local Supabase is running
        try {
          const status = execSync('supabase status 2>&1', {
            encoding: 'utf-8',
          });
          if (status.includes('API URL')) {
            consola.success('Local Supabase: running');
          } else {
            consola.warn(
              'Local Supabase may not be running. Run `supabase start`.'
            );
          }
        } catch {
          consola.warn(
            'Could not check Supabase status. Run `supabase start`.'
          );
        }
      }
    } else {
      consola.warn('No .lenserfight.json found. Run `lenserfight init`.');
    }

    if (hasError) {
      consola.error('Some checks failed. Fix the issues above.');
      process.exitCode = 1;
    } else {
      consola.success('All checks passed!');
    }
  },
});
