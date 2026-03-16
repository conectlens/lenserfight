#!/usr/bin/env bash
# One-time setup: forward port 80 → 8080 so http://*.localhost works without :8080
# Run once per machine: bash tools/dev-proxy/setup.sh
set -euo pipefail

OS="$(uname -s)"

if [[ "$OS" == "Darwin" ]]; then
  PLIST_PATH="/Library/LaunchDaemons/com.lenserfight.devproxy.plist"

  echo "Installing launchd port-forward rule: 80 → 8080 (requires sudo)"
  sudo tee "$PLIST_PATH" > /dev/null <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.lenserfight.devproxy</string>
  <key>ProgramArguments</key>
  <array>
    <string>/sbin/pfctl</string>
    <string>-f</string>
    <string>/etc/pf.conf</string>
    <string>-e</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
PLIST

  sudo tee /etc/pf.anchors/lenserfight-devproxy > /dev/null <<'PF'
rdr pass on lo0 proto tcp from any to 127.0.0.1 port 80 -> 127.0.0.1 port 8080
PF

  # Add anchor to pf.conf if not already present
  if ! sudo grep -q "lenserfight-devproxy" /etc/pf.conf 2>/dev/null; then
    sudo bash -c 'echo "
rdr-anchor \"lenserfight-devproxy\"
load anchor \"lenserfight-devproxy\" from \"/etc/pf.anchors/lenserfight-devproxy\"" >> /etc/pf.conf'
  fi

  sudo launchctl load -w "$PLIST_PATH" 2>/dev/null || true
  sudo pfctl -f /etc/pf.conf -e 2>/dev/null || true

  echo "Done. Port 80 → 8080 is active. http://<app>.localhost works immediately."
  echo "To remove: sudo launchctl unload $PLIST_PATH && sudo rm $PLIST_PATH /etc/pf.anchors/lenserfight-devproxy"

elif [[ "$OS" == "Linux" ]]; then
  echo "Setting up iptables port-forward: 80 → 8080 (requires sudo)"

  sudo sysctl -w net.ipv4.ip_forward=1 > /dev/null

  # Add rule only if not already present
  if ! sudo iptables -t nat -C OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080 2>/dev/null; then
    sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080
  fi

  # Persist across reboots if iptables-persistent is available
  if command -v netfilter-persistent &>/dev/null; then
    sudo netfilter-persistent save
    echo "Rules persisted via netfilter-persistent."
  elif command -v iptables-save &>/dev/null; then
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>&1 || true
    echo "Rules saved to /etc/iptables/rules.v4 (may need iptables-persistent to auto-load on boot)."
  else
    echo "Warning: could not persist iptables rules. Re-run this script after reboot."
  fi

  echo "Done. Port 80 → 8080 is active. http://<app>.localhost works immediately."
  echo "To remove: sudo iptables -t nat -D OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080"

else
  echo "Unsupported OS: $OS"
  exit 1
fi
