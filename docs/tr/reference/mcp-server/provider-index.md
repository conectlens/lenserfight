---
title: Üçüncü Taraf Sağlayıcı Entegrasyonu — LenserFight MCP Sunucusu
description: Üçüncü taraf bir yapay zeka ürününün LenserFight MCP sunucusunu entegre etmesi için gereken her şey — hızlı başlangıç, bağlantı modları, OAuth 2.1 PKCE ve 31 aracın tamamı için eksiksiz araç referansı.
---

# Üçüncü Taraf Sağlayıcı Entegrasyonu

Bu bölüm, **LenserFight MCP sunucusunu** yapay zeka (AI) ürününüze entegre etmek için ihtiyacınız olan her şeyi kapsar. Entegre edildikten sonra kullanıcılarınız, ürününüzden ayrılmadan doğrudan arayüzünüz üzerinden LenserFight lenslerini, savaşlarını ve iş akışlarını arayabilir, çalıştırabilir ve yönetebilir.

---

## Ne elde edersiniz?

LenserFight MCP sunucusu, [Model Context Protocol (Model Bağlam Protokolü)](https://modelcontextprotocol.io) aracılığıyla, OAuth 2.1 PKCE kimlik doğrulamasına sahip barındırılan bir HTTPS uç noktasından sunulan **31 araç** sunar. Ürününüz bir kez bağlanır; kullanıcılarınız bir kez yetkilendirir; her şey kendiliğinden çalışır.

| Yetenek grubu | Araç Sayısı | Kullanıcılarınız ne yapabilir? |
|---|---|---|
| **Lensler (Lenses)** | 15 | Yeniden kullanılabilir sürümlü istem şablonları kütüphanesine göz atabilir, parametrelerle çalıştırabilir, çatallayabilir ve özelleştirebilir |
| **Savaşlar (Battles)** | 8 | AI-AI veya insan-AI yarışmaları oluşturup değerlendirebilir, skorları okuyabilir, yaşam döngüsünü yönetebilir |
| **İş Akışları (Workflows)** | 8 | Çok adımlı yapay zeka yürütme hatları (pipeline) oluşturabilir, çalıştırmaları başlatabilir, durumu sorgulayabilir, günlükleri (logs) okuyabilir |

---

## Dokümantasyon haritası

Bu entegrasyon bölümü, [Diátaxis çerçevesi](https://diataxis.fr) takip edilerek dört sayfa türünde düzenlenmiştir:

| Sayfa | Tür | Ne zaman okunmalı? |
|---|---|---|
| [Sağlayıcı Hızlı Başlangıç](./provider-quickstart) | **Öğretici (Tutorial)** | Çalışan bir örnekle ürününüzü 5 dakika içinde bağlamak istediğinizde |
| [Entegrasyon Kılavuzu](./provider-integration) | **Açıklama (Explanation)** | Geliştirmeye başlamadan önce mimariyi, taşıma modlarını, RLS'yi ve jeton (token) modelini anlamak istediğinizde |
| [Bağlantı Modları](./provider-connection) | **Nasıl Yapılır (How-to)** | LF Cloud, stdio veya HTTP + tünel için adım adım talimatlara ihtiyaç duyduğunuzda |
| [OAuth ve Kimlik Doğrulama](./provider-oauth) | **Nasıl Yapılır (How-to)** | Tam OAuth 2.1 PKCE akışını, dinamik kaydı ve jeton yaşam döngüsünü uygulamak istediğinizde |
| [31 Aracın Tümü](./provider-tools) | **Referans (Reference)** | Her araç için parametre tablolarına ve geri dönüş şablonlarına ihtiyaç duyduğunuzda |

---

## Uç nokta (Endpoint)

```
https://mcp.lenserfight.com/mcp
```

Bu, kararlı LF Cloud uç noktasıdır. Yerel sunucu gerekmez. Kimlik doğrulaması OAuth akışı üzerinden gerçekleştirilir — kullanıcılarınız LenserFight kimlik bilgileriyle oturum açar ve ürününüzü bir kez yetkilendirir.

---

## Minimum entegrasyon kontrol listesi

- [ ] OAuth istemcinizi kaydedin: `redirect_uri` parametrenizle birlikte `POST /oauth/register` isteği gönderin
- [ ] OAuth 2.1 PKCE yetkilendirme kodu (authorization code) akışını uygulayın
- [ ] Kullanıcı başına `lf_mcp_*` erişim jetonunu (access token) saklayın
- [ ] Her MCP isteğine `Authorization: Bearer lf_mcp_...` üst bilgisini (header) ekleyin
- [ ] Kullanıcıların lenserfight.com adresinde katılım adımlarını tamamlamasını sağlamak için `No Lenser profile found` hatasını ele alın
- [ ] Bağlantının sağlıklı olduğunu doğrulamak için `list_lenses` aracıyla test edin

---

## Sağlık kontrolü (Health Check)

```bash
curl https://mcp.lenserfight.com/health
# {"status":"ok","server":"lenserfight-mcp","version":"1.0.0"}
```

---

## Kullanıcıların neye ihtiyacı var?

Bir kullanıcının entegrasyonunuzu yetkilendirebilmesi için şunlar gerekir:

1. Bir LenserFight hesabı ([lenserfight.com](https://lenserfight.com) adresinden kaydolun)
2. Tamamlanmış bir Lenser profili (katılım sırasında seçilen bir kullanıcı adı/kulp - handle)

Kullanıcı adı seçmemiş kullanıcılar, yetkilendirme sırasında `No Lenser profile found` hatası alacaktır. Bu adımı tamamlamaları için onları lenserfight.com adresine yönlendirin.

---

## Buradan başlayın

<div class="tip custom-block">

**İlk kez mi?** [Sağlayıcı Hızlı Başlangıç](./provider-quickstart) kılavuzu ile başlayın — bu kılavuz kayıt, yetkilendirme ve gerçek bir araç çağrısını 5 dakikadan kısa sürede tamamlamanızı sağlar.

</div>

Ardından, üretim kodunu yazmadan önce mimariyi anlamak için [Entegrasyon Kılavuzu](./provider-integration) belgesini okuyun.
