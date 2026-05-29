---
title: Vector Search
description: Vektör deposu üzerinde anlamsal benzerlik araması yapar ve en yüksek k eşleşen belgeyi döndürür.
---

# Vector Search

## Genel Bakış

Vector Search düğümü, adlandırılmış bir vektör koleksiyonunu düz metin sorgusu ya da önceden hesaplanmış gömme vektörü kullanarak sorgular. Platform, en yakın komşu araması çalıştırmadan önce metin sorgusunu koleksiyonun varsayılan gömme modeli ile otomatik olarak gömmeye dönüştürür. Sonuçlar kosinüs benzerliğine göre sıralanır; isteğe bağlı puan eşiği ve meta veri yüklemi ile filtrelenir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Vector Search (EN)](../../en/reference/workflow-nodes/vector_search)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `collection` | string | Evet | — | Sorgulanacak vektör deposu koleksiyonunun adı. Platformun vektör deposu kayıt defterinde bulunmalıdır. |
| `query_text` | string | Hayır | — | Düz metin arama sorgusu. `query_embedding` ile karşılıklı olarak dışlar. |
| `query_embedding` | array\<number\> | Hayır | — | Önceden hesaplanmış gömme vektörü. `query_text` ile karşılıklı olarak dışlar. |
| `top_k` | integer | Hayır | `5` | Döndürülecek maksimum sonuç sayısı. Aralık: 1–100. |
| `score_threshold` | number | Hayır | `0.0` | Sonucun dahil edilmesi için gereken minimum kosinüs benzerlik puanı (0–1). |
| `metadata_filter` | object | Hayır | `{}` | Puanlama öncesi belge meta verileriyle eşleştirilen anahtar/değer çiftleri (AND semantiği). |
| `include_metadata` | boolean | Hayır | `true` | Her sonuca depolanan meta veri nesnesinin dahil edilip edilmeyeceği. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `query_text` | string | `query_text` yapılandırma alanı için çalışma zamanı geçersiz kılma. |
| `query_embedding` | array\<number\> | Yukarı akış `embedding` düğümünden iletilen önceden hesaplanmış gömme. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `results` | array\<object\> | Eşleşen belgelerin sıralı listesi. Her öğe `id`, `score`, `content` ve isteğe bağlı `metadata` içerir. |
| `count` | number | Döndürülen toplam sonuç sayısı (eşik filtrelemesinden sonra). |

## Notlar

- `query_text` veya `query_embedding`'den tam olarak biri sağlanmalıdır; yapılandırmada ya da çalışma zamanında girdi portu aracılığıyla.
- Koleksiyon, workflow çalışmadan önce doldurulmalıdır; bu düğüm salt okunurdur ve vektör deposuna hiçbir zaman yazmaz.
- Yüksek trafikli workflow'larda, LLM yanıtlarını bozabilecek düşük kaliteli eşleşmeleri önlemek için `score_threshold`'u `0.6`'nın üzerinde ayarlayın.
