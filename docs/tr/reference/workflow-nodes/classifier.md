---
title: Classifier
description: Girdi metnini bir dil modeli kullanarak önceden tanımlanmış bir veya daha fazla kategoriye sınıflandırır.
---

# Classifier

## Genel Bakış

Classifier düğümü, girdi metnini ve kategori etiketleri listesini bir dil modeline gönderir; model en uygun etiketi (ya da çok etiketli modda birden fazla etiketi) döndürür. Her tahmin edilen kategori için bir güven puanı üretilir; `confidence_threshold`'un altındaki sonuçlar çıktıdan hariç tutulur. Bu düğüm, sınıflandırma görevleri için geçici prompt mühendisliğinin yerini alır ve tutarlı, yapılandırılmış çıktı üretir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Classifier (EN)](../../en/reference/workflow-nodes/classifier)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `categories` | array\<string\> | Evet | — | Modelin atayabileceği sıralı kategori etiketleri listesi. |
| `model_key` | string | Evet | — | Sınıflandırma için kullanılacak dil modeli (ör. `"gpt-4o-mini"`, `"claude-3-haiku"`). |
| `multi_label` | boolean | Hayır | `false` | `false` olduğunda model tam olarak bir kategori döndürür. `true` olduğunda birden fazla kategori döndürebilir. |
| `confidence_threshold` | number | Hayır | `0.5` | Kategorinin çıktıda yer alması için gereken minimum güven puanı (0–1). |
| `system_prompt` | string | Hayır | — | Alan bağlamı veya sınıflandırma yönergeleri sağlayan özel sistem istemi. |
| `input_path` | string | Hayır | `"$.text"` | Gelen veri nesnesi içinde metin alanını işaret eden JSONPath ifadesi. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | Sınıflandırılacak metni içeren veri nesnesi. `input_path`'teki alan çıkarılır. |
| `text` | string | Kısayol girdi: sınıflandırılacak çıplak dize. Bağlandığında `input_path` yok sayılır. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `label` | string | En üst tahmin edilen kategori etiketi. |
| `labels` | array\<object\> | `confidence_threshold`'un üzerindeki tüm tahmin edilen kategoriler, her biri `{ label, confidence }` içerir; güven azalan sırada sıralanır. |
| `confidence` | number | En üst etiketin güven puanı (0–1). |
| `usage` | object | LLM çağrısı için token kullanımı: `{ prompt_tokens, completion_tokens, total_tokens }`. |

## Notlar

- Tek etiketli modda, ara `output_parser` adımı olmadan workflow'u kategori başına dallandırmak için `label` çıktısını doğrudan `switch` düğümüne bağlayın.
- Güven puanları modele bağımlıdır; eşikleri kullanım durumunuz için deneysel olarak doğrulayın.
- Küçük, sabit etiket kümeleri (2–5 kategori) için düşük maliyetli modeller genellikle karşılaştırılabilir doğruluk sağlar.
- `multi_label: true` kullanırken hiçbir kategori `confidence_threshold`'u aşmazsa `labels` dizisi boş olabilir; bu durumu açıkça ele alın.
