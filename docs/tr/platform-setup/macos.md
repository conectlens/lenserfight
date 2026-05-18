---
title: macOS Kurulumu
description: LenserFight CLI'yi macOS üzerinde kurun ve yapılandırın — Application Support yapılandırma yolları, Homebrew ve zsh kullanımı.
---

# macOS Kurulumu

## Yapılandırma yolları

| Katman | Yol |
|--------|-----|
| Proje yapılandırması | `.lenserfight/lenserfight.json` (proje kök dizininde) |
| Cihaz yapılandırması | `~/Library/Application Support/lenserfight/config.json` |
| Eski cihaz | `~/.lenserfight/lenserfight.json` (yalnızca yedek okuma) |

`~/Library/Application Support/lenserfight/` macOS'un kullanıcı başına uygulama verisi için belirlediği standart konumdur.

## Node.js kurulumu

[Homebrew](https://brew.sh/) ile:

```bash
# Homebrew kurulu değilse önce yükleyin
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node@20
```

Veya [nvm](https://github.com/nvm-sh/nvm) ile:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20
nvm use 20
```

## pnpm kurulumu

```bash
npm install -g pnpm
```

Veya Homebrew ile:

```bash
brew install pnpm
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

## Ortam değişkenleri (zsh)

macOS varsayılan olarak zsh kullanır. `~/.zshrc` dosyasına ekleyin:

```zsh
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

Yeniden yükleyin:

```bash
source ~/.zshrc
```

Veya proje kök dizininde `.env.local` dosyasına yazın.

## Cihaz yapılandırma konumu

`lf auth login` veya `lf connect` sonrasında:

```
~/Library/Application Support/lenserfight/config.json
```

İncelemek için:

```bash
cat ~/Library/Application\ Support/lenserfight/config.json
```

Bu dosya gizli bilgiler içerir — commit etmeyin.

## Gatekeeper notları

Önceden derlenmiş bir `lenserfight` ikili dosyası indirdiyseniz macOS Gatekeeper ilk çalıştırmada engelleyebilir:

```bash
xattr -d com.apple.quarantine /usr/local/bin/lenserfight
```

Klonlanmış bir repodan `pnpm lenserfight` ile çalıştırırken bu adım gerekmez.

## Otomasyon nesnelerini doğrulama

```bash
pnpm lenserfight validate ./automation
```

## Yerel savaş çalıştırma

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## İlgili

- [Platform Kurulumuna Genel Bakış](./index)
- [Linux Kurulumu](./linux)
- [CLI Yapılandırma Referansı](/en/reference/cli/configuration)
- [PRIVATE_BATTLE.md Nasıl Çalıştırılır](/en/tutorials/battle-walkthroughs/private-battle-execute)
