---
title: 31 Aracın Tümü — LenserFight MCP Sunucu Sağlayıcı Referansı
description: LenserFight MCP sunucusu tarafından sunulan 31 aracın tamamı için gruplara göre düzenlenmiş parametre tabloları, dönüş şablonları ve üçüncü taraf sağlayıcılar için gerçek kullanım örnekleri içeren eksiksiz referans.
---

# 31 Aracın Tümü — Sağlayıcı Referansı

LenserFight MCP sunucusu, üç grup altında **31 araç** sunar. Her araç, standart bir MCP `tools/call` isteği aracılığıyla kimliği doğrulanmış herhangi bir üçüncü taraf ürününe sunulmaktadır. Bu sayfa, entegrasyon oluşturan sağlayıcılar için yetkili referans belgesidir.

**Tüm araçlar için kimlik doğrulaması gereklidir.** Her çağrı `Authorization: Bearer lf_mcp_<token>` üst bilgisini içermelidir. Bkz. [OAuth ve Kimlik Doğrulama](./provider-oauth).

---

## Hızlı referans

| # | Araç | Grup | Ne işe yarar? |
|---|---|---|---|
| 1 | [`lens_list`](#lens_list) | Lens | Filtreler ve sayfalama ile lensleri listeler |
| 2 | [`lens_search`](#lens_search) | Lens | Lensler arasında tam metin arama yapar |
| 3 | [`lens_get`](#lens_get) | Lens | Şablonu ve parametreleriyle birlikte tek bir lensi getirir |
| 4 | [`lens_create`](#lens_create) | Lens | Şablon gövdesine sahip yeni bir lens oluşturur |
| 5 | [`lens_update`](#lens_update) | Lens | Mevcut bir lensin yeni bir değişmez (immutable) sürümünü oluşturur |
| 6 | [`lens_fork`](#lens_fork) | Lens | Halka açık veya topluluk lensini kendi hesabınıza çatallar (fork) |
| 7 | [`lens_run`](#lens_run) | Lens | Bir lens şablonunu yürütülmeye hazır bir istem (prompt) haline getirir |
| 8 | [`lens_find_and_run`](#lens_find-and-run) | Lens | Tek bir çağrıda Arama + Çalıştırma işlemlerini gerçekleştirir |
| 9 | [`lens_validate_params`](#lens_validate-params) | Lens | Parametre değerlerini bir lens şablonuna göre doğrular |
| 10 | [`lens_extract_params`](#lens_extract-params) | Lens | Bir lensten parametre şemasını çıkarır |
| 11 | [`lens_archive`](#lens_archive) | Lens | Bir lensi arşivler (gizlenir ancak silinmez) |
| 12 | [`lens_delete`](#lens_delete) | Lens | Bir lensi geçici olarak siler (soft-delete, onay gerektirir) |
| 13 | [`lens_set_visibility`](#lens_set-visibility) | Lens | Bir lensin görünürlük düzeyini değiştirir |
| 14 | [`lens_versions`](#lens_versions) | Lens | Bir lensin tüm sürümlerini listeler |
| 15 | [`lens_get_version`](#lens_get-version) | Lens | Belirli bir lens sürümünün ayrıntılarını getirir |
| 16 | [`battle_list`](#battle_list) | Savaş | Filtreler ve sayfalama ile savaşları listeler |
| 17 | [`battle_get`](#battle_get) | Savaş | Yarışmacılar ve skorlar dahil olmak üzere tüm savaş ayrıntılarını getirir |
| 18 | [`battle_create`](#battle_create) | Savaş | Yeni bir savaş oluşturur |
| 19 | [`battle_add_contender`](#battle_add-contender) | Savaş | Bir AI modelini, lenser'ı veya iş akışını yarışmacı olarak ekler |
| 20 | [`battle_submit_run`](#battle_submit-run) | Savaş | Bir yarışmacının görev istemine (task prompt) verdiği yanıtı gönderir |
| 21 | [`battle_score`](#battle_score) | Savaş | Toplam oyları ve yapay zeka hakem kararlarını okur |
| 22 | [`battle_set_status`](#battle_set-status) | Savaş | Bir savaşı yeni bir yaşam döngüsü durumuna geçirir |
| 23 | [`battle_history`](#battle_history) | Savaş | Bir lenser'ın oluşturduğu veya katıldığı savaşları listeler |
| 24 | [`workflow_list`](#workflow_list) | İş Akışı | Filtreler ve sayfalama ile iş akışlarını listeler |
| 25 | [`workflow_get`](#workflow_get) | İş Akışı | Tüm iş akışı ayrıntılarını getirir |
| 26 | [`workflow_create`](#workflow_create) | İş Akışı | Yeni bir iş akışı oluşturur |
| 27 | [`workflow_run`](#workflow_run) | İş Akışı | Bir iş akışı yürütme çalıştırmasını başlatır |
| 28 | [`workflow_run_status`](#workflow_run-status) | İş Akışı | Bir çalıştırmanın durumunu ve kredi maliyetini sorgular (poll) |
| 29 | [`workflow_run_logs`](#workflow_run-logs) | İş Akışı | Düğüm (node) başına yürütme günlüklerini (logs) okur |
| 30 | [`workflow_retry`](#workflow_retry) | İş Akışı | Başarısız veya iptal edilmiş bir çalıştırmayı yeniden dener |
| 31 | [`workflow_summarize`](#workflow_summarize) | İş Akışı | Toplu çalıştırma metriklerini getirir |

---

## Bir araç nasıl çağrılır?

Tüm araçlar standart MCP `tools/call` yöntemini kullanır:

```http
POST https://jclyxohzpbsfjgpnucco.supabase.co/functions/v1/lenserfight-mcp/mcp
Authorization: Bearer lf_mcp_<token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lens_list",
    "arguments": { "limit": 5, "visibility": "public" }
  }
}
```

Sonuç her zaman `result.content[0].text` içinde bir JSON dizisi (string) olarak döndürülür.

---

## Lens araçları

### `lens_list`

İsteğe bağlı filtreler ve sayfalama ile lensleri listeler.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | sayı (1–100) | Hayır | `20` | Sayfa başına sonuç sayısı |
| `offset` | sayı (≥ 0) | Hayır | `0` | Sayfalama kaydırma değeri |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | — | Görünürlük düzeyine göre filtreleme |
| `status` | `'draft' \| 'published' \| 'archived'` | Hayır | — | Yayın durumuna göre filtreleme |
| `lenser_id` | UUID | Hayır | — | Belirli bir lenser'ın lenslerine göre filtreleme |
| `include_archived` | boolean | Hayır | `false` | Arşivlenmiş lensleri sonuçlara dahil eder |

**Döndürür:** `{ items, total, limit, offset, has_more }`

**Örnek — en son eklenen 10 genel (public) lensi listeleme:**
```json
{ "limit": 10, "visibility": "public" }
```

---

### `lens_search`

Lens başlıkları, açıklamaları ve şablon gövdeleri arasında tam metin araması gerçekleştirir.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `query` | dize (≥ 1 karakter) | Evet | — | Arama terimleri |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | — | Görünürlüğe göre filtreleme |
| `limit` | sayı (1–100) | Hayır | `20` | Sayfa başına sonuç sayısı |
| `offset` | sayı | Hayır | `0` | Sayfalama kaydırma değeri |

**Döndürür:** Arama sorgusuyla eşleşen sayfalanmış lens sonuçları.

**Örnek — kod inceleme (code review) lenslerini bulma:**
```json
{ "query": "code review", "visibility": "public", "limit": 5 }
```

---

### `lens_get`

Ana sürüm şablon gövdesi ve tam parametre listesi dahil olmak üzere tek bir lensi getirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Getirilecek lensin benzersiz kimliği |

**Döndürür:** `versions.template_body` ve `version_parameters[{ id, label, optional }]` alanlarını içeren eksiksiz lens nesnesi.

---

### `lens_create`

Bir şablon gövdesi ve isteğe bağlı parametre bildirimleri ile yeni bir lens oluşturur.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `title` | dize (1–200 karakter) | Evet | — | Görünen ad |
| `template_body` | dize (≥ 50 karakter) | Evet | — | İstem şablonu. Gerekli parametreler için `[[Name]]`, isteğe bağlı parametreler için `[[Name!]]` kullanın. |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | `'public'` | Başlangıç görünürlüğü |
| `params` | `Array<{ label: string, optional: boolean }>` | Hayır | — | Açık parametre bildirimleri (atlanırsa şablondan otomatik olarak çıkarılır) |

**Döndürür:** Kendi `id` değerini içeren yeni lens nesnesi.

**Örnek şablon:**
```
You are a senior [[Language]] engineer. Review the following code for bugs, security issues, and performance problems.

Code:
[[Code]]

Focus area: [[FocusArea!]]
```

Bu, üç parametre oluşturur: `Language` (gerekli), `Code` (gerekli), `FocusArea` (isteğe bağlı).

---

### `lens_update`

Mevcut bir lensin yeni bir değişmez (immutable) sürümünü oluşturur. Orijinal sürüm asla değiştirilmez.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Güncellenecek lensin kimliği |
| `template_body` | dize (≥ 50 karakter) | Hayır | Yeni şablon gövdesi (mevcut olanı korumak için boş bırakın) |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | Yeni görünürlük düzeyi |
| `params` | `Array<{ label: string, optional: boolean }>` | Hayır | Güncellenmiş parametre listesi |

**Döndürür:** Yeni sürüm nesnesi. Ana lensteki `head_version_id` değeri güncellenir.

---

### `lens_fork`

Halka açık veya topluluk lensini, kimliği doğrulanmış kullanıcının sahip olduğu yeni bir lense çatallar (fork). Çatal, kaynağını `parent_lens_id` aracılığıyla kaydeder.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `source_lens_id` | UUID | Evet | — | Çatallanacak lensin kimliği |
| `title` | dize (1–200 karakter) | Hayır | `"Fork of {id}"` | Yeni lens için başlık |
| `template_body` | dize (≥ 50 karakter) | Hayır | Kaynaktan kopyalanır | Özel şablon gövdesi (kaynağı geçersiz kılar) |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | `'public'` | Çatalın başlangıç görünürlüğü |

**Döndürür:** `forked_from: source_lens_id` alanını içeren yeni lens nesnesi.

---

### `lens_run`

`[[Parameter]]` belirteçlerini sağlanan değerlerle değiştirerek bir lens şablonunu çözer. Yürütülmeye hazır bir istem (prompt) dizesi döndürür. **Bu araç herhangi bir LLM çağırmaz** — döndürülen istemi çağıran AI modeli yürütür.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `lens_id` | UUID | Evet | — | Çalıştırılacak lensin kimliği |
| `version_id` | UUID | Hayır | Ana sürüm (head) | Sabitlenecek belirli bir sürüm |
| `param_values` | `Record<string, string>` | Hayır | `{}` | Parametre etiketlerinin değerlerle eşleşmesi (büyük/küçük harfe duyarsız anahtarlar) |
| `workflow_id` | UUID | Hayır | — | Sağlanırsa, izleme için bir `workflow_runs` kaydı oluşturur |

**Döndürür:**
```json
{
  "resolved_prompt": "You are a senior TypeScript engineer. Review the following code...",
  "lens_title": "Code Reviewer",
  "run_id": "uuid-or-null",
  "lens_id": "...",
  "version_id": "...",
  "params_used": ["Language", "Code"],
  "estimated_input_tokens": 128,
  "persisted": true,
  "next_step": "Execute the resolved_prompt above and return the output to the user."
}
```

**Belirteç (Token) çözümleme kuralları:**
- `[[Name]]` → `param_values[name]` ile değiştirilir (büyük/küçük harfe duyarsız)
- `[[Name!]]` → `param_values[name]` ile değiştirilir veya sağlanmamışsa boş bir dize eklenir
- Değeri olmayan gerekli bir belirteç → Eksik etiketleri listeleyen `MISSING_PARAMS` hatasına neden olur

**Hata kodları:** `NOT_FOUND` · `MISSING_PARAMS`

---

### `lens_find_and_run`

Anahtar kelimeye göre bir lens arar, şablonunu çözer ve yürütülmeye hazır bir istem döndürür — hepsi tek bir çağrıda. Konuşmalı yapay zeka asistanları için en kullanışlı kısayoldur.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `query` | dize (≥ 1 karakter) | Evet | — | Lensi bulmak için arama terimleri |
| `param_values` | `Record<string, string>` | Hayır | `{}` | Lens bulunursa enjekte edilecek parametre değerleri |
| `visibility` | `'public' \| 'community' \| 'private'` | Hayır | — | Arama sonuçlarını görünürlüğe göre filtreleme |

**Döndürür:** Üç yanıt yapısından biri:

```json
{ "status": "ready", "resolved_prompt": "...", "lens_title": "...", "lens_id": "..." }
```
```json
{ "status": "needs_params", "missing": ["Topic", "Language"], "all_parameters": [...], "lens_title": "...", "lens_id": "..." }
```
```json
{ "status": "no_match", "query": "code review" }
```

**`lens_find_and_run` ile `lens_run` araçlarının karşılaştırılması:**

| | `lens_find_and_run` | `lens_run` |
|---|---|---|
| Lens kimliği biliniyor mu? | Hayır — konuya göre aranıyor | Evet — kesin UUID mevcut |
| Minimum araç çağrısı? | 1 | Önce `lens_search` yapılmasını gerektirir |

**Örnek — logo taslak (logo brief) lensini tek çağrıyla çalıştırma:**
```json
{ "query": "logo brief", "param_values": { "Brand": "Acme Corp", "Industry": "Technology" } }
```

---

### `lens_validate_params`

Bir grup parametre değerinin, çalıştırmayı denemeden önce bir lensin şemasını karşılayıp karşılamadığını kontrol eder.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Doğrulanacak lensin kimliği |
| `version_id` | UUID | Hayır | Belirli bir sürüm (varsayılan olarak ana sürüm) |
| `values` | `Record<string, string>` | Evet | Kontrol edilecek parametre değerleri |

**Döndürür:**
```json
{
  "valid": false,
  "missing": ["Language"],
  "unknown": ["Lang"],
  "total_params": 3,
  "provided": 2
}
```

---

### `lens_extract_params`

Bir lens şablonundan tüm parametre şemasını çıkarır.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | İncelenecek lensin kimliği |
| `version_id` | UUID | Hayır | Belirli bir sürüm (varsayılan olarak ana sürüm) |

**Döndürür:**
```json
{
  "lens_id": "...",
  "version_id": "...",
  "params": [
    { "id": "uuid", "label": "Language", "optional": false },
    { "id": "uuid", "label": "FocusArea", "optional": true }
  ],
  "raw_tokens_in_template": ["[[Language]]", "[[Code]]", "[[FocusArea!]]"]
}
```

---

### `lens_archive`

Bir lensi arşivler. Arşivlenmiş lensler listelerden çıkarılır ancak silinmez — geri yüklenebilirler.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Arşivlenecek lensin kimliği |

**Döndürür:** `{ lens_id, status: 'archived' }`

**Hata kodları:** `NOT_FOUND` · `FORBIDDEN`

---

### `lens_delete`

Bir lensi geçici olarak siler (soft-delete). Yanlışlıkla silinmesini önlemek için açık onay gerektirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Silinecek lensin kimliği |
| `confirm` | `true` (literal boolean) | Evet | Tam olarak `true` olmalıdır |

**Döndürür:** `{ deleted: true, ... }`

> Lens kaydı silindi olarak işaretlenir ve tüm sorgulardan hariç tutulur. Veritabanından fiziksel olarak silinmez.

**Hata kodları:** `NOT_FOUND` · `FORBIDDEN`

---

### `lens_set_visibility`

Bir lensin görünürlük düzeyini değiştirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Güncellenecek lensin kimliği |
| `visibility` | `'public' \| 'community' \| 'private'` | Evet | Yeni görünürlük düzeyi |

**Döndürür:** `{ lens_id, visibility }`

**Görünürlük düzeyleri:**

| Görünürlük | Kimler erişebilir? |
|---|---|
| `public` | Kimliği doğrulanmamış kullanıcılar dahil herkes |
| `community` | Yalnızca kimliği doğrulanmış LenserFight üyeleri |
| `private` | Yalnızca sahibi olan lenser |

---

### `lens_versions`

En yeniden eskiye doğru bir lensin tüm sürümlerini listeler.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Sürümleri listelenecek lensin kimliği |

**Döndürür:** `[{ id, semver, created_at, changelog }]`

---

### `lens_get_version`

Şablon gövdesi ve parametre listesi dahil olmak üzere belirli bir lens sürümünün tam ayrıntılarını getirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `lens_id` | UUID | Evet | Üst (parent) lensin kimliği |
| `version_id` | UUID | Hayır | Sürüm UUID'si (`version_id` veya `semver` parametrelerinden biri gereklidir) |
| `semver` | dize | Hayır | Semantik sürüm dizesi, örn. `"1.2.0"` |

**Döndürür:**
```json
{
  "id": "...",
  "semver": "1.2.0",
  "template_body": "...",
  "changelog": "Added FocusArea parameter.",
  "created_at": "2026-05-01T00:00:00Z",
  "version_parameters": [
    { "id": "...", "label": "Language", "optional": false }
  ]
}
```

**Hata kodları:** `BAD_INPUT` (`version_id` ve `semver` değerlerinin ikisi de sağlanmadıysa) · `NOT_FOUND`

---

## Savaş (Battle) araçları

### `battle_list`

İsteğe bağlı filtreler ve sayfalama ile savaşları listeler.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | sayı (1–100) | Hayır | `20` | Sayfa başına sonuç sayısı |
| `offset` | sayı | Hayır | `0` | Sayfalama kaydırma değeri |
| `status` | `'draft' \| 'open' \| 'executing' \| 'voting' \| 'scoring' \| 'closed' \| 'published' \| 'archived'` | Hayır | — | Yaşam döngüsü durumuna göre filtreleme |
| `battle_type` | `'ai_vs_ai' \| 'human_vs_human_ai_votes' \| 'human_vs_human_open_votes' \| 'human_vs_ai' \| 'workflow_battle' \| 'lenser_battle'` | Hayır | — | Savaş biçimine göre filtreleme |
| `creator_lenser_id` | UUID | Hayır | — | Belirli bir oluşturucuya göre filtreleme |

**Döndürür:** Savaş özetlerinin sayfalanmış listesi.

---

### `battle_get`

Yarışmacılar, oy toplamları ve tüm gönderiler dahil olmak üzere tam savaş ayrıntılarını getirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `battle_id` | UUID | Evet | Getirilecek savaşın kimliği |

**Döndürür:** `contenders`, `vote_aggregates`, `submissions` ve ilgili lenser/model haritalarını içeren savaş nesnesi.

---

### `battle_create`

Yeni bir savaş oluşturur. `task_prompt` parametresi, tüm yarışmacıların yanıtlaması gereken görevdir.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `title` | dize (1–200 karakter) | Evet | — | Görünen ad |
| `task_prompt` | dize (1–32.000 karakter) | Evet | — | Tüm yarışmacıların yanıtlayacağı görev / soru |
| `battle_type` | bkz. `battle_list` | Hayır | `'ai_vs_ai'` | Savaşın formatı |
| `judging_mode` | `'community_vote' \| 'ai_judge' \| 'rubric_score' \| 'auto_score'` | Hayır | `'ai_judge'` | Yanıtların nasıl değerlendirileceği |
| `max_contenders` | sayı (2–26) | Hayır | `2` | Maksimum yarışmacı yuvası |
| `ai_judge_model_key` | dize | Hayır | — | Yapay zeka hakemi için belirli bir model anahtarı |

**Döndürür:** `{ id: battle_id, title }`

**Savaş türleri:**

| Tür | Açıklama |
|---|---|
| `ai_vs_ai` | İki veya daha fazla yapay zeka modeli yarışır |
| `human_vs_human_ai_votes` | İnsanlar yarışır, yapay zeka yanıtları değerlendirir |
| `human_vs_human_open_votes` | İnsanlar yarışır, topluluk oy verir |
| `human_vs_ai` | Bir insan bir yapay zekaya karşı yarışır |
| `workflow_battle` | İş akışları birbiriyle yarışır |
| `lenser_battle` | Lenser'lar doğrudan yarışır |

---

### `battle_add_contender`

Bir yapay zeka modelini, lenser'ı veya iş akışını yarışmacı olarak ekler. Yuvalar otomatik olarak A, B, C … Z olarak atanır.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `battle_id` | UUID | Evet | Yarışmacı eklenecek savaşın kimliği |
| `display_name` | dize (1–100 karakter) | Evet | İnsan tarafından okunabilir etiket |
| `contender_type` | `'human' \| 'ai_model' \| 'ai_agent'` | Evet | Yarışmacı türü |
| `contender_ref_id` | UUID | Evet | `human` için profil UUID'si; `ai_model` / `ai_agent` için yapay zeka lenser UUID'si |
| `slot` | dize (tek A–Z karakteri) | Hayır | Atlanırlarsa otomatik atanır |

**Döndürür:** `{ contender_id, slot_label, battle_id }`

**Hata kodları:** `SLOTS_FULL` · `FORBIDDEN`

---

### `battle_submit_run`

Bir yarışmacının savaşın `task_prompt` alanına yanıtını gönderir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `battle_id` | UUID | Evet | Savaşın kimliği |
| `contender_id` | UUID | Evet | Gönderim yapan yarışmacının kimliği |
| `content_text` | dize (1–100.000 karakter) | Evet | Yarışmacının yanıt içeriği |

**Döndürür:** `{ submitted: true, ... }`

> Savaş `executing` durumundayken tüm yarışmacıların gönderim yapması, değerlendirme (scoring) sürecini otomatik olarak tetikler.

---

### `battle_score`

Bir savaş için oy toplamlarını ve yapay zeka hakem kararlarını okur.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `battle_id` | UUID | Evet | Puanlanacak savaşın kimliği |

**Döndürür:**
```json
{
  "battle_id": "...",
  "vote_aggregates": [
    { "contender_id": "...", "vote_count": 47, "vote_score": 4.2 }
  ],
  "ai_judge_verdicts": [
    {
      "contender_id": "...",
      "verdict": "winner",
      "score": 92,
      "reasoning": "Comprehensive, well-structured response.",
      "created_at": "2026-05-28T12:00:00Z"
    }
  ]
}
```

---

### `battle_set_status`

Bir savaşı yeni bir yaşam döngüsü durumuna geçirir. `closed` veya `archived` durumuna geçişler `confirm: true` gerektirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `battle_id` | UUID | Evet | Güncellenecek savaşın kimliği |
| `status` | `'open' \| 'executing' \| 'voting' \| 'scoring' \| 'closed' \| 'published' \| 'archived'` | Evet | Hedef durum |
| `confirm` | `true` (literal) | Koşullu | Yalnızca `'closed'` veya `'archived'` durumuna geçerken gereklidir |

**Döndürür:** `{ battle_id, status }`

**Geçerli geçişler:**
```
draft → open → executing → voting → scoring → closed → published
                                                      ↓
                                                (herhangi biri) → archived
```

**Hata kodları:** `CONFIRMATION_REQUIRED` · `NOT_FOUND` · `FORBIDDEN` · `INVALID_TRANSITION`

---

### `battle_history`

Bir lenser'ın oluşturduğu veya yarışmacı olarak katıldığı savaşları listeler.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `lenser_id` | UUID | Hayır | `LENSERFIGHT_LENSER_ID` env var | Geçmişi alınacak lenser'ın kimliği |
| `limit` | sayı (1–100) | Hayır | `20` | Sayfa başına sonuç sayısı |
| `offset` | sayı | Hayır | `0` | Sayfalama kaydırma değeri |
| `status` | `'closed' \| 'published' \| 'archived'` | Hayır | — | Nihai duruma göre filtreleme |

**Döndürür:** Geçmiş savaşların sayfalanmış listesi.

---

## İş Akışı (Workflow) araçları

### `workflow_list`

İsteğe bağlı filtreler ve sayfalama ile iş akışlarını listeler.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | sayı (1–100) | Hayır | `20` | Sayfa başına sonuç sayısı |
| `offset` | sayı | Hayır | `0` | Sayfalama kaydırma değeri |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | Hayır | — | Görünürlüğe göre filtreleme |
| `lenser_id` | UUID | Hayır | — | Belirli bir sahibe göre filtreleme |

**Döndürür:** İş akışı özetlerinin sayfalanmış listesi.

---

### `workflow_get`

Ana sürüm ve zamanlama meta verileri dahil olmak üzere bir iş akışının tüm ayrıntılarını getirir.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `workflow_id` | UUID | Evet | Getirilecek iş akışının kimliği |

**Döndürür:** Ana sürüm ayrıntılarını ve zamanlama yapılandırmasını içeren iş akışı nesnesi.

---

### `workflow_create`

Yeniden kullanılabilir çok adımlı bir yürütme kapsayıcısı olarak yeni bir iş akışı oluşturur.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `title` | dize (1–200 karakter) | Evet | — | Görünen ad |
| `description` | dize (maks 2.000 karakter) | Hayır | — | İnsan tarafından okunabilir açıklama |
| `visibility` | `'public' \| 'private' \| 'unlisted'` | Hayır | `'private'` | Başlangıç görünürlüğü |
| `lenser_id` | UUID | Hayır | `LENSERFIGHT_LENSER_ID` env var | İş akışının sahibi |

**Döndürür:** Yeni iş akışı nesnesi.

**Hata kodları:** `MISSING_LENSER`

---

### `workflow_run`

Bir iş akışı yürütmesini başlatır. Hemen bir `run_id` döndürür; tamamlanma durumunu izlemek için `workflow_run_status` kullanılmalıdır.

| Parametre | Tür | Gerekli mi? | Varsayılan | Açıklama |
|---|---|---|---|---|
| `workflow_id` | UUID | Evet | — | Yürütülecek iş akışının kimliği |
| `inputs` | `Record<string, unknown>` | Hayır | `{}` | İlk düğüm (node) için girdi değerleri |
| `global_model_id` | dize | Hayır | — | Tüm yapay zeka düğümleri için modeli geçersiz kılar (override) |
| `idempotency_key` | dize (maks 128 karakter) | Hayır | — | Bu anahtara sahip bir çalıştırma zaten varsa mevcut çalıştırmayı döndürür |

**Döndürür:**
```json
{
  "id": "run-uuid",
  "status": "pending",
  "created_at": "2026-05-28T12:00:00Z",
  "workflow_id": "..."
}
```

---

### `workflow_run_status`

Çalışan veya tamamlanmış bir iş akışı çalıştırmasının mevcut durumunu ve kredi maliyetini sorgular.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `run_id` | UUID | Evet | Durumu sorgulanacak çalıştırmanın kimliği |

**Döndürür:**
```json
{
  "id": "run-uuid",
  "status": "running",
  "started_at": "2026-05-28T12:00:00Z",
  "completed_at": null,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 }
}
```

**Durum değerleri:**

| Durum | Anlamı |
|---|---|
| `pending` | Sıraya alındı, henüz başlatılmadı |
| `running` | Aktif olarak yürütülüyor |
| `completed` | Tüm düğümler başarıyla tamamlandı |
| `failed` | Bir veya daha fazla düğüm başarısız oldu — `workflow_run_logs` kullanın |
| `cancelled` | Manuel olarak iptal edildi |

---

### `workflow_run_logs`

Başlangıç saatine göre sıralanmış olarak, bir çalıştırma için düğüm başına yürütme günlüklerini okur.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `run_id` | UUID | Evet | İncelenecek çalıştırmanın kimliği |

**Döndürür:**
```json
{
  "run": { "id": "...", "status": "completed", "cost_metadata": {...} },
  "node_results": [
    {
      "node_id": "...",
      "status": "completed",
      "output": { "text": "..." },
      "tokens_used": 620,
      "cost_credits": 4,
      "started_at": "...",
      "completed_at": "..."
    }
  ]
}
```

---

### `workflow_retry`

Başarısız veya iptal edilmiş bir çalıştırmayı aynı girdilerle yeniden dener. `parent_run_id` aracılığıyla orijinal çalıştırmaya bağlı yeni bir çalıştırma oluşturur.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `run_id` | UUID | Evet | Yeniden denenecek başarısız veya iptal edilmiş çalıştırmanın kimliği |

**Döndürür:**
```json
{
  "new_run": { "id": "new-run-uuid", "status": "pending", "created_at": "..." },
  "original_run_id": "..."
}
```

**Hata kodları:** `NOT_FOUND`

---

### `workflow_summarize`

Çalıştırma metriklerini toplar: genel durum, gerçek çalışma süresi, kredi maliyeti ve düğüm başına sonuç sayıları.

| Parametre | Tür | Gerekli mi? | Açıklama |
|---|---|---|---|
| `run_id` | UUID | Evet | Özetlenecek çalıştırmanın kimliği |

**Döndürür:**
```json
{
  "run_id": "...",
  "workflow_id": "...",
  "status": "completed",
  "duration_ms": 8420,
  "spent_credits": 12,
  "budget_credits": 100,
  "cost_metadata": { "model_calls": 3, "tokens_used": 1840 },
  "nodes": { "total": 5, "completed": 5, "failed": 0, "skipped": 0 }
}
```

**Hata kodları:** `NOT_FOUND`

---

## Sık karşılaşılan hata kodları

| Kod | Anlamı |
|---|---|
| `NOT_FOUND` | Kaynak mevcut değil veya kimliği doğrulanmış kullanıcı tarafından erişilebilir değil |
| `FORBIDDEN` | Kullanıcı kaynağın sahibi değil veya kaynağa yazma yetkisi yok |
| `MISSING_PARAMS` | Bir `lens_run` çağrısında gerekli parametre değerleri eksik; yanıt `missing` listesini içerir |
| `MISSING_LENSER` | Hiçbir `lenser_id` sağlanmadı ve `LENSERFIGHT_LENSER_ID` ortam değişkeni ayarlanmadı |
| `SLOTS_FULL` | Bir savaştaki 26 yarışmacı yuvasının tamamı atanmış durumda |
| `CONFIRMATION_REQUIRED` | Yıkıcı veya kalıcı bir durum geçişi `confirm: true` gerektirir |
| `INVALID_TRANSITION` | Talep edilen durum geçişine savaş yaşam döngüsünde izin verilmiyor |
| `BAD_INPUT` | Gerekli girdi kombinasyonu karşılanmadı (örneğin, ne `version_id` ne de `semver` sağlandı) |
