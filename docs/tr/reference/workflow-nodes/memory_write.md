---
title: Memory Write
description: Oturum veya uzun süreli bellek deposuna anahtarlı bir değer yazar ya da günceller.
---

# Memory Write

## Genel Bakış

Memory Write düğümü, isteğe bağlı JSON değerlerini platformun bellek sistemine adlandırılmış bir ad alanı ve anahtar altında kalıcı hale getirir. Aynı `memory_id` + `key` kombinasyonuna sahip bir giriş zaten varsa üzerine yazılır (upsert semantiği). Oturum kapsamlı girdiler isteğe bağlı TTL taşıyabilir. Konuşma geçmişini denetim noktası olarak kaydetmek, hesaplanan sonuçları önbelleğe almak veya çok turlu bir workflow genelinde durum biriktirmek için yaygın olarak kullanılır.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Memory Write (EN)](../../en/reference/workflow-nodes/memory_write)

## Yapılandırma

::: v-pre
| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `memory_id` | string | Evet | — | İlgili bellek girdilerini gruplandıran ad alanı. `{{ifade}}` şablon söz dizimini destekler. |
| `key` | string | Evet | — | Ad alanı içinde değerin depolandığı benzersiz anahtar. |
| `value` | any | Hayır | — | Yazılacak statik JSON değeri. Atlanırsa düğüm değeri çalışma zamanında `value` girdi portundan okur. |
| `type` | string | Hayır | `"session"` | Yazılacak bellek katmanı: `"session"` (çalışma kapsamlı) veya `"long_term"` (kalıcı). |
| `ttl_seconds` | integer | Hayır | — | Saniye cinsinden yaşam süresi. Yalnızca `type` `"session"` olduğunda geçerlidir. |
| `merge` | boolean | Hayır | `false` | `true` ve mevcut değer nesne ise gelen değer derin birleştirilir; diziler her zaman değiştirilir. |
:::

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `value` | any | Yazılacak değer. Çalışma zamanında `config.value`'yu geçersiz kılar. |
| `memory_id` | string | `memory_id` yapılandırma alanı için isteğe bağlı çalışma zamanı geçersiz kılma. |
| `key` | string | Depolama anahtarı için isteğe bağlı çalışma zamanı geçersiz kılma. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `memory_id`, `key`, `type` ve `written_at` (ISO-8601 zaman damgası) içeren onay nesnesi. |

## Notlar

- `ttl_seconds` yalnızca `"session"` tipi girdiler için geçerlidir; `"long_term"` girdide ayarlamak etkisizdir ve derleme zamanı uyarısı oluşturur.
- `merge: true` yalnızca depolanan değer düz veya sığ nesne olduğunda güvenlidir.
- Yuvarlanan bir konuşma penceresi uygulamak için `memory_read` ile geçmişi okuyun, `json_transform` düğümünde yeni mesajı ekleyin, ardından bu düğümle sonucu geri yazın.
