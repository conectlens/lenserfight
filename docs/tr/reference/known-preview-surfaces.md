---
title: Bilinen Önizleme Yüzeyleri
description: LenserFight Community Edition'da varsayılan olarak kullanılamayan, özellik bayrağıyla, yalnızca bulutta veya henüz uygulanmamış tüm özelliklerin tam listesi. Kontrol eden ortam değişkenleri ve geri alma talimatları dahildir.
---

# Bilinen Önizleme Yüzeyleri

Bu sayfa, kendi sunucusunda barındırılan bir Community Edition kurulumunda **varsayılan olarak kullanılamayan** her özelliği listeler. Doğru beklenti belirlemek, dağıtımları yapılandırmak ve katkıda bulunanlara kapsamı iletmek için kullanın.

## Durum tanımları

| Durum | Anlamı |
|-------|--------|
| **Stabil** | Community Edition'da etkin gelir. Bayrak gerekmez. |
| **Önizleme** | Uygulanmıştır ama bir özellik bayrağı veya belirli bir ortam gerektirir. |
| **Yalnızca bulut** | Barındırılan LenserFight platformunu gerektirir. Kendi sunucusunda barındırılan kurulumlarda etkin değildir. |
| **Henüz uygulanmadı** | Yol haritasında izlenir ama henüz gönderilmedi. |

## Özellik yüzey tablosu

| Özellik | Durum | Kontrol eden ortam değişkeni / gereksinim | Geri alma |
|---------|-------|-------------------------------------------|-----------|
| Çekirdek iş akışı yürütme (manuel) | **Stabil** | — | — |
| Lensler ve lens kütüphanesi | **Stabil** | — | — |
| CLI (`lf run exec`, `lf execution wait`) | **Stabil** | — | — |
| Bildirim zili ve rozeti | **Stabil** | Supabase | — |
| Cüzdan bakiye rozeti | **Stabil** | Supabase + Chainabit | — |
| Sosyal graf (takip et / bırak) | **Stabil** | Supabase | — |
| CRON zamanlama | **Önizleme** | `VITE_FEATURE_CRON_SCHEDULING=true` + Supabase | Bayrağı `false` yapın; psql'de `SELECT cron.unschedule('dispatch-scheduled-workflows')` çalıştırın |
| Onay kapıları | **Önizleme** | Supabase (`agents.*` şeması) | Zamanlamayı kaldırın veya `approval_policy->>'requiresApproval'` değerini `true` yapın |
| Onay otomatik zaman aşımı | **Stabil** | `app.approval_timeout_hours` Postgres GUC (varsayılan 24sa); `expire-stale-approvals` pg_cron işi | `SELECT cron.unschedule('expire-stale-approvals')` |
| Onay bekleyen webhook | **Önizleme** | `app.approval_webhook_url` Postgres GUC + `pg_net` uzantısı | `ALTER DATABASE postgres SET app.approval_webhook_url = ''` |
| Platform-api `/health` probu | **Stabil** | `public.fn_health()` RPC; kimlik doğrulamasız GET | — |
| SSE çalıştırma olay akışı (`GET /v1/runs/:id/events`) | **Önizleme** | Supabase (`lenses.workflow_run_events`) | `lf execution inspect` ile yoklama kullanın |
| Pazar yeri (`/marketplace`) | **Önizleme** | Supabase (`lenses.lenses.visibility` sütunu) | Yol kimlik doğrulamasız; ters proxy yol bloğuyla devre dışı bırakın |
| Araç çağrı kayıtları | **Önizleme** | Supabase (`platform.tool_invocation_logs`) | Faz 2 göçünü çalıştırmayarak devre dışı bırakın |
| Araç çağrı onayları | **Önizleme** | Supabase (`agents.*` şeması, Faz 2 göçü) | Faz 2 göçünü çalıştırmayın; onay kapıları yoktur |
| Platform otonomi acil durdurma | **Önizleme** | `platform.system_flags.autonomy_dispatch_enabled` | `UPDATE platform.system_flags SET value = 'false' WHERE key = 'autonomy_dispatch_enabled'` |
| Chainabit yürütme köprüsü | **Önizleme** | `VITE_FEATURE_CHAINABIT_EXECUTION=true` + `CHAINABIT_API_URL` | Bayrağı `false` yapın |
| Yerel savaşlar (CLI) | **Önizleme** | Bayrak gerekmez — `lf battle local` komutları bulut altyapısı olmadan çalışır | yok |
| Bulut savaş arenası | **Özel Alfa** | `VITE_FEATURE_PUBLIC_BATTLES=true` + barındırılan Supabase | `VITE_FEATURE_PUBLIC_BATTLES=false`; yerel savaşlar çalışmaya devam eder |
| Savaş BYOK akışı | **Özel Alfa** | `VITE_FEATURE_PUBLIC_BATTLES=true` + BYOK anahtar referansı + barındırılan Supabase | Bayrağı `false` yapın |
| ELO lider tablosu | **Özel Alfa** | `VITE_FEATURE_PUBLIC_BATTLES=true` + Supabase (kendi sunucusunda varsayılan `false`) | Bayrağı `false` yapın |
| Konektör pazarı | **Henüz uygulanmadı** | — | — |
| Faturalama ve krediler | **Henüz uygulanmadı** | — | — |
| Kıyaslama paketi | **Henüz uygulanmadı** | — | — |
| AI hakem (savaş) | **Önizleme** | Supabase + edge fonksiyonu env'de `ANTHROPIC_API_KEY` | AI hakem bayrağını ilgili savaşlarda kapatın |
| Turnuva sistemi | **Önizleme** | Supabase | `fn_create_tournament` çağırmayın |
| Yaratıcı analitiği (zaman serisi, baş başa) | **Önizleme** | Supabase + Faz 3 göçü | Faz 3 analitik göçünü kaldırın |

## CRON zamanlamayı nasıl kapatırsınız (tam geri alma)

```sql
-- Adım 1: pg_cron'un zamanlanmış iş akışlarını dağıtmasını durdur
SELECT cron.unschedule('dispatch-scheduled-workflows');

-- Adım 2: UI'yı kapat (bunu .env dosyanıza ekleyin)
-- VITE_FEATURE_CRON_SCHEDULING=false

-- Adım 3: Daha sonra yeniden etkinleştir (ifade orijinal göçle aynı olmalı)
SELECT cron.schedule(
  'dispatch-scheduled-workflows',
  '*/5 * * * *',
  'SELECT public.fn_dispatch_scheduled_workflows_with_approval()'
);
```

## Platform otonomi acil durdurma anahtarını nasıl etkinleştirirsiniz

```sql
-- Tüm otonom iş akışı dağıtımlarını anında durdur
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';

-- Tekrar etkinleştir
UPDATE platform.system_flags
SET value = 'true', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';
```

## İlgili

- [Acil Durdurma](/tr/how-to/kill-switch) — ajan başı ve platform seviyesi acil durdurma rehberi
- [Sürüm Kontrol Listesi](/tr/how-to/contributors/release-checklist) — gönderim öncesi bayrak durumunu doğrulama
