---
title: Webhook Trigger
description: Otomatik oluşturulan webhook URL'sine bir HTTP isteği geldiğinde workflow'u başlatır.
---

# Webhook Trigger

## Genel Bakış

Webhook Trigger düğümü, workflow için benzersiz bir HTTPS uç noktası açar. Harici bir sistem bu URL'ye HTTP isteği gönderdiğinde LenserFight, yapılandırılan `auth` yöntemine göre çağıranı doğrular ve ardından istek gövdesini ve başlıklarını başlangıç yükü olarak ileterek bir workflow çalışması başlatır. Uç nokta URL'si ilk yayımlamada oluşturulur ve workflow'un ömrü boyunca sabit kalır. Bu düğüm her zaman çizgedeki ilk düğümdür.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Webhook Trigger (EN)](../../en/reference/workflow-nodes/webhook_trigger)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `method` | `"POST"` \| `"GET"` | Hayır | `"POST"` | Kabul edilen HTTP yöntemi. Diğer yöntemler `405 Method Not Allowed` alır. |
| `auth` | `"none"` \| `"bearer"` \| `"hmac"` | Hayır | `"none"` | Kimlik doğrulama stratejisi. `"bearer"` `Authorization: Bearer <token>` başlığını doğrular. `"hmac"` HMAC-SHA256 imzasını doğrular. |
| `secret` | string | Hayır | — | Doğrulama için kullanılan token veya HMAC anahtarı. `"bearer"` veya `"hmac"` olduğunda zorunludur. Şifreli olarak saklanır. |
| `response_mode` | `"immediate"` \| `"last_node_output"` | Hayır | `"immediate"` | `"immediate"` hemen `202 Accepted` ve çalışma ID'si döndürür. `"last_node_output"` workflow tamamlanana kadar bağlantıyı açık tutar. |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| — | — | Girdi yok; bu düğüm çalışmayı başlatır. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | object | `body` (ayrıştırılmış JSON veya ham dize), `headers`, `query` (sorgu dizesi parametreleri) ve `received_at` (ISO-8601 zaman damgası) içerir. |

## Notlar

- Webhook URL'si `https://api.lenserfight.io/webhooks/<workflow_id>` desenini izler ve ilk yayımlamadan sonra Studio'da gösterilir.
- HMAC doğrulaması `HMAC-SHA256(secret, ham_istek_gövdesi)` hesaplar ve `X-LF-Signature` başlığındaki hex özeti ile karşılaştırır.
- `response_mode: "last_node_output"` bağlantıyı en fazla 30 saniye açık tutar; daha uzun sürebilecek workflow'lar `"immediate"` kullanmalı ve çalışma durumu uç noktasını yoklamalıdır.
- `auth` `"none"` olduğunda URL'ye sahip herkes workflow'u tetikleyebilir; yazma tetikleyen herhangi bir üretim uç noktası için `"bearer"` veya `"hmac"` tercih edin.
