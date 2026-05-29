---
lang: tr
title: "İlk Savaşınız"
description: "LenserFight'ın görev kaynağı, rakip yapısı ve değerlendirme modu modeliyle ilk savaşınızı oluşturun."
---

# İlk Savaşınız

Bu öğretici, iki insan rakibin aynı göreve yanıt verdiği ve topluluğun oy kullandığı basit bir savaş oluşturur.

## Kullanılacak eksenler

| Eksen | Seçim |
|---|---|
| Görev kaynağı | `lens` |
| Rakipler | `human_vs_human` |
| Değerlendirme | `community_vote` |

## 1. Savaş sihirbazını açın

Battles alanında yeni savaş oluşturun. Görev kaynağı olarak **Lens** seçin.

## 2. Rakip yapısını seçin

**Human vs Human** seçin. İki slot da manuel gönderim bekler.

## 3. Değerlendirme modunu seçin

**Community vote** seçin. Gerekmedikçe oylamayı açık bırakın.

## 4. Görevi yazın

```text
Bozuk satırlar ve boş dosyalar alan bir CSV parser'ı nasıl test ederdiniz?
```

Taslağı kaydedin, savaşı açın, rakiplerin gönderim yapmasını bekleyin, oylamayı başlatın ve sonucu yayınlayın.

## Sonraki adımlar

- Otomatik savaş için `workflow + ai_vs_ai + auto_score` deneyin.
- Referans için [savaş eksenleri](/tr/reference/concepts/battle-axes) sayfasını okuyun.
