// Node-only entry point. CLI and gateway import from here.

export type {
  AddLocalKeyInput,
  DoctorReport,
  LocalKeyMetadata,
  LocalKeyStoreErrorCode,
  LocalKeyStorePort,
  UpdateLocalKeyInput,
} from './lib/ports'
export { LocalKeyStoreError } from './lib/ports'

export {
  ENV_KEYS_DIR,
  ENV_RUNTIME_DIR,
  KEY_ID_PATTERN,
  KEYS_DIR_MODE,
  KEYS_FILE_MODE,
  ensureKeysDir,
  getAuditLogPath,
  getKeyFilePath,
  getKeysDir,
  getLenserfightRuntimeDir,
  validateKeyId,
  validateProvider,
} from './lib/paths'

export {
  ENV_FORCE_ENV,
  ENV_PASSPHRASE,
  KEYCHAIN_ACCOUNT,
  KEYCHAIN_SERVICE,
  PassphraseProvider,
  defaultPassphraseProvider,
} from './lib/passphrase'

export { LocalKeyStore, generateKeyId } from './lib/store'
export type { LocalKeyStoreOptions } from './lib/store'

export { decryptEnvelope, encryptEnvelope, safeEqual } from './lib/cipher'

export { isKeyEnvelope, parseEnvelopeJson, serializeEnvelope } from './lib/envelope'
export type { KeyEnvelope } from './lib/envelope'

export { appendAuditEvent } from './lib/audit'
export type { AuditEvent, AuditEventKind } from './lib/audit'
