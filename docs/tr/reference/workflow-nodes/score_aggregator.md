---
title: Score Aggregator
description: Bir veya daha fazla hakem çalışmasından gelen puanları toplar ve battle için nihai sıralı lider tablosu üretir.
---

# Score Aggregator

## Genel Bakış

Score Aggregator düğümü, bir battle için tüm değerlendirme kayıtlarını — tek bir `judge_battle` düğümü veya birden fazla bağımsız hakem çalışmasıyla üretilmiş olsun — okur ve kriter başına, yarışmacı başına puanları yarışmacı başına tek bir toplam puana indirger. Elde edilen lider tablosu veritabanındaki battle kaydına geri yazılır ve aşağı akışa yayılır.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Score Aggregator (EN)](../../en/reference/workflow-nodes/score_aggregator)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `battle_id` | string | Evet | — | Değerlendirmeleri toplanacak battle'ın UUID'si. Şablon ifadelerini destekler. |
| `aggregation_method` | `"mean"` \| `"median"` \| `"weighted_mean"` | Hayır | `"mean"` | Birden fazla puanı birleştirmek için kullanılan algoritma. |
| `weight_map` | object | Hayır | — | Kriter adını sayısal ağırlığa eşler. Yalnızca `aggregation_method` `"weighted_mean"` olduğunda kullanılır. Ağırlıklar uygulanmadan önce toplamı 1'e normalize edilir. |
| `min_evaluations` | integer | Hayır | `1` | Yarışmacı başına gereken minimum değerlendirme kaydı sayısı. Daha az değerlendirmesi olan yarışmacılar lider tablosundan hariç tutulur. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | İsteğe bağlı yukarı akış verisi. `battle_id`'yi geçersiz kılmayı ya da `judge_battle` tarafından yayılan `evaluations` dizisini kabul eder. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `battle_id`, `aggregated_at`, `leaderboard` (toplam puana göre azalan sırada yarışmacı nesneleri dizisi) ve `excluded_contenders` içerir. |

## Notlar

- `"weighted_mean"` kullanırken `weight_map`'te bulunmayan herhangi bir kriter `0` ağırlığı alır ve toplam puana katkıda bulunmaz.
- Düğüm, kesinleştirilmiş lider tablosunu `battle_results` tablosuna yazar ve battle durumunu `"scored"` olarak günceller.
- `"median"` toplamlamasıyla nihai puan bağları gönderi zaman damgasına göre bozulur (daha erken gönderi kazanır).
- `min_evaluations` `1`'den büyükse bu düğüm, birden fazla AI modeli veya insan değerlendirici ayrı değerlendirme çalışmaları ürettiğinde en çok kullanışlıdır.
