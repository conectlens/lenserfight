---
title: LenserFight MCP Sunucusu — Sağlayıcı Entegrasyon Kılavuzu
description: LenserFight MCP sunucusunun ne olduğunu, mimari olarak nasıl çalıştığını ve bunu entegre etmenin yapay zeka ürününüze tek bir standart protokol üzerinden lenslere, savaşlara ve iş akışlarına erişim sağlama nedenlerini anlayın.
---

# LenserFight MCP Sunucusu — Sağlayıcı Entegrasyon Kılavuzu

Bu sayfa, LenserFight MCP sunucusunun arkasındaki **kavramları ve mimariyi** açıklamaktadır. Şu soruları yanıtlar: *nedir, nasıl çalışır ve ürününüz bunu entegre ederek ne kazanır?*

Doğrudan bağlantı kurmaya başlamak isterseniz, [Sağlayıcı Hızlı Başlangıç](./provider-quickstart) veya [Bağlantı Modları](./provider-connection) sayfalarına gidin.

---

## LenserFight MCP sunucusu nedir?

LenserFight MCP sunucusu, LenserFight'ın temel yeteneklerini — lensler, savaşlar ve iş akışları — çağrılabilir araçlar olarak herhangi bir MCP uyumlu yapay zeka asistanına veya ürününe sunan bir **Model Context Protocol (Model Bağlam Protokolü - MCP) sunucusudur**.

