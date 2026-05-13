#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getAppSeo,
  injectSeoIntoHtml,
  renderRobots,
  renderSitemap,
  routeOutputPath,
} from './app-seo.mjs'

const appName = process.argv[2]

if (!appName) {
  console.error('Usage: node tools/seo/generate-app-seo.mjs <web|arena>')
  process.exit(1)
}

// Script lives at tools/seo/, so two levels up is the workspace root
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = resolve(workspaceRoot, `dist/apps/${appName}`)
const indexPath = resolve(outDir, 'index.html')

if (!existsSync(indexPath)) {
  console.error(`Cannot generate SEO pages: missing ${indexPath}`)
  process.exit(1)
}

const app = getAppSeo(appName)
const indexHtml = readFileSync(indexPath, 'utf-8')

for (const route of app.routes) {
  const outputPath = resolve(outDir, routeOutputPath(route.path))
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, injectSeoIntoHtml(indexHtml, route), 'utf-8')
}

writeFileSync(resolve(outDir, 'sitemap.xml'), renderSitemap(appName), 'utf-8')
writeFileSync(resolve(outDir, 'robots.txt'), renderRobots(appName), 'utf-8')

console.log(`Generated ${app.routes.length} SEO prerender pages for ${appName}.`)
