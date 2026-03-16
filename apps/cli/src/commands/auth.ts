import { defineCommand } from 'citty';
import consola from 'consola';
import {
  loginWithEmail,
  clearAuthTokens,
  getUserInfo,
  isAuthenticated,
} from '../utils/auth';

const login = defineCommand({
  meta: {
    name: 'login',
    description: 'Authenticate with your LenserFight account.',
  },
  args: {
    email: {
      type: 'string',
      description: 'Account email address',
      required: true,
    },
    password: {
      type: 'string',
      description: 'Account password',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const tokens = await loginWithEmail(args.email, args.password);
      consola.success(
        'Logged in successfully. Token expires at %s',
        tokens.expiresAt
      );
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

export default defineCommand({
  meta: {
    name: 'auth',
    description: 'Manage authentication: login, logout, whoami.',
  },
  subCommands: {
    login,
    logout,
    whoami,
  },
});
