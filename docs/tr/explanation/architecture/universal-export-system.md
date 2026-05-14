# Evrensel Dışa Aktarma Sistemi

LenserFight, birinci sınıf varlıkları — **muhabereler, iş akışları, lensler, ajanlar** — paylaşabileceğiniz, denetleyebileceğiniz, yeniden oynatabildiğiniz veya git'e işleyebildiğiniz taşınabilir dosyalara aktarmanızı sağlar. Bu sayfa mimariyi, güvenlik garantilerini ve yeni bir varlık ya da format eklemenin nasıl yapılacağını açıklamaktadır.

> **Durum.** **EX-1** fazı yayınlandı: `markdown` ve `json` formatlarında `battle` ve `lens` için tek dosya dışa aktarımları. Paket dışa aktarımları, YAML, iş akışı/ajan serileştiricileri ve localhost-masaüstü taşıması EX-2'den EX-5'e kadar gelecek fazlarda kullanıma sunulacaktır.

## Özet

| İstediğiniz…                                    | Format     | Hedef             | Kullanan araçlar                     |
| ----------------------------------------------- | ---------- | ----------------- | ------------------------------------ |
| GitHub'da bir muharebeyi paylaşmak              | `markdown` | Bulut / Cihaz     | GitHub frontmatter'ı otomatik işler  |
| Bir ajanı betiklere beslemek                    | `json`     | Bulut / Cihaz     | LenserFight SDK + Claude API         |
| Bir iş akışını repoya işlemek (EX-2)            | `yaml`     | Çalışma alanı     | `lf run -f workflow.yaml`            |
| Her şeyi yedek olarak kaydetmek (EX-2)          | `bundle`   | Bulut (`.zip`)    | `lf import bundle.zip`               |

İnsanlar için **Markdown**, kod için **JSON**, GitOps için **YAML** seçin.

## Katmanlar (Nx sınırları)

| Katman                          | Paket                            | Sorumluluk                                                               |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `libs/domain/exports`           | `@lenserfight/domain/exports`    | Zarf, manifest, kanonik JSON, redaksiyon politikası, değişmezler         |
| `libs/api/exports`              | `@lenserfight/api/exports`       | DTO'lar, hata kodları, tür bekçileri (edge fn ve SDK ile paylaşımlı)     |
| `libs/data/exports`             | `@lenserfight/data/exports`      | `ExportsRepositoryPort` + Supabase implementasyonu                       |
| `libs/shared/serializers`       | `@lenserfight/shared/serializers`| Serileştirici kayıt defteri, JSON + Markdown adaptörleri. İzomorfik.     |
| `libs/features/exports`         | `@lenserfight/features/exports`  | `ExportOrchestrator`, taşıyıcılar, `ExportButton`, `ExportModal`         |
| `supabase/functions/exports-*`  | _(EX-2)_                         | `exports-build` / `exports-status` / `exports-revoke` edge fonksiyonları |

Serileştirici kayıt defteri **izomorfiktir** — DOM veya Node'a özgü API yoktur — aynı kod tarayıcıda, `apps/cli`'de ve Deno edge fonksiyonlarında çalışır.

## Alan modeli

Her dışa aktarım bir `ExportEnvelope<T>` içinde teslim edilir:

```ts
interface ExportEnvelope<T> {
  schema: `lenserfight.export.v${number}`  // sabitlenmiş ana sürüm
  schemaVersion: string                    // semver, şu an "1.0.0"
  kind: ExportKind                         // battle | workflow | lens | agent | bundle
  generatedAt: string                      // ISO-8601 UTC, sağlama toplamına dahil değil
  generatedBy: { userId: string | null; via: 'web' | 'cli' | 'api' }
  source:      { host: string; tenantId: string | null; commit?: string }
  visibility:  'public' | 'authenticated' | 'owner'
  redactions:  string[]                    // politika gereği çıkarılan tüm JSON yolları
  data:        T                           // yazılı yük
  checksum:    string                      // canonical(data)'nın sha256'sı
}
```

