import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { TailscaleInterface } from '@lenserfight/infra/gateway'
import { describe, expect, it } from 'vitest'

import type { GatewayConfig } from './config'
import { evaluatePreconditions, preconditionsAllPass } from './preconditions'
import { writeConsent } from './tailscale'

const baseConfig: GatewayConfig = {
  bind: '127.0.0.1',
  port: 38080,
  tailscale: false,
  keysOnly: false,
  stateDir: '/tmp/lf-gateway-test',
  keychainService: 'lenserfight-gateway-test',
  daemonVersion: 'test',
  heartbeatIntervalMs: 1,
  pullIntervalMs: 1,
  outboxFlushIntervalMs: 1,
  clockSkewLimitSeconds: 300,
}

const fakeTailscaleIf: TailscaleInterface = {
  name: 'tailscale0',
  address: '100.64.0.2',
  cidr: '100.64.0.0/10',
  family: 'IPv4',
}

function passingProbes() {
  return {
    checkClockSkew: async () => ({ ok: true, skewSeconds: 0 }),
    checkKeychainPresent: async () => true,
    checkIdentityPresent: async () => true,
    checkSessionPresent: async () => true,
    checkLenserActive: async () => true,
    checkKillSwitch: async () => false,
  }
}

describe('evaluatePreconditions', () => {
  it('passes when all probes pass and runtime is least-privileged', async () => {
    const results = await evaluatePreconditions(
      { config: baseConfig, env: {} },
      passingProbes()
    )

    expect(preconditionsAllPass(results)).toBe(true)
    expect(results.map((r) => r.id)).toEqual([
      'bind_safe',
      'no_service_role',
      'clock_skew',
      'keychain_present',
      'identity_present',
      'session_present',
      'lenser_active',
      'kill_switch',
    ])
  })

  it('fails public bind and service-role preconditions', async () => {
    const results = await evaluatePreconditions(
      {
        config: { ...baseConfig, bind: '0.0.0.0' },
        env: { SUPABASE_SERVICE_ROLE_KEY: 'secret' },
      },
      passingProbes()
    )

    expect(preconditionsAllPass(results)).toBe(false)
    expect(results.find((r) => r.id === 'bind_safe')?.ok).toBe(false)
    expect(results.find((r) => r.id === 'no_service_role')?.ok).toBe(false)
  })

  it('fails when kill switch is active', async () => {
    const probes = { ...passingProbes(), checkKillSwitch: async () => true }
    const results = await evaluatePreconditions({ config: baseConfig, env: {} }, probes)

    expect(results.find((r) => r.id === 'kill_switch')).toMatchObject({
      ok: false,
      message: 'global_kill_switch=true',
    })
  })

  it('passes tailscale_consent when consent file matches injected interfaces', async () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), 'lf-gw-ts-'))
    try {
      writeConsent({ stateDir, detector: () => [fakeTailscaleIf] })
      const results = await evaluatePreconditions(
        {
          config: { ...baseConfig, tailscale: true, stateDir },
          env: {},
          tailscaleDetector: () => [fakeTailscaleIf],
        },
        passingProbes()
      )

      expect(results.map((r) => r.id)).toContain('tailscale_consent')
      expect(results.find((r) => r.id === 'tailscale_consent')).toMatchObject({ ok: true })
      expect(preconditionsAllPass(results)).toBe(true)
    } finally {
      rmSync(stateDir, { recursive: true, force: true })
    }
  })

  it('keysOnly mode skips identity/session/lenser/kill_switch preconditions', async () => {
    const probes = {
      ...passingProbes(),
      checkIdentityPresent: async () => false,
      checkSessionPresent: async () => false,
      checkLenserActive: async () => false,
      checkKillSwitch: async () => true,
    }
    const results = await evaluatePreconditions(
      { config: { ...baseConfig, keysOnly: true }, env: {} },
      probes
    )
    // The keys-only surface needs none of these — the daemon must still start.
    expect(preconditionsAllPass(results)).toBe(true)
    const ids = results.map((r) => r.id)
    expect(ids).not.toContain('identity_present')
    expect(ids).not.toContain('session_present')
    expect(ids).not.toContain('lenser_active')
    expect(ids).not.toContain('kill_switch')
  })

  it('keysOnly mode permits binding 0.0.0.0', async () => {
    const results = await evaluatePreconditions(
      { config: { ...baseConfig, keysOnly: true, bind: '0.0.0.0' }, env: {} },
      passingProbes()
    )
    const bindResult = results.find((r) => r.id === 'bind_safe')
    expect(bindResult?.ok).toBe(true)
    expect(bindResult?.message).toMatch(/keys-only/)
  })

  it('non-keysOnly mode still refuses 0.0.0.0', async () => {
    const results = await evaluatePreconditions(
      { config: { ...baseConfig, bind: '0.0.0.0' }, env: {} },
      passingProbes()
    )
    expect(results.find((r) => r.id === 'bind_safe')?.ok).toBe(false)
  })

  it('fails tailscale_consent when live interfaces do not match consent fingerprints', async () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), 'lf-gw-ts-'))
    try {
      writeConsent({ stateDir, detector: () => [fakeTailscaleIf] })
      const mismatched: TailscaleInterface = {
        ...fakeTailscaleIf,
        name: 'tailscale9',
      }
      const results = await evaluatePreconditions(
        {
          config: { ...baseConfig, tailscale: true, stateDir },
          env: {},
          tailscaleDetector: () => [mismatched],
        },
        passingProbes()
      )

      const ts = results.find((r) => r.id === 'tailscale_consent')
      expect(ts?.ok).toBe(false)
      expect(ts?.message).toMatch(/fingerprint|re-run/)
      expect(preconditionsAllPass(results)).toBe(false)
    } finally {
      rmSync(stateDir, { recursive: true, force: true })
    }
  })
})
