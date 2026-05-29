---
title: Manual Trigger
description: Kullanıcı UI'da tetikleme düğmesine açıkça tıkladığında workflow'u başlatır.
---

# Manual Trigger

## Genel Bakış

Manual Trigger düğümü, otomatik olarak değil açık kullanıcı isteğiyle bir workflow başlatır. Workflow yayımlandığında LenserFight, yapılandırılmış etiket ve açıklamayı kullanan bir düğme (veya satır içi form) oluşturur. `require_input` etkinleştirildiğinde yürütme başlamadan önce kullanıcının `input_schema` ile tanımlanan bir formu doldurması gerekir. Bu düğüm her zaman çizgedeki ilk düğümdür.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Manual Trigger (EN)](../../en/reference/workflow-nodes/manual_trigger)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `label` | string | Hayır | `"Run"` | UI'da gösterilen tetikleme düğmesinin görünen metni. |
| `description` | string | Hayır | — | Workflow'un ne yaptığını açıklayan, düğmenin altında görüntülenen kısa yardım metni. |
| `require_input` | boolean | Hayır | `false` | `true` olduğunda yürütme başlamadan önce kullanıcının form göndermesi gerekir. |
| `input_schema` | object | Hayır | — | Girdi formunu açıklayan JSON Schema (draft-07). `require_input` `true` olduğunda zorunludur. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| — | — | Girdi yok; bu düğüm çalışmayı başlatır. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `triggered_at` (ISO-8601 zaman damgası) ve `require_input` `true` olduğunda gönderilen değerleri tutan `form_data` anahtarını içerir. |

## Notlar

- Bir workflow yalnızca bir tetikleme düğümü içerebilir; ikincisi yayımlama zamanında doğrulama hatasına yol açar.
- `require_input` `false` olduğunda aşağı akış düğümleri `form_data: null` alır; çizginiz form değerlerinde dallanıyorsa buna karşı guard ekleyin.
- Tetikleme düğmesi, workflow'da en az `viewer` iznine sahip herhangi bir kullanıcı tarafından görülebilir; yürütme hâlâ `runner` veya daha yüksek izin gerektirir.
