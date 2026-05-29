---
title: Agent Execute
description: Otonom bir AI ajanını bir hedef ve araç kümesiyle çalıştırır; nihai yanıtını ve çalışma izini döndürür.
---

# Agent Execute

## Genel Bakış

`agent_execute` düğümü, nihai bir yanıta ulaşana veya adım bütçesini tüketene kadar araçları özerk olarak seçip çağıran bir AI ajanı başlatır. `agent_id` ile kayıtlı bir AI Lenser tanımına işaret edebilir ya da yapılandırma içinde satır içi talimatlar verebilirsiniz. Görev; araştırma, çok adımlı veri getirme veya battle çıktılarını değerlendirme gibi dinamik karar almayı gerektirdiğinde bu düğümü kullanın.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Agent Execute (EN)](../../en/reference/workflow-nodes/agent_execute)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `agent_id` | string | Hayır | — | Ajan tanımı olarak kullanılacak kayıtlı AI Lenser'ın UUID'si. Her ikisi de sağlandığında `instructions`'a göre önceliklidir. |
| `instructions` | string | Hayır | — | Ajan için satır içi sistem istemi / hedef açıklaması. `agent_id` verilmediğinde kullanılır. |
| `tools` | array | Hayır | `[]` | Ajanın çağırmasına izin verilen araç adları listesi. |
| `model_key` | string | Hayır | `"default"` | Model yönlendirme anahtarı. Geçersiz kılmak için `"claude-sonnet-4-6"` gibi belirli bir anahtar kullanın. |
| `max_steps` | number | Hayır | `10` | Ajanın nihai yanıt üretmeye zorlanmadan önce maksimum akıl yürütme adımı sayısı. En fazla `50`. |
| `on_max_steps` | string | Hayır | `"return_partial"` | `max_steps`'e ulaşıldığında davranış: `"return_partial"` kısmi sonucu yayar; `"fail"` hata oluşturur. |

## Girdiler

::: v-pre
| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | Ajanın ilk kullanıcı mesajına enjekte edilen ve `instructions`'da `{{değişken}}` enterpolasyonu için kullanılabilen başlangıç bağlamı. |
:::

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `answer` (ajanın nihai metin yanıtı), `steps_used` ve `tool_calls` (her araç çağrısını özetleyen dizi) içerir. |
| `error` | object | Kurtarılamaz hatada mevcuttur; `message` ve `code` içerir. |

## Notlar

- Ajan tarafından tüketilen her adım çalışma alanınızın AI kullanım kotasından düşer; `max_steps`'i görevin izin verdiği kadar düşük tutun.
- Araç erişimi varsayılan olarak reddedilir: `tools`'ta listelenmemiş araçlar kullanılamaz.
- `output`'taki `tool_calls` dizisi denetim günlüğü için uygundur.
- Deterministik, iyi tanımlanmış görevler için statik düğüm dizisi `agent_execute`'tan daha ucuz ve öngörülebilirdir.
