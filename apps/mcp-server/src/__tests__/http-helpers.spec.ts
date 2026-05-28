import * as crypto from 'crypto';
import { parseFormBody, generateToken, verifyPkce, escapeHtml } from '../transport/http';

describe('parseFormBody', () => {
  it('parses standard application/x-www-form-urlencoded body', () => {
    const out = parseFormBody('grant_type=authorization_code&code=abc&client_id=xyz');
    expect(out).toEqual({
      grant_type: 'authorization_code',
      code: 'abc',
      client_id: 'xyz',
    });
  });

  it('URL-decodes values', () => {
    const out = parseFormBody('redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback');
    expect(out.redirect_uri).toBe('https://claude.ai/api/mcp/auth_callback');
  });

  it('returns empty object for empty body', () => {
    expect(parseFormBody('')).toEqual({});
  });

  it('keeps last value when key repeats', () => {
    const out = parseFormBody('k=1&k=2&k=3');
    expect(out.k).toBe('3');
  });
});

describe('generateToken', () => {
  it('produces lf_mcp_ prefix', () => {
    expect(generateToken()).toMatch(/^lf_mcp_[0-9a-f]{64}$/);
  });

  it('produces distinct tokens on each call', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe('verifyPkce', () => {
  // Generate a real PKCE pair to test against
  function pkcePair() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest().toString('base64url');
    return { verifier, challenge };
  }

  it('returns true for a matching verifier/challenge pair', () => {
    const { verifier, challenge } = pkcePair();
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it('returns false for a wrong verifier', () => {
    const { challenge } = pkcePair();
    expect(verifyPkce('wrong-verifier-value', challenge)).toBe(false);
  });

  it('returns false for empty verifier', () => {
    const { challenge } = pkcePair();
    expect(verifyPkce('', challenge)).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes &, <, >, ", and \'', () => {
    expect(escapeHtml(`<script>alert("x's")</script>&amp;`)).toBe(
      '&lt;script&gt;alert(&quot;x&#39;s&quot;)&lt;/script&gt;&amp;amp;'
    );
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world 123')).toBe('hello world 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
