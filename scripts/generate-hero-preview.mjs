#!/usr/bin/env node
/**
 * Generates the animated hero preview used on the landing page.
 *
 * Walks a fixed tour of apps/web pages with Playwright, screenshots each one
 * in light and dark mode, and encodes the two frame sequences into small
 * animated WebP files:
 *   apps/landing/public/screenshots/hero-tour-light.webp
 *   apps/landing/public/screenshots/hero-tour-dark.webp
 *
 * A second tour demonstrates creating an AI agent and browsing its Control
 * Room (only runs when signed in):
 *   apps/landing/public/screenshots/hero-agent-tour-light.webp
 *   apps/landing/public/screenshots/hero-agent-tour-dark.webp
 *
 * Both tours' frame counts + shared frame delay are written to
 * apps/landing/public/screenshots/hero-tour-meta.json for the frontend
 * player that sequences them.
 *
 * Detail pages (lens/workflow/battle/profile) are resolved by clicking the
 * first matching link found on their list page, so the tour always reflects
 * whatever is seeded in the local DB instead of relying on hardcoded IDs
 * that go stale between reseeds.
 *
 * Several tour pages (Battles, profiles, Agent Workspace) only render for a
 * signed-in visitor. Rather than driving the separate apps/auth login UI,
 * the script signs in directly against the local Supabase Auth REST API and
 * injects the resulting session into the app's cookie-based session storage
 * (libs/data/supabase/src/lib/cookieStorage.ts, key `lf_auth_token`).
 *
 * Requires:
 *   - the web app dev server running locally: pnpm nx serve web
 *   - a seeded local Supabase with known passwords: pnpm supabase:seed:demo
 *
 * Usage:
 *   pnpm hero:preview
 *   node scripts/generate-hero-preview.mjs --base-url http://localhost:3000
 *   node scripts/generate-hero-preview.mjs --email you@local.test --password ...
 */

import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { chromium } from '@playwright/test'
import gifenc from 'gifenc'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const { GIFEncoder, quantize, applyPalette } = gifenc

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

const BASE_URL = flag('base-url', process.env.HERO_PREVIEW_BASE_URL ?? 'http://localhost:3000')
const OUT_DIR = path.resolve(ROOT, 'apps/landing/public/screenshots')
const VIEWPORT = { width: 1280, height: 800 }
const FRAME_WIDTH = Number(flag('width', 1120))
const FRAME_DELAY_MS = Number(flag('delay', 1600))
const WEBP_QUALITY = Number(flag('quality', 84))

