---
title: Windows Kurulumu
description: LenserFight CLI'yi Windows üzerinde kurun ve yapılandırın — yapılandırma yolları, PowerShell kullanımı ve ortam değişkenleri.
---

# Windows Kurulumu

## Yapılandırma yolları

| Katman | Yol |
|--------|-----|
| Proje yapılandırması | `.lenserfight\config.json` (proje kök dizininde) |
| Cihaz yapılandırması | `%APPDATA%\lenserfight\config.json` |
| Eski cihaz | `%USERPROFILE%\.lenserfight\config.json` (yalnızca yedek okuma) |

`%APPDATA%` standart bir Windows kurulumunda `C:\Users\<kullanıcı>\AppData\Roaming` olarak çözümlenir.

## Node.js ve pnpm kurulumu

[winget](https://learn.microsoft.com/windows/package-manager/winget/) kullanın (Windows 11 / güncellenmiş Windows 10):

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g pnpm
```

Veya [Chocolatey](https://chocolatey.org/) ile:

```powershell
choco install nodejs-lts
npm install -g pnpm
```

Doğrulama:

```powershell
node --version   # 20+
pnpm --version
```

## CLI kurulumu

Proje kök dizininden:

```powershell
pnpm install
```

CLI'yi çalıştırın:

```powershell
pnpm lenserfight --version
# veya kısa takma adıyla:
pnpm lf --version
```

## Projeyi başlatma

```powershell
pnpm lenserfight init
```

Bu komut, mevcut dizinde yerel mod varsayılanlarıyla `.lenserfight\config.json` oluşturur.

## Windows'ta ortam değişkenleri

PowerShell'de geçerli oturum için ayarlayın:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:OPENAI_API_KEY    = "sk-..."
```

Oturumlar arasında kalıcı hale getirmek için:

```powershell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

Veya proje kök dizininde `.env.local` dosyasına yazın — CLI bunu otomatik okur:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Cihaz yapılandırma konumu

`lf auth login` veya `lf connect` çalıştırıldıktan sonra CLI, auth token'larını şuraya yazar:

```
C:\Users\<kullanıcı>\AppData\Roaming\lenserfight\config.json
```

Bu dosya gizli bilgiler içerir — commit etmeyin.

## Otomasyon nesnelerini doğrulama

```powershell
pnpm lenserfight validate .\automation
```

> Önce bir şablon oluşturmanız gerekirse:
> ```powershell
> pnpm lenserfight export agent --template --out .\AGENT.md
> ```

## Yerel savaş çalıştırma

```powershell
pnpm lenserfight battle run .\PRIVATE_BATTLE.md
```

## İlgili

- [Platform Kurulumuna Genel Bakış](./index)
- [CLI Yapılandırma Referansı](/en/reference/cli/configuration)
- [PRIVATE_BATTLE.md Nasıl Çalıştırılır](/en/tutorials/battle-walkthroughs/private-battle-execute)