[MCP](https://modelcontextprotocol.io), yapay zeka uygulamalarının harici veri kaynaklarına ve araçlara nasıl bağlanacağını standartlaştıran açık bir protokoldür. Herhangi bir MCP istemcisi (Claude.ai, Cursor, VS Code eklentileri, özel yapay zeka ürünleri) LenserFight sunucusuna bağlanabilir ve LenserFight'a özel SDK'lar, özel API'ler veya el yapımı entegrasyonlar olmadan 31 aracın tamamını kullanabilir.

**Kullanıcılarınızın bakış açısından**, yapay zeka asistanlarının bir konuşmadan ayrılmadan — ürününüzden hiç çıkmadan — LenserFight kaynaklarına göz atabildiği, bunları çalıştırabildiği ve yönetebildiği kesintisiz bir deneyim elde ederler.

---

## Sunucu ne yapabilir?

Sunucu, üç yetenek grubunda **31 araç** sunar:

| Grup | Araç Sayısı | Kullanıcılarınız ne yapabilir? |
|---|---|---|
| **Lensler (Lenses)** | 15 | Yeniden kullanılabilir istem şablonlarını arayabilir, göz atabilir, oluşturabilir, çalıştırabilir, çatallayabilir ve sürümlendirebilir |
| **Savaşlar (Battles)** | 8 | Skorlama sistemi ile AI-AI veya insan-AI yarışmaları oluşturabilir ve yönetebilir |
| **İş Akışları (Workflows)** | 8 | Çok adımlı yapay zeka yürütme hatları (pipeline) oluşturabilir, çalıştırabilir, izleyebilir ve yeniden deneyebilir |

Her araç, LenserFight arka ucundaki bir Supabase RPC işlevine (function) yetki devreder. Hiçbir araç doğrudan herhangi bir LLM çağırmaz — istemleri çağıran AI modeli (ürününüzün asistanı) yürütür. MCP sunucusu şablonları çözer ve yapılandırılmış veri döndürür; zeka modelin kendisindedir.

Eksiksiz araç referansına bakın: [31 Aracın Tümü](./provider-tools).

---

## Taşıma modları (Transport modes)

Sunucu iki taşıma modunu destekler:

### HTTP (sağlayıcılar için önerilir)

LF Cloud üzerinde barındırılan uç nokta, üçüncü taraf ürünler için standart yoldur. MCP istemciniz uç nokta URL'sine HTTP POST istekleri gönderir; kimlik doğrulaması OAuth 2.1 PKCE akışı tarafından yönetilir.

```
https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
```

Bu bir Supabase Edge Function'dır. Küresel olarak dağıtılmıştır, durumsuzdur (stateless) ve jeton başına hız sınırına (rate-limited) tabidir. Henüz ayrı bir LenserFight API alanı bulunmamaktadır — Supabase URL'si kararlı genel uç noktadır.

### stdio (yerel/gömülü kullanım için)

LenserFight deposu içinde çalışan ürünler için (örneğin, katkıda bulunanlar, yerel geliştirme araçları), sunucu bir alt süreç (child process) olarak başlatılabilir. İstemci stdin/stdout üzerinden iletişim kurar. Bu mod bir service role anahtarı kullanır ve RLS'yi devre dışı bırakır — **üçüncü taraf üretim entegrasyonları için uygun değildir**.

---

## Kimlik doğrulama modeli

MCP sunucusuna yapılan her HTTP isteği bir taşıyıcı jeton (bearer token) taşımalıdır. Sağlayıcılar için geçerli iki jeton türü vardır:

### MCP jetonları (`lf_mcp_*`)

Standart jeton türüdür. Bir kullanıcı ürününüzü yetkilendirdiğinde OAuth 2.1 PKCE akışının sonunda verilir. Biçim: `lf_mcp_<64 onaltılık karakter>`.

MCP jetonları **uzun ömürlüdür** — varsayılan olarak süreleri dolmaz. `lensers.mcp_tokens` tablosunda saklanırlar ve ilgili satır silinerek iptal edilebilirler.

**Çözümleme akışı:**
1. İstemciniz `Authorization: Bearer lf_mcp_<hex>` isteği gönderir.
2. RPC `fn_mcp_resolve_token(token)` işlevi kullanıcının `lenser_id` değerini ve bir Supabase yenileme jetonunu (refresh token) döndürür.
3. Yenileme jetonu, kısa ömürlü bir Supabase JWT ile değiştirilir.
4. Tüm Supabase sorguları bu JWT ile çalışır — Satır Düzeyinde Güvenlik (Row-Level Security - RLS) normal şekilde uygulanır.

Bu, her araç çağrısının **kimliği doğrulanmış kullanıcıyla sınırlı olduğu** anlamına gelir. Kullanıcılar tıpkı LenserFight web uygulamasında olduğu gibi yalnızca sahibi oldukları veya erişim haklarına sahip oldukları kaynakları okuyabilir veya yazabilir.

### Dinamik OAuth istemci kaydı

Uygulamanızı LenserFight'a önceden kaydetmeniz gerekmez. Sunucu, [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) dinamik istemci kaydını uygulamaktadır. İlk bağlantıda, istemciniz yönlendirme URI'si ile birlikte `POST /oauth/register` isteği gönderir ve otomatik olarak bir `client_id` alır.

Tam akış diyagramı ve entegrasyon kontrol listesi için [OAuth ve Kimlik Doğrulama](./provider-oauth) sayfasına bakın.

---

## Kullanıcıların neye ihtiyacı var?

Bir kullanıcının entegrasyonunuzu yetkilendirebilmesi için şunlar gerekir:

1. Bir LenserFight hesabı ([lenserfight.com](https://lenserfight.com) adresinde e-posta + şifre)
2. Tamamlanmış bir Lenser profili (katılım sırasında seçilen bir kullanıcı adı/kulp)

Kaydolan ancak hiçbir zaman kullanıcı adı seçmeyen kullanıcılar, yetkilendirme sırasında `No Lenser profile found` hatası alacaktır. Öncelikle [lenserfight.com](https://lenserfight.com) adresinde katılım adımlarını tamamlamalıdırlar.

---

## RLS ve veri izolasyonu

HTTP uç noktası üzerinden yapılan tüm veri erişimleri **Supabase Satır Düzeyinde Güvenlik (Row-Level Security - RLS)** ile korunmaktadır. Bir kullanıcı ürününüzü yetkilendirdiğinde:

- Kendi lenslerini, savaşlarını ve iş akışlarını okuyabilir.
- Herhangi bir lenser'ın halka açık ve topluluk lenslerini okuyabilir.
- Başka bir kullanıcının özel lenslerini **okuyamaz**.
- Yazma işlemleri (oluşturma, güncelleme, arşivleme, silme) yalnızca sahibi olduğu kaynaklar için geçerlidir.

Ürününüzün ek bir yetkilendirme katmanı uygulaması gerekmez. Hangi araç çağrısı yapılırsa yapılsın, RLS veritabanı düzeyinde zorunlu kılınır.

---

## Oturum yönetimi

Sunucu, ilk istekte bir `mcp-session-id` değeri oluşturur. Aynı konuşma içindeki sonraki isteklerde bu başlığın (header) eklenmesi önerilir — bu, sunucunun bellek içi oturum bağlamını korumasını sağlar ve genel yükü azaltır.

`mcp-session-id` eklenmezse sunucu her istek için durumsuz (stateless) bir oturum oluşturur. Bu doğru çalışır ancak çok adımlı sohbetler için daha az verimlidir.

---

## Keşif belgeleri (Discovery documents)

Sunucu üç standart keşif belgesi yayınlar. Standartlara tam uyumlu herhangi bir OAuth 2.1 veya MCP istemcisi, manuel yapılandırma olmadan bunlardan kurulum yapabilmelidir:

| Uç nokta | Standart | Amaç |
|---|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 | OAuth sunucu meta verileri: yetkilendirme uç noktası, jeton uç noktası, kayıt uç noktası |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 | Korunan kaynak meta verileri |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728 | MCP'ye özel korunan kaynak meta verileri |

---

## Sağlık kontrolü (Health Check)

```bash
curl https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Kaynak kodu

- MCP sunucusu uygulaması: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Edge işlevi: [`supabase/functions/lenserfight-mcp`](https://github.com/conectlens/lenserfight/tree/main/supabase/functions/lenserfight-mcp)
- Protokol özellikleri: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## Sıradaki adımlar

| Yapmak istediğim… | Git… |
|---|---|
| Ürünümü 5 dakika içinde bağlamak | [Sağlayıcı Hızlı Başlangıç](./provider-quickstart) |
| Tüm bağlantı modlarını ayrıntılı olarak anlamak | [Bağlantı Modları](./provider-connection) |
| Sıfırdan OAuth uygulamak | [OAuth ve Kimlik Doğrulama](./provider-oauth) |
| Parametreleriyle birlikte tüm araçları görmek | [31 Aracın Tümü](./provider-tools) |
