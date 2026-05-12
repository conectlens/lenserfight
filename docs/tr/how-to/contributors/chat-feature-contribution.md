---
title: Chat'e Katkıda Bulunun
description: LenserFight'ta çok-ajanlı sohbet arayüzünü nasıl inşa edeceğiniz — kapsam, mimari ipuçları ve kabul kriterleri.
---

# Chat Özelliğine Katkıda Bulunun

Chat sayfası (`/chat`) planlanmış bir özelliktir ve harika bir ilk büyük katkı fırsatıdır. Bugün bir yer tutucu arayüzü mevcuttur — hedef, LenserFight'ın AI altyapısıyla desteklenen gerçek bir çok-ajanlı sohbet arayüzüdür.

## Ne İnşa Edilmesi Gerekiyor

v1 Chat özelliği için temel teslimatlar:

- **Konuşma iş parçacığı arayüzü** — yazar avatarları (kullanıcı vs. AI ajanı), zaman damgaları ve akış metin desteğiyle mesaj geçmişi listesi.
- **Model seçici** — kullanıcının oturumu yönetecek AI ajanını veya modeli seçmesine izin verin (GPT-4o, Claude, özel Lenser'lar).
- **Kompozitör çubuğu** — gerçek işleyicilere bağlı gönder, dosya ekle, görsel ve mikrofon düğmeleriyle metin girişi.
- **Oturum yönetimi** — yeni bir sohbet başlatın, geçmiş oturumları kenar çubuğu veya açılır listede görüntüleyin.
- **Supabase arka ucu** — `chat_sessions` ve `chat_messages` tabloları, RLS politikaları, akış yanıtlar için gerçek zamanlı abonelik.

## İlgili Dosyalar

| Dosya | Rol |
|---|---|
| `libs/features/chat/src/lib/pages/ChatPage.tsx` | Sayfa kabuğu — buradan başlayın |
| `libs/features/chat/src/index.ts` | Kütüphanenin genel API'si |
| `apps/web/src/WebRouter.tsx` | Rota kaydı (`/chat`) |
| `supabase/migrations/` | Şema değişikliklerinin yapıldığı yer |

## Mimari İpuçları

- Veri getirme kancalarını `libs/data/` içinde tutun — sayfa yalnızca sunum amaçlı olmalıdır.
- Akış yanıtları: Supabase Realtime kanallarını veya `apps/platform-api`'den sunucu tarafı olayları kullanın.
- Model seçici, `libs/domain/`'den mevcut model/lenser alan türlerini yeniden kullanmalıdır.
- Mevcut özellik dilimi desenini takip edin — referans olarak `libs/features/battles/`'a bakın.

## Başlarken

1. GitHub'da [Chat özelliği sorununu](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) talep edin.
2. `pnpm nx serve web` çalıştırın ve mevcut yer tutucuyu görmek için `/chat`'e gidin.
3. `#chat-feature` tartışma iş parçacığında sorular sorun veya erken bir taslak PR açın.
