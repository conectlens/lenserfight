import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface LenserfightConfig {
  mode: 'local' | 'cloud';
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  dbPort: number;
  apiPort: number;
}

const CONFIG_FILE = '.lenserfight.json';

const DEFAULT_CONFIG: LenserfightConfig = {
  mode: 'local',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: '',
  dbPort: 54322,
  apiPort: 54321,
};

export function findConfigPath(cwd = process.cwd()): string {
  return resolve(cwd, CONFIG_FILE);
}

export function configExists(cwd = process.cwd()): boolean {
  return existsSync(findConfigPath(cwd));
}

export function loadConfig(cwd = process.cwd()): LenserfightConfig {
  const path = findConfigPath(cwd);
  if (!existsSync(path)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return { ...DEFAULT_CONFIG, ...raw };
}

export function saveConfig(
  config: Partial<LenserfightConfig>,
  cwd = process.cwd()
): void {
  const path = findConfigPath(cwd);
  const merged = { ...DEFAULT_CONFIG, ...config };
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n');
}
