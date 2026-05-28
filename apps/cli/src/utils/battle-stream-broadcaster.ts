// ─── BattleStreamBroadcaster ───────────────────────────────────────────────────
// GRASP roles:
//   Pure Fabrication: no domain counterpart — pure transport adapter
//   Indirection: decouples CLI execution from Supabase channel internals
//
// Security rules:
//   Keys are resolved transiently; never stored on broadcaster instance.
//   Broadcast failures are swallowed — consistent with event-publisher.ts pattern.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { resolveConfig, loadUserConfig } from '../config/project-config';
import { resolveBearerToken } from './api';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export class BattleStreamBroadcaster {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private channelName = '';

  async open(battleId: string, slot: 'A' | 'B'): Promise<void> {
    try {
      const config = resolveConfig();
      const userConfig = loadUserConfig();
      const token = resolveBearerToken(config, {});

      this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        realtime: { params: { eventsPerSecond: 40 } },
      });

      this.channelName = `battle-cli-stream-${battleId}-${slot}`;
      this.channel = this.client.channel(this.channelName);
      await new Promise<void>((resolve) => {
        this.channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
        // Resolve after 3s even if not subscribed — non-blocking
        setTimeout(resolve, 3000);
      });
    } catch {
      // Silent failure — never break CLI execution
    }
  }

  broadcastToken(delta: string, t: number): void {
    if (!this.channel) return;
    this.channel
      .send({ type: 'broadcast', event: 'token', payload: { delta, t } })
      .catch(() => {});
  }

  broadcastEnd(usage: TokenUsage): void {
    if (!this.channel) return;
    this.channel
      .send({ type: 'broadcast', event: 'end', payload: { usage } })
      .catch(() => {});
  }

  broadcastError(message: string): void {
    if (!this.channel) return;
    this.channel
      .send({ type: 'broadcast', event: 'error', payload: { message } })
      .catch(() => {});
  }

  async close(): Promise<void> {
    try {
      if (this.channel && this.client) {
        await this.client.removeChannel(this.channel);
      }
    } catch {
      // Silent failure
    }
    this.channel = null;
    this.client = null;
  }
}
