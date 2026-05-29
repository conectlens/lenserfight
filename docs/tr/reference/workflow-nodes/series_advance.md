---
title: Series Advance
description: Bir battle serisini bir sonraki tura ilerletir veya ilerleme koşulu karşılandığında seri kazananını ilan eder.
---

# Series Advance

## Genel Bakış

Series Advance düğümü, bir battle serisinin mevcut turunun ilerlemeye hazır olup olmadığını değerlendirir. Seri için en son puanlanan sonuçları okur, yapılandırılan `advance_condition`'ı uygular ve koşul karşılandığında seriyi bir sonraki turuna geçirir. Serinin başka turu yoksa bunun yerine seriyi tamamlandı olarak işaretler ve nihai kazanan kaydını yayımlar.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Series Advance (EN)](../../en/reference/workflow-nodes/series_advance)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `series_id` | string | Evet | — | İlerletilecek battle serisinin UUID'si. Şablon ifadelerini destekler. |
| `advance_condition` | `"all_complete"` \| `"threshold"` | Hayır | `"all_complete"` | Turun tamamlandığını belirleyen kural. `"all_complete"` mevcut turdaki her battle puanlanana kadar bekler. `"threshold"` tamamlanan battle yüzdesi `winner_threshold`'a ulaşır ulaşmaz ilerler. |
| `winner_threshold` | number | Hayır | — | `advance_condition` `"threshold"` olduğunda ilerlemeyi tetiklemek için tamamlanması gereken battle yüzdesi (0–100). `"threshold"` seçildiğinde zorunludur. |
| `auto_publish_results` | boolean | Hayır | `false` | `true` olduğunda seri sonuçları ve lider tablosu, ilerleme veya seri tamamlanmasında hemen kamuya açılır. `false` olduğunda bir insan yayımlayana kadar `draft` durumunda kalır. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | İsteğe bağlı yukarı akış verisi. `series_id`'yi geçersiz kılmayı kabul eder. Düğüm, yalnızca yukarı akış düğümü çıktısına güvenmek yerine veritabanından kalıcı battle sonuçlarını da okur. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `series_id`, `action` (`"advanced"`, `"series_complete"` veya `"condition_not_met"`), `current_round`, `next_round` (`null` ise seri tamamlandı), `advanced_at` ve `series_winner` içerir. |

## Notlar

- `action` `"condition_not_met"` olduğunda düğüm başarıyla çıkar ancak seri durumunu değiştirmez. Bu değer üzerinde dallandırmak için bir `condition` düğümü ekleyin.
- `auto_publish_results: true`, tam otomatik seriler için kullanışlıdır ancak manuel inceleme adımını atlar; yalnızca yukarı akış yargılama ardışık düzenine güvenildiğinde etkinleştirin.
- Seri kazanan tespiti, serinin yapılandırılmış ilerleme kurallarını (ör. kümülatif puan, galibiyet sayısı veya ELO deltası) izler.
- Seri son turuna ulaştığında ve `action` `"series_complete"` olduğunda düğüm bir `series.completed` platform olayı tetikler.
