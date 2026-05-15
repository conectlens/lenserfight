---
title: Uluslararasılaştırma (i18n) Katkı Rehberi
description: LenserFight'ın yerel dil çözümleme, kalıcılaştırma ve apps/web (çerez tabanlı), apps/arena (URL ön ek) ve apps/docs (VitePress) arasında dili nasıl paylaştığı.
---

# Uluslararasılaştırma (i18n) Katkı Rehberi

> **Bu sayfa hâlâ çevriliyor.** [İngilizce sürümünü görüntüle.](/en/how-to/contributors/i18n-guide)

LenserFight İngilizce öncelikli olarak geliştiriliyor ama her yüzey çeviriye hazır. Platform artık iki yerel dil stratejisi ve uygulamalar arasında paylaşılan bir çerez kullanıyor. Mimari, çerez akışı, dosya yolları ve doğrulama adımları için yukarıdaki İngilizce sürüme bakın.

Yeni bir dil eklemek için: [Dil Ekleme](./dil-ekleme.md).

## Hızlı Özet

- **apps/web** — URL'de dil ön eki yok. Dil sırası: kimliği doğrulanmış kullanıcı → çerez (`lf-locale`) → localStorage → tarayıcı → `en`.
- **apps/arena** — URL'de `/en/`, `/tr/` ön ekleri var. Geçiş yapıldığında paylaşılan çerezi de yazar.
- **apps/docs** — VitePress; `/en/`, `/tr/` URL ön ekleri. İlk açılışta çerezi okur ve uygun dile yönlendirir.

Tam mimari, çerez nitelikleri (`Domain=.lenserfight.com`, `Path=/`, `SameSite=Lax`, `Secure`, `Max-Age=1y`) ve örnek kodlar için [İngilizce rehberi okuyun](/en/how-to/contributors/i18n-guide).
