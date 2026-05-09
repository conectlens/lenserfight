export interface LeaseHolderRow {
  holderDeviceId: string
  holderAcquired: boolean
  expiresAt: string
}

export interface LeaderElectionPort {
  acquireLeaderLease(input: {
    leaseKind: string
    deviceId: string
    leaseSeconds?: number
  }): Promise<LeaseHolderRow>
}

export interface LeaderLease {
  kind: string
  deviceId: string
  isLeader: boolean
  expiresAt: Date
}

/**
 * Thin orchestrator around the data-layer leader-lease RPC.
 *
 * Usage:
 *
 *   const leader = new LeaderElection(repo)
 *   const lease = await leader.acquire({ kind: 'sync_flush', deviceId })
 *   if (lease.isLeader) { await flushOutbox() }
 */
export class LeaderElection {
  constructor(private readonly port: LeaderElectionPort) {}

  async acquire(input: {
    kind: string
    deviceId: string
    leaseSeconds?: number
  }): Promise<LeaderLease> {
    const row = await this.port.acquireLeaderLease({
      leaseKind: input.kind,
      deviceId: input.deviceId,
      leaseSeconds: input.leaseSeconds,
    })
    return {
      kind: input.kind,
      deviceId: input.deviceId,
      isLeader: row.holderAcquired,
      expiresAt: new Date(row.expiresAt),
    }
  }
}
