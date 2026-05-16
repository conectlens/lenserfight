import { defineCommand } from 'citty';
import consola from 'consola';
import { printJson, printTable } from '../utils/output';
import {
  loginWithEmail,
  clearAuthTokens,
  getUserInfo,
  isAuthenticated,
  refreshAuthToken,
  getAuthToken,
  registerUser,
  buildAuthAppUrl,
  clearDeveloperToken,
  getDeveloperTokenMetadata,
  isDeveloperTokenActive,
  listDeveloperTokens,
  openBrowser,
  requestDeviceApproval,
  requestDeviceLogin,
  revokeDeveloperToken,
  saveDeveloperToken,
  waitForDeveloperToken,
  waitForSessionLogin,
} from '../utils/auth';

const login = defineCommand({
  meta: {
    name: 'login',
    description:
      'Authenticate with your LenserFight account. Omit flags to use browser-based login.',
  },
  args: {
    email: {
      type: 'string',
      description: 'Account email address (optional — omit to use browser login)',
      alias: 'e',
    },
    password: {
      type: 'string',
      description: 'Account password (optional — omit to use browser login)',
      alias: 'p',
    },
    'no-browser': {
      type: 'boolean',
      description: 'Print the approval URL instead of opening the browser automatically',
      default: false,
    },
  },
  async run({ args }) {
    try {
      if (isAuthenticated()) {
        consola.warn('You are already signed in. Run `lf auth whoami` to check your session or `lf auth logout` to sign out.');
        return;
      }

      if (args.email && args.password) {
        // Headless / scripted path — email + password
        const tokens = await loginWithEmail(args.email, args.password);
        consola.success('Logged in successfully. Token expires at %s', tokens.expiresAt);
        return;
      }

      // Browser-based device login (RFC 8628 Device Authorization Grant)
      consola.info('Starting browser login...');
      const request = await requestDeviceLogin();
      const approvalUrl = buildAuthAppUrl(request.verificationUri);

      if (args['no-browser']) {
        consola.info('Approval URL:     %s', approvalUrl);
      } else {
        openBrowser(approvalUrl);
        consola.info('Opening browser:  %s', approvalUrl);
      }
      consola.info('Approval code:    %s', request.userCode);
      consola.info('If the browser did not open, visit the URL above manually.');

      consola.start('Waiting for browser approval...');
      const tokens = await waitForSessionLogin(request, (status) => {
        if (status.status !== 'pending') {
          consola.info('Browser approved. Completing login...');
        }
      });
      consola.success('Logged in successfully. Token expires at %s', tokens.expiresAt);
    } catch (err) {
      consola.error('Login failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

const logout = defineCommand({
  meta: {
    name: 'logout',
    description: 'Clear stored authentication tokens.',
  },
  async run() {
    clearAuthTokens();
    consola.success('Logged out successfully.');
  },
});

const whoami = defineCommand({
  meta: {
    name: 'whoami',
    description: 'Show current authenticated user.',
  },
  async run() {
    if (!isAuthenticated()) {
      consola.warn('Not authenticated. Run `lenserfight auth login` first.');
      return;
    }

    try {
      const user = await getUserInfo();
      if (!user) {
        consola.warn('Could not retrieve user info. Token may be expired.');
        return;
      }
      consola.info('Email: %s', user.email);
      consola.info('ID:    %s', user.id);
      consola.info(
        'Role:  %s',
        (user as Record<string, unknown>).role || 'authenticated'
      );
    } catch (err) {
      consola.error('Failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

const refresh = defineCommand({
  meta: {
    name: 'refresh',
    description: 'Force-refresh the stored access token.',
  },
  async run() {
    try {
      const tokens = await refreshAuthToken();
      consola.success('Token refreshed. Expires at %s', tokens.expiresAt);
    } catch (err) {
      consola.error('Refresh failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

const token = defineCommand({
  meta: {
    name: 'token',
    description: 'Print the raw Supabase session token (for piping into other tools).',
  },
  args: {
    format: {
      type: 'string',
      description: 'Output format: raw or bearer',
      default: 'raw',
    },
  },
  async run({ args }) {
    const t = getAuthToken();
    if (!t) {
      consola.error('Not authenticated. Run `lenserfight auth login` first.');
      process.exitCode = 1;
      return;
    }
    process.stdout.write((args.format === 'bearer' ? `Bearer ${t}` : t) + '\n');
  },
});

const deviceRequest = defineCommand({
  meta: {
    name: 'request',
    description: 'Start a device approval request and wait for a developer token.',
  },
  args: {
    label: {
      type: 'string',
      description: 'Optional label for the developer token',
    },
    'request-ttl-minutes': {
      type: 'string',
      description: 'Device approval request lifetime in minutes',
      default: '10',
    },
    'token-ttl-hours': {
      type: 'string',
      description: 'Developer token lifetime in hours',
      default: '24',
    },
    json: {
      type: 'boolean',
      description: 'Print the initial request as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      if (!isAuthenticated()) {
        consola.error('Not authenticated. Run `lenserfight auth login` first.')
        process.exitCode = 1
        return
      }

      const request = await requestDeviceApproval({
        label: args.label ?? null,
        requestTtlMinutes: parseInt(args['request-ttl-minutes'] ?? '10', 10),
        tokenTtlHours: parseInt(args['token-ttl-hours'] ?? '24', 10),
      })

      const approvalUrl = buildAuthAppUrl(request.verificationUri)

      if (args.json) {
        printJson({
          ...request,
          verificationUrl: approvalUrl,
        })
      } else {
        consola.info('Approval code: %s', request.userCode)
        consola.info('Open:          %s', approvalUrl)
        consola.info('Expires at:    %s', request.expiresAt)
      }

      consola.start('Waiting for approval...')
      const token = await waitForDeveloperToken(request, (status) => {
        if (status.status === 'pending') return
        if (status.status === 'approved') {
          consola.info('Device approved. Minting developer token...')
        }
      })
      saveDeveloperToken(token)
      consola.success('Developer token stored locally.')
      consola.info('Token ID: %s', token.tokenId)
      consola.info('Expires:  %s', token.expiresAt)
    } catch (err) {
      consola.error('Device approval failed: %s', (err as Error).message)
      process.exitCode = 1
    }
  },
})

const device = defineCommand({
  meta: {
    name: 'device',
    description: 'Create and complete a device approval request.',
  },
  subCommands: {
    request: deviceRequest,
  },
})

const developerTokenCurrent = defineCommand({
  meta: {
    name: 'current',
    description: 'Show the locally stored developer token metadata.',
  },
  async run() {
    const meta = getDeveloperTokenMetadata()
    if (!meta.developerToken) {
      consola.warn('No developer token stored locally.')
      return
    }

    consola.info('Developer token: %s', isDeveloperTokenActive() ? 'active' : 'expired')
    if (meta.developerTokenId) consola.info('Token ID:       %s', meta.developerTokenId)
    if (meta.developerTokenExpiresAt) consola.info('Expires at:     %s', meta.developerTokenExpiresAt)
  },
})

const developerTokenList = defineCommand({
  meta: {
    name: 'list',
    description: 'List developer tokens for the current signed-in user.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Print output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const tokens = await listDeveloperTokens()

      if (args.json) {
        printJson(tokens)
        return
      }

      if (!tokens.length) {
        consola.info('No developer tokens found.')
        return
      }

      printTable(
        ['ID', 'Label', 'Prefix', 'Status', 'Expires', 'Revoked'],
        tokens.map((t) => [
          t.id.slice(0, 8),
          t.label ?? '',
          t.tokenPrefix,
          t.status,
          new Date(t.expiresAt).toLocaleString(),
          t.revokedAt ? new Date(t.revokedAt).toLocaleString() : '',
        ])
      )
    } catch (err) {
      consola.error('Failed to list developer tokens: %s', (err as Error).message)
      process.exitCode = 1
    }
  },
})

const developerTokenRevoke = defineCommand({
  meta: {
    name: 'revoke',
    description: 'Revoke a developer token by ID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Developer token UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await revokeDeveloperToken(args.id)
      if (getDeveloperTokenMetadata().developerTokenId === args.id) {
        clearDeveloperToken()
      }
      consola.success('Developer token revoked: %s', args.id)
    } catch (err) {
      consola.error('Failed to revoke developer token: %s', (err as Error).message)
      process.exitCode = 1
    }
  },
})

const developerToken = defineCommand({
  meta: {
    name: 'developer-token',
    description: 'Manage time-bounded developer tokens.',
  },
  subCommands: {
    current: developerTokenCurrent,
    list: developerTokenList,
    revoke: developerTokenRevoke,
  },
})

const register = defineCommand({
  meta: {
    name: 'register',
    description: 'Create a new LenserFight account.',
  },
  args: {
    email: {
      type: 'string',
      description: 'Account email address',
      alias: 'e',
      required: true,
    },
    password: {
      type: 'string',
      description: 'Account password (min 8 characters)',
      alias: 'p',
      required: true,
    },
    'display-name': {
      type: 'string',
      description: 'Display name (optional)',
      alias: 'n',
    },
  },
  async run({ args }) {
    try {
      const result = await registerUser(
        args.email,
        args.password,
        args['display-name']
      );
      consola.success('Account created successfully.');
      consola.info('ID:     %s', result.id);
      consola.info('Email:  %s', result.email);
      consola.info('Handle: %s', result.handle);
    } catch (err) {
      consola.error('Registration failed: %s', (err as Error).message);
      process.exitCode = 1;
    }
  },
});

export default defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage authentication, device approval, and developer tokens.',
  },
  subCommands: {
    login,
    logout,
    whoami,
    refresh,
    token,
    request: deviceRequest,
    device,
    'developer-token': developerToken,
    register,
  },
});
