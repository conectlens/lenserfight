---
title: Bulut Savaşları — Operatör Çalışma Kitabı
description: Bulut Savaşları yüzeyi için operatör çalışma kitabı — ön hazırlık ortam değişkenleri ve Postgres GUC'leri, izleme sinyalleri, geri alma adımları ve eskalasyon kanalı.
---

# Bulut Savaşları — Operatör Çalışma Kitabı

<ExperimentalBadge title="Battles" description="Battles hâlâ inşa ediliyor. Eşleştirme, oylama ve sonuç akışları değişebilir — denemenizi bekliyoruz, hatalı durumları geri bildirin." />


Bu sayfa, Cloud Battles yüzeyini çalıştırmaya yönelik operatör çalışma kitabıdır. Dağıtımın Phase O webhook outbox migration'ını uyguladığı ve `pg_cron` ile `pg_net` mevcut olan barındırılan bir Supabase örneğinin bulunduğu varsayılır.

Yüzeyin dış kullanıcılar için açılmadan önce geçmesi gereken bütün bütünlük kontrolleri için bkz. [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist).

## Ön hazırlık

### Ortam değişkenleri

| Değişken | Amaç | Gerekli |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Savaşları ve işçileri destekleyen barındırılan Supabase projesi | evet |
| `API_URL` | Web uygulaması ve işçiler tarafından kullanılan `apps/platform-api` kökeni | evet |
| `ANTHROPIC_API_KEY` (edge function env) | AI hakem edge function tarafından kullanılır. | evet |
| `CHAINABIT_API_URL` | Savaşlar Chainabit yürütme köprüsünden gönderildiğinde kullanılır. | yalnızca Chainabit köprüsü etkinse |

### Postgres GUC'leri

Bu değerleri dağıtımda `ALTER DATABASE postgres SET …` ile ayarlayın. GUC'nin cron job oturumunda etkili olması için değişiklikten sonra `pg_cron` işçilerini yeniden başlatın.

| GUC | Amaç | Varsayılan | Gerekli |
|---|---|---|---|
| `app.approval_timeout_hours` | `expire-stale-approvals` job'u için eşik. | `24` | önerilir |
| `app.approval_webhook_url` | Yeni bekleyen onaylar için en iyi çaba POST URL'si (operatör çağrı zincirini besler). | boş | evet |
| `app.moderation_webhook_url` | Moderasyon olayları için en iyi çaba POST URL'si (işaretlenen gönderimler, geçersiz kılma kararları). | boş | evet |
| `app.webhook_signing_secret` | `audit.webhook_outbox` teslimleri için HMAC imzalama anahtarı. Alıcı tarafında `X-Lenserfight-Signature` eşleşmediğinde teslimi reddedin. | boş | evet |

```sql
ALTER DATABASE postgres SET app.approval_timeout_hours = 24;
ALTER DATABASE postgres SET app.approval_webhook_url    = 'https://example.com/approvals';
ALTER DATABASE postgres SET app.moderation_webhook_url  = 'https://example.com/moderation';
ALTER DATABASE postgres SET app.webhook_signing_secret  = '<32-byte hex>';
```

### Cron job'ları

Dispatcher ve zaman aşımı uygulaması Postgres içinde `pg_cron` üzerinden çalışır. İkisinin de zamanlanmış olduğunu doğrulayın:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('expire-stale-approvals', 'webhook-outbox-dispatcher');
```

Her iki satır da `active = true` göstermelidir.

## İzleme

| Sinyal | Nereye bakılır | Ne aranmalı |
|---|---|---|
| Webhook outbox birikimi | `audit.webhook_outbox` | `count(*) WHERE delivered_at IS NULL` sıfıra doğru ilerlemeli. Artan teslim edilmemiş sayım, alıcıların 5xx döndürdüğü veya dispatcher'ın çalışmadığı anlamına gelir. |
| Onay zaman aşımı job sağlığı | `cron.job_run_details WHERE jobname = 'expire-stale-approvals'` | Job 5 dakikada bir çalışır. Art arda birden fazla `failed` satırı, yapılandırma regresyonuna veya uzun süreli kilitleyen bir işleme işaret eder. |
| Webhook dispatcher sağlığı | `cron.job_run_details WHERE jobname = 'webhook-outbox-dispatcher'` | Job sık çalışır; art arda hatalar dispatcher RPC'sinin yanlış yapılandırıldığı veya `pg_net`'in kullanılamadığı anlamına gelir. |
| Savaş moderasyon geçersiz kılmaları | `battles.moderation_decisions` (mevcutsa) veya `audit.action_logs WHERE action LIKE 'battle_moderation_%'` | Geçersiz kılma artışı ya bir model regresyonuna ya da koordineli kötüye kullanıma işaret eder. `battles.battle_submissions` reddetme oranıyla karşılaştırın. |
| ELO değişim günlüğü | `battles.elo_changes` (veya eşdeğer log tablosu) | Her liderlik tablosu mutasyonu bir satır üretmelidir. Boşluklar, ELO yazıcısının log yolunu atladığı anlamına gelir. |

## Geri alma (Rollback)

Geri alma yıkıcı değildir — uçuştaki savaşlar talep edildikleri yolda biter. Yapılandırma değişikliği yalnızca yeni girişleri durdurur.

```bash
# 1. Bulut savaş rotalarını halka açık olarak sunmayı durdurun (reverse-proxy veya web + işçileri yeniden dağıtın)
```

```sql
-- 2. Webhook outbox dispatcher'ını durdurun
SELECT cron.unschedule('webhook-outbox-dispatcher');

-- 3. İsteğe bağlı: başarısız tekrar denemelerin yayılmaması için webhook URL'lerini temizleyin
ALTER DATABASE postgres SET app.approval_webhook_url   = '';
ALTER DATABASE postgres SET app.moderation_webhook_url = '';
```

Yerel savaşlar (`lf battle local`) çalışmaya devam eder — yukarıdakilerin hiçbirine bağlı değildirler.

Daha sonra yeniden etkinleştirmek için yönlendirmeyi ve yapılandırmayı geri yükleyin, GUC'leri yeniden ayarlayın ve dispatcher'ı orijinal migration'da kullanılan ifadeyle yeniden zamanlayın.

## Eskalasyon

Otomatik bir kontrol gerçek dünya olayını (saldırgan gönderim, bir prompt'ta sızdırılan kimlik bilgileri, sürekli moderasyon atlatma) durduramadığında bu kanalı kullanın.

- **Birincil:** `moderation@lenserfight.org` adresine e-posta gönderin. 24 saat içinde ilk yanıt beklenir.
- **GitHub Issue (hassas):** Rapor kullanıcı verisi veya kimlik bilgisi içeriyorsa özel bir güvenlik danışma belgesi açın.
- **GitHub Issue (genel):** İhbarın bakımcı önceliklendirme kuyruğunda görünmesi için issue'yu `incident` olarak etiketleyin.

## İlgili

- [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) — bulut savaşları etkinleştirilmeden önce gereken kontroller.
- [Bilinen Önizleme Yüzeyleri](/tr/reference/known-preview-surfaces) — yüzey başına denetim bayrakları ve geri alma.
- [OSS Lansman Kapsamı](/tr/explanation/community/oss-launch-scope) — yüzey durumu ve dağıtım gereksinimleri.
- [Approvals](/en/reference/internals/approvals) — webhook payload şekli ve teslim semantiği.
