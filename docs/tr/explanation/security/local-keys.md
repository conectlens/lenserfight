---
title: Yerel Anahtarlar — güvenlik modeli
description: LenserFight yerel BYOK anahtar deposu için tehdit modeli, beklemede şifreleme, eşleşme akışı, kurtarma ve yedekleme duruşu.
---

# Yerel Anahtarlar — güvenlik modeli

Bu sayfa `user_byok_local` finansman kaynağı için kanonik güvenlik referansıdır. Anahtarların diskte nerede yaşadığını, nasıl şifrelendiğini, tarayıcının şifreli metni asla önbelleğe almadan onlara nasıl ulaştığını ve tasarımın hangi tehditlere karşı koruduğunu/korumadığını kapsar.

Sadece kullanım talimatları için: [Finansman Kaynakları](/tr/explanation/lenses/funding-sources) ve [`lf keys`](/tr/reference/cli/keys) CLI referansı.

## "Yerel Anahtarlar" şimdi ne anlama geliyor

Yerel BYOK anahtarları kullanıcının makinesindeki **`~/.lenserfight/keys/`** dizininde yaşar, OS keychain'inde tutulan bir ana parolayla beklemede şifrelenir.

Tarayıcı **hiçbir zaman** şifreli metin tutmaz, ana parolayı **hiçbir zaman** tutmaz ve düz metni yalnızca tek bir uçuş halindeki istek süresince tutar. Tüm erişim **LenserFight Gateway** loopback daemon'undan (`apps/gateway`, varsayılan `127.0.0.1:38080`) geçer.

## Beklemede şifreleme

Her anahtar `~/.lenserfight/keys/<id>.json` adresinde kendi zarfında yaşar:

- **Anahtar başına salt + scrypt KDF**: `N=2^15, r=8, p=1, dkLen=32`. Zarf başına bir türetme.
- **AES-256-GCM** + yeni 12-byte IV. Herhangi bir kurcalama `decryption_failed` üretir.
- **Atomik yazımlar**: `O_EXCL | O_NOFOLLOW` ile geçici dosyaya yazıp `rename(2)`.
- **Dosya modu 0600**, dizin modu 0700. Sembolik bağlantılar reddedilir. ID regex'i `^[A-Za-z0-9_-]{20,40}$`.
- **Ana parola** OS keychain'inde (`lenserfight-keys`) tutulur. `~/.lenserfight/` altındaki hiçbir dosyaya yazılmaz.

## Tarayıcı ↔ gateway sınırı

| Kontrol | Davranış | Neden |
| --- | --- | --- |
| Origin allow-list | `lenserfight.com`, alt domain, `localhost`, `127.0.0.1`. Diğerleri → 403. | Aynı makinedeki diğer sekmeler gateway'i çağıramaz. |
| Bearer token | 32 byte rastgele, OS keychain (sunucu) + `sessionStorage` (tarayıcı). | Token olmadan `/keys/*` erişilemez. |
| Token saklama | Yalnızca `sessionStorage` — cookie değil, localStorage değil. | Sekme kapanır, token gider, eşleşme yenilenir. |
| Hız sınırı | `/keys/:id/resolve` token başına 60/dk + burst 5. 429 + denetim. | Tehlikeye düşmüş origin saniyeler içinde tüm anahtarları çekemez. |
| Gövde sınırı | 64 KiB, aşan istek 413. | Bariz suistimali erken yakala. |
| Yalnız loopback | Sunucu `0.0.0.0` / `::` bağlamayı reddeder. | Gateway bu makine için; ağa açılmaz. |

## Tehdit modeli

| Tehdit | Savunma | Artık risk |
| --- | --- | --- |
| Disk hırsızlığı | Beklemede AES-256-GCM + OS keychain'deki parola. | Zayıf OS girişi → fiziksel erişimli saldırgan çözebilir. |
| Aynı kullanıcı kötü amaçlı yazılım | 0600 unprivileged eşleri engeller; aynı UID şifreli metni görür ama keychain açmadan çözemez. | OS sandbox (TCC, AppArmor) ek savunmadır. |
| Cross-origin tarayıcı JS | Origin allow-list + bearer + `sessionStorage` token. | Tehlikeye düşmüş lenserfight.com origin XSS ile çekebilir — CSP/SRI. |
| Loopback dinleme | Çekirdekten çıkmıyor. | Yok. |
| Path traversal / symlink | Sıkı ID regex + `O_NOFOLLOW` + symlink reddi. | Yok. |
| Zarf kurcalama | AES-GCM auth-tag → `decryption_failed`. | Yok. |
| Bulut yedekleme | `~/.lenserfight/keys/` varsayılan yedekleme kökünde değil. | Yanlış yapılandırılmış yedek şifreli metni alır — parola olmadan işe yaramaz. |
| Resolve brute force | 60/dk + 429 + denetim. | Sabırlı saldırgan grindleyebilir — sıkı origin + token. |
| Ana parolanın env üzerinden açığa çıkması | Keychain mevcutsa env reddedilir (zorunlu kılınmadıkça). | Linux `/proc/<pid>/environ` aynı UID için okunabilir — env'i CI'da tutun. |

## Kurtarma

Ana parola kaybolursa anahtarlar **kurtarılamaz**. `lf keys add` ile yeniden ekleyin.

## Bulut yedeklemeden çıkma

- **macOS**: `xattr -w com.apple.metadata:com_apple_backup_excludeItem com.apple.backupd ~/.lenserfight`
- **Windows**: OneDrive ayarları → hariç tutulan klasörler.
- **Linux**: Çoğu masaüstü senkron istemcisi nokta dosyaları varsayılan olarak dışlar; yine de doğrulayın.

## Ayrıca bakınız

- [`lf keys` CLI referansı](/tr/reference/cli/keys)
- [Finansman kaynakları genel bakış](/tr/explanation/lenses/funding-sources)
- [Depo güvenlik politikası](https://github.com/conectlens/lenserfight/blob/main/SECURITY.md)
