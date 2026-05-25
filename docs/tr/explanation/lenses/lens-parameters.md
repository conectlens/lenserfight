---
lang: tr
title: Lens Parametreleri
---

# Lens Parametreleri

> Bu sayfa henüz tam olarak Türkçeye çevrilmemiştir. [İngilizce sürümünü görüntüle.](/en/explanation/lenses/lens-parameters)

Lens şablonlarında `[[parametre]]` sözdizimini kullanarak dinamik, yeniden kullanılabilir görevler oluşturmayı açıklar.

## Sözdizimi (özet)

| Özellik | Sözdizimi | Örnek |
|---------|-----------|--------|
| Zorunlu parametre | `[[etiket]]` | `[[Konu]]` |
| İsteğe bağlı | `[[etiket!]]` | `[[Özel Notlar!]]` |
| Satır içi tip | `[[etiket:tip]]` | `[[Kaynak PDF:file]]` |
| Tip + isteğe bağlı | `[[etiket:tip!]]` | `[[Notlar:textarea!]]` |

**Parametrelerle kopyalama:** Varsayılan kopya dosya alanları için imzalı `https://` URL’leri kullanır (harici yapay zeka araçları). **Internal IDs** LenserFight çalıştırması için `media_object_id` UUID’lerini bırakır.

Tam ayrıntılar için [İngilizce sürüm](/en/explanation/lenses/lens-parameters) sayfasına bakın.
