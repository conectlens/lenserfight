---
title: Bilinen Sınırlamalar
description: LenserFight Community Edition'daki güncel kısıtlamalar — zamanlama, onaylar, bellek, savaşlar ve dokümantasyon kapsamı. Özür yok, yol haritası abartısı yok.
---

# Bilinen Sınırlamalar

Bunlar mevcut sürümdeki gerçek kısıtlamalardır. Hata değildirler — bilinen ödünleşmelerle alınmış kasıtlı kapsam kısıntıları veya mühendislik kararlarıdır. LenserFight'ı kurmadan veya değerlendirmeden önce okuyun.

---

## Zamanlama

**CRON zamanlama, tam bir Supabase örneği gerektirir.**
Dispatch fonksiyonu Postgres içinde `pg_cron` üzerinden çalışır. SQLite, PlanetScale, pg_cron uzantısı olmayan yalnızca-yerel Postgres ve tek başına Supabase Edge Functions çalışmayacaktır. Süreç-içi bir zamanlayıcı yoktur.

**Zamanlama geçmişi sorgu başına 50 çalıştırma ile sınırlıdır.**
`lf schedule history <id>`, zamanlamanın `workflow_id`'sine göre filtrelenmiş `lenses.workflow_runs` tablosundan en son çalıştırmaları okur. Varsayılan sayfa boyutu 10'dur; `--limit` 1–50 arası değer kabul eder. 50 girişin ötesindeki eski geçmiş için doğrudan SQL sorgusu gerekir.

**Kaçırılan çalıştırma davranışı varsayılan olarak skip'tir.**
Zamanlanmış pencere sırasında pg_cron işçisi devre dışıysa, çalıştırma varsayılan olarak atlanır. Geri dolum modu (`queue_policy.onMissed='backfill'`) mevcuttur ancak henüz CLI'da yüzeylenmemiştir.

---

## Onaylar

**Onay webhook'u "ateşle ve unut" türündedir — yeniden deneme, e-posta/push taşıması yoktur.**
`app.approval_webhook_url` yapılandırıldığında, yeni oluşturulan her bekleyen onay `pg_net` aracılığıyla tek bir best-effort POST tetikler. Teslim hatasında yeniden deneme yoktur, dahili e-posta veya push taşıması yoktur ve imzalama yoktur — operatörler teslimi yalnızca best-effort temelinde alır. En az bir kez teslim için `agents.approval_requests_v` tablosunu yoklayın ve uzlaştırın.

**Her çalıştırma bireysel onay gerektirir — toplu veya kalıcı onay yoktur.**
"Sonraki 24 saat boyunca bu zamanlamadan herhangi bir çalıştırmayı onayla" gibi bir yüzey yoktur. Her zamanlanmış dispatch, bireysel olarak karara bağlanması gereken kendi bekleyen girişini oluşturur.

**Çoklu onaylayıcı iş akışları desteklenmez.**
Tek bir sahip veya ortak sahip kararı kesindir. M-of-N onay şemaları modellenmemiştir.

---

## Araçlar ve bellek

**Araç çağrı kayıtları çağrı başınadır — iş akışları arası özet yoktur.**
`platform.tool_invocation_logs`, bireysel çağrıları kaydeder. Bir agent veya zaman dilimi için tüm çalıştırmalar boyunca toplam araç kullanımını gösteren toplu bir görünüm yoktur.

**Bellek tam metin araması yalnızca Postgres `english` sözlüğünü kullanır.**
`lf memory search`, GIN-indeksli bir tsvector aracılığıyla `agents.memories.content` üzerinde sorgulama yapar. İngilizce olmayan içerik aranabilir ancak sıralama İngilizce kök çekimine doğru eğilimlidir. Anlamsal benzerlik (vektör araması) henüz yüzeylenmemiştir.

**Bellek kontrol noktası politikası iş akışı düğümü başına opt-in'dir.**
Varsayılan `memory_write_policy='on_success'` başarısızlık durumunda tamponlanmış girişleri atar. Kısmi-yazma dayanıklılığı gerektiren iş akışları, ara belleğin başarısızlıktan sonra hayatta kalması gereken her düğümde `memory_write_policy='checkpoint'` ayarlamalıdır.

