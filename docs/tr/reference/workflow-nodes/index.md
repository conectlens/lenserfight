---
title: "Workflow Düğümleri Referansı"
description: "Tüm workflow düğüm türleri için eksiksiz referans."
---

# Workflow Düğümleri Referansı

LenserFight workflow'ları, yönlendirilmiş asiklik bir çizgede (DAG) birbirine bağlanan **düğümlerden** oluşur. Her düğümün sabit bir `type` tanımlayıcısı, tiplendirilmiş bir `config` bloğu ve standartlaştırılmış `inputs`/`outputs` bağlantı noktaları bulunur.

> Tam dokümantasyon için İngilizce sayfaya bakınız: [Workflow Nodes Reference (EN)](../../en/reference/workflow-nodes/index)

## El ile Yazılmış Referans Sayfaları

| Düğüm | Açıklama |
|---|---|
| [Lens Execute](/tr/reference/workflow-nodes/lens_execute) | Sürümlü bir Lens'i girdi ile çalıştırır ve çıktısını döndürür. |
| [Prompt Template](/tr/reference/workflow-nodes/prompt_template) | Çalışma zamanı değişkenlerini Jinja2/Handlebars şablonuna işler. |
| [HTTP Request](/tr/reference/workflow-nodes/http_request) | Kimlik doğrulamalı veya anonim HTTP çağrısı yapar ve yanıtı ayrıştırır. |
| [Code](/tr/reference/workflow-nodes/code) | Korumalı alanda JavaScript çalıştırır ve sonuç döndürür. |
| [Switch](/tr/reference/workflow-nodes/switch) | Bir ifadeye göre N etiketli kenara yönlendirir. |
| [Loop Map](/tr/reference/workflow-nodes/loop_map) | Bir dizi üzerinde yayar ve sonuçları paralel veya sıralı olarak toplar. |
| [Agent Execute](/tr/reference/workflow-nodes/agent_execute) | Kayıtlı bir AI Lenser ajanını çağırır ve yanıtını bekler. |
| [Output Parser](/tr/reference/workflow-nodes/output_parser) | Ham metinden yapılandırılmış veriyi şema veya regex ile çıkarır. |
| [Vector Search](/tr/reference/workflow-nodes/vector_search) | Vektör dizinini sorgular ve en yakın K komşuyu döndürür. |
| [Memory Read](/tr/reference/workflow-nodes/memory_read) | Ajanın uzun süreli bellek deposundan girdileri alır. |
| [Memory Write](/tr/reference/workflow-nodes/memory_write) | Ajanın uzun süreli bellek deposuna anahtar/değer çiftleri yazar. |
| [Embedding](/tr/reference/workflow-nodes/embedding) | Metin veya çok modlu girdi için vektör gömme üretir. |
| [Summarizer](/tr/reference/workflow-nodes/summarizer) | Uzun metni seçilen model ile kısa özete dönüştürür. |
| [Classifier](/tr/reference/workflow-nodes/classifier) | Girdiye sabit etiket kümesinden bir veya daha fazla etiket atar. |
| [Manual Trigger](/tr/reference/workflow-nodes/manual_trigger) | Kullanıcı isteğiyle UI veya CLI'dan workflow başlatır. |
| [Schedule Trigger](/tr/reference/workflow-nodes/schedule_trigger) | CRON zamanlaması veya sabit aralıkta workflow başlatır. |
| [Webhook Trigger](/tr/reference/workflow-nodes/webhook_trigger) | Gelen HTTP webhook'u tetiklendiğinde workflow başlatır. |
| [Battle Create](/tr/reference/workflow-nodes/battle_create) | Programatik olarak yeni bir battle oluşturur ve yapılandırır. |
| [Judge Battle](/tr/reference/workflow-nodes/judge_battle) | Gönderilen battle yanıtlarına AI veya insan değerlendirmesi uygular. |
| [Score Aggregator](/tr/reference/workflow-nodes/score_aggregator) | Birden fazla hakemden gelen kısmi puanları nihai sonuca birleştirir. |
| [Series Advance](/tr/reference/workflow-nodes/series_advance) | Battle serisi aktif yarışmacı kümesini ilerletir. |
