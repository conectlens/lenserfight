---
title: Onaylar
description: Otonom agent takımları için sahip onay kapılarının nasıl çalıştığı. Kuyruk, agents.team_runs üzerinden agents.approval_requests_v olarak materyalize edilir ve fn_decide_approval üzerinden çözülür.
---

# Onaylar

Onaylar, otonom agent yürütmesi üzerinde insan Lenser'ın yetkili kalmasını sağlar. Bir takım çalıştırması hassas bir eylemi tetiklediğinde — çıktı yayımlama, kredi harcama, dış mesaj gönderme, zamanlamaları değiştirme, veri silme — motor durur ve sahibin karara bağladığı bekleyen bir giriş oluşturur.

**Kuyruk ayrı bir tablo değildir**. `approval_status='pending'` ile [`agents.team_runs`](/reference/internals/domain-model#agents-team-runs) tablosunun bir izdüşümüdür, `agents.approval_requests_v` olarak materyalize edilir ve `fn_decide_approval` üzerinden çözülür.

## Onay şekli

Bugün, her onay kapısı `agents.team_runs` tablosunda bir satırdır:

| Sütun                        | Onay anlamı                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `id`                         | Onay isteği id'si                                                            |
| `ai_lenser_id`               | Hangi sahipliğin uygulandığı                                                 |
| `team_id`                    | İsteği üreten takım                                                          |
| `workflow_id`                | Hangi iş akışı                                                               |
| `workflow_run_id`            | Altta yatan iş akışı çalıştırması (varsa)                                    |
| `workflow_assignment_id`     | Bu çalıştırmayı dispatch eden atama                                          |
| `status`                     | `queued / running / completed / failed / cancelled / blocked`                |
| `approval_status`            | `'pending' \| 'approved' \| 'rejected' \| 'not_required'`                    |
| `metadata`                   | jsonb — kapı `kind`, istenen izin, isteyen agent id, eylem hedefi            |
| `started_at`, `completed_at` | Çalıştırma zamanlaması                                                       |

Karar, `fn_decide_approval` üzerinden atomik olarak değiştirilir: RPC, `approval_status`'u günceller, karar metadata'sını ekler ve onay sonucu için `agents.agent_run_events` tablosuna yazar.

## Zorunlu kapılar

Bu eylemler, takımın özerklik düzeyinden bağımsız olarak **her zaman sahip onayı gerektirir**:

| Kapı                 | Tetiklenme koşulu                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `create_agent`       | Bir takım yeni bir Agent Lenser oluşturmayı önerir                                               |
| `add_team_member`    | Bir takım kendisine veya başka bir takıma üye eklemeyi önerir                                    |
| `grant_lens`         | Bir takım bir agent'a yeni bir lens bağlamayı önerir (`agents.lens_bindings`)                    |
| `grant_tool`         | Bir takım `tool_profile.allow_tools` setine eklemeyi önerir                                      |
| `grant_model`        | Bir takım bir agent'a yeni bir model bağlamayı önerir                                            |
| `publish_output`     | Bir takım içeriği herkese açık olarak yayımlamayı önerir (`visibility='public'`)                 |
| `external_message`   | Bir takım dış sisteme e-posta / Slack / webhook göndermeyi önerir                                |
| `paid_provider_call` | Bir takım `support_level='byok_only'` ve hiçbir anahtar yapılandırılmamışken ücretli model çağırmayı önerir |
| `spend_threshold`    | Çalıştırma düzeyindeki maliyet projeksiyonu `agents.policies.spending_limit_credits` değerini aşar |
| `delete_data`        | Bir takım bir lens / iş akışı / çalıştırma / varlık silmeyi önerir                               |
| `modify_schedule`    | Bir takım bir CRON zamanlamasını düzenlemeyi veya duraklatmayı/devam ettirmeyi önerir            |
| `expand_permissions` | Bir takım `agents.ownerships` üzerindeki `permission_scope` alanını genişletmeyi önerir          |

Yukarıdaki liste **varsayılandır**. Sahipler atama başına `approval_policy.gates: string[]` aracılığıyla kapıları genişletebilir, ancak varsayılan setteki kapıları kaldıramaz.

## Onay akışı

```mermaid
sequenceDiagram
    participant C as CRON / Çağıran
    participant E as Motor
    participant H as İnsan Sahip
    participant DB as agents.* + lenses.*

    C->>E: çalıştırmayı dispatch et
    E->>DB: workflow_run + team_run ekle<br/>approval_status='pending'
    E->>H: onay kuyruğunda yüzeylet (UI / e-posta)
    alt Sahip onaylar
      H->>DB: UPDATE team_runs SET approval_status='approved'
      DB->>E: satır olayı
      E->>E: çalıştırmayı talep et; düğümleri yürüt
      E->>DB: agent_run_events: 'approval_granted'
    else Sahip reddeder
      H->>DB: UPDATE team_runs SET approval_status='rejected'
      DB->>E: satır olayı
      E->>DB: workflow_run.status='failed', team_run.status='failed'
      E->>DB: agent_run_events: 'approval_rejected'
    else Zaman aşımı (yapılandırılabilir)
      E->>DB: workflow_run.status='timed_out', team_run.status='cancelled'
      E->>DB: agent_run_events: 'approval_timed_out'
    end
```

## Karar denetim alanları

Bugün, bir onay kararı şunları yazar:

1. `agents.team_runs.approval_status` — son durum.
2. `agents.team_runs.metadata` — `decision_at`, `decision_by_lenser_id`, `decision_reason` (serbest metin), `decision_modifications` (jsonb diff) ekler.
3. `agents.agent_run_events` — `event_type IN {approval_granted, approval_rejected, approval_modified}` olan bir satır, yukarıdaki anlık görüntüyü taşıyan `payload` ile.

Birleştirildiğinde bunlar denetim sorularını yanıtlar:

- **Kim onayladı?** `metadata.decision_by_lenser_id`.
- **Ne zaman?** `metadata.decision_at`.
- **Neden?** `metadata.decision_reason`.
- **Onaylayan isteği değiştirdi mi?** `metadata.decision_modifications`.

## Onayla / reddet / değiştir

Üç karar türü desteklenir:

| Karar                  | Etki                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onayla**             | `approval_status='approved'`. Motor çalıştırmayı orijinal payload ile talep eder.                                                                   |
| **Reddet**             | `approval_status='rejected'`. Çalıştırma `failed` durumuyla sona erer.                                                                              |
| **Değiştir ve onayla** | `approval_status='approved'` artı `team_runs.metadata.decision_modifications` üzerine bir input override. Motor çalıştırmayı birleştirilmiş payload ile talep eder. |

Değiştirme yolu, sahiplerin aşırı geniş bir isteği güvenli şekilde daraltabilmesi içindir (örn. token bütçesini azaltmak, hedef kitleyi daraltmak, modeli değiştirmek).

## Karar adım adım

### Onayla

```bash
lf approval approve <approval-id>
```

Veritabanında neler olur:

1. `agents.team_runs.approval_status` → `'approved'`
2. `agents.team_runs.metadata` `decision_at`, `decision_by_lenser_id` alır
3. `agents.agent_run_events` tablosuna `event_type='approval_granted'` ile bir satır eklenir
4. Motor çalıştırmayı bir sonraki yoklama döngüsünde (saniyeler içinde) alır ve düğüm yürütmeye başlar

Çalıştırma **orijinal dispatch input'larıyla** ilerler.

---

### Reddet

```bash
lf approval reject <approval-id> --reason "Tatil — bugün atla"
```

Veritabanında neler olur:

1. `agents.team_runs.approval_status` → `'rejected'`
2. `agents.team_runs.status` → `'failed'`
3. `agents.team_runs.metadata` `decision_at`, `decision_by_lenser_id`, `decision_reason` alır
4. `lenses.workflow_runs.status` → `'failed'`
5. `agents.agent_run_events` tablosuna `event_type='approval_rejected'` ile bir satır eklenir

Çalıştırma sona erer. Hiçbir düğüm yürütülmez. Hiçbir bellek yazılmaz.

---

### Değiştir ve onayla

Dispatch input'ları şekil olarak doğru ancak değer olarak yanlış olduğunda bunu kullanın — örneğin, zamanlanmış çalıştırma eski bir konuyu veya aşırı geniş bir hedef kitleyi kullanacak olurdu.

```bash
lf approval approve <approval-id> \
  --modifications '{"inputs": {"topic": "bugün için revize edilmiş konu"}}'
```

Veritabanında neler olur:

1. `agents.team_runs.approval_status` → `'approved'`
2. `agents.team_runs.metadata` `decision_at`, `decision_by_lenser_id`, `decision_modifications` (JSON diff) alır
3. `agents.agent_run_events` tablosuna `event_type='approval_modified_and_approved'` ile bir satır eklenir
4. Motor çalıştırmayı talep etmeden önce `decision_modifications` alanını çalıştırmanın input payload'una birleştirir — zamanlamadaki orijinal `inputs_template`, değişiklikle override edilir

Çalıştırma **birleştirilmiş input'larla** ilerler. Override denetim izinde kaydedilir ve çalıştırmanın olay günlüğünde görünür.

---

## CRON tetiklemeli çalıştırmalar

Zamanlanmış bir dispatch aynı akışı izler. Zamanlamanın `approval_policy` alanı doğruluğun kaynağıdır — takımın varsayılan politikası `autonomous_with_gates` olsa bile, `requiresApproval=true` olan bir zamanlama onayda bloke olur.

Bu, **CRON onayları atlayamaz** kuralını mekanik olarak doğru kılar: motor, kapı kararı verirken tetikleyici kaynağını hiçbir zaman okumaz.

## Zaman aşımı davranışı

Onay zaman aşımı, her 5 dakikada bir çalışan `expire-stale-approvals` pg_cron işi tarafından uygulanır. Yapılandırılmış eşikten daha eski bekleyen `team_runs` atomik olarak geçiş yapar:

- `agents.team_runs.approval_status` → `'timed_out'`
- `agents.team_runs.status` → `'cancelled'`
- `lenses.workflow_runs.status` → `'timed_out'` (çalıştırma oluşturulduğunda)
- `agents.agent_run_events` tablosuna `event_type='approval_timed_out'` ile satır eklenir
- `agents.team_runs.metadata` `timed_out_at` ve etkili `timeout_hours` alır

Eşik, `app.approval_timeout_hours` Postgres GUC'si üzerinden ayarlanır. Ayarlanmadığında varsayılan 24'tür:

```sql
ALTER DATABASE postgres SET app.approval_timeout_hours = 12;
```

Otomatik onay modu sunulmaz. Zaman aşımı, çalıştırmanın terk edildiği anlamına gelir — kendini onayladığı değil.

Süre dolma işi `FOR UPDATE SKIP LOCKED` kullanır, böylece eşzamanlı tetiklemeler aynı satıra çift yazma yapamaz ve halihazırda terminal durumda olan satırlar sonraki geçişlerde atlanır.

Cron tetiklemeleri arasında bekleyen öğeleri zorla süresi dolmuş hale getirmek için bir operatör fonksiyonu doğrudan çağırabilir:

```sql
SELECT public.fn_expire_stale_approvals();
```

Zaman aşımı tetiklenmeden önce belirli bir bekleyen isteği elle reddetmek için:

```bash
lf approval list --status pending
lf approval reject <stale-request-id> --reason "Tatil — bugün atla"
```

## Bekleyen onay webhook'u

`app.approval_webhook_url` yapılandırıldığında, yeni oluşturulan her bekleyen onay `pg_net` aracılığıyla o URL'ye en iyi çaba POST'u tetikler. Payload sürümü `1`'dir:

```json
{
  "webhook_version": 1,
  "event": "approval_pending",
  "team_run_id": "…",
  "ai_lenser_id": "…",
  "team_id": "…",
  "workflow_id": "…",
  "workflow_run_id": "…",
  "workflow_assignment_id": "…",
  "gate_kind": "publish_output",
  "requested_action": "…",
  "pending_since": "2026-05-08T14:32:01Z"
}
```

Header'lar: `Content-Type: application/json`, `X-Lenserfight-Webhook: approval_pending`, `X-Lenserfight-Version: 1`.

Yapılandırma:

```sql
ALTER DATABASE postgres SET app.approval_webhook_url = 'https://example.com/approvals';
```

**Teslim semantiği:** En iyi çaba, tek deneme, `pg_net` üzerinden ateşle-ve-unut. Yetkili durum veritabanıdır; webhook bir bildirim nezaketidir. En az bir kez teslim gerektiren operatörler `agents.approval_requests_v` tablosunu yoklamalı ve kendi durumlarına karşı uzlaştırmalıdır.

## Onayların bugün KAPSAMADIĞI şeyler

- **Bir zamanlamanın tamamının önceden onaylanması** — ilk çalıştırma dispatch edilmeden önce onaylanacak bir satır yoktur. Sahipler bu niyeti hazır olana kadar zamanlamayı `is_active=false` ile yapılandırarak ifade ederler, ardından etkinleştirirler.
- **Kayan-pencere onayları** — "sonraki 24 saat içinde herhangi bir çalıştırmayı onayla" gibi bir yüzey yoktur. Her çalıştırma bireysel olarak onaylanır.
- **Çoklu onaylayıcı iş akışları** — tek bir sahip / ortak sahip kararı kesindir. M-of-N modellenmemiştir.

## RLS duruşu

[`agents.can_manage_ai_lenser()`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L92) onay verisinin her okuması ve yazmasını kapılar. Yalnızca AI çalışma alanının sahibi veya ortak sahibi şunları yapabilir:

- Bekleyen istekleri gör (`agents.approval_requests_v` veya bootstrap/fleet görünümleri üzerinden okuma).
- İstekleri `fn_decide_approval` üzerinden çöz.

## Gelecekteki çalışma

Aşağıdakiler **Önerilen (henüz uygulanmadı)**:

- **Kuyruk zenginleştirme** — `agents.approval_requests_v` görünümünü daha fazla türetilmiş alan, filtre ve bildirime hazır payload ile genişlet:

  ```sql
  CREATE OR REPLACE VIEW agents.approval_requests_v AS
  SELECT
    tr.id AS request_id,
    tr.ai_lenser_id,
    tr.team_id,
    tr.workflow_id,
    tr.workflow_assignment_id,
    tr.metadata->>'gate_kind' AS gate_kind,
    tr.metadata->>'requested_action' AS requested_action,
    tr.metadata->>'requester_agent_id' AS requester_agent_id,
    tr.created_at AS requested_at,
    wa.assignee_kind,
    wa.approval_policy,
    w.title AS workflow_title
  FROM agents.team_runs tr
  LEFT JOIN agents.workflow_assignments wa ON wa.id = tr.workflow_assignment_id
  LEFT JOIN lenses.workflows w ON w.id = tr.workflow_id
  WHERE tr.approval_status = 'pending'
    AND agents.can_manage_ai_lenser(tr.ai_lenser_id);
  ```

- **Onay UI iyileştirmesi** — özel `/lenser/:handle/ag/approvals` bölümü bugün gönderilir, ancak hâlâ daha zengin diff'leme, filtreleme ve kuyruk analitiği gerektirir.
- **Bildirim yayılımı** — bekleyen istekleri bildirim hizmeti aracılığıyla insan sahibe iten bir `agents.agent_run_events` dinleyicisi ([libs/data/repositories/src/lib/services/notificationService.ts](../../libs/data/repositories/src/lib/services/notificationService.ts)).
- **Zamanlama başına onay zaman aşımı override** — veritabanı genelindeki `app.approval_timeout_hours` GUC'sini override etmek için tek bir iş akışı atamasında `approval_policy.timeoutMinutes`. Genel zaman aşımı Faz K1'de gönderilir; atama başına override'lar önerilen olarak kalır.
- **Bypass denemeleri için denetim olayı** — ✓ Gönderildi (Faz G). Aktif bir zamanlamada `requiresApproval=false` ayarlandığında, `agents.action_logs` tablosuna bir `approval_bypass_attempted` satırı eklenir.
