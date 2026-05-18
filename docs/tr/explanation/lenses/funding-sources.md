---
title: Finansman Kaynakları
description: Chainabit kredileri, LF Bulut Anahtarları (BYOK bulut) ve Yerel Anahtarlar (BYOK yerel) nasıl çalışır — anahtarlar nerede saklanır, nasıl güvence altına alınır ve her mod ne zaman kullanılır.
---

# Finansman Kaynakları

Her Lens çalıştırması, yapay zeka çıkarımını ödemek için bir yola ihtiyaç duyar. LenserFight, platformun nasıl çalıştırıldığına bağlı olarak üç finansman modunu destekler.

---

## Chainabit Kredileri

> Yalnızca LenserFight Cloud'da kullanılabilir.

Chainabit, ConectLens ekosistemi için faturalandırma katmanıdır. Chainabit'i finansman kaynağı olarak kullanarak bir Lens çalıştırdığınızda, Chainabit kredi bakiyeniz platformun yapay zeka çıkarım ücretleri üzerinden tahsil edilir — herhangi bir sağlayıcı API anahtarına ihtiyaç duymazsınız.

**Nasıl çalışır:**

1. Ayarlar → Entegrasyonlar bölümünden Chainabit hesabınızı bağlayın.
2. [chainabit.com](https://chainabit.com) adresinden kredi yükleyin.
3. Lens çalıştırmadan önce Finansman panelinde **Chainabit**'i seçin.

**Kredi bakiyesi** geçişte canlı olarak gösterilir. Bakiyeniz sıfıra ulaşırsa, Chainabit otomatik olarak devre dışı bırakılır ve geçiş bulut BYOK anahtarlarınıza geri döner.

**Ne zaman kullanılır:** Sağlayıcı API anahtarlarını yönetmeden sorunsuz, kullandıkça öde deneyimi istiyorsunuz.

---

## LF Bulut Anahtarları (BYOK Bulut)

> Yalnızca LenserFight Cloud'da kullanılabilir.

"Kendi Anahtarınızı Getirin" (BYOK) bulut modu, kendi sağlayıcı API anahtarlarınızı LenserFight hesabınıza eklemenizi sağlar. Anahtarlar **LenserFight'ın sunucularında şifreli olarak saklanır** ve herhangi bir cihazdan veya oturumdan erişilebilir.

**Anahtarlar nasıl saklanır:**

- Depolanmadan önce AES-256 ile şifrelenir.
- Düz metin anahtar asla kaydedilmez.
- Anahtarlar hesabınızla sınırlıdır ve asla paylaşılmaz.

**Anahtar ekleme:** Ayarlar → API Anahtarları → Anahtar Ekle. Farklı sağlayıcılar için birden fazla anahtar ekleyebilirsiniz (Anthropic, OpenAI, Google, Mistral vb.).

**Ne zaman kullanılır:** Mevcut sağlayıcı API hesaplarınız var ve kendi faturalandırmanızla çok cihazlı, yönetilen bir deneyim istiyorsunuz.

---

## Yerel Anahtarlar (BYOK Yerel)

Yerel Anahtarlar **yalnızca makinenizde** yaşar; ana parolayla şifrelenip `~/.lenserfight/keys/` altında saklanır. Tarayıcı şifreli metin **tutmaz**, kalıcı durum **tutmaz** — her okuma loopback üzerinden LenserFight Gateway daemon'una gider.

```
┌──────────────────┐  HTTP (loopback, bearer)        ┌──────────────────┐  fs (0600/0700)
│  apps/web        │ ─────────────────────────────>  │  apps/gateway    │ ────────────>  ~/.lenserfight/keys/
│  (tarayıcı)      │   /keys CRUD + /keys/:id/resolve│  (Node daemon)   │                <id>.json (AES-256-GCM)
└──────────────────┘                                 └──────────────────┘
                                                              ▲
                                                              │ direct fs
                                                              │
                                                     ┌──────────────────┐
                                                     │  apps/cli        │
                                                     │  lf keys *       │
                                                     └──────────────────┘
```

Aynı depo hem tarayıcıya (gateway aracılığıyla) hem de CLI'ye (`lf keys *`) hizmet verir. Önceki tarayıcı-içi IndexedDB tasarımı kaldırıldı.

### Kurulum

İki kısa CLI komutu çalıştırıp tarayıcıya bir token yapıştıracaksınız.

**Bir terminalde — açık bırakın.** Kurulumunuza uyan satırı seçin:

```bash
# Aynı makine — gateway ve tarayıcı aynı kutuda (en yaygın).
lf gateway serve --keys-only

# Tailscale veya LAN — tarayıcı başka bir cihazda, gateway burada.
# 0.0.0.0'a (veya Tailscale IP'nize) bağlanın ki diğer cihaz ulaşabilsin.
lf gateway serve --keys-only --bind 0.0.0.0
```

`--keys-only` identity/session/lenser/kill_switch ön koşullarını atlar — bunlar imzalı koordinasyon özelliği içindir, Yerel Anahtarlar için değil. `--keys-only` ile ayrıca Tailscale onay dosyasına gerek kalmadan loopback dışı bir adrese bağlayabilirsiniz.

**Başka bir terminalde:**

```bash
# Bir kerelik: ana parolayı üret (OS keychain'e kaydedilir) ve
# ~/.lenserfight/keys/ dizinini oluştur.
lf keys init

# Bir anahtar ekle (değer stdin'den okunur; shell geçmişine düşmez).
lf keys add --provider openai --label "Prod"

# Tarayıcının ihtiyaç duyacağı eşleştirme token'ını yazdır.
lf gateway pair --web
```

**Tarayıcıda:**

1. LenserFight web uygulamasını herhangi bir lens, savaş veya workflow sayfasında açın (Finansman paneli olan herhangi bir yer).
2. Finansman panelinde **Yerel Anahtarlar** kutucuğuna tıklayın.
3. `Paste your pairing token below ↓` (eşleştirme token'ınızı aşağıya yapıştırın) kutusu görünür. `lf gateway pair --web` çıktısındaki token'ı buraya yapıştırıp **Pair gateway**'e tıklayın.

`lf keys add` ile eklediğiniz anahtarlar artık seçicide görünecek.

Eşleştirme token'ı yalnızca `sessionStorage`'da yaşar — sekme kapanırsa yeniden `lf gateway pair --web` çalıştırmanız gerekir. Global bir `Ayarlar → Yerel Anahtarlar` sayfası yoktur; eşleştirme girdisi Finansman paneline gömülüdür çünkü Yerel Anahtarlar yalnızca orada kullanılır.

`lf keys list`, `lf keys rotate <id>`, `lf keys remove <id>`, `lf keys doctor` de mevcuttur. Tam yüzey için [CLI referansı](/tr/reference/cli/keys).

### Beklemede şifreleme

Her anahtar `~/.lenserfight/keys/<id>.json` altında kendi zarfında bulunur. AES-256-GCM + scrypt KDF (N=2^15, r=8, p=1). Anahtar başına yeni 16 byte salt ve 12 byte IV; auth-tag her türlü değişikliği yakalar. Dosya modu 0600, dizin modu 0700, sembolik bağlantılar reddedilir.

Ana parola OS keychain'de (`lenserfight-keys` servisi) tutulur. `~/.lenserfight/` altında hiçbir dosyaya yazılmaz. CI için `LENSERFIGHT_KEYS_PASSPHRASE` ortam değişkeni kullanılabilir.

### Tarayıcı ↔ gateway kimlik doğrulaması

- **Origin allow-list**: `lenserfight.com`, alt alan adları, `localhost`, `127.0.0.1`. Diğerleri → 403.
- **Bearer token**: 32 rastgele byte. Tarayıcıda yalnızca `sessionStorage` (sekme kapanınca silinir, cookie değil, localStorage değil).
- **Hız sınırı**: `/keys/:id/resolve` token başına 60/dk, burst 5.
- **Boyut sınırı**: 64 KiB; aşan istekler 413.
- **Yalnız loopback**: Sunucu `0.0.0.0` veya `::`'ye bağlanmayı reddeder.

Detaylı tehdit modeli: [security/local-keys](/tr/explanation/security/local-keys).

### Ollama (yerel modeller)

Ollama yapay zeka modellerini tamamen makinenizde çalıştırır. Yerel Ollama modelleri için **API anahtarı gerekmez** — Ollama `localhost:11434`'e bağlanır. İsteğe bağlı anahtar alanı yalnızca bulut yönlendirmeli Ollama modelleri içindir.

### Eski IndexedDB deposundan geçiş

Daha önceki sürümlerde Yerel Anahtarlar kullandıysanız, eski IndexedDB veritabanı (`lenserfight-local-keys`) yükseltmeden sonraki ilk yüklemede otomatik silinir. Anahtarları `lf keys add` ile yeniden ekleyin. Eski depodan dışa aktarma yolu yoktur.

**Yerel Anahtarlar ne zaman kullanılır:**

- LenserFight'ı kendi sunucunuzda barındırıyorsunuz ve tüm gizli bilgilerin makinenizde kalmasını tercih ediyorsunuz.
- CLI ile tarayıcı arasında geçiş yapıyorsunuz ve sağlayıcı anahtarlarınız için tek bir gerçek kaynak istiyorsunuz.
- LenserFight hesabı oluşturmadan AI sağlayıcılarını test etmek istiyorsunuz.

---

## Karşılaştırma

| Özellik | Chainabit Kredileri | LF Bulut Anahtarları | Yerel Anahtarlar |
|---|---|---|---|
| Anahtarlar nerede | Chainabit hesabı | LenserFight sunucuları (şifreli) | Makinenizdeki `~/.lenserfight/keys/` |
| Sağlayıcı anahtarı gerekli | Hayır | Evet | Evet |
| Cloud'da kullanılabilir | Evet | Evet | Evet (gateway gerekli) |
| Kendi barındırmada kullanılabilir | Hayır | Hayır | Evet |
| Cihazlar arasında erişilebilir | Evet | Evet | Tek makine — ikinci için `~/.lenserfight/keys/` manuel kopyalanır |
| CLI'da çalışır (`lf`) | Chainabit faturalandırması | Bulut anahtar API'si | Evet (`lf keys *`) |
| Tarayıcıya değer mi? | Hayır (sunucu faturalandırması) | Hayır (sunucu tarafı resolve) | Yalnızca uçuş halindeki istek için düz metin; saklanmaz |

---

## Ayrıca bakınız

- [BYOK yürütme kılavuzu](/tr/how-to/battles/byok-execution)
- [BYOK Bulut Savaşı adım adım anlatım](/tr/tutorials/battle-walkthroughs/byok-cloud-battle)
- [Chainabit entegrasyon referansı](/tr/how-to/integrations/chainabit-example)
