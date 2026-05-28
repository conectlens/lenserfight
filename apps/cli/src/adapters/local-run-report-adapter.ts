import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const BASE_DIR = resolve(homedir(), '.lenserfight');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: Record<string, unknown>): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

export class LocalRunReportAdapter {
  private readonly runReportsDir = resolve(BASE_DIR, 'run-reports');
  private readonly incidentsDir = resolve(BASE_DIR, 'incidents');
  private readonly policyLogDir = resolve(BASE_DIR, 'policy-log');
  private readonly workspaceSettingsDir = resolve(BASE_DIR, 'workspace-settings');

  saveRunReport(report: Record<string, unknown>): void {
    ensureDir(this.runReportsDir);
    const id = String(report['id'] ?? report['run_report_id']);
    writeJson(resolve(this.runReportsDir, `${id}.json`), report);
  }

  getRunReport(id: string): Record<string, unknown> | null {
    return readJson(resolve(this.runReportsDir, `${id}.json`));
  }

  listRunReports(agentId: string): Record<string, unknown>[] {
    if (!existsSync(this.runReportsDir)) return [];
    return readdirSync(this.runReportsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(resolve(this.runReportsDir, f)))
      .filter(
        (r): r is Record<string, unknown> =>
          r !== null && r['ai_lenser_id'] === agentId,
      );
  }

  saveIncident(incident: Record<string, unknown>): void {
    const reportId = String(incident['run_report_id']);
    const incidentId = String(incident['id']);
    const dir = resolve(this.incidentsDir, reportId);
    ensureDir(dir);
    writeJson(resolve(dir, `${incidentId}.json`), incident);
  }

  listIncidents(reportId: string): Record<string, unknown>[] {
    const dir = resolve(this.incidentsDir, reportId);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(resolve(dir, f)))
      .filter((r): r is Record<string, unknown> => r !== null);
  }

  appendPolicyLog(agentId: string, entry: Record<string, unknown>): void {
    ensureDir(this.policyLogDir);
    const filePath = resolve(this.policyLogDir, `${agentId}.jsonl`);
    appendFileSync(filePath, JSON.stringify(entry) + '\n');
  }

  getPolicyLog(agentId: string, limit = 100): Record<string, unknown>[] {
    const filePath = resolve(this.policyLogDir, `${agentId}.jsonl`);
    if (!existsSync(filePath)) return [];
    const lines = readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((r): r is Record<string, unknown> => r !== null);
  }

  getWorkspaceSettingsCache(agentId: string): Record<string, unknown> | null {
    return readJson(resolve(this.workspaceSettingsDir, `${agentId}.json`));
  }

  saveWorkspaceSettingsCache(
    agentId: string,
    settings: Record<string, unknown>,
  ): void {
    ensureDir(this.workspaceSettingsDir);
    writeJson(resolve(this.workspaceSettingsDir, `${agentId}.json`), settings);
  }
}
