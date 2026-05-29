---
title: Output Parser
description: Bir LLM'nin ham metin çıktısını doğrulanmış, yapılandırılmış bir veri nesnesine dönüştürür.
---

# Output Parser

## Genel Bakış

Output Parser düğümü, bir dil modeli tarafından üretilen ham metni alır ve JSON Schema ile tanımlanan yapılandırılmış, tiplendirilmiş bir nesneye dönüştürür. JSON, YAML ve Markdown tablo kaynak biçimlerini destekler. `strict` mod etkinleştirildiğinde ayrıştırma hatalarında düğüm workflow'u durdurur; aşağı akış düğümleri garantili şekle bağımlıysa bu doğru seçimdir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Output Parser (EN)](../../en/reference/workflow-nodes/output_parser)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `schema` | object | Evet | — | Hedef çıktı şeklini tanımlayan JSON Schema (draft-07). Ayrıştırma sonrası tüm özellikler doğrulanır. |
| `format` | string | Hayır | `"json"` | Modelin ham metninin beklenen biçimi: `"json"`, `"yaml"` veya `"markdown_table"`. |
| `strict` | boolean | Hayır | `false` | `true` olduğunda ayrıştırma veya doğrulama hatası `error` portuna yönlendirir. `false` olduğunda en iyi çabaya dayalı kısmi nesne yayılır. |
| `trim_code_fences` | boolean | Hayır | `true` | Ayrıştırmadan önce baş/son markdown kod çitleri (`` ``` ``) kaldırılır. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `text` | string | Bir LLM veya önceki düğümden ham metin çıktısı. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | Ayrıştırılmış ve şema doğrulamalı nesne. Şekli `config.schema` ile eşleşir. |
| `error` | object | Yalnızca `strict: true` ve ayrıştırma başarısız olduğunda yayılır. `message` ve `raw` (orijinal metin) içerir. |

## Notlar

- `format` `"markdown_table"` olduğunda her satır, başlık satırı anahtar olarak kullanılan bir nesne olur; yalnızca metindeki ilk tablo ayrıştırılır.
- `schema` alanı workflow kaydetme sırasında doğrulanır; geçersiz şema workflow yayımlamasını engeller.
- Katı olmayan modda `_parseWarnings`, her doğrulama ihlaline ait dize dizisidir; şekle güvenmeden önce varlığını kontrol edin.
