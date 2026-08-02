/**
 * RpcCaller — Dependency Inversion (GRASP).
 *
 * The CLI (`@lenserfight/cli-client`'s `callRpc`) and the MCP server
 * (`SupabaseClient.rpc`) each call Postgres RPCs with a different call
 * signature. This is the seam: both wrap their own client into this shape,
 * so the composers below — which RPCs to call, in what order, how to merge
 * results — are genuinely shared, not duplicated per caller.
 */
export type RpcCaller = <T = unknown>(fn: string, params: Record<string, unknown>) => Promise<T>