// Standard local Supabase demo project credentials — printed by `supabase
// status` for every default local install, not a secret. Override via env
// or flags for non-default local setups.
const SUPABASE_URL = flag('supabase-url', process.env.SUPABASE_URL ?? 'http://localhost:54321')
const SUPABASE_ANON_KEY =
  flag('supabase-key', process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Matches the reserved dev account seeded by supabase/seeds/02_auth_users.sql
// and password-set by `pnpm supabase:seed:demo` (SEED_LF_PASSWORD).
const LOGIN_EMAIL = flag('email', process.env.HERO_PREVIEW_EMAIL ?? 'hey@lenserfight.com')
const LOGIN_PASSWORD = flag(
  'password',
  process.env.HERO_PREVIEW_PASSWORD ?? process.env.SEED_LF_PASSWORD ?? 'lenserfight-local-dev'
)

// Cookie storage key + chunk size must match libs/data/supabase/src/lib/cookieStorage.ts.
const AUTH_COOKIE_KEY = 'lf_auth_token'
const AUTH_COOKIE_CHUNK_SIZE = 2800

// libs/ui/theme/src/lib/themeController.ts fetches the signed-in user's saved
// theme from lensers.preferences after hydration and overwrites localStorage
// + the DOM class once that resolves — racing (and often beating) whatever we
// set before navigating. Presetting the DB row per theme run, rather than
// fighting the race client-side, makes the account's own resync agree with us.
const DB_CONTAINER = flag(
  'db-container',
  process.env.HERO_PREVIEW_DB_CONTAINER ?? 'supabase_db_lenserfight'
)

// Tour pages, in playback order. `path` is a static list page. When
// `detailLinkPattern` is set, the script opens `path` first, then follows the
// first link whose href matches the pattern (best-effort — a page is skipped
// with a warning if no match is found, it never fails the whole run).
const PAGES = [
  { label: 'Discover', path: '/' },
  { label: 'Topics', path: '/ray' },
  { label: 'Lenses', path: '/lenses' },
  {
    label: 'Lens Detail',
    path: '/lenses',
    detailLinkPattern: /^\/lenses\/[0-9a-f-]{36}/i,
  },
  { label: 'Workflows', path: '/workflows' },
  {
    label: 'Workflow Detail',
    path: '/workflows',
    detailLinkPattern: /^\/workflows\/[0-9a-f-]{36}/i,
  },
  { label: 'Battles', path: '/battles' },
  {
    label: 'Battle Detail',
    path: '/battles',
    detailLinkPattern: /^\/battles\/[a-z0-9-]+$/i,
  },
  { label: 'AI Lensers', path: '/lensers?type=ai' },
  { label: 'LenserBoard', path: '/lenserboard' },
  {
    label: 'Human Lenser Profile',
    path: '/lensers',
    detailLinkPattern: /^\/lenser\/[^/]+$/i,
  },
  {
    label: 'AI Lenser Profile',
    path: '/lensers?type=ai',
    detailLinkPattern: /^\/lenser\/[^/]+$/i,
  },
]

// A second, separate tour: create a fresh AI agent from the Sidebar's "Add AI
// Lenser" action, then browse its Control Room (agent workspace) tabs. This
// mirrors a real onboarding flow, so it's captured as its own procedural
// sequence (clicks + form fill) rather than the URL-list-driven PAGES tour
// above. "Overview" isn't in this list — it's the page the wizard lands on
// after creation, captured before the loop starts clicking the rest.
const AGENT_TOUR_TABS = ['Runs', 'Workflows', 'Instructions', 'Tools', 'Settings']

const THEMES = ['light', 'dark']

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    console.error(
      `\nCould not reach ${BASE_URL} (${err.message}).\n` +
        `Start the web app first: pnpm nx serve web\n`
    )
    process.exit(1)
  }
}

async function findDetailHref(page, pattern) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
  return hrefs.find((h) => h && pattern.test(h))
}

async function runLocalSql(sql) {
  await execFileAsync('docker', [
    'exec',
    '-i',
    DB_CONTAINER,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ])
}

