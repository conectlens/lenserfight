// Device registry types — mirrors devices.registered_devices and execution.runner_device_bindings.

export type DeviceTrustLevel =
  | 'pending'
  | 'approved'
  | 'trusted'
  | 'offline'
  | 'revoked'
  | 'blocked'
  | 'unhealthy'

export type DeviceType = 'desktop' | 'laptop' | 'server' | 'cloud' | 'other'

export interface DeviceCapabilities {
  cpuCores?: number
  ramGb?: number
  gpuAvailable?: boolean
  supportedRuntimes?: string[]
  localModels?: string[]
}

/** Mirrors devices.registered_devices */
export interface DeviceRecord {
  id: string
  lenserId: string
  name: string
  deviceType: DeviceType
  os: string | null
  arch: string | null
  cliVersion: string | null
  runnerVersion: string | null
  capabilities: DeviceCapabilities
  trustLevel: DeviceTrustLevel
  gatewayStatus: string
  lastSeenAt: string | null
  revokedAt: string | null
  createdAt: string
}

/** Mirrors execution.runner_device_bindings */
export interface RunnerDeviceBinding {
  id: string
  runnerId: string
  deviceId: string
  boundAt: string
  status: 'active' | 'paused' | 'revoked'
}

/** Used in device list RPC responses that include runner binding summary */
export interface DeviceWithRunners extends DeviceRecord {
  activeRunnerCount: number
  runners?: RunnerDeviceBinding[]
}

/** DTO for registering a new local device via fn_device_register */
export interface RegisterDeviceDTO {
  name: string
  deviceType?: DeviceType
  os?: string
  arch?: string
  cliVersion?: string
  capabilities?: DeviceCapabilities
}