Alan katmanında üç değişmez uygulanır:

1. Sağlama toplamı yalnızca **`data`'nın kanonik JSON'ı** üzerinden hesaplanır; `generatedAt` dahil edilmez — böylece aynı varlıklar her zaman aynı karma değerini üretir (makineler arası tekilleştirme destekli).
2. Çağıranın `owner` kapsamı olmadığı durumlarda `redactions` **boş olamaz**. Anonim bir muharebenin `apiKey` ve `judge_prompt` içeren dışa aktarımı her iki yolu da `redactions` altında listeler.
3. `schemaVersion`, yalnızca **kaldırma veya yeniden adlandırma** işlemlerinde yükseltilir; eklemeler için değil (Protected Variations).

Her zarf oluşturulduktan sonra doğrulama çalışır — herhangi bir değişmez ihlal edilirse `ExportEnvelopeFactory.build()` bir `ExportValidationError` fırlatır.

## Format garantileri

| Format     | Belirleyicilik                                     | Zararlı içerik koruması                                              |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `markdown` | YAML frontmatter + GFM gövde + sağlama toplamı alt bilgisi | `<script>` / `<img onerror>` temizlenir, kontrol karakterleri temizlenir, frontmatter dizeleri her zaman ters eğik çizgi kaçış kodlamasıyla çift tırnakla sarılır |
| `json`     | Kanonik JSON (RFC 8785 alt kümesi)                 | NaN/Infinity yok, `bigint` yok, UTF-8 NFC dizeler                    |
| `yaml`     | Yalnızca blok stili, çıpa/takma ad yok (EX-2)      | Markdown frontmatter ile aynı kontrol karakteri politikası           |

JSON serileştiricisi kendini döngüsel olarak doğrular: serileştir → ayrıştır → kanonize → orijinal baytları üretmeli. Kayıt defterindeki `validate()` adımı, kullanıcıya indirme ulaşmadan önce herhangi bir sapmayı yakalar.

## Güvenlik modeli

### Redaksiyon politikası

`RedactionPolicy`, neyin çıkarılacağı konusundaki **tek otorite**dir. Aynı kod hem sunucu tarafında (edge fn) hem de istemci tarafında çalışır (kullanıcıya ait verilerin localhost dışa aktarımı), dolayısıyla iki yol hiçbir zaman ayrışamaz.

| Kademe           | Her zaman çıkarılır                                                 | Sahip görür | Sahip olmayan görür |
| ---------------- | ------------------------------------------------------------------- | ----------- | -------------------- |
| `apiKey`, `secret`, `token`, `password`, `byok`, `authorization`, `signing_secret`, `bearer`, `credentials` | evet | ❌ | ❌ |
| `email`, `billing`, `stripe`, `ip_address`, `internal_notes`, `voter_id` | – | ✅ | ❌ |
| `judge_prompt`, `evaluation_rationale`, `admin_note`                | –           | ✅          | yalnızca kimlik doğrulanmışsa |

Testler `libs/domain/exports/src/lib/redaction.spec.ts` dosyasında üç kademeyi, iç içe nesneleri ve dizileri kapsar.

### Yol geçişi

`safeJoinWithinRoot` yardımcısı (alan katmanındaki Pure Fabrication), herhangi bir dosya sistemi adaptörü görmeden önce her göreli yolu normalleştirir. Şunları reddeder:

- Çalışma alanı kökünden kaçan `..` segmentleri (gereksiz `.` ve çift ayırıcılar daraltıldıktan sonra)
- `\0` (NUL bayt) içeren yollar
- Boş sonuçlar
- Windows'a ayrılmış adlar (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`)

Bulut taşıyıcısı hiçbir zaman dosya sistemine dokunmaz; yerel çalışma alanı taşıyıcısı (EX-4) her yazmayı bu yardımcı aracılığıyla yönlendirir.

### XSS / frontmatter enjeksiyonu

