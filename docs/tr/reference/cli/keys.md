---
lang: tr
title: lf keys
description: ~/.lenserfight/keys/ altında AES-256-GCM ile şifreli olarak saklanan yerel BYOK API anahtarlarını yönetin.
---

# `lf keys`

Makinenizde `~/.lenserfight/keys/` altındaki yerel BYOK API anahtarlarını yönetin.
Her anahtar AES-256-GCM zarfı içinde şifrelenir; ana parola OS keychain'inde tutulur.
Aynı disk deposu, LenserFight Gateway loopback daemon'u aracılığıyla `apps/web` tarafından da okunur.

> **Güvenlik:** Yeni anahtarlar **her zaman** stdin'den okunur (TTY'larda yankı bastırılır),
> asla CLI bayrağından okunmaz — böylece shell geçmişinde veya süreç listelerinde görünmezler.

```bash
lf keys init                                   # tek seferlik kurulum: parola oluştur + ~/.lenserfight/keys/ dizinini oluştur
lf keys list [--json]
lf keys add    --provider <sağlayıcı> [--label <etiket>]   # anahtarı stdin'den okur
lf keys update <id> [--label <etiket>] [--rotate]
lf keys rotate <id>                                        # yeni anahtarı stdin'den okur
lf keys remove <id> [--yes]
lf keys export <id> --i-understand
lf keys doctor [--json]
```

Tarayıcı erişimi için ayrıca: `lf gateway serve` + `lf gateway pair --web`.

---

## Komutlar

### `lf keys init`

Ana parolayı oluşturur ve `~/.lenserfight/keys/` dizinini oluşturur. Bir kez çalıştırın.

### `lf keys list`

Kayıtlı tüm anahtarları listeler. `--json` ile makine tarafından okunabilir çıktı verir.

### `lf keys add`

Yeni bir anahtar ekler. `--provider` zorunludur (örn. `openai`, `anthropic`, `google`). Anahtar değeri stdin'den okunur.

### `lf keys rotate <id>`

Mevcut bir anahtarın değerini yeni bir değerle değiştirir. Yeni değer stdin'den okunur.

### `lf keys remove <id>`

Bir anahtarı kalıcı olarak siler. Onay için `--yes` ekleyin.

### `lf keys doctor`

Anahtar deposunun bütünlüğünü kontrol eder ve sorunları raporlar.

---

## Ayrıca bakınız

- [Finansman kaynakları](/tr/explanation/lenses/funding-sources)
- [Yerel Anahtarlar — güvenlik modeli](/tr/explanation/security/local-keys)
