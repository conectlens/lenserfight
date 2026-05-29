---
title: Lens Execute
description: Kayıtlı bir Lens'i (AI fonksiyonu) ID'si ile çalıştırır ve çıktısını döndürür.
---

# Lens Execute

## Genel Bakış

`lens_execute` düğümü, LenserFight üzerinde yayımlanmış herhangi bir Lens'i ID'si ile çağırır; yapılandırılmış parametreleri iletir ve Lens'in çıktısını workflow verisi olarak alır. Varsayılan olarak en son yayımlanmış sürümü kullanır; tekrarlanabilir çalışmalar için belirli bir sürüme sabitlenebilir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Lens Execute (EN)](../../en/reference/workflow-nodes/lens_execute)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `lens_id` | string | Evet | — | Çalıştırılacak Lens'in UUID'si. |
| `input_map` | object | Hayır | `{}` | Yukarı akış çıktı yollarını Lens parametre adlarıyla eşler. Değerler JSONPath ifadesidir. |
| `version` | string | Hayır | `"latest"` | Sabitlenmiş sürüm dizesi (ör. `"3"`) veya `"latest"`. |
| `timeout_ms` | number | Hayır | `30000` | Lens yanıt vermeden önce beklenecek maksimum milisaniye. |
| `on_error` | string | Hayır | `"fail"` | Hata davranışı: `"fail"` workflow'u durdurur; `"continue"` `null` çıktı iletir. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | `input_map` ifadeleri için kullanılabilir yukarı akış verisi. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | any | Lens tarafından döndürülen ham çıktı. |
| `metadata` | object | Çalışma meta verisi: `run_id`, `version_used`, `duration_ms`, `model_key`. |
| `error` | object | Yalnızca `on_error` `"continue"` ve Lens başarısız olduğunda mevcuttur. |

## Notlar

- `input_map` değerleri, tam workflow durum nesnesi üzerinde değerlendirilen JSONPath ifadeleridir. Çözümlenemeyen bir yol o parametre için `null` enjekte eder.
- Lens tarafından gerektirilen ancak `input_map` ile karşılanmayan parametreler Lens şemasındaki varsayılan değerleri kullanır; eksik zorunlu parametreler yürütme başlamadan önce doğrulama hatasına yol açar.
- `version`'ı açık bir sayıya sabitlemek, bir Lens yazarı kampanya ortasında yeni sürüm yayımladığında sessiz davranış değişikliklerini önler.
- Her `lens_execute` çağrısı planınızın Lens çalışma kotasından düşer; kota kullanımını öngörülebilir tutmak için fan-out kopyaları yerine tek bir `lens_execute` alt düğümüyle `loop_map` kullanın.
