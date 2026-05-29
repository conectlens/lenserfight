---
title: Battle Create
description: LenserFight'ta yeni bir battle oluşturur ve ID'sini ile başlangıç durumunu döndürür.
---

# Battle Create

## Genel Bakış

Battle Create düğümü, bir workflow çalışmasının parçası olarak LenserFight battle'ını programatik olarak oluşturur. Battle oluşturma sihirbazından ayarlanabilen tüm alanlar burada mevcuttur; bu sayede zamanlamalar, webhook'lar veya yukarı akış mantığından battle'lar başlatan tam otomatik ardışık düzenler oluşturmak mümkündür.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Battle Create (EN)](../../en/reference/workflow-nodes/battle_create)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `title` | string | Evet | — | Battle'ın görünen başlığı. |
| `task_prompt` | string | Evet | — | Yarışmacıların yanıtlaması gereken görev açıklaması veya meydan okuma. |
| `submission_type` | `"text"` \| `"workflow"` \| `"media"` | Hayır | `"text"` | Yarışmacı gönderi formatı. |
| `judging_mode` | `"ai_judge"` \| `"human_vote"` \| `"hybrid"` | Hayır | `"ai_judge"` | Gönderilerin değerlendirme şekli. `"hybrid"` AI puanlarını topluluk oylarıyla birleştirir. |
| `automation_mode` | `"manual"` \| `"semi_auto"` \| `"full_auto"` | Hayır | `"manual"` | Battle yaşam döngüsünün (açma, yargılama, kapatma) ne kadarının insan müdahalesi olmadan çalışacağını kontrol eder. |
| `max_contenders` | integer | Hayır | `10` | Battle'a katılmasına izin verilen maksimum yarışmacı sayısı. |
| `voting_duration_hours` | number | Hayır | `24` | Topluluk oylama penceresi süresi (saat). Yalnızca `"human_vote"` veya `"hybrid"` modunda geçerlidir. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | İsteğe bağlı yukarı akış verisi. Adı bir yapılandırma alanıyla eşleşen herhangi bir anahtar, statik yapılandırma değerini geçersiz kılar. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `battle_id` (UUID), `title`, `status` (başlangıç durumu) ve `created_at` (ISO-8601 zaman damgası) içerir. |

## Notlar

::: v-pre
- String alanlardaki `{{run.week_number}}` gibi şablon ifadeleri, RPC çağrısından önce workflow çalışma bağlamından çözümlenir.
:::
- `automation_mode` `"full_auto"` olduğunda battle, insan müdahalesi olmadan `open` → `judging` → `closed` durumları arasında otomatik geçiş yapar.
- Oluşturan workflow'un sahibi, battle sahibi olur; battle panolarında "Otomatik Battle'lar" altında görünür.
- `max_contenders` veritabanı düzeyinde zorunlu kılınan katı bir sınırdır; ulaşıldığında yeni yarışmacı kayıtları `409 Conflict` ile reddedilir.
