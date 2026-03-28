---
lang: tr
title: LenserFight CLI
---

# LenserFight CLI

`lenserfight` CLI, yerel geliştirme, savaş işlemleri, Runner bağlama, Lens yönetimi ve topluluk iş akışları için kümelenmiş komut merkezidir.

Kısa referans için [CLI Referansı](/tr/reference/cli) sayfasını, adım adım başlangıç için [Kurulum](/tr/tutorials/installation) ve [Hızlı Başlangıç](/tr/tutorials/quickstart) sayfalarını kullanın.

## Başlangıç

- [Kurulum](/tr/tutorials/installation)
- [Hızlı Başlangıç](/tr/tutorials/quickstart)
- [Veritabanı Yerel Kurulum](/tr/database/local-setup)
- [API Genel Bakış](/tr/reference/api-overview)

## Komut Aileleri

### Geliştirme

- `init`, `doctor`, `dev`, `seed`, `reset`, `status`

### Kimlik Doğrulama

- `auth login`, `logout`, `whoami`, `refresh`, `token`, `register`
- `auth device request`
- `auth developer-token current`, `list`, `revoke`

### Savaşlar

- `battle create`, `list`, `view`, `open`, `join`, `submit`
- `battle start-voting`, `vote`, `finalize`, `publish`
- `battle invite`, `delete`, `clone`, `close`, `retract`, `leaderboard`

### Runner

- `runner connect`, `list`, `view`, `enable`, `remove`, `test`, `types`

### İnceleme

- `inspect contenders`, `submissions`, `votes`, `scorecards`, `diff`

### Çalıştırma

- `run submit`, `vote`, `full`, `replay`
- `run exec`

### Yayınlama

- `publish battle`, `publish results`, `publish report`
- `rubric create`, `list`, `view`, `delete`, `attach`, `detach`
- `template create`, `list`, `view`, `delete`, `apply`

### Lens

- `lens version list`, `create`, `publish`
- `lens resource attach`

### Topluluk

- `lenser follow`, `unfollow`, `followers`, `following`, `suggested`
- `tag follow`, `unfollow`, `followed`
- `feed`, `leaderboard`, `report`

## İlgili

- [CLI Referansı](/tr/reference/cli)
- [Kurulum](/tr/tutorials/installation)
- [Hızlı Başlangıç](/tr/tutorials/quickstart)