// Best-effort: point the signed-in account's saved theme at the one we're
// about to capture, via the local Supabase DB container. If docker/the
// container isn't reachable, forceTheme()'s DOM-class override during
// capture is still applied as a fallback, just without eliminating the race.
async function presetThemePreference(theme) {
  const email = LOGIN_EMAIL.replace(/'/g, "''")
  try {
    await runLocalSql(`
      UPDATE lensers.preferences p
      SET theme = '${theme}'
      FROM lensers.profiles pr
      JOIN auth.users u ON u.id = pr.user_id
      WHERE p.lenser_id = pr.id AND u.email = '${email}';
    `)
  } catch (err) {
    console.warn(
      `Could not preset "${theme}" as the account's saved theme (${err.message}). ` +
        `Falling back to a best-effort DOM override per page, which can occasionally lose a race against the account's own theme resync.`
    )
  }
}

// The account has a hard cap on how many AI agents it can own (surfaced in
// the UI as "Maximum of 5 AI agents reached"). Previous runs' demo agents
// (handle prefix demo_agent_) count against that cap, so a second run would
// otherwise fail to create a fresh one. fn_delete_agent() is a SECURITY
// DEFINER RPC that checks auth.uid() internally, so calling it as the
// postgres superuser needs request.jwt.claims set to impersonate the account
// — same effect as calling it over the authenticated REST API, without the
// extra HTTP round trip.
async function cleanupDemoAgents() {
  const email = LOGIN_EMAIL.replace(/'/g, "''")
  try {
    await runLocalSql(`
      DO $$
      DECLARE
        v_user_id uuid;
        v_lenser_id uuid;
        r record;
      BEGIN
        SELECT id INTO v_user_id FROM auth.users WHERE email = '${email}';
        SELECT id INTO v_lenser_id FROM lensers.profiles WHERE user_id = v_user_id;
        PERFORM set_config(
          'request.jwt.claims',
          json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
          true
        );

        FOR r IN
          SELECT al.id AS ai_lenser_id
          FROM agents.ownerships o
          JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
          JOIN lensers.profiles p ON p.id = al.profile_id
          WHERE o.owner_lenser_id = v_lenser_id
            AND o.revoked_at IS NULL
            AND al.is_active = true
            AND left(p.handle, 11) = 'demo_agent_'
        LOOP
          PERFORM public.fn_delete_agent(r.ai_lenser_id);
        END LOOP;
      END $$;
    `)
  } catch (err) {
    console.warn(
      `Could not clean up previous demo agents (${err.message}). ` +
        `If the account is already at its agent cap, creating a new one may fail.`
    )
  }
}

// Signs in against the local Supabase Auth REST API directly (rather than
// driving the separate apps/auth login UI) and returns the browser cookies
// needed to make apps/web treat the tab as an authenticated session. Battles,
// profiles, and Agent Workspace only render their real content when signed in.
async function fetchAuthCookies() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  })
  const session = await res.json()
  if (!res.ok || !session.access_token) {
    throw new Error(
      `Login failed for ${LOGIN_EMAIL} (${res.status}): ${session.error_description ?? session.msg ?? 'unknown error'}. ` +
        `Run "pnpm supabase:seed:demo" to set the known dev password, or pass --email/--password.`
    )
  }

  const value = JSON.stringify(session)
  const cookies = []
  if (value.length <= AUTH_COOKIE_CHUNK_SIZE) {
    cookies.push({ name: AUTH_COOKIE_KEY, value })
  } else {
    const chunks = []
    for (let i = 0; i < value.length; i += AUTH_COOKIE_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + AUTH_COOKIE_CHUNK_SIZE))
    }
    cookies.push({ name: `${AUTH_COOKIE_KEY}__n`, value: String(chunks.length) })
    chunks.forEach((chunk, i) => cookies.push({ name: `${AUTH_COOKIE_KEY}__c${i}`, value: chunk }))
  }
  return cookies.map((c) => ({ ...c, domain: new URL(BASE_URL).hostname, path: '/' }))
}

// Best-effort wait for skeleton/spinner placeholders (role="status", the app's
// loading overlay) to clear before screenshotting, on top of a fixed settle
// delay for entrance animations. Never blocks longer than its own timeout —
// a page that keeps a background spinner running (e.g. live data ticker)
// shouldn't stall the whole tour.
async function waitForContentSettled(page) {
  await page
    .waitForSelector('[role="status"][aria-label="Loading..."]', {
      state: 'hidden',
      timeout: 6_000,
    })
    .catch(() => {})
  await page.waitForTimeout(1200)
}

// Signed-in sessions pull the visitor's saved theme preference (usually
// "system") from their profile after hydration and overwrite the localStorage
// value set by the context's addInitScript, so a plain "set it once before
// navigating" approach silently reverts to light mode. Reapplying the class
// right before the screenshot — after that resync has had time to fire —
// guarantees the frame matches the theme we're actually building.
async function forceTheme(page, theme) {
  await page.evaluate((t) => {
    try {
      window.localStorage.setItem('theme', t)
    } catch {
      // storage unavailable — the class toggle below still covers rendering
    }
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(t)
  }, theme)
  await page.waitForTimeout(150) // let any theme-change CSS transition finish
}

