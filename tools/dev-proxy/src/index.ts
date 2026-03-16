import { discoverPorts } from './discover-ports.js'
import { startProxy } from './proxy-server.js'

const proxyPort = parseInt(process.env['DEV_PROXY_PORT'] ?? '8080', 10)

const routes = discoverPorts()

if (routes.length === 0) {
  console.error('[dev-proxy] No apps discovered. Check that apps/* have vite.config.mts or project.json with a --port flag.')
  process.exit(1)
}

// Print route table
const nameWidth = Math.max(...routes.map((r) => r.name.length), 'App'.length)
const urlWidth = 30

console.log('\n  ┌' + '─'.repeat(nameWidth + 2) + '┬' + '─'.repeat(urlWidth + 2) + '┬' + '─'.repeat(22) + '┐')
console.log(`  │ ${'App'.padEnd(nameWidth)} │ ${'URL'.padEnd(urlWidth)} │ ${'Proxied to'.padEnd(20)} │`)
console.log('  ├' + '─'.repeat(nameWidth + 2) + '┼' + '─'.repeat(urlWidth + 2) + '┼' + '─'.repeat(22) + '┤')

for (const route of routes) {
  const portSuffix = proxyPort === 80 ? '' : `:${proxyPort}`
  const url = `http://${route.name}.localhost${portSuffix}`
  console.log(`  │ ${route.name.padEnd(nameWidth)} │ ${url.padEnd(urlWidth)} │ ${route.target.padEnd(20)} │`)
}

console.log('  └' + '─'.repeat(nameWidth + 2) + '┴' + '─'.repeat(urlWidth + 2) + '┴' + '─'.repeat(22) + '┘')

startProxy(routes, proxyPort)
