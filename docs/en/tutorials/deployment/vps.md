---
title: VPS Deployment
description: Deploy LenserFight to a VPS — server setup, reverse proxy, SSL, process management, and monitoring.
head:
  - - meta
    - name: og:title
      content: VPS Deployment — LenserFight
  - - meta
    - name: og:description
      content: Production VPS deployment guide for LenserFight.
---

# VPS Deployment

Deploy LenserFight on a virtual private server (VPS) from providers like DigitalOcean, Hetzner, Linode, or AWS EC2.

## Prerequisites

- A VPS with Ubuntu 22.04+ (minimum 2 CPU, 4 GB RAM)
- A domain name with DNS configured
- SSH access to the server

---

## Step 1 — Server setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install Docker (for Supabase)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2
```

---

## Step 2 — Deploy the application

```bash
# Clone the repository
git clone https://github.com/conectlens/lenserfight.git /opt/lenserfight
cd /opt/lenserfight

# Install dependencies
pnpm install --frozen-lockfile

# Build the apps
pnpm nx run web:build
pnpm nx run worker:build

# Configure environment
cp .env.example .env.local
# Edit .env.local with production values
```

---

## Step 3 — Configure Nginx

```nginx
# /etc/nginx/sites-available/lenserfight
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

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Web app (static files)
    location / {
        root /opt/lenserfight/dist/apps/web;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Gateway API (local trust daemon, if running)
    location /gateway/ {
        proxy_pass http://127.0.0.1:38080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lenserfight /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4 — SSL certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

---

## Step 5 — Process management with PM2

```bash
# Start the background worker
pm2 start dist/apps/worker/main.js --name lenserfight-worker

# Save process list
pm2 save

# Enable startup on boot
pm2 startup
```

> **Note:** The worker is a background job processor (no HTTP surface). It handles scheduled tasks, event-driven automation, and async execution.

---

## Step 6 — Monitoring

```bash
# Process status
pm2 status

# Logs
pm2 logs lenserfight-worker

# Resource usage
pm2 monit
```

---

## Scaling strategy

| Load | CPU | RAM | Strategy |
|------|-----|-----|----------|
| Low (<100 users) | 2 cores | 4 GB | Single VPS |
| Medium (<1K users) | 4 cores | 8 GB | VPS + managed Supabase |
| High (<10K users) | 8 cores | 16 GB | Multiple VPS + load balancer |
| Very high | — | — | Kubernetes (see K8s guide) |

---

## Next steps

- [Docker Deployment](/en/tutorials/deployment/docker) — containerized deployment
- [CI/CD Setup](/en/tutorials/deployment/ci-cd) — automated deployments