async function captureTheme(browser, theme, authCookies) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  await context.addInitScript((t) => {
    window.localStorage.setItem('theme', t)
  }, theme)
  if (authCookies.length > 0) await context.addCookies(authCookies)
  const page = await context.newPage()

  const frames = []
  for (const entry of PAGES) {
    try {
      await page.goto(`${BASE_URL}${entry.path}`, { waitUntil: 'networkidle', timeout: 20_000 })

      if (entry.detailLinkPattern) {
        const href = await findDetailHref(page, entry.detailLinkPattern)
        if (!href) {
          console.warn(`[${theme}] skipping "${entry.label}" — no matching link on ${entry.path}`)
          continue
        }
        await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle', timeout: 20_000 })
      }

      await waitForContentSettled(page)
      await forceTheme(page, theme)
      const buffer = await page.screenshot({ type: 'png' })
      frames.push(buffer)
      console.log(`[${theme}] captured "${entry.label}"`)
    } catch (err) {
      console.warn(`[${theme}] skipping "${entry.label}" — ${err.message}`)
    }
  }

  await context.close()
  return frames
}

// Demonstrates creating a new AI agent from the Sidebar's "Add AI Lenser"
// action and browsing its Control Room. Real click-through, not URL
// navigation — the create-agent wizard is a modal, and the workspace's tab
// rail is rendered as <button onClick> (libs/features/agents/.../
// agentNavConfig.ts), not <a href>, so it can't reuse findDetailHref(). Every
// run creates a genuinely new local-only demo agent (unique handle per theme
// run); `pnpm supabase:db:reset` is the natural cleanup point.
// `existingHandle`: the account's AI-agent cap (5) means only one fresh demo
// agent can be created per full run — cleanupDemoAgents() frees prior runs'
// leftovers, but light+dark both creating one would still hit the cap mid-run.
// So only the first theme actually walks the creation wizard; the second
// reuses that handle and starts straight from the Control Room tabs.
async function captureAgentTour(browser, theme, authCookies, existingHandle) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  await context.addInitScript((t) => {
    window.localStorage.setItem('theme', t)
  }, theme)
  await context.addCookies(authCookies)
  const page = await context.newPage()

  const frames = []
  const capture = async (label) => {
    await waitForContentSettled(page)
    await forceTheme(page, theme)
    frames.push(await page.screenshot({ type: 'png' }))
    console.log(`[${theme}] agent tour: captured "${label}"`)
  }

  let handle = existingHandle
  try {
    if (!handle) {
      await page.goto(`${BASE_URL}/lensers`, { waitUntil: 'networkidle', timeout: 20_000 })
      await page
        .getByRole('button', { name: /Add (AI Lenser|Agent)/i })
        .first()
        .click()
      await capture('Create agent — start')

      // lensers.profiles handle CHECK constraint is `^[a-z0-9._]+$` (no
      // hyphens, despite the form's helper text) and length 4–24.
      handle = `demo_agent_${Date.now().toString().slice(-6)}`
      await page.getByLabel(/Display name/i).pressSequentially('Demo Preview Agent', { delay: 15 })
      const handleInput = page.getByLabel(/Handle/i)
      await handleInput.click()
      await handleInput.fill('')
      await handleInput.pressSequentially(handle, { delay: 15 })
      await page.waitForTimeout(1500) // debounced handle-availability check
      await capture('Create agent — details filled')

      await page.getByRole('button', { name: /Next/i }).click()
      await capture('Agent created')
    }

    await page.goto(`${BASE_URL}/lenser/${handle}/ag/overview`, {
      waitUntil: 'networkidle',
      timeout: 20_000,
    })
    await capture('Agent control room — Overview')

    for (const tab of AGENT_TOUR_TABS) {
      try {
        await page.getByRole('button', { name: tab, exact: true }).click()
        await capture(`Agent control room — ${tab}`)
      } catch (err) {
        console.warn(`[${theme}] agent tour: skipping tab "${tab}" — ${err.message}`)
      }
    }
  } catch (err) {
    console.warn(`[${theme}] agent tour ended early — ${err.message}`)
  }

  await context.close()
  return { frames, handle }
}

