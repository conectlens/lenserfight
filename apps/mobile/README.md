<p align="center">
  <img src="assets/mobile/ms-icon-310x310.png" width="80" alt="LenserFight Mobile" />
</p>
<h1 align="center">LenserFight Mobile Companion App</h1>
<p align="center">
  Expo-based iOS and Android companion app for the LenserFight ecosystem.
</p>
<p align="center">
  <a href="."><img src="https://img.shields.io/badge/framework-Expo_Go-blue" alt="Expo Go" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue" alt="License" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-brightgreen" alt="Platform" /></a>
</p>

---

## 📱 Overview

`apps/mobile` contains the mobile companion app for LenserFight. Designed as a lightweight, high-performance client, it brings critical workflows like signing in, viewing the lens feed, voting/judging, profile viewing, and forum interactions straight to mobile devices via **Expo Go** and native distributions.

To support rapid developer iterations and cross-device testing, this guide explains how to properly configure your development network environment, bind backend services, and troubleshoot common connection bugs.

---

## ⚡ 1. Binding a Backend Server to `0.0.0.0`

When developing with **Expo Go**, your physical mobile device and your development computer **must be connected to the same Wi-Fi network** (or be joined to the same virtual network like **Tailscale**). If your mobile app needs to communicate with a locally-running backend (such as local Supabase, or a Node.js, Rails, or Flask API), you must bind that backend to `0.0.0.0` instead of `localhost` or `127.0.0.1`.

### ❓ Why
By default, most local servers bind to `localhost` (`127.0.0.1`), which tells the server to *only* accept connections originating from the same machine.
Binding to **`0.0.0.0`** tells the server to **listen on all available network interfaces** on your machine. This exposes the service to your entire local area network (LAN) and active VPNs (like Tailscale), making it accessible to other devices—like your physical phone running Expo Go.

> [!WARNING]
> If you keep your backend bound to `localhost`, your phone running Expo Go will attempt to find the API on *itself* (the phone) instead of your development computer, resulting in connection timeouts (`ERR_CONNECTION_REFUSED`).

### ⚙️ How to Configure & Use

Instead of calling `http://localhost:3000` or `http://localhost:54321` inside your Expo environment configuration, you must use your computer's actual **local IP address** (or Tailscale IP).

1. **Find your IP address:**
   - **Tailscale (Recommended):** Run `tailscale ip -4` to fetch your Tailscale IPv4 address.
   - **Local LAN:** Run `ip route get 1 | awk '{print $NF;exit}'` (Linux/macOS) or `ipconfig` (Windows).

2. **Configure your Mobile Env (`.env`):**
   Create a `.env` file in `apps/mobile/` (or copy `.env.example`) and supply your computer's LAN or Tailscale IP address:
   ```env
   # ─── Supabase (Local Development Example) ──────────────────────────────────
   EXPO_PUBLIC_SUPABASE_URL=http://100.88.58.68:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=placeholder-key-for-mobile-dev
   
   # ─── API endpoints ─────────────────────────────────────────────────────────
   EXPO_PUBLIC_API_URL=http://100.88.58.68:54321/rest/v1
   ```

3. **Verify Dev Client Warnings:**
   The `supabase` Native Client is pre-configured to detect development hostname setups. If it detects `localhost` in a non-web environment, it will print a prominent console warning:
   ```
   ⚠️ [LenserFight Mobile Dev Warning]: Supabase URL is set to 'http://localhost:54321'.
   When developing with Expo Go on a physical device, 'localhost' will NOT resolve to your machine.
   Ensure your backend server is bound to 0.0.0.0, and configure EXPO_PUBLIC_SUPABASE_URL with your local IP.
   ```

---

## 🔒 2. Tailscale & VPN Support (Automatic)

If you are developing across different locations or networks, running **Tailscale** is the easiest way to connect your physical phone to your development server safely. 

The LenserFight dev CLI **automatically detects active Tailscale interfaces**.
* If a Tailscale daemon is running, the bundler automatically retrieves your `100.x.x.x` IPv4 address and sets `REACT_NATIVE_PACKAGER_HOSTNAME` so that the generated Metro URL and QR code route perfectly over your Tailscale tailnet.
* If Tailscale is not running, it automatically falls back to your local Wi-Fi router's default LAN IP address.

---

## 🛠️ 3. Network Status & Troubleshooting

Below are solutions to common networking hurdles faced during mobile development.

### 🔴 A. IP Retrieval Failure
* **Symptom:** The Expo CLI or network logs report the host/device IP as `0.0.0.0`.
* **Why:** The Expo Network SDK (or Metro Bundler) returns `0.0.0.0` if it cannot successfully resolve or retrieve the device's local IPv4 address. This is common when your computer is connected to multiple virtual interfaces (e.g. VPNs, VirtualBox adapters, WSL networks) or lacks an active Wi-Fi connection.
* **Fix:** 
  1. Temporarily disable active VPNs, Docker bridges, or virtual machine network adapters.
  2. Set the `REACT_NATIVE_PACKAGER_HOSTNAME` environment variable explicitly to your computer's real local IP address before starting Metro:
     ```bash
     REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.5 pnpm nx serve mobile
     ```

### 🔴 B. Port Conflicts (8081)
* **Symptom:** Expo fails to start, crashes immediately, or logs indicate that port `8081` is already in use.
* **Why:** Metro Bundler runs on port `8081` by default. If you see `0.0.0.0:8081` in your terminal's network statistics (`netstat` or `ss`), another process (like an antivirus program, a mock API server, a React/Vite dev server, or an orphaned Metro instance) is already listening on that port.
* **Fix:**
  1. **Identify the conflicting process:**
     ```bash
     # Linux / macOS
     sudo lsof -i :8081
     
     # Windows (cmd)
     netstat -ano | findstr :8081
     ```
  2. **Terminate the process:**
     ```bash
     # Linux / macOS (replace <PID> with the actual process ID)
     kill -9 <PID>
     ```
  3. **Run on an alternative port:**
     If you cannot free port `8081`, you can customize the Metro port in Expo:
     ```bash
     pnpm nx serve mobile --port 8089
     ```

### 🔴 C. Docker Container Environments
* **Symptom:** Expo starts, but physical devices or the host machine cannot connect.
* **Why:** When running Expo or mock API servers inside a Docker container, `localhost`/`127.0.0.1` binds exclusively to the *container's* loopback interface, blocking outside host or LAN connections.
* **Fix:**
  1. Setting the host target to `0.0.0.0` within the container is **required** to map and expose the service to your host machine.
  2. Ensure your `docker-compose.dev.yml` or container launch commands expose ports `8081` (Metro), `19000-19002` (Expo Dev), and your backend ports to the host:
     ```yaml
     ports:
       - "8081:8081"
       - "54321:54321"
     ```
  3. Set `REACT_NATIVE_PACKAGER_HOSTNAME` to your host computer's LAN IP so the containerized Metro bundler broadcasts a routable QR code.

---

## 🚀 Running Mobile Local Development

Get started with the mobile companion app in three commands:

```bash
# 1. Install dependencies from repo root
pnpm install

# 2. Build dependent libraries inside the monorepo
pnpm nx run-many --targets=build --projects=types,data

# 3. Start the Expo Metro Bundler
pnpm nx serve mobile
```

Open **Expo Go** on your physical phone, scan the generated terminal QR code, and begin developing!
