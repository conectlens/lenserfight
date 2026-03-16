# dev-proxy

Local development reverse proxy for the LenserFight monorepo. Maps `http://<app>.localhost` to each app's Vite dev server port — automatically, with zero manual configuration.

## First-time setup (one per machine)

Run once to forward port 80 → 8080 at the OS level so `.localhost` URLs work without a port suffix:

```sh
bash tools/dev-proxy/setup.sh
```

This requires `sudo` once. After that, no elevated privileges are needed for daily development.

- **macOS:** installs a `launchd` daemon + `pf` anchor — survives reboots automatically.
- **Linux:** adds an `iptables` NAT rule, persisted via `netfilter-persistent` if available.

> `.localhost` resolves to `127.0.0.1` natively on macOS and Linux (RFC 6761) — no `/etc/hosts` changes needed.

## Daily usage

```sh
npm run dev
```

Starts all apps and the proxy concurrently. Access any app by subdomain:

| URL | App | Port |
|-----|-----|------|
| http://conectlenscom.localhost | conectlenscom | 2999 |
| http://forum.localhost | forum | 3000 |
| http://arena.localhost | arena | 3001 |
| http://admin.localhost | admin | 3002 |
| http://docs.localhost | docs | 3003 |

## How port discovery works

On startup, the proxy scans `apps/*/` and tries two strategies per app:

1. **Vite config** (`vite.config.mts` / `vite.config.ts`): reads the file as text and extracts `server.port`.
2. **project.json command** (`targets.serve.options.command`): parses a `--port <N>` flag from the serve command (used by VitePress docs).

Apps without a web dev server (`cli`, `mobile`) are excluded via the `EXCLUDE` set in [src/discover-ports.ts](src/discover-ports.ts).

## Adding a new app

No proxy configuration needed. Add your app under `apps/` with either:

- A `vite.config.mts` containing `server: { port: <N> }`, or
- A `project.json` serve target with a `--port <N>` flag.

Then add the app name to the `--projects` list in `package.json` `scripts.dev`, and restart.

## Skipping the one-time setup

If you haven't run `setup.sh`, the proxy still works on port 8080:

```sh
# URLs become http://forum.localhost:8080 etc.
npm run dev
```

To override the proxy port:

```sh
DEV_PROXY_PORT=9090 npm run dev
```

## Troubleshooting

**App shows "App not running" (503):** The app's dev server hasn't started yet — wait a few seconds and reload.

**App shows "No dev-proxy route" (502):** The app name in the URL doesn't match any discovered app. Check the route table printed at startup.

**Port 80 not forwarding after reboot (Linux):** Run `setup.sh` again, or install `iptables-persistent` (`sudo apt install iptables-persistent`).

**To remove the port-forward (macOS):**
```sh
sudo launchctl unload /Library/LaunchDaemons/com.lenserfight.devproxy.plist
sudo rm /Library/LaunchDaemons/com.lenserfight.devproxy.plist /etc/pf.anchors/lenserfight-devproxy
```

**To remove the port-forward (Linux):**
```sh
sudo iptables -t nat -D OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080
```
