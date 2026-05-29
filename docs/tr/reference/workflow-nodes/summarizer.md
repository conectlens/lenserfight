---
title: Summarizer
description: Yapılandırılmış bir dil modeli kullanarak uzun metni veya belgeleri kısa özete dönüştürür.
---

# Summarizer

## Genel Bakış

Summarizer düğümü, girdi metnini kısaltılmış bir sürüm üretmek amacıyla talimatlı bir dil modeline gönderir. Çıktı biçimi yapılandırılan `format`'a bağlı olarak tutarlı bir paragraf, madde listesi veya tek bir TL;DR cümlesi olabilir. İsteğe bağlı `preserve_entities` bayrağı, modeli adlandırılmış varlıkları (kişiler, kuruluşlar, ürünler, tarihler) korumaya yönlendirir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Summarizer (EN)](../../en/reference/workflow-nodes/summarizer)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `model_key` | string | Evet | — | Özetleme için kullanılacak dil modeli (ör. `"gpt-4o-mini"`, `"claude-3-haiku"`). |
| `max_tokens` | integer | Hayır | `256` | Özetin token cinsinden hedef uzunluğu. Aralık: 32–2048. |
| `format` | string | Hayır | `"paragraph"` | Özet biçimi: `"paragraph"` (akan nesir), `"bullets"` (madde listesi) veya `"tldr"` (tek cümle). |
| `preserve_entities` | boolean | Hayır | `false` | `true` olduğunda model adlandırılmış varlıkları başka sözcüklerle ifade etmemesi veya düşürmemesi için yönlendirilir. |
| `language` | string | Hayır | `"en"` | Çıktı özeti için BCP-47 dil kodu. Girdi dilinden bağımsız olarak bu dilde özet üretilir. |
| `system_prompt` | string | Hayır | — | Özetleme talimatının önüne eklenen özel sistem istemi. Atlanırsa varsayılan prompt kullanılır. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `text` | string | Özetlenecek uzun biçimli metin. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `summary` | string | Yapılandırılan `format`'ta kısaltılmış özet. |
| `usage` | object | LLM çağrısı için token kullanımı: `{ prompt_tokens, completion_tokens, total_tokens }`. |

## Notlar

- Çok kısa girdiler (~100 tokendan az) neredeyse orijinal kadar uzun özet üretebilir; önce girdi uzunluğunu kontrol eden bir `if_condition` eklemeyi değerlendirin.
- `max_tokens` yalnızca tamamlamaya uygulanır; girdi metni seçilen modelin bağlam penceresine katkıda bulunur.
- `format` `"bullets"` olduğunda çıktı `- ` ile başlayan ham bir markdown dizesidir.
- Çok uzun belgeler için önce `text_splitter` ile girdiyi bölün, her parçayı özetleyin, ardından özetleri ikinci geçişte özetleyin.
