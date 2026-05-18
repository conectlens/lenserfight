---
title: Docker Deployment
description: Deploy LenserFight with Docker — build images, configure compose, and run production containers.
head:
  - - meta
    - name: og:title
      content: Docker Deployment — LenserFight
  - - meta
    - name: og:description
      content: Production Docker deployment guide for LenserFight.
---

# Docker Deployment

Deploy LenserFight using Docker containers for reproducible, portable production environments.

## Prerequisites

- Docker Engine 24+ or Docker Desktop
- Docker Compose v2
- A domain name (for production)
- SSL certificate (or use Let's Encrypt)

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Nginx      │────▶│   Web App    │     │   Arena App  │
│   (Reverse   │────▶│   (3000)     │     │   (3001)     │
│    Proxy)    │────▶│              │     │              │
│   (80/443)   │     └──────────────┘     └──────────────┘
└──────────────┘            │                    │
                     ┌──────────────┐     ┌──────────────┐
                     │    Worker    │     │   Supabase   │
                     │  (background)│────▶│  (54321)     │
                     └──────────────┘     └──────────────┘
```

---

## Step 1 — Build Docker images

### Web app

```dockerfile
# Dockerfile.web
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm nx run web:build

FROM nginx:alpine
COPY --from=builder /app/dist/apps/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### Worker (background processor)

```dockerfile
# Dockerfile.worker
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm nx run worker:build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/worker ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "main.js"]
```

> **Note:** The worker is a pure background processor (no HTTP surface). It handles scheduled jobs, event processing, and async execution tasks.

### Build all images

```bash
docker build -f Dockerfile.web -t lenserfight-web .
docker build -f Dockerfile.worker -t lenserfight-worker .
```

---

## Step 2 — Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: lenserfight-web
    ports:
      - "3000:80"
    environment:
      - SUPABASE_URL=http://supabase:54321
    depends_on:
      - supabase

  worker:
    image: lenserfight-worker
    environment:
      - SUPABASE_URL=http://supabase:54321
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - supabase

  supabase:
    image: supabase/postgres:15
    ports:
      - "54322:5432"
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - supabase-data:/var/lib/postgresql/data

volumes:
  supabase-data:
```

### Start services

```bash
docker compose up -d
```

---

## Step 3 — Production environment variables

Create a `.env.production` file:

```bash
# Database
POSTGRES_PASSWORD=<strong-password>
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App
DATA_SOURCE=supabase
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
WEB_BASE_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Security
CORS_ORIGIN=https://yourdomain.com
```

---

## Step 4 — Reverse proxy with Nginx

```nginx
# nginx.conf
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://web:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://api:8786/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Step 5 — SSL with Let's Encrypt

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renew
certbot renew --dry-run
```

---

## Health checks

Add health checks to your compose file:

```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
```

> The worker process is a background job runner with no HTTP surface. Monitor it via Docker container health and logs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Container exits immediately | Check logs: `docker compose logs <service>` |
| Port conflict | Change port mapping in compose file |
| Database connection refused | Ensure Supabase is healthy before API starts |
| Static assets 404 | Verify Nginx root points to build output |

---

## Next steps

- [VPS Deployment](/en/tutorials/deployment/vps) — deploy to a virtual private server
- [CI/CD Setup](/en/tutorials/deployment/ci-cd) — automated deployment pipeline
- [Vercel Deployment](/en/tutorials/deployment/vercel) — serverless deployment
