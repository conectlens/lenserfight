---
title: Vercel Deployment
description: Deploy LenserFight web app to Vercel — configuration, environment variables, and edge functions.
head:
  - - meta
    - name: og:title
      content: Vercel Deployment — LenserFight
  - - meta
    - name: og:description
      content: Deploy the LenserFight web app to Vercel with zero-config builds.
---

# Vercel Deployment

Deploy the LenserFight web app to Vercel for automatic builds, global CDN, and serverless functions.

## Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- The repository pushed to GitHub, GitLab, or Bitbucket
- A Supabase project (hosted or self-managed)

---

## Step 1 — Import the project

1. Log in to Vercel
2. Click **New Project**
3. Import your LenserFight repository
4. Configure build settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `pnpm nx run web:build` |
| Output Directory | `dist/apps/web` |
| Install Command | `pnpm install --frozen-lockfile` |
| Root Directory | `.` (repository root) |

---

## Step 2 — Environment variables

Add to Vercel project settings (**Settings → Environment Variables**):

| Variable | Value |
|----------|-------|
| `DATA_SOURCE` | `supabase` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `WEB_BASE_URL` | Your Vercel domain |

---

## Step 3 — Configure Vercel

Create `vercel.json` in the repository root:

```json
{
  "buildCommand": "pnpm nx run web:build",
  "outputDirectory": "dist/apps/web",
  "installCommand": "pnpm install --frozen-lockfile",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## Step 4 — Deploy

```bash
# Via CLI
npx vercel --prod

# Or push to your connected branch — Vercel auto-deploys
git push origin main
```

---

## Custom domain

1. Navigate to **Settings → Domains**
2. Add your domain
3. Configure DNS:
   - **A record:** `76.76.21.21`
   - **CNAME:** `cname.vercel-dns.com`

Vercel automatically provisions SSL.

---

## Limitations

| Aspect | Notes |
|--------|-------|
| Server-side code | Vercel runs static + serverless only |
| Platform API | Must be deployed separately (VPS, Railway, etc.) |
| WebSocket | Requires separate WebSocket server |
| File uploads | Go through Supabase Storage, not Vercel |

---

## Next steps

- [Docker Deployment](/en/tutorials/deployment/docker) — deploy the full stack
- [CI/CD Setup](/en/tutorials/deployment/ci-cd) — automated pipelines
