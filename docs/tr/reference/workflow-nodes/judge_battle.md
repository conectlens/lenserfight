---
title: Judge Battle
description: Bir battle'daki tüm yarışmacı gönderilerini değerlendirmek ve puanlamak için AI hakem çağırır.
---

# Judge Battle

## Genel Bakış

Judge Battle düğümü, belirtilen battle için kabul edilen her gönderiyi alır ve tanımlı bir puanlama kriterleri kümesine göre değerlendirmek üzere bir AI hakem modeline gönderir. Her kriter bağımsız olarak sayısal ölçekte puanlanır ve ham kriter başına puanlar aşağı akış toplamlaması için yayılır. `parallel_evaluation` etkinleştirildiğinde tüm gönderiler duvar saati süresini minimize etmek için eş zamanlı değerlendirilir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Judge Battle (EN)](../../en/reference/workflow-nodes/judge_battle)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `battle_id` | string | Evet | — | Yargılanacak battle'ın UUID'si. Statik değer veya yukarı akış düğümü çıktısını referans alan şablon ifadesi olabilir. |
| `model_key` | string | Evet | — | Kullanılacak hakem modelinin tanımlayıcısı (ör. `"claude-sonnet-4-6"`, `"gpt-4o"`). |
| `criteria` | array of objects | Evet | — | Puanlama boyutları. Her öğe `name` (string) ve `description` (string) içermelidir. |
| `max_score_per_criterion` | integer | Hayır | `10` | Her kriterin puanı için üst sınır. |
| `parallel_evaluation` | boolean | Hayır | `false` | `true` olduğunda tüm gönderiler eş zamanlı değerlendirilir. Verimi artırır ancak oran sınırlama riskini de artırır. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | İsteğe bağlı yukarı akış verisi. `battle_id` anahtarı statik yapılandırma değerini geçersiz kılar. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `battle_id`, `judged_at` (ISO-8601 zaman damgası) ve `evaluations` — her gönderi için bir nesne içeren dizi, her biri `contender_id`, `submission_id` ve `scores` (kriter adını sayısal puana eşleyen nesne) içerir. |

## Notlar

- Her kriter açıklaması doğrudan hakemin sistem istemine enjekte edilir; modelin niyeti tahmin etmesi gerekmeyecek şekilde açık ve bağımsız açıklamalar yazın.
- `parallel_evaluation: true`, çok sayıda gönderisi olan battle'lar için gecikmeyi önemli ölçüde azaltabilir, ancak her paralel çağrı bağımsız olarak oran sınırlarından düşer.
- Bu düğüm yürütüldüğünde battle'ın kabul edilmiş gönderisi yoksa düğüm başarılı olur ve `evaluations: []` yayar.
- BYOK çalışma alanları `model_key`'i kendi sağlayıcı kimlik bilgilerine karşı çözer; anahtar yapılandırılmış bir sağlayıcıyla eşleşmezse düğüm hemen başarısız olur.
