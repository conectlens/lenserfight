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

> Kendi kendine barındırılan LenserFight dağıtımlarında kullanılabilir. Cloud'da açıkça etkinleştirildiğinde tarayıcı taraflı seçenek olarak da kullanılabilir.

Yerel Anahtarlar, AES-GCM 256 bit şifreleme kullanılarak **yalnızca mevcut tarayıcınızda** saklanan API anahtarlarıdır. LenserFight'ın sunucularına hiçbir şey gönderilmez.

### Web UI: tarayıcınızda şifreli

Finansman paneli aracılığıyla Yerel Anahtar eklediğinizde:

- Anahtar, [Web Crypto API](https://developer.mozilla.org/tr/docs/Web/API/Web_Crypto_API) kullanılarak tarayıcıda hemen şifrelenir (AES-GCM, 256 bit).
- Şifreli blob, **IndexedDB**'de (`lenserfight-local-keys` veritabanı) saklanır.
- AES cihaz anahtarı, `localStorage`'da saklanan tarayıcıya özgü bir salt'tan PBKDF2 aracılığıyla türetilir.
- Düz metin anahtar yalnızca yürütme zamanında kısaca bellekte bulunur, diske yazılmaz veya iletilmez.

**Önemli durumlar:**

| Durum | Sonuç |
|---|---|
| Tarayıcı depolamasını / IndexedDB'yi temizliyorsunuz | Anahtarlar kurtarılamaz — yeniden ekleyin |
| Özel / gizli modda tarama | Salt yalnızca oturum süresince geçerlidir; sekme kapandığında anahtarlar kaybolur |
| HTTP (HTTPS veya localhost değil) | Web Crypto kullanılamaz; Yerel Anahtarlar eklenemez |
| Aynı makinede farklı tarayıcı | Erişim yok — anahtarlar cihaz değil tarayıcı başınadır |

### CLI: `.env` veya ortam değişkenleri

`lf` CLI aracılığıyla Lens yürütmelerini çalıştırırken, yerel anahtarlar **ortam değişkenlerinizden** çözümlenir — IndexedDB'den veya herhangi bir LenserFight deposundan değil. CLI hiçbir zaman tarayıcınızın IndexedDB'sini okumaz.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
lf battle exec <battle-id> --byok
```

Kalıcı anahtar yapılandırması için, proje kökünüzdeki bir `.env` dosyasına veya `lf` tarafından otomatik olarak yüklenen `~/.lenserfight/env` dosyasına ekleyin:

```bash
# ~/.lenserfight/env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

`~/.lenserfight/` dizini **asla** LenserFight'ın sunucularıyla senkronize edilmez.

### Ollama (yerel modeller)

Ollama, yapay zeka modellerini tamamen makinenizde çalıştıran özel bir sağlayıcıdır. Yerel Ollama modelleri için **API anahtarı gerekmez** — Ollama `localhost:11434`'e bağlanır. İsteğe bağlı anahtar alanı yalnızca bulut yönlendirmeli Ollama modelleri içindir.

**Yerel Anahtarlar ne zaman kullanılır:**

- LenserFight'ı kendi sunucunuzda barındırıyorsunuz ve tüm gizli bilgilerin makinenizde kalmasını tercih ediyorsunuz.
- LenserFight hesabı oluşturmadan AI sağlayıcılarını test etmek istiyorsunuz.
- Yerel olarak çalışan Ollama aracılığıyla modeller kullanmak istiyorsunuz.

---

## Karşılaştırma

| Özellik | Chainabit Kredileri | LF Bulut Anahtarları | Yerel Anahtarlar |
|---|---|---|---|
| Anahtarlar nerede | Chainabit hesabı | LenserFight sunucuları (şifreli) | Tarayıcınız (IndexedDB) veya `~/.lenserfight/env` |
| Sağlayıcı anahtarı gerekli | Hayır | Evet | Evet |
| Cloud'da kullanılabilir | Evet | Evet | İsteğe bağlı |
| Kendi barındırmada kullanılabilir | Hayır | Hayır | Evet |
| Cihazlar arasında erişilebilir | Evet | Evet | Hayır (tarayıcı yerel) |
| CLI'da çalışır (`lf`) | Chainabit faturalandırması | Bulut anahtar API'si | Ortam değişkenleri |

---

## Ayrıca bakınız

- [BYOK yürütme kılavuzu](/tr/how-to/battles/byok-execution)
- [BYOK Bulut Savaşı adım adım anlatım](/tr/tutorials/battle-walkthroughs/byok-cloud-battle)
- [Chainabit entegrasyon referansı](/tr/how-to/integrations/chainabit-example)
