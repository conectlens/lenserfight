export interface SecretRef {
  /** Logical service name, e.g. `lenserfight-gateway`. */
  service: string
  /** Account identifier, e.g. `device:<uuid>` or `byok:<provider>`. */
  account: string
}

export interface SecretWrite extends SecretRef {
  secret: string
}

export interface AccountInfo extends SecretRef {
  /** True when the value is materialized in the OS keychain. */
  present: boolean
}

export interface KeychainBackend {
  readonly id: 'keytar' | 'file' | 'memory'
  getSecret(ref: SecretRef): Promise<string | null>
  setSecret(ref: SecretWrite): Promise<void>
  deleteSecret(ref: SecretRef): Promise<boolean>
  findAccounts(ref: { service: string }): Promise<AccountInfo[]>
}
