---
title: OSS Lansman Kapsamı
description: LenserFight Community Edition OSS lansmanının kapsamına neyin dahil olduğu ve neyin olmadığı. Stabil yüzeyler, önizleme yüzeyleri, özel alfa ve açıkça kapsam dışı maddeler.
---

# OSS Lansman Kapsamı

Bu sayfa, LenserFight Community Edition'ın OSS lansmanında neye söz verdiğini ve neye bilinçli olarak söz vermediğini tanımlar. Projeyi değerlendirmeden, katkıda bulunmadan ya da kendi sunucunuza kurmadan önce okuyun.

## OSS lansmanının kapsamında

Bu yüzeyler Community Edition içinde etkin (veya önizleme bayrağıyla) gelir. Kendi kurulumunuzla hepsine erişebilirsiniz.

| Yüzey | Durum | Notlar |
|-------|-------|--------|
| Çekirdek iş akışı yürütme (manuel) | **Stabil** | DAG motoru, düğüm yeniden denemeleri, sözleşme doğrulama |
| Lensler ve lens kütüphanesi | **Stabil** | Oluşturma, sürümleme, yayımlama, klonlama |
| CLI (`lf run exec`, `lf execution wait`) | **Stabil** | Yerel ve BYOK model denemeleri |
| Sosyal graf (takip et / bırak) | **Stabil** | |
| Bildirimler (zil, rozet) | **Stabil** | Supabase gerekir |
| CRON zamanlama | **Önizleme** | Supabase `pg_cron` configured for workflow dispatch + pg_cron gerektirir. Varsayılan olarak onay kapısıyla. |
| Onay kapıları | **Önizleme** | Zamanlanmış çalıştırmaları ve yazma sınıfı araç çağrılarını insan kararı verene kadar bloklar |
| Araç çağrısı (salt okur ve yazma sınıfı) | **Önizleme** | Yazma sınıfı araçlar her zaman onay ister |
| Hafıza (profiller, kayıtlar, enjeksiyon) | **Önizleme** | Başarıda yazma kapısı uygulanır |
| SSE çalıştırma olay akışı | **Önizleme** | `GET /v1/runs/:id/events` — Supabase gerektirir |
| Acil durdurma anahtarı (ajan başı + platform) | **Önizleme** | `lf kill-switch on/off/status`, `platform.system_flags` |
| Yerel savaşlar (CLI) | **Önizleme** | `lf battle local init/run/vote` — bulut altyapısı gerekmez |

**Kendi sunucusunda barındıranlar için "Önizleme" ne anlama gelir:** özellik uygulanmış ve test edilmiş durumda. Bir özellik bayrağı veya tam bir Supabase örneği gerektirir. Kabaca olabilecek noktalar barındırabilir. Her iş yükü için üretim seviyesinde kabul edilemez.

## Özel Alfa (yetki gerekir)

Bu yüzeyler kod tabanında bulunur, ancak OSS lansmanı taahhüdüne dahil değildir. Açık bir erişim verme veya barındırılan bir ortam gerektirir.

| Yüzey | Kapı |
|-------|------|
| Bulut savaş arenası | onaylı bulut savaşları + barındırılan Supabase + erişim onayı |
| Savaş BYOK akışı | Bulut savaşları kapısı + BYOK anahtar referansı |
| ELO lider tablosu | Bulut savaşları kapısı |
| Turnuva skorlama | Bulut savaşları kapısı |
| Kamu arenası ve keşif | Bulut savaşları kapısı |

**"Özel Alfa" ne anlama gelir:** kod mevcut, özellik bayrağı var, ama yüzey genel kullanıma açık değil. Henüz kamuya açık SLA, moderasyon sistemi veya kötüye kullanım koruması yok. Moderasyon ve bütünlük kontrolleri tamamlanmadan bu yüzeyi kamuya açık çalıştırmak açıkça önerilmez.

## Kapsam dışı — henüz uygulanmadı

Bunlar yol haritasında izleniyor ancak **henüz üretim için taahhüt edilen bir yüzey** yok. Lansmanda bunları stabil LenserFight yeteneği olarak göstermeyin.

| Yüzey | Neden kapsam dışı |
|-------|-------------------|
| **Stabil** npm konektör SDK (`@lenserfight/sdk` v1) | Alfa adaptör kodu ve RFC repoda (Faz 10); v1 sözleşmesi ve npm yükseltmesi Faz 16 — bkz. [Konektörler](/tr/reference/connectors/index). |
| Konektör pazarı | Stabil herkese açık SDK ve yönetişime bağlı |
| Faturalama ve krediler | Ticari altyapı OSS'in parçası değil |
| Kıyaslama paketi | Değerlendirme çerçevesi henüz birleştirilmedi |
| Gelişmiş analitik | Önizlemedeki yaratıcı analitiğinin ötesinde |
| Tam otonom zamanlamalar (çalıştırma başına onay olmadan) | Moderasyon ve denetim altyapısı olgunlaşana kadar açıkça ertelendi |

## Bunun katkıda bulunanlar için anlamı

- Kapsam dışı yüzeylerin çalıştığını katkıcı odaklı materyallerde iddia etmeyin.
- Özel alfa yüzeylerini genel kullanıma açıkmış gibi tanıtmayın.
- Belge yazarken bu listedeki yüzeylere `::: warning Özel Alfa` veya `::: warning Önizleme` uyarısı ekleyin.
- Uyguladığınız bir özellik özel alfa yüzeyine dokunuyorsa uçtan uca test öncesi erişim onayı talep edin.

## İlgili

- [Bilinen Önizleme Yüzeyleri](/tr/reference/known-preview-surfaces) — kontrol bayrakları ve geri alma talimatları
- [Bilinen Sınırlamalar](/tr/reference/known-limitations) — mevcut kısıtlamaların dürüst listesi
