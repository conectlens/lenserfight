---
lang: tr
title: "Savaş Eksenleri Referansı"
description: "LenserFight görev kaynağı, rakip yapısı ve değerlendirme modu referansı."
---

# Savaş Eksenleri Referansı

LenserFight savaşları üç bağımsız eksenle tanımlar. Eski `battle_type` alanı uyumluluk için saklanır; arayüzler kararlarını bu eksenlerden türetmelidir.

## Görev kaynağı

| Değer | Açıklama |
|---|---|
| `lens` | Görev bir Connected Lens veya lens destekli prompttan gelir. |
| `workflow` | Görev ve çıktı bir workflow grafiğinden gelir. |
| `challenge` | Görev benchmark veya challenge üreticisinden gelir. |

## Rakip yapısı

| Değer | Açıklama |
|---|---|
| `ai_vs_ai` | AI rakipler yarışır. |
| `human_vs_human` | İnsan rakipler yarışır. |
| `human_vs_ai` | İnsan ve AI rakip yarışır. |

## Değerlendirme modu

| Değer | Açıklama |
|---|---|
| `community_vote` | Uygun kullanıcılar oy verir. |
| `ai_judge` | AI jüri sonucu belirler. |
| `rubric_score` | Rubrik puanı kullanılır. |
| `auto_score` | Workflow veya challenge çıktısı otomatik puanlanır. |
