#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getAppSeo,
  getAppBaseRoutes,
  injectSeoIntoHtml,
  renderRedirectShim,
  renderRobots,
  renderSitemap,
  routeOutputPath,
} from './app-seo.mjs'

const appName = process.argv[2]

if (!appName) {
  console.error('Usage: node tools/seo/generate-app-seo.mjs <web|arena>')
  process.exit(1)
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = resolve(workspaceRoot, `dist/apps/${appName}`)
const indexPath = resolve(outDir, 'index.html')

if (!existsSync(indexPath)) {
  console.error(`Cannot generate SEO pages: missing ${indexPath}`)
  process.exit(1)
}

const app = getAppSeo(appName)
const indexHtml = readFileSync(indexPath, 'utf-8')

// 1. Emit one prerender HTML per (locale, route) for localized apps, or per
//    route for non-localized apps.
for (const route of app.routes) {
  const outputPath = resolve(outDir, routeOutputPath(route.path))
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, injectSeoIntoHtml(indexHtml, route), 'utf-8')
}

let shimCount = 0
// 2. For localized apps: emit Tier-1 HTML shims at the bare-path locations so
//    existing inbound links (eg. /about) serve a crawler-friendly redirect to
//    the default-locale URL (/en/about) with canonical + noindex.
if (app.locales) {
  const base = getAppBaseRoutes(appName)
  for (const baseRoute of base.routes) {
    const shimPath = resolve(outDir, routeOutputPath(baseRoute.path))
    const targetPath =
      baseRoute.path === '/' ? `/${app.defaultLocale}` : `/${app.defaultLocale}${baseRoute.path}`
    const canonicalUrl = `${app.baseUrl.replace(/\/+$/, '')}${targetPath}`
    mkdirSync(dirname(shimPath), { recursive: true })
    writeFileSync(
      shimPath,
      renderRedirectShim({ targetUrl: targetPath, canonicalUrl }),
      'utf-8',
    )
    shimCount++
  }
}

writeFileSync(resolve(outDir, 'sitemap.xml'), renderSitemap(appName), 'utf-8')
writeFileSync(resolve(outDir, 'robots.txt'), renderRobots(appName), 'utf-8')

console.log(
  `Generated ${app.routes.length} SEO prerender pages for ${appName}${
    shimCount ? ` + ${shimCount} bare-path redirect shims` : ''
  }.`,
)
