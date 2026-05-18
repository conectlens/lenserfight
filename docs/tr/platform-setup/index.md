---
title: Platform Kurulumu
description: LenserFight CLI'yi Windows, Linux, macOS ve Pardus üzerinde kurun ve yapılandırın — işletim sistemine özgü yapılandırma yolları ve senkronizasyon kuralları.
---

# Platform Kurulumu

LenserFight CLI, **iki katmanlı bir yapılandırma modeli** kullanır: kodunuzun yanına işlenen proje düzeyinde bir yapılandırma ve makinenize özel cihaz düzeyinde bir yapılandırma. Yapılandırma dosyası yolları işletim sistemine göre farklılık gösterir.

## Yapılandırma katmanlarına genel bakış

| Katman | Dosya / Dizin | Amaç |
|--------|--------------|-------|
| Proje | `.lenserfight/lenserfight.json` | Mod, port, uygulama listesi — commit edilebilir |
| Proje (eski) | `.lenserfight.json` | Eski düz dosya — yalnızca okunur, yazılmaz |
| Cihaz — Windows | `%APPDATA%\lenserfight\config.json` | Auth token'ları, API anahtarları |
| Cihaz — macOS | `~/Library/Application Support/lenserfight/config.json` | Auth token'ları, API anahtarları |
| Cihaz — Linux | `$XDG_CONFIG_HOME/lenserfight/config.json` (varsayılan: `~/.config/lenserfight/`) | Auth token'ları, API anahtarları |
| Cihaz — Pardus | Linux ile aynı (XDG uyumlu) | Auth token'ları, API anahtarları |
| Eski cihaz | `~/.lenserfight/lenserfight.json` | Geriye dönük uyumluluk; yazıda yansıtılır |

## Çözümleme sırası

CLI bir yapılandırma değerini çözümlerken şu öncelik sırasını kullanır:

1. `process.env` / `.env.local` / `.env` (en yüksek öncelik)
2. İşletim sistemine özgü yoldaki cihaz yapılandırması
3. Eski `~/.lenserfight/lenserfight.json` (yalnızca yedek okuma)
4. Bilinen yerel Supabase varsayılanları *(yalnızca local mod)*
5. Yerleşik varsayılanlar (en düşük öncelik)

## Çalışma alanı senkronizasyonu

`saveConfig` bir proje yapılandırması yazdığında, çalışma alanını cihaz yapılandırmasında `workspaces` altına da kaydeder:

```json
{
  "workspaces": {
    "/home/kullanici/projeler/lenserfight-projem": {
      "mode": "local",
      "lastSeenAt": "2026-05-09T12:00:00.000Z",
      "configPath": "/home/kullanici/projeler/lenserfight-projem/.lenserfight/lenserfight.json"
    }
  }
}
```

Bu, TUI panosunun (`lf`) dosya sistemi taraması yapmadan cihazdaki tüm projeleri keşfetmesini sağlar.

## Markdown ve JSON otomasyon nesneleri

Otomasyon nesneleri (`AGENT.md`, `WORKFLOW.md`, `TOOL.md`, vb.) kodunuzun yanında YAML ön başlıklı markdown dosyaları olarak saklanır. `.lenserfight/automation-registry.json` içindeki yerel kayıt defteri bunları dizinler. Çalıştırma dizinleri ve rapor dosyaları da `.lenserfight/` altında yer alır:

```
.lenserfight/
├── config.json            ← proje yapılandırması
├── automation-registry.json
├── runs/
└── reports/
```

## Platformunuzu seçin

- [Windows](./windows) — PowerShell yolları, `%APPDATA%`, winget / npm kurulumu
- [Linux](./linux) — XDG yapılandırması, bash/zsh, apt / npm kurulumu
- [macOS](./macos) — `~/Library/Application Support`, brew / npm kurulumu
- [Pardus](./pardus) — TÜBİTAK Linux, apt tabanlı, Linux ile aynı XDG yolları

## İlgili

- [CLI Yapılandırma Referansı](/en/reference/cli/configuration)
- [Ortam Değişkenleri](/en/reference/platform-api/environment-variables)
- [CLI: Başlarken](/en/tutorials/getting-started/cli-getting-started)
