import { isAllowedRedirectUri } from '../oauth/redirectUri';
import { generateAuthCode, generateToken } from '../transport/http';

describe('isAllowedRedirectUri', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'http://127.0.0.1:33418/callback',
    'http://localhost:6274/oauth/callback',
    'cursor://anysphere.cursor-mcp/oauth/callback',
  ])('accepts %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    'javascript:alert(1)//',
    'JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'http://attacker.example/cb',
    'https://client.example/cb#frag',
    'not a url',
    '',
    42,
    null,
  ])('rejects %p', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });
});

describe('authorization code vs access token', () => {
  it('issues codes that can never be mistaken for bearer tokens', () => {
    const code = generateAuthCode();
    expect(code.startsWith('lf_code_')).toBe(true);
    expect(code.startsWith('lf_mcp_')).toBe(false);
    expect(generateToken().startsWith('lf_mcp_')).toBe(true);
  });

  it('issues a fresh code each time', () => {
    expect(generateAuthCode()).not.toBe(generateAuthCode());
  });
});
