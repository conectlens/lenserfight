import {
  negotiateProtocolVersion,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '../protocol';

describe('negotiateProtocolVersion', () => {
  it('echoes a version the server actually supports', () => {
    for (const version of SUPPORTED_PROTOCOL_VERSIONS) {
      expect(negotiateProtocolVersion(version)).toBe(version);
    }
  });

  it('answers with the latest supported version when the client asks for an unsupported one', () => {
    // The literal case from issue #374: 2026-07-28 removes the initialize
    // handshake this Worker relies on, so it must not be reported as agreed.
    expect(negotiateProtocolVersion('2026-07-28')).toBe(LATEST_PROTOCOL_VERSION);
    expect(SUPPORTED_PROTOCOL_VERSIONS).not.toContain('2026-07-28');
  });

  it('does not echo arbitrary strings back as a negotiated version', () => {
    expect(negotiateProtocolVersion('banana')).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion('')).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('falls back to the latest supported version when the field is absent or not a string', () => {
    expect(negotiateProtocolVersion(undefined)).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(null)).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(20260728)).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion({ protocolVersion: '2025-11-25' })).toBe(
      LATEST_PROTOCOL_VERSION
    );
  });

  it('advertises a version at least as new as the previously hardcoded 2025-06-18', () => {
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain('2025-06-18');
    expect(LATEST_PROTOCOL_VERSION >= '2025-06-18').toBe(true);
  });
});