---

## Savaşlar

**Yerel savaşlar yerel sağlayıcı anahtarlarını kullanır — maliyet üst sınırı uygulaması yoktur.**
`lf battle local run`, yapılandırılmış anahtarınızı kullanarak doğrudan sağlayıcı API'nizi çağırır. LenserFight, yerel savaş yürütmesinde harcama sınırı dayatmaz. Sağlayıcınızın kendi hız sınırları geçerlidir.

**Bulut savaşları Sınırlı Beta'dadır ve açık bir erişim izni gerektirir.**
Onaylı bir bulut savaşları dağıtımı, bulut arena arayüzünü ve işçiyi açar; ancak yüzey genel kullanıma açık değildir. Herhangi bir herkese açık dağıtımdan önce moderasyon sistemi, oylama bütünlüğü kontrolleri ve kötüye kullanım azaltmaları [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) listesini geçmelidir.

**Yerel savaş şifrelemesi yerel anahtarınıza bağlıdır.**
Yeni savaş durumu kullanıcı çalışma zamanı depolamasına yazılır ve `LENSERFIGHT_LOCAL_BATTLE_KEY` ile şifrelenir. Eski proje kökü `.lenserfight/local-battles/{id}.json` dosyaları hâlâ bulunabilir ve özel prompt veya çıktılar içerebilir. Bu dosyaları commit etmeyin.

---

## API ve dokümantasyon

**OpenAPI 3.1 spesifikasyonu yayımlanır ancak rota işleyicilerinden otomatik üretilmez.**
HTTP API yüzeyi [`docs/reference/platform-api/openapi.yaml`](https://github.com/conectlens/lenserfight/blob/main/docs/reference/platform-api/openapi.yaml) dosyasında tanımlanır. Spesifikasyon `libs/api/contracts/` içindeki DTO'lara karşı el ile yazılmıştır; CI bunu `redocly` ile linter'dan geçirir ancak henüz rota işleyici imzalarına karşı diff yapmaz. Drift mümkündür.

**Türkçe dokümantasyon, niş sayfalarda İngilizceden geri kalır.**
Yüksek trafikli sayfalar (Hızlı Başlangıç, OSS Lansman Kapsamı, Bilinen Önizleme Yüzeyleri) çevrilmiştir. Derinlemesine referans sayfaları yalnızca İngilizce olarak kalmaya devam eder ve Türkçe gezintiden bağlantılanmaz.

**CLI referansı, gönderilen komutların yanı sıra önerilen komutları da belgeler.**
Referans dokümantasyonunda açıklanan bazı `lf` alt komutları "Önerilen" olarak işaretlenmiştir ve henüz uygulanmamıştır. Şu anda neyin mevcut olduğu konusunda CLI yardımı (`lf --help`, `lf <command> --help`) yetkilidir.

---

## Self-hosted kurulumlar

**Supabase seed ilk çalıştırmada birkaç dakika sürer.**
Seed scripti (`supabase/seed.sql`) tüm RPC'leri, görünümleri ve başlangıç verilerini uygular. Soğuk bir yerel Supabase örneğinde bu 3–5 dakika sürebilir. Bu, tek seferlik bir maliyettir.

**Ortam değişkeni değişiklikleri geliştirme sunucusunun yeniden başlatılmasını gerektirir.**

Vite, `import.meta.env` değerlerini yalnızca geliştirme sunucusu başlarken okur. `.env` / `.env.local` düzenledikten sonra `pnpm nx run web:serve` komutunu yeniden başlatın (env dosyalarını değiştirdiyseniz `auth` / `arena` için de aynısı geçerlidir).

---

## İlgili

- [Bilinen Önizleme Yüzeyleri](/tr/reference/known-preview-surfaces) — kapılama ve geri alma talimatları
- [OSS Lansman Kapsamı](/tr/explanation/community/oss-launch-scope) — bu sürümün kapsamı dahilinde olan ve olmayanlar
- [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) — bulut savaşlarını etkinleştirmeden önce gereken kontroller
