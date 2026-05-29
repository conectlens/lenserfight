---
title: HTTP Request
description: Herhangi bir URL'ye giden HTTP çağrısı yapar ve durumu, başlıkları ile gövdeyi döndürür.
---

# HTTP Request

## Genel Bakış

`http_request` düğümü, harici bir uç noktaya tek bir HTTP isteği gönderir ve yanıtı workflow'a aktarır. Tüm yaygın yöntemleri (GET, POST, PUT, PATCH, DELETE), özel başlıkları ve isteğe bağlı gövdeyi destekler. Üçüncü taraf REST API'lerini çağırmak, webhook'lara olay göndermek veya aşağı akış düğümlerini besleyen uzak veri almak için kullanın.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [HTTP Request (EN)](../../en/reference/workflow-nodes/http_request)

## Yapılandırma

::: v-pre
| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `url` | string | Evet | — | Şema ve yol dahil tam URL. Workflow değişkenlerinden `{{değişken}}` enterpolasyonunu destekler. |
| `method` | string | Evet | `"GET"` | HTTP yöntemi: `GET`, `POST`, `PUT`, `PATCH` veya `DELETE`. |
| `headers` | object | Hayır | `{}` | İstek başlıklarının anahtar-değer eşlemesi. |
| `body` | string | Hayır | — | Ham dize olarak istek gövdesi. GET ve DELETE için yok sayılır. |
| `timeout_ms` | number | Hayır | `10000` | Düğüm başarısız olmadan önce yanıt bekleme süresi (milisaniye). |
| `follow_redirects` | boolean | Hayır | `true` | HTTP 3xx yönlendirmelerini otomatik olarak takip edip etmeyeceği. |
| `response_encoding` | string | Hayır | `"utf-8"` | Yanıt gövdesi için karakter kodlaması: `"utf-8"` veya `"base64"`. |
:::

## Girdiler

::: v-pre
| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | object | `url`, `headers` ve `body`'deki `{{değişken}}` enterpolasyonu için kullanılabilir yukarı akış verisi. |
:::

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `status` (sayı), `headers` (nesne) ve `body` (dize veya ayrıştırılmış JSON) içerir. |
| `error` | object | Ağ hatası veya zaman aşımında mevcuttur; `message`, `code` ve `status` içerir. |

## Notlar

- HTTP 4xx ve 5xx yanıtları otomatik olarak hata sayılmaz; `output.status` durum kodunu içerir. Gerekirse aşağıya bir `switch` veya `if_condition` düğümü ekleyin.
::: v-pre
- API anahtarları gibi ortam sırları, `headers` veya `body`'ye sabit kodlamak yerine `{{env.DEĞİŞKEN_ADI}}` ile referans verilmelidir.
:::
- Düğüm, bir iş çakışanını süresiz engellemesini önlemek için `timeout_ms` ne olursa olsun 60 000 ms üst sınırını uygular.
- 10 MB'ın üzerindeki yanıt gövdeleri kesilir; büyük dosya aktarımları için `object_storage_upload` / `object_storage_download` düğümlerini kullanın.
