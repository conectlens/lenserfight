---
title: İş Akışı Güvenliği
description: LenserFight'ın iş akışı yürütmesini nasıl güvende tuttuğu — worker ayrıcalık sınırı, enjeksiyona karşı güvenli parametreli promptlar, idempotency ve hız sınırları, bütçeler, moderasyon, insan onayları ve hata kurtarma.
---

# İş Akışı Güvenliği

İş akışları güvenilmeyen promptları çalıştırır, dış sağlayıcıları çağırır, kredi harcar ve webhook'lar ile zamanlamalar tarafından tetiklenebilir. Bu sayfa, tüm bunları güvende tutan katmanları açıklar. Yol gösterici ilke **RLS önceliklidir**: her tablo satır düzeyi güvenliği zorunlu kılar ve ayrıcalıklı işlemler yalnızca dar kapsamlı fonksiyonların ardında gerçekleşir.

## Worker ayrıcalık sınırı

Yürütme iki rol arasında bölünmüştür:

- **İstemciler** (`authenticated` / `anon`) — web uygulaması, CLI ve MCP sunucusu. İş akışlarını, satır düzeyi güvenlikle korunan RPC'ler aracılığıyla oluşturur ve başlatırlar.
- **Worker** (`service_role`) — çalıştırmaları üstlenen, sağlayıcı anahtarlarını çözen, ham lens gövdelerini okuyan ve düğüm sonuçlarını yazan tek roldür.

Bu ayrıcalıklı işi yapan fonksiyonlar `SECURITY DEFINER`'dır ve yükseltilmiş yetkilerle çalışır; bu nedenle **yalnızca** `service_role`'e verilir — asla `anon` veya `authenticated`'e verilmez. Bir istemci, bir worker fonksiyonunu doğrudan çağırarak saklanan bir anahtarı çözemez, başka bir kiracının çalıştırmasını üstlenemez veya özel bir lens gövdesini okuyamaz. Bu sınır sürekli çalışan bir test ile doğrulanır; böylece yeni eklenen bir worker fonksiyonu bu sınırı bozacak şekilde gerileme yaratamaz.

## Enjeksiyona karşı güvenli parametreli promptlar

::: v-pre
Parametreler, yaygın şablon motorlarının kullandığı `{{ … }}` söz dizimi yerine çift köşeli parantez belirteçlerini kullanır — `[[label]]`, isteğe bağlı için `[[label!]]`, tipli için `[[label:type]]`.

Bu tercih bilinçlidir: bir kullanıcının prompt gövdesi sıklıkla birebir `{{ … }}` *içerir* (Jinja, Handlebars, Mustache örnekleri). `[[ … ]]` üzerinden bağlanmak, kullanıcı içeriğinin parametre motoruyla asla çakışamayacağı anlamına gelir ve girdi temizleme, sağlanan değerlerden `{{ … }}` dizilerini etkin biçimde ayıklar; böylece bunlar aşağı akıştaki bir işleyiciye şablon kontrolü kaçıramaz.
:::

İşlenen promptu iki ek koruma daha güvence altına alır:

- **Katı çözümlenmemiş belirteç tespiti** — ikame işleminden sonra, geride kalan zorunlu bir yer tutucu, yarı doldurulmuş bir promptu bir modele göndermek yerine düğümü iptal eder.
- **Dahili kimlikler sızmaz** — saklanan biçimdeki `[[:uuid]]` referansları (bir parametrenin kalıcı gösterimi) bir prompt bir sağlayıcıya ulaşmadan önce ayıklanır; böylece dahili bir kimlik asla model girdisinde görünemez.

## İdempotency ve hız sınırları

- **İdempotency** — bir çalıştırmayı başlatmak, iş akışından ve girdilerinden türetilen bir idempotency anahtarını kabul eder. Anahtarın TTL penceresi içinde, tekrarlanan bir gönderim, yinelenen bir çalıştırma oluşturmak yerine aynı çalıştırmaya çözümlenir; böylece yeniden denenen bir webhook veya çift tıklama, paralel yürütmelere dağılmaz.
- **Hız sınırlama** — çalıştırma oluşturma, kısa bir kayan pencere boyunca lenser başına sınırlandırılır ve kazara ya da kötü amaçlı ani artışları sınırlar.
- **Eşzamanlılık** — zamanlamalar bir `max_concurrent` politikasına uyar; böylece yavaş bir iş akışı, sınırsız sayıda üst üste binen çalıştırmayı biriktiremez.

## Bütçeler ve maliyet kontrolü

Her çalıştırma bir kredi bütçesi taşır. Zamanlayıcı, her düğüm dalgasından önce harcamayı bütçeye karşı denetler ve bir çalıştırma bütçeyi aşacaksa zamanlamayı durdurur; böylece kontrolden çıkan bir döngü veya pahalı bir model bir hesabı sessizce tüketemez. Zamanlanmış gönderim ayrıca agent başına harcama sınırlarını ve sistem genelinde bir acil durdurma anahtarını / kuyruk dondurmasını zorunlu kılar.

## Moderasyon ağ geçidi

AI düğümleri her iki yönde de moderasyondan geçer: girdiler bir sağlayıcı çağrısından önce, çıktılar ise aşağı akıştaki düğümlere sunulmadan önce taranır. Engellenen bir düğüm sessizce atılmak yerine etiketlenir (`moderation_blocked`); böylece çalıştırma kaydı, bir dalın neden durduğunu açıklar.

## İnsan denetimli onaylar

Zamanlamalar ve hassas düğümler, ilerlemeden önce bir onay gerektirebilir. Bir onay politikası, çalıştırmayı bir kontrol noktasında duraklatır ve kimin onayladığını kaydeder; bu da otomasyonu tamamen devre dışı bırakmadan, yüksek etkili veya geri alınamaz eylemlerde bir insanın kontrolde kalmasını sağlar.

## Hata politikaları ve kurtarma

Geçici bir arızanın işi kaybetmemesi veya yinelememesi için güvenilirlik katmanlıdır:

- **Düğüm başına** — geri çekilmeli (backoff) yapılandırılabilir yeniden denemeler, zaman aşımları ve bir üst-düğüm hata politikası (`skip`, `propagate` veya `substitute_default`).
- **Çalıştırma başına** — bir heartbeat, bir çalıştırmanın bir worker tarafından etkin biçimde sahiplenildiğini işaretler; bir kurtarma döngüsü yalnızca heartbeat'i eskimiş çalıştırmaları geri alır; böylece devam eden bir çalıştırma asla çalınmaz.
- **Ölü mektuplar (dead letters)** — tükenmiş hatalar, yok olmak yerine inceleme için bir dead-letter kaydına düşer.

## Görünürlük ve dışa aktarma redaksiyonu

Bir iş akışının grafiğini okumak (bkz. [Bir İş Akışını Dışa Aktarma](/en/how-to/workflows/export-a-workflow)) genel veya sahip olunan iş akışlarıyla sınırlıdır ve yapılandırma **referansları** döndürür — asla çözülmüş anahtarlar değil. Webhook gizli anahtarları ve entegrasyon kimlik bilgileri düğüm grafiğinin dışında yaşar ve dışa aktarmalardan çıkarılır.

## İlgili

- [İş Akışı Kavramları](./workflow-concepts.md)
- [Bir İş Akışını Dışa Aktarma](/en/how-to/workflows/export-a-workflow)
- [Açık Kaynak İş Akışları](./open-source-workflows.md)
