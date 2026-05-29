---
title: Loop Map
description: Bir dizi üzerinde yineler ve bağlı alt workflow'u her öğe için bir kez çalıştırarak tüm sonuçları toplar.
---

# Loop Map

## Genel Bakış

`loop_map` düğümü, gelen veriden bir dizi çıkarır, her öğe için bir alt workflow yürütmesi başlatır ve sonuçları girdi sırasıyla bir çıktı dizisinde toplar. `Array.prototype.map`'in workflow eşdeğeridir: her öğe bağımsız olarak işlenir ve düğüm yayılmadan önce tüm yinelemelerin tamamlanmasını bekler.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Loop Map (EN)](../../en/reference/workflow-nodes/loop_map)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `items_path` | string | Evet | — | `input` nesnesi içinde yinelenecek diziyi çözümleyen JSONPath ifadesi (ör. `$.contenders`). |
| `item_variable` | string | Hayır | `"item"` | Her dizi öğesinin yineleme girdi nesnesine enjekte edildiği anahtar. |
| `concurrency` | number | Hayır | `1` | Eş zamanlı olarak işlenen öğe sayısı. Minimum `1`, maksimum `10`. |
| `on_item_error` | string | Hayır | `"fail"` | Başarısız yineleme davranışı: `"fail"` döngüyü durdurur; `"skip"` null kaydeder; `"collect_errors"` hata nesnesi ekler. |
| `output_path` | string | Hayır | `"results"` | Toplanan sonuçlar dizisinin düğüm çıktı nesnesine yerleştirileceği anahtar adı. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | `items_path` aracılığıyla çözümlenen yinelenecek diziyi içeren veri nesnesi. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `output_path` ile adlandırılan anahtar altında her yinelemenin çıktısından oluşan dizi içerir. `count`, `succeeded` ve `failed` sayılarını da içerir. |
| `error` | object | Yalnızca `on_item_error` `"fail"` ve bir yineleme başarısız olduğunda mevcuttur. |

## Notlar

- Maksimum `concurrency` değeri `10`'dur; üzerindeki değerler sessizce kırpılır. Çoğu harici API çağrısı için `3`–`5` güvenli bir varsayılandır.
- Çıktı sırası, hangi yinelemelerin önce tamamlandığından bağımsız olarak her zaman girdi sırasını korur.
- Boş diziler (sıfır öğe) geçerlidir: düğüm `output.results = []`, `count = 0`, `succeeded = 0` yayar.
- `on_item_error` `"skip"` ise karşılık gelen dizin `null`'dur; aşağı akış düğümleri null'ları guard etmelidir.
