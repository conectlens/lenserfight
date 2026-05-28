import * as http from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServerConfig } from '../config.js';
import { buildDiscoveryDocument } from '../oauth/discovery.js';
import { validateBearer } from '../middleware/auth.js';

export async function bootHttp(server: McpServer, cfg: McpServerConfig): Promise<void> {
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${cfg.httpPort}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(buildDiscoveryDocument(cfg)));
      return;
    }

    if (url.pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', server: 'lenserfight-mcp', version: '1.0.0' }));
      return;
    }

    if (url.pathname !== '/mcp') {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized', hint: 'Provide Authorization: Bearer <supabase-jwt>' }));
      return;
    }

    const token = authHeader.slice(7);
    const ctx = await validateBearer(token, cfg);
    if (!ctx) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Invalid or expired token' }));
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(cfg.httpPort, () => {
      process.stderr.write(
        `[lenserfight-mcp] HTTP transport ready on http://localhost:${cfg.httpPort}/mcp\n`
      );
      resolve();
    });
  });
}
