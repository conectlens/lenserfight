---
title: Pardus Kurulumu
description: LenserFight CLI'yi Pardus üzerinde kurun — TÜBİTAK'ın ulusal Linux dağıtımı, Debian tabanlı, XDG yapılandırma yolları.
---

# Pardus Kurulumu

[Pardus](https://pardus.org.tr/), [TÜBİTAK ULAKBİM](https://www.tubitak.gov.tr/) tarafından geliştirilen Türkiye'nin ulusal Linux dağıtımıdır. Debian tabanlı ve XDG uyumlu olduğundan yapılandırma yolları [Linux Kurulumu](./linux) ile birebir aynıdır.

## Yapılandırma yolları

| Katman | Yol |
|--------|-----|
| Proje yapılandırması | `.lenserfight/lenserfight.json` (proje kök dizininde) |
| Cihaz yapılandırması | `$XDG_CONFIG_HOME/lenserfight/config.json` |
| Varsayılan cihaz | `~/.config/lenserfight/config.json` (`XDG_CONFIG_HOME` tanımlı değilse) |
| Eski cihaz | `~/.lenserfight/lenserfight.json` (yalnızca yedek okuma) |

## Pardus'a Node.js kurulumu

Pardus'un varsayılan apt depolarında Node.js 20+ bulunmayabilir. NodeSource kurulum betiğini kullanın:

```bash
# NodeSource'dan Node.js 20 kur
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v20.x.x çıktısı beklenir
```

Veya kullanıcı başına sürüm yönetimi için nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## pnpm kurulumu

```bash
npm install -g pnpm
```

## Derleme bağımlılıkları (gerekirse)

Bazı native Node eklentileri derleme araçları gerektirir:

```bash
sudo apt install -y build-essential python3
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

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

Kalıcı hale getirmek için `~/.bashrc` veya `~/.profile` dosyasına ekleyin. Veya proje kök dizininde `.env.local` kullanın.

## Cihaz yapılandırma konumu

```
~/.config/lenserfight/config.json
```

Bu dosya gizli bilgiler içerir — commit etmeyin.

## Pardus'a özgü notlar

- Pardus, GNOME veya XFCE masaüstü ortamlarıyla birlikte gelir; her ikisi de XDG standartlarını tam destekler.
- Node.js, Pardus Yazılım Merkezi'nde listelenmez — yukarıdaki apt veya nvm yöntemini kullanın.
- Test için Pardus Live DVD kullanıyorsanız proje yapılandırmanızda `mode: local` ayarlayın — yerel mod savaşları için internet bağlantısı gerekmez.
- Pardus 23 (Karınca) ve Pardus 21 (Anka) her ikisi de Debian tabanlıdır ve bu kurulum için aynı şekilde çalışır.

## Yerel savaş çalıştırma

```bash
pnpm lenserfight battle run ./PRIVATE_BATTLE.md
pnpm lenserfight battle run ./PRIVATE_BATTLE.md --execute
```

## İlgili

- [Platform Kurulumuna Genel Bakış](./index)
- [Linux Kurulumu](./linux)
- [CLI Yapılandırma Referansı](/en/reference/cli/configuration)
- [Pardus resmi sitesi](https://pardus.org.tr/)
- [PRIVATE_BATTLE.md Nasıl Çalıştırılır](/en/tutorials/battle-walkthroughs/private-battle-execute)
