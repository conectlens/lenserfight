export interface McpServerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  supabaseJwtSecret: string;
  mcpOAuthBaseUrl: string;
  authAppBaseUrl: string;
  lenserId?: string;
  transport: 'stdio' | 'http';
  httpPort: number;
}

let _config: McpServerConfig | null = null;

export function getConfig(): McpServerConfig {
  if (_config) return _config;

  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const anonKey = process.env['SUPABASE_ANON_KEY'];
  const jwt = process.env['SUPABASE_JWT_SECRET'];

  const missing: string[] = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!jwt) missing.push('SUPABASE_JWT_SECRET');

  if (missing.length > 0) {
    process.stderr.write(
      `[lenserfight-mcp] ERROR: Missing required env vars: ${missing.join(', ')}\n`
    );
    process.exit(1);
  }

  const httpPort = parseInt(process.env['MCP_HTTP_PORT'] ?? '3001', 10);

  _config = {
    supabaseUrl: url!,
    supabaseServiceRoleKey: key!,
    supabaseAnonKey: anonKey!,
    supabaseJwtSecret: jwt!,
    mcpOAuthBaseUrl: process.env['MCP_OAUTH_BASE_URL'] ?? `http://localhost:${httpPort}`,
    authAppBaseUrl: process.env['AUTH_APP_BASE_URL'] ?? 'http://localhost:3004',
    lenserId: process.env['LENSERFIGHT_LENSER_ID'],
    transport: (process.env['MCP_TRANSPORT'] as 'stdio' | 'http') ?? 'stdio',
    httpPort,
  };

  return _config;
}