Markdown serileştiricisi her dizeye güvensiz olarak davranır. Kontrol karakterleri temizlenir, HTML etiketleri ve yorumlar temizlenir ve frontmatter dizeleri her zaman ters eğik çizgi kaçış kodlamasıyla çift tırnakla sarılır. `<script>alert(1)</script>OK` gibi bir başlık çıktıda yalnızca `OK` olarak görünür. Testler `libs/shared/serializers/src/lib/serializers.spec.ts` dosyasında bu davranışı kilitler.

### İmzalı indirmeler (EX-2)

| Özellik            | Değer                                                    |
| ------------------ | -------------------------------------------------------- |
| TTL                | Tek dosya 10 dk / paket 30 dk                            |
| Yeniden oynatma koruması | nonce `export_jobs.request->>'nonce'` içinde saklanır; yeniden kullanım → `410 Gone` |
| Kiracı izolasyonu  | Depo anahtarı `<tenantId>/` ön ekiyle; kiracılar arası paketler → `409 Conflict` |
| Paket boyutu sınırı | İstek başına 100 MB                                     |
| Hız sınırı         | 30 tek dosya/dk, 5 paket/saat (token bucket)             |

## GRASP / OOAD açıklaması

Sistem her GRASP ilkesini somut bir çağrı noktasıyla bir kez kullanır — soyut teori yok:

| İlke                   | Yer                                              | Sağladığı                                                                       |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Information Expert     | varlık başına serileştiriciler (kendi alanlarının yanında) | Muharebe kendi dışa aktarma şeklinin sahibidir; iş akışı muharebenin içlerine erişmez. |
| Creator                | `ExportEnvelopeFactory`                          | Zarfların oluşturulduğu tek yer — değişmezler atlatılamaz.                      |
| Controller             | `ExportOrchestrator`                             | UI hiçbir zaman fetch+serialize+deliver'ı koordine etmez; kullanım durumu başına tek giriş noktası. |
| Low Coupling           | `ExportTransport` arayüzü                        | Bulut ↔ yerel değişimi serileştiricilere dokunmaz.                              |
| High Cohesion          | `libs/features/exports`                          | UI, hook'lar, çalışma zamanı tespiti, orkestratör bağlantısı birlikte konumlandırılmış. |
| Polymorphism           | `Serializer` + `ExportTransport`                 | Yeni formatlar / hedefler kayıt yoluyla eklenir, `switch` merdiveni yok.        |
| Pure Fabrication       | `RedactionPolicy`, `SerializerRegistry`, `safeJoinWithinRoot` | Doğal alan evi yok, izole ve kolayca mock'lanabilir. |
| Indirection            | `ExportsRepositoryPort`                          | Edge URL / imzalı URL sağlayıcısı / depo tek bir yerde değişebilir.            |
| Protected Variations   | `schemaVersion` + manifest sürümü               | Eklemeli alanlar güvenlidir; kaldırmalar ana sürüm yükseltmesi gerektirir.      |

## Mevcut UI'yi yeniden kullanmak

`ExportModal`, `libs/ui/*` primitiflerinden oluşur — hiç ham HTML yok:

- `Dialog` + `ModalFooter` (overlays) — kabuk ve yapışkan alt bilgi
- `SegmentedControl` (components) — `FormatSelector` / `DestinationSelector` aracılığıyla hem format hem de hedef seçiciler için
- `InlineNotice` (feedback) — gizlilik açıklaması ve hata yüzeyi için
- `Button` (components) — `ModalFooter` tarafından sarılmış
- `HelpButton` (components) — bu sayfaya derin bağlantı

HelpButton, kullanıcının `useDocsLocale()` aracılığıyla depolanan dilini çözümler; böylece Türkçe bir kullanıcı bu makalenin Türkçe çevirisine, İngilizce bir kullanıcı İngilizce sürüme ulaşır.

## Hedefler

