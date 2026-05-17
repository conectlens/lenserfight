# Running the Worker

`apps/worker` is the background process that handles AI inference, battle execution, scheduled workflows, webhook delivery, and vote anomaly detection. **Without it running, lens executions and battles will queue but never complete.**

Choose the path that matches your situation:

- [Local development](#local-development) — zero config, echo provider, auto-restart
- [LenserFight Cloud (self-hosted)](#lenserfight-cloud-self-hosted)
  - [PM2 (recommended for VPS)](#pm2-recommended-for-vps)
  - [systemd (recommended for bare metal)](#systemd-recommended-for-bare-metal)
  - [Docker](#docker)
  - [Railway / Render / Fly.io](#railway--render--flyio)

---

## Local development

The quickest way to start everything together:

```sh
./scripts/dev-start.sh
```

This starts Supabase locally, seeds the database, and launches the worker in **echo mode** (no real AI calls, responses are reflected back as-is). Suitable for all frontend/database development.

**To start only the worker** (when Supabase is already running):

```sh
ECHO_PROVIDER=1 pnpm nx serve worker
```

**To enable specific sub-workers** with real providers:

```sh
OPENAI_API_KEY=sk-...            \
ANTHROPIC_API_KEY=sk-ant-...     \
PLATFORM_API_BATTLE_WORKER_ENABLED=true          \
PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED=true \
pnpm nx serve worker
```

**To drain the queue once and exit** (useful in CI or one-shot scripts):

```sh
ECHO_PROVIDER=1 PLATFORM_API_WORKER_ONCE=true pnpm nx serve worker
```

**Hot reload**: `pnpm nx serve worker` uses `@nx/js:node` which watches for source changes and restarts automatically.

### Minimum `.env.development.local`

```sh
# Filled in automatically by dev-start.sh from `pnpm supabase start` output
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<from pnpm supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from pnpm supabase start>

# No real keys needed in echo mode
ECHO_PROVIDER=1
```

---

## LenserFight Cloud (self-hosted)

Build the worker once, then run the compiled output. The build produces a self-contained ESM bundle at `dist/apps/worker/`.

```sh
pnpm nx build worker
# Output: dist/apps/worker/main.js  (+ package.json)
```

### Required environment variables

```sh
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Enable the sub-workers you need
PLATFORM_API_BATTLE_WORKER_ENABLED=true
PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED=true
PLATFORM_API_TEAM_RUN_WORKER_ENABLED=true

# AI provider keys (set whichever providers your platform uses)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
FAL_API_KEY=...

# Identity (set a unique ID per instance when scaling)
BATTLE_WORKER_ID=worker-0
```

See [environment variables](/en/reference/worker/environment-variables) for the full reference.

---

### PM2 (recommended for VPS)

```sh
# Install PM2 globally once
npm install -g pm2

# Start the worker
pm2 start dist/apps/worker/main.js \
  --name lf-worker \
  --interpreter node \
  --env production

# Save the process list so it restarts on reboot
pm2 save
pm2 startup
```

**`ecosystem.config.cjs`** — use this for reproducible deployments:

```js
module.exports = {
  apps: [
    {
      name: 'lf-worker',
      script: 'dist/apps/worker/main.js',
      interpreter: 'node',
      instances: 1,          // increase to scale; each instance claims separate jobs
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        PLATFORM_API_BATTLE_WORKER_ENABLED: 'true',
        PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED: 'true',
        PLATFORM_API_TEAM_RUN_WORKER_ENABLED: 'true',
        BATTLE_WORKER_ID: 'worker-0',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
    },
  ],
}
```

```sh
pm2 start ecosystem.config.cjs --env production
pm2 logs lf-worker
pm2 monit
```

**Scaling to multiple instances:**

```sh
# Each instance must have a unique BATTLE_WORKER_ID
pm2 start ecosystem.config.cjs --env production -i 3 \
  --env BATTLE_WORKER_ID=worker-$(pm2 id)
```

---

### systemd (recommended for bare metal)

Create `/etc/systemd/system/lf-worker.service`:

```ini
[Unit]
Description=LenserFight Background Worker
After=network.target

[Service]
Type=simple
User=lenserfight
WorkingDirectory=/opt/lenserfight
ExecStart=/usr/bin/node dist/apps/worker/main.js
Restart=always
RestartSec=5

Environment=NODE_ENV=production
Environment=SUPABASE_URL=https://<ref>.supabase.co
Environment=SUPABASE_ANON_KEY=eyJ...
Environment=SUPABASE_SERVICE_ROLE_KEY=eyJ...
Environment=PLATFORM_API_BATTLE_WORKER_ENABLED=true
Environment=PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED=true
Environment=PLATFORM_API_TEAM_RUN_WORKER_ENABLED=true
Environment=OPENAI_API_KEY=sk-...
Environment=ANTHROPIC_API_KEY=sk-ant-...
Environment=BATTLE_WORKER_ID=worker-0

StandardOutput=journal
StandardError=journal
SyslogIdentifier=lf-worker

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable lf-worker
sudo systemctl start lf-worker

# View logs
sudo journalctl -u lf-worker -f
```

---

### Docker

Create `apps/worker/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm nx build worker --configuration=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/worker ./
COPY --from=builder /app/dist/apps/worker/node_modules ./node_modules
CMD ["node", "main.js"]
```

```sh
docker build -f apps/worker/Dockerfile -t lf-worker .

docker run -d \
  --name lf-worker \
  --restart unless-stopped \
  -e SUPABASE_URL=https://<ref>.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e PLATFORM_API_BATTLE_WORKER_ENABLED=true \
  -e PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED=true \
  -e PLATFORM_API_TEAM_RUN_WORKER_ENABLED=true \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e BATTLE_WORKER_ID=worker-0 \
  lf-worker
```

**With Docker Compose** (add to your existing `docker-compose.yml`):

```yaml
services:
  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    restart: unless-stopped
    env_file: .env.production
    environment:
      BATTLE_WORKER_ID: worker-0
      PLATFORM_API_BATTLE_WORKER_ENABLED: "true"
      PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED: "true"
      PLATFORM_API_TEAM_RUN_WORKER_ENABLED: "true"
```

**Scaling with Docker Compose:**

```yaml
  worker:
    # ...same as above...
    deploy:
      replicas: 3
```

Each replica must have a unique `BATTLE_WORKER_ID`. With Compose you can inject it via an entrypoint script or an orchestrator.

---

### Railway / Render / Fly.io

These platforms run any Docker image or Node.js process from a repo.

**Railway (recommended for quick self-hosted deploys):**

1. Connect your repo in Railway, choose `apps/worker/Dockerfile` as the build source.
2. Add all required environment variables in the Railway variables panel.
3. Set the start command to `node main.js` if Railway does not pick it up from the Dockerfile `CMD`.
4. No port is needed — the worker has no HTTP surface.

**Render:**

1. Create a new **Background Worker** service (not a Web Service).
2. Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm nx build worker`
3. Start command: `node dist/apps/worker/main.js`
4. Add environment variables in the Render dashboard.

**Fly.io:**

```toml
# fly.toml
app = "lf-worker"

[build]
  dockerfile = "apps/worker/Dockerfile"

[[services]]
  # No HTTP service — worker has no port

[env]
  NODE_ENV = "production"
  PLATFORM_API_BATTLE_WORKER_ENABLED = "true"
  PLATFORM_API_SCHEDULED_WORKFLOW_WORKER_ENABLED = "true"
  PLATFORM_API_TEAM_RUN_WORKER_ENABLED = "true"
  BATTLE_WORKER_ID = "worker-0"
```

Set secrets separately:
```sh
fly secrets set SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... OPENAI_API_KEY=sk-...
fly deploy
```

---

## Verifying the worker is running

The worker logs every job it processes:

```
{"level":"info","message":"processed queued run","runId":"...","durationMs":1240,"provider":"anthropic","model":"claude-3-5-sonnet"}
{"level":"info","message":"battle job completed","jobId":"...","battleId":"...","slot":"A","durationMs":4310}
```

When the queue is empty you will see polling tick silently — no output is expected.

**Check the database directly:**

```sql
-- See recently completed runs
select id, status, latency_ms, created_at
from execution.runs
order by created_at desc
limit 10;

-- See battle job status
select id, status, error_message, updated_at
from battles.jobs
order by updated_at desc
limit 10;
```

**With health monitoring enabled** (`FEATURE_WORKER_HEALTH_MONITORING=true`):

```sql
select worker_id, worker_type, last_seen_at
from internal.worker_heartbeats
order by last_seen_at desc;
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Lens runs stay `queued` forever | Worker not running | Start the worker, check logs |
| `Failed to decrypt BYOK key` | Service-role key missing or wrong | Verify `SUPABASE_SERVICE_ROLE_KEY` |
| `provider_status_checker_missing` | AI provider key not set | Set the matching `*_API_KEY` env var |
| Battle jobs go to DLQ immediately | `BATTLE_WORKER_MAX_RETRIES=0` or bad provider key | Check retries and API key |
| Worker exits with code 1 on startup | Supabase URL unreachable | Verify `SUPABASE_URL` and network access |
| High CPU / tight polling | `PLATFORM_API_WORKER_INTERVAL_MS` too low | Raise to 5000+ when queue is usually empty |
