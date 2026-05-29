---
title: Code
description: Korumalı bir çalışma zamanında kullanıcı tarafından sağlanan JavaScript kod parçacığını çalıştırır.
---

# Code

## Genel Bakış

`code` düğümü, korumalı bir V8 izolesi içinde isteğe bağlı JavaScript çalıştırır; böylece workflow'lara hiçbir yerleşik düğümün karşılamadığı veri dönüştürme, değer hesaplama veya mantık yürütme imkânı verir. Betik, yukarı akış `input` nesnesini `input` olarak alır ve sonucu `output`'a atayarak iletmelidir.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Code (EN)](../../en/reference/workflow-nodes/code)

## Yapılandırma

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `code` | string | Evet | — | Çalıştırılacak JavaScript kaynağı. `input` değişkeni önceden bağlıdır; sonucu `output`'a atayın. |
| `language` | string | Hayır | `"javascript"` | Çalışma dili. Şu anda yalnızca `"javascript"` kabul edilir. |
| `timeout_ms` | number | Hayır | `5000` | Betiğin zorla sonlandırılmadan önce çalışabileceği maksimum milisaniye. |
| `memory_limit_mb` | number | Hayır | `64` | İzolenin ayırabildiği maksimum heap belleği (megabayt). |

## Girdiler

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `input` | any | Betik içinde `input` değişkeni olarak enjekte edilen yukarı akış verisi. |

## Çıktılar

| Bağlantı Noktası | Tür | Açıklama |
|---|---|---|
| `output` | any | Betik içinde `output` değişkenine atanan değer. JSON serileştirilebilir herhangi bir tür olabilir. |
| `error` | object | Betik işlenmemiş bir istisna fırlatır veya zaman aşımına uğrarsa mevcuttur. |

## Notlar

- Betik çıkmadan önce `output`'u atamalıdır; atanmazsa düğüm `null` yayar ve devam eder. Üst düzeyde `return` ifadesi gerekmez.
- `console.log()` çağrıları yakalanır ve hata ayıklama için workflow çalışma günlüklerinde görünür.
- Korumalı alanın `fetch`, `require`, `process` veya herhangi bir Node.js yerleşiğine erişimi yoktur; saf hesaplama ve JSON manipülasyonu amaçlanmıştır.
- `input` değişkenini mutasyona uğratan betikler yukarı akış düğümlerini etkilemez — `input`, yukarı akış çıktısının derin bir kopyasıdır.
