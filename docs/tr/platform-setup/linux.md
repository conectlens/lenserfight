---
title: Linux Kurulumu
description: LenserFight CLI'yi Linux üzerinde kurun ve yapılandırın — XDG yapılandırma yolları, bash/zsh kullanımı ve ortam değişkenleri.
---

# Linux Kurulumu

Debian/Ubuntu, Fedora, Arch ve XDG uyumlu tüm dağıtımları kapsar. Pardus'a özgü kurulum için [Pardus Kurulumu](./pardus) sayfasına bakın.

## Yapılandırma yolları

| Katman | Yol |
|--------|-----|
| Proje yapılandırması | `.lenserfight/lenserfight.json` (proje kök dizininde) |
| Cihaz yapılandırması | `$XDG_CONFIG_HOME/lenserfight/config.json` |
| Varsayılan cihaz | `~/.config/lenserfight/config.json` (`XDG_CONFIG_HOME` tanımlı değilse) |
| Eski cihaz | `~/.lenserfight/lenserfight.json` (yalnızca yedek okuma) |

CLI, [XDG Temel Dizin Spesifikasyonu](https://specifications.freedesktop.org/basedir-spec/latest/)'na uymaktadır. Özel bir `XDG_CONFIG_HOME` kullanıyorsanız cihaz yapılandırması ona göre otomatik konumlanır.

## Node.js kurulumu

Sürüm yönetimi için [nvm](https://github.com/nvm-sh/nvm) kullanılması önerilir:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # veya ~/.zshrc
nvm install 20
nvm use 20
```

Veya dağıtımınızın paket yöneticisinden (20+ sürüm sağlayın):

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs npm
```

## pnpm kurulumu

```bash
npm install -g pnpm
```

## CLI kurulumu

Proje kök dizininden:

```bash
pnpm install
```

Doğrulama:

```bash
pnpm lenserfight --version
pnpm lf --version
```

## Projeyi başlatma

```bash
pnpm lenserfight init
```

Yerel mod varsayılanlarıyla `.lenserfight/lenserfight.json` oluşturur.

## Ortam değişkenleri

Oturum için dışa aktarın:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

Kalıcı hale getirmek için `~/.bashrc` veya `~/.zshrc` dosyasına ekleyin.

Alternatif olarak proje kök dizininde `.env.local` dosyasına yazabilirsiniz:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Cihaz yapılandırma konumu

`lf auth login` veya `lf connect` sonrasında:

```
~/.config/lenserfight/config.json
```

Bu dosya gizli bilgiler içerir — commit etmeyin.

Önerilen `.gitignore` eklemeleri:

```gitignore
.lenserfight.json
.lenserfight/runs/
.lenserfight/reports/
.lenserfight/local-battles/
```

`.lenserfight/lenserfight.json` gizli bilgi içermez, commit edilebilir.

## Otomasyon nesnelerini doğrulama

```bash
pnpm lenserfight validate ./automation
```

## Yerel savaş çalıştırma

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## İlgili

- [Platform Kurulumuna Genel Bakış](./index)
- [Pardus Kurulumu](./pardus)
- [CLI Yapılandırma Referansı](/en/reference/cli/configuration)
- [PRIVATE_BATTLE.md Nasıl Çalıştırılır](/en/tutorials/battle-walkthroughs/private-battle-execute)
