---
title: Embedding
description: Yapılandırılmış bir gömme modeli kullanarak metin değeri için yoğun vektör gömme üretir.
---

# Embedding

## Genel Bakış

Embedding düğümü, bir gömme modeli API'sini çağırarak metin dizesini sabit boyutlu bir kayan noktalı vektöre dönüştürür. Elde edilen vektör, `output_field` altında workflow veri nesnesine eklenir; böylece aşağı akış düğümleri — en yaygın olarak `vector_search` veya özel `code` düğümü — ikinci bir API çağrısı yapmadan tüketebilir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Embedding (EN)](../../en/reference/workflow-nodes/embedding)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `model_key` | string | Evet | — | Kullanılacak gömme modelinin tanımlayıcısı (ör. `"text-embedding-3-small"`). Platformun model kayıt defterinde kayıtlı olmalıdır. |
| `input_path` | string | Hayır | `"$.text"` | Gelen veri nesnesi içinde metin alanını işaret eden JSONPath ifadesi. |
| `output_field` | string | Hayır | `"embedding"` | Gömme vektörünü tutan çıktı nesnesine eklenen alanın adı. |
| `encoding_format` | string | Hayır | `"float"` | Döndürülen vektörün kodlama biçimi: `"float"` (32 bit kayan noktalı dizi) veya `"base64"`. |
| `dimensions` | integer | Hayır | — | İstenen çıktı boyutluluğu. Yalnızca değişken boyutlara izin veren modeller tarafından desteklenir. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | Gömülecek metni içeren veri nesnesi. `input_path` ile başvurulan alan çıkarılır. |
| `text` | string | Kısayol girdi: gömülecek çıplak dize. Bağlandığında `input_path` yok sayılır. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `output_field` eklenmiş (veya üzerine yazılmış) orijinal girdi nesnesi. |
| `embedding` | array\<number\> | `vector_search`'ün `query_embedding` portuna kolayca bağlanmak üzere ayrıca yayılan ham gömme vektörü. |
| `usage` | object | Token kullanım bilgisi: `{ prompt_tokens: number, total_tokens: number }`. |

## Notlar

- Gömme çağrıları, bağlı AI sağlayıcınızın token kotasından düşer; `usage` çıktı portu veya platformun maliyet panosu aracılığıyla kullanımı izleyin.
- Sonucu doğrudan `vector_search`'e beslerken, ikinci bir gömme çağrısını önlemek için `embedding` çıktı portunu `vector_search`'ün `query_embedding` portuna bağlayın.
- Koleksiyondaki depolanan vektörlerin boyutluluğu bu düğümün ürettiği boyutlulukla eşleşmelidir.
