/**
 * MCP protocol version negotiation for the hand-rolled Worker JSON-RPC layer.
 *
 * The Node transport negotiates inside the SDK's `StreamableHTTPServerTransport`;
 * the Cloudflare Worker answers `initialize` itself and so has to negotiate here.
 */

import {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Pick the protocol revision to report from `initialize`.
 *
 * The spec allows echoing the client's requested version only when the server
 * actually speaks it; otherwise the server answers with a version it does
 * support, letting the client decide whether to continue or disconnect.
 * Echoing the request back unchanged claims support for any string a client
 * sends — including revisions this Worker cannot serve.
 *
 * The supported set comes from the SDK rather than a local literal so that
 * upgrading `@modelcontextprotocol/sdk` moves both transports at once.
 */
export function negotiateProtocolVersion(requested: unknown): string {
  const supported: readonly string[] = SUPPORTED_PROTOCOL_VERSIONS;
  return typeof requested === 'string' && supported.includes(requested)
    ? requested
    : LATEST_PROTOCOL_VERSION;
}

export { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS };
