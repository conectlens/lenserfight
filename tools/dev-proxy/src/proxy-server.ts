import http from 'http'
import httpProxy from 'http-proxy'
import type { AppRoute } from './discover-ports.js'

export function startProxy(routes: AppRoute[], proxyPort: number): void {
  const proxy = httpProxy.createProxyServer({})

  proxy.on('error', (err, _req, res) => {
    const response = res as http.ServerResponse
    if (!response.headersSent) {
      response.writeHead(503, { 'Content-Type': 'text/plain' })
      response.end(`App not running: ${(err as NodeJS.ErrnoException).message}`)
    }
  })

  const server = http.createServer((req, res) => {
    const host = req.headers.host ?? ''
    // "forum.localhost:8080" → "forum"
    const subdomain = host.split('.localhost')[0]
    const route = routes.find((r) => r.name === subdomain)

    if (!route) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end(`No dev-proxy route for: ${subdomain}\nAvailable: ${routes.map((r) => r.name).join(', ')}`)
      return
    }

    proxy.web(req, res, { target: route.target })
  })

  // WebSocket upgrade — required for Vite HMR
  server.on('upgrade', (req, socket, head) => {
    const host = req.headers.host ?? ''
    const subdomain = host.split('.localhost')[0]
    const route = routes.find((r) => r.name === subdomain)

    if (!route) {
      socket.destroy()
      return
    }

    proxy.ws(req, socket, head, { target: route.target })
  })

  server.listen(proxyPort, '0.0.0.0', () => {
    console.log(`\n  dev-proxy listening on port ${proxyPort}\n`)
  })
}
