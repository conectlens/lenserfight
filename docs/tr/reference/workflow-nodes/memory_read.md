---
title: Memory Read
description: Oturum veya uzun süreli bellek deposundan anahtarlı değerleri okur.
---

# Memory Read

## Genel Bakış

Memory Read düğümü, platformun bellek sisteminden önceden depolanmış verileri alır. Bellek, adlandırılmış bir ad alanına (`memory_id`) kapsamlandırılır ve oturum kapsamlı (tek bir workflow çalışmasına bağlı) ya da uzun süreli (çalışmalar arasında kalıcı) olabilir. Önceki bir çalışmadan durumu geri yüklemek veya aynı oturumda daha önce `memory_write` düğümü tarafından yazılan gerçekleri aramak için kullanın.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Memory Read (EN)](../../en/reference/workflow-nodes/memory_read)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `memory_id` | string | Evet | — | İlgili bellek girdilerini gruplandıran ad alanı. Şablon ifadelerini destekler. |
| `key` | string | Hayır | `"*"` | Alınacak belirli bellek anahtarı. `"*"` ad alanındaki tüm anahtarları `limit`'e kadar döndürür. |
| `type` | string | Hayır | `"session"` | Okunacak bellek katmanı: `"session"` (çalışma kapsamlı) veya `"long_term"` (kalıcı). |
| `limit` | integer | Hayır | `10` | `key` `"*"` olduğunda döndürülecek maksimum giriş sayısı. Aralık: 1–100. |
| `default_value` | any | Hayır | `null` | Anahtar bulunamadığında `not_found`'a yönlendirmek yerine `output` portunda yayılan değer. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `memory_id` | string | `memory_id` yapılandırma alanı için isteğe bağlı çalışma zamanı geçersiz kılma. |
| `key` | string | Arama anahtarı için isteğe bağlı çalışma zamanı geçersiz kılma. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | any | Alınan değer (veya anahtar yoksa ve varsayılan yapılandırılmışsa `default_value`). `key` `"*"` olduğunda `{ key, value, updated_at }` nesnelerinden oluşan dizi yayar. |
| `not_found` | null | Anahtar mevcut değil ve `default_value` ayarlı değilse yayılır. Önbellek isabetsizliğinde workflow'u dallandırmak için kullanın. |

## Notlar

- Oturum belleği workflow çalışması tamamlandığında otomatik olarak temizlenir; uzun süreli bellek açıkça silinene veya `memory_write` düğümü tarafından üzerine yazılana kadar kalır.
- Tüm anahtarları okumak (`"*"`) hata ayıklama için yararlıdır ancak çok sayıda girişe sahip ad alanları için üretimde kaçınılmalıdır.
::: v-pre
- `memory_id`, `run.userId` veya `run.sessionId` gibi değişkenlerle parametrelendirilmesine izin veren `{{ifade}}` şablon söz dizimini destekler.
:::
