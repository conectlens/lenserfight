---
title: Yeni Dil Ekleme
description: Bir saplama yerel dili web, arena, docs ve veritabanı genelinde sürülebilir bir dile yükseltmek için adım adım kılavuz.
---

# Yeni Dil Ekleme

> **Bu sayfa hâlâ çevriliyor.** [İngilizce sürümünü görüntüle.](/en/how-to/contributors/adding-a-language)

LenserFight 11 yerel dili tanıyor — `libs/utils/locale/src/lib/locales.ts` dosyasına bakın. Çoğu hâlâ saplama. Bir saplamadan sürülebilir bir dile geçiş için tam adımlar İngilizce rehberde.

## Adımlar (özet)

1. `libs/utils/locale/src/lib/locales.ts` içinde `status: 'stub'` → `'wip'` olarak güncelle.
2. `apps/web/src/locales/<dil>.json` oluştur, `i18n.ts` içinde kaydet.
3. `apps/arena/src/locales/<dil>.json` ve `apps/arena/src/locales/<dil>/policies/` oluştur.
4. `docs/<dil>/index.md` oluştur, VitePress yapılandırmasına ekle (`apps/docs/.vitepress/config.ts`): `locales`, `hreflang`, `inLanguage`.
5. Doğrulama: `pnpm nx build web/arena/docs`, ardından her uygulamada elle test et.
6. PR aç. Henüz `wip` → `stable` yapma — önce kullanıcılardan geri bildirim al.

Tam talimatlar, örnek kod blokları ve RTL diller için ek notlar için [İngilizce rehbere](/en/how-to/contributors/adding-a-language) bakın.
