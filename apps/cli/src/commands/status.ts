import { defineCommand } from 'citty';
import { execSync } from 'node:child_process';
import consola from 'consola';
import { loadConfig, configExists } from '../config/project-config';
import { isAuthenticated } from '../utils/auth';

export default defineCommand({
  meta: {
    name: 'status',
    description: 'Show environment, config, and auth status.',
  },
  async run() {
    consola.info('--- LenserFight Status ---\n');

    // Config
    if (configExists()) {
      const config = loadConfig();
      consola.info('Config:   .lenserfight.json found');
      consola.info('Mode:     %s', config.mode);
      consola.info('URL:      %s', config.supabaseUrl);
      consola.info('Anon key: %s', config.supabaseAnonKey ? 'set' : 'not set');
      consola.info(
        'Service:  %s',
        config.supabaseServiceRoleKey ? 'set' : 'not set'
      );
    } else {
      consola.warn('Config:   .lenserfight.json not found');
    }

    // Auth
    consola.info(
      'Auth:     %s',
      isAuthenticated() ? 'authenticated' : 'not authenticated'
    );

    // Local Supabase
    const config = loadConfig();
    if (config.mode === 'local') {
      try {
        const output = execSync('supabase status', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        consola.info('Supabase: running');
        const dbLine = output
          .split('\n')
          .find((l) => l.includes('DB URL'));
        if (dbLine) consola.info('  %s', dbLine.trim());
      } catch {
        consola.warn('Supabase: not running or CLI not installed');
      }
    }
  },
});
