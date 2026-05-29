---
title: Schedule Trigger
description: Yinelenen bir cron zamanlamasında workflow'u otomatik olarak tetikler.
---

# Schedule Trigger

## Genel Bakış

Schedule Trigger düğümü, standart beş bölümlü bir cron ifadesiyle tanımlanan sabit aralıklarda bir workflow başlatır. LenserFight, ifadeyi yapılandırılan saat diliminde değerlendirir ve zamanlama her tetiklendiğinde bir çalışma kuyruğa alır. Zamanlanmış bir çalışma devam ediyorken bir sonraki tik geldiğinde platform, yeni çalışmayı atlayıp atlamayacağına ya da sıraya alıp almayacağına karar vermek için `max_concurrent_runs`'a uyar. Bu düğüm her zaman çizgedeki ilk düğümdür.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Schedule Trigger (EN)](../../en/reference/workflow-nodes/schedule_trigger)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `cron` | string | Evet | — | Beş bölümlü cron ifadesi (`dakika saat ay-günü ay haftanın-günü`). Örnek: `"0 9 * * 1"` her Pazartesi 09:00'da çalışır. |
| `timezone` | string | Hayır | `"UTC"` | Cron ifadesini çözümlemek için kullanılan IANA saat dilimi adı. Örnek: `"Europe/Istanbul"`. |
| `enabled` | boolean | Hayır | `true` | Düğümü silmeden zamanlamayı duraklatmak için `false` olarak ayarlayın. |
| `max_concurrent_runs` | integer | Hayır | `1` | Aynı anda izin verilen maksimum devam eden çalışma sayısı. Sınıra ulaşıldığında gelen tikler atılır. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| — | — | Girdi yok; bu düğüm çalışmayı başlatır. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | Bu çalışmayı tetikleyen tikin `scheduled_at` (ISO-8601 zaman damgası) ve `timezone` (çözümlenen saat dilimi dizesi) değerlerini içerir. |

## Notlar

- Cron ifadeleri POSIX kuralını izler: alanlar `dakika saat gün ay haftagünü`'dür. Saniyeler desteklenmez.
- `enabled` `false` olarak ayarlanırsa zamanlama askıya alınır ancak tüm geçmiş ve yapılandırma korunur.
- `max_concurrent_runs`'ı `1`'den büyük ayarlamak idempotent workflow'lar için kullanışlıdır, ancak durum yazan workflow'larda yarış koşullarından kaçınmak için dikkatli kullanılmalıdır.
- Platform tik başına en az bir kez teslim garantisi verir ancak tam olarak bir kez değil; aşağı akış düğümlerini idempotent tasarlayın.
