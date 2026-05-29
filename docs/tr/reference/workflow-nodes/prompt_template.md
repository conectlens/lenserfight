---
title: Prompt Template
description: Çalışma zamanı değişkenlerini bir şablona işleyerek parametreli prompt dizesi oluşturur.
---

# Prompt Template

## Genel Bakış

::: v-pre
`prompt_template` düğümü, `{{değişken}}` yer tutucuları içeren bir dize şablonu alır ve yukarı akış workflow verisindeki veya statik varsayılanlardan gelen değerleri ikame ederek tam işlenmiş bir dize üretir. Genellikle bir modele gönderilecek metni oluşturmak için `lens_execute` veya `code` düğümünden hemen önce yerleştirilir.
:::

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Prompt Template (EN)](../../en/reference/workflow-nodes/prompt_template)

## Yapılandırma

::: v-pre
| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `template` | string | Evet | — | Şablon dizesi. Değişken adlarını çift süslü paranteze alın: `{{değişken_adı}}`. |
| `variables` | object | Hayır | `{}` | Şablon değişkenleri için statik varsayılan değerler. `input` port verisindeki eşleşen anahtarlar bunları geçersiz kılar. |
| `strict` | boolean | Hayır | `false` | `true` olduğunda, çözümlenemeyen yer tutucu varsa düğüm başarısız olur. `false` olduğunda boş dizeyle değiştirilir. |
| `trim_output` | boolean | Hayır | `true` | İşlenen dizeden baş ve son boşlukları kaldırır. |
:::

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | İşleme sırasında `variables`'ı geçersiz kılan veya tamamlayan anahtar-değer çiftleri. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | string | Tam olarak işlenmiş şablon dizesi. |
| `error` | object | Yalnızca `strict` `true` ve bir veya daha fazla yer tutucu çözümlenemediğinde mevcuttur. |

## Notlar

- Şablon değişkenleri, `variables` (düşük öncelik) ile `input` nesnesi (yüksek öncelik) birleştirilerek çözümlenir; yukarı akış verisi her zaman statik varsayılanları geçersiz kılar.

::: v-pre
- Nokta yolu erişimi herhangi bir derinlik için çalışır: `{{a.b.c}}`, `a` içindeki `b` içindeki `c` iç içe anahtarını çözümler. Dizi dizinleme (`{{items.0}}`) de desteklenir.
:::

- Bu düğüm hiçbir AI modeli çağırmaz; yalnızca dize enterpolasyonudur ve ihmal edilebilir gecikme ekler.