async function buildAnimatedWebp(pngFrames, outFile) {
  if (pngFrames.length === 0) throw new Error(`No frames captured for ${outFile}`)

  // sharp can't compose an animated output directly from separate stills, but
  // it *can* read an animated GIF and re-encode it as animated WebP. So we
  // quantize+encode a GIF in memory with gifenc first (never written to
  // disk), then hand that off to sharp for the final WebP pass — WebP's
  // better compression keeps the on-disk file small without visible banding.
  const gif = GIFEncoder()
  for (const pngBuffer of pngFrames) {
    const { data, info } = await sharp(pngBuffer)
      .resize({ width: FRAME_WIDTH })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    // rgb565 (5-6-5 bits) spends its whole budget on color instead of
    // splitting it with an alpha channel we don't need — screenshots are
    // fully opaque — which visibly reduces banding vs. rgba4444.
    const palette = quantize(data, 256, { format: 'rgb565' })
    const index = applyPalette(data, palette, 'rgb565')
    gif.writeFrame(index, info.width, info.height, { palette, delay: FRAME_DELAY_MS })
  }
  gif.finish()
  const gifBuffer = Buffer.from(gif.bytes())

  const webpBuffer = await sharp(gifBuffer, { animated: true })
    .webp({ quality: WEBP_QUALITY, effort: 6, loop: 0 })
    .toBuffer()

  await writeFile(outFile, webpBuffer)
  const kb = (webpBuffer.byteLength / 1024).toFixed(1)
  console.log(`wrote ${path.relative(ROOT, outFile)} (${pngFrames.length} frames, ${kb} KB)`)
  return pngFrames.length
}

async function main() {
  await assertServerUp()

  let authCookies = []
  try {
    authCookies = await fetchAuthCookies()
    console.log(`signed in as ${LOGIN_EMAIL}`)
  } catch (err) {
    console.warn(`${err.message}\nContinuing as an anonymous visitor.`)
  }

  if (authCookies.length > 0) await cleanupDemoAgents()

  const browser = await chromium.launch()
  const meta = { delayMs: FRAME_DELAY_MS, main: {}, agent: {} }
  let agentHandle = null

  try {
    for (const theme of THEMES) {
      if (authCookies.length > 0) await presetThemePreference(theme)

      const frames = await captureTheme(browser, theme, authCookies)
      meta.main[theme] = await buildAnimatedWebp(
        frames,
        path.join(OUT_DIR, `hero-tour-${theme}.webp`)
      )

      if (authCookies.length > 0) {
        const { frames: agentFrames, handle } = await captureAgentTour(
          browser,
          theme,
          authCookies,
          agentHandle
        )
        agentHandle = handle
        meta.agent[theme] = await buildAnimatedWebp(
          agentFrames,
          path.join(OUT_DIR, `hero-agent-tour-${theme}.webp`)
        )
      }
    }
  } finally {
    await browser.close()
  }

  const metaFile = path.join(OUT_DIR, 'hero-tour-meta.json')
  await writeFile(
    metaFile,
    JSON.stringify(
      {
        delayMs: meta.delayMs,
        main: { frames: Math.max(meta.main.light ?? 0, meta.main.dark ?? 0) },
        agent:
          meta.agent.light || meta.agent.dark
            ? { frames: Math.max(meta.agent.light ?? 0, meta.agent.dark ?? 0) }
            : null,
      },
      null,
      2
    ) + '\n'
  )
  console.log(`wrote ${path.relative(ROOT, metaFile)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
