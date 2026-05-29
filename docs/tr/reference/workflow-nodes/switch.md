---
title: Switch
description: Bir değer veya ifade eşleşmesine göre workflow yürütmesini birkaç adlandırılmış porta yönlendirir.
---

# Switch

## Genel Bakış

`switch` düğümü, gelen veriye karşı bir ifade değerlendirir ve bu veriyi eşleşen çıktı portuna ileterek birden fazla yol üzerinde koşullu dallanmayı sağlar. `if_condition`'ın çok dallı eşdeğeridir: `if_condition` ikili doğru/yanlış bölünmelerini ele alırken `switch` üç veya daha fazla farklı sonucu işler.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Switch (EN)](../../en/reference/workflow-nodes/switch)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `expression` | string | Evet | — | `input` nesnesine karşı değerlendirilen JSONPath ifadesi (ör. `$.status`). |
| `cases` | array | Evet | — | Sıralı durum nesneleri listesi. Her durum `value` (beklenen değer) ve `port` (etkinleştirilecek çıktı portu adı) içerir. |
| `default_port` | string | Hayır | `"default"` | Hiçbir durum eşleşmediğinde etkinleştirilecek çıktı portu adı. |
| `strict_types` | boolean | Hayır | `false` | `true` olduğunda karşılaştırma tür katıdır (`===`). `false` olduğunda `"200"` dizesi `200` sayısıyla eşleşir. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | any | `expression`'ın değerlendirildiği ve eşleşen çıktı portuna değiştirilmeden iletilen veri nesnesi. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| *(durum port adları)* | any | `cases`'taki her giriş için bir çıktı portu. Yürütme başına yalnızca eşleşen port etkinleşir. |
| `default` | any | Hiçbir durum eşleşmediğinde etkinleşir. Aynı `input` verisini taşır. |

## Notlar

- Durumlar sırayla test edilir; netlik ve hafif performans avantajı için en spesifik veya en yaygın durumu öne koyun.
- `switch` düğümü girdi verisini değiştirmez; yalnızca yönlendirici olarak işlev görür.
- `cases`'taki port adları geçerli tanımlayıcı dizeleri (alfasayısal ve alt çizgi) olmalıdır.
- `default_port` atlanır ve hiçbir durum eşleşmezse düğüm sessiz bir işlemsizdir; açık bir `default` portu eklemek önerilir.