| Taşıyıcı                        | Çalışma zamanları                                  | Ne yapar                                                              |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| `cloud-download`                | bulut / localhost-browser / localhost-desktop      | Bir `exports-build` işi kuyruğa ekler, 10 dakikalık imzalı URL döndürür. |
| `local-download`                | localhost-browser / localhost-desktop              | Dosyayı istemci tarafında işler ve `<a download>` tetikler. Yükleme olmaz. |
| `local-workspace` _(EX-4)_     | yalnızca localhost-desktop                         | `.lenserfight/exports/<kind>/<slug>/…` dosyasına atomik olarak yazar. |

`useRuntimeMode()` (useSyncExternalStore ile desteklenen) hedef seçiciyi besler. SSR anlık görüntüsü her zaman `'cloud'`'dur, böylece ilk render belirleyicidir; istemci, hidratasyon uyuşmazlığı olmadan `localhost-browser` veya `localhost-desktop`'a çözülebilir.

## Yeni format nasıl eklenir

1. `(kind, format)` çifti için `Serializer<T>` arayüzünü uygulayın.
2. `libs/shared/serializers/src/lib/bootstrap.ts` dosyasına kaydedin.
3. Formatı `libs/domain/exports`'taki `EXPORT_FORMATS` ve `formatExtension()`'a ekleyin.
4. `FormatSelector` yeni seçeneği otomatik olarak alır; orkestratör değişikliği gerekmez.

Serileştiricinin `ExportEnvelope` üzerinde yeni bir alan getirmesi durumunda, `EXPORT_SCHEMA_VERSION`'ı yalnızca değişiklik **kaldırma veya yeniden adlandırma** ise yükseltin. Eklemeli alanlar `1.x.y` sürümünde kalır.

## Dosya düzeni (EX-4+)

```
.lenserfight/
├── exports/
│   ├── battles/<slug>/<YYYY-MM-DDTHHMMSSZ>--<shortid>.{md,json,yaml}
│   ├── workflows/<slug>/…
│   ├── lenses/<slug>/…
│   └── agents/<slug>/…
├── manifests/<exportId>.manifest.json
├── snapshots/<YYYY-MM-DD>/<exportId>.zip
└── cache/exports/<sha[:2]>/<sha>          # içerik adresli tekilleştirme
```

`buildExportFilename({ slug, format })` dosya adını üretir: kebab-case slug + ISO-8601 temel UTC + 6 karakterlik base32 kısa id. Makineler ve saatler arasında çakışmaya karşı güvenli.

## Fazlar

| Faz   | Kapsam                                                                             |
| ----- | ---------------------------------------------------------------------------------- |
| EX-1  | Alan türleri, kayıt defteri, `battle` ve `lens` için JSON + Markdown, bulut taşıyıcısı. |
| EX-2  | YAML, paket ZIP, toplu araç çubuğu, edge fn + kuyruk, imzalı URL'ler, denetim günlüğü. |
| EX-3  | İş akışı + Ajan serileştiricileri, önizleme modalı, doğrulama yaşam döngüsü UI, geçmişi. |
| EX-4  | Localhost-masaüstü taşıyıcısı (Tauri köprüsü), `.lenserfight/exports/` yazmaları. |
| EX-5  | Anlık görüntüler, yeniden oynatma/içe aktarma uyumluluk testleri, şema v1→v2 geçiş çerçevesi. |

Her faz güvenilirlik kapısının arkasında bağımsız olarak gönderilebilir.

## İlgili

- [`libs/domain/exports/src/lib/types.ts`](../../../../libs/domain/exports/src/lib/types.ts) — `ExportEnvelope`, `ExportManifest`, türler, formatlar, görünürlük
- [`libs/shared/serializers/src/lib/SerializerRegistry.ts`](../../../../libs/shared/serializers/src/lib/SerializerRegistry.ts) — kayıt + arama
- [`libs/features/exports/src/lib/orchestrator/ExportOrchestrator.ts`](../../../../libs/features/exports/src/lib/orchestrator/ExportOrchestrator.ts) — denetleyici
- [`libs/features/exports/src/lib/components/ExportModal.tsx`](../../../../libs/features/exports/src/lib/components/ExportModal.tsx) — UI giriş noktası
