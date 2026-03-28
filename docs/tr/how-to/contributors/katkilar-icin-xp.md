# Katkilar Icin XP

LenserFight, acik kaynak katkida bulunanlarini XP ile odullendirir. Ana projeye katkida bulunmak, tum XP sistemindeki en yuksek degerli aksiyondur.

## Nasil Calisir

Katkiniz dogrulandiginda (GitHub webhook veya yonetici onayi ile) sistem:

1. Katki turunu ve deposunu uygun XP kuralina eslestirir
2. Zorluk carpanini uygular
3. Katki kaydina bagli degistirilemez bir XP olayi olusturur
4. Toplamlarinizi, seviyenizi ve sezonluk durumunuzu gunceller

## Katki Baglamlari

| Baglam | Aciklama | Kullanilan kural |
|--------|---------|----------------|
| `main_project` | LenserFight ana deposu (`connectlens-org/lenserfight-web`) | `CONTRIB_PR_MERGED_MAIN` |
| `community_plugin` | Topluluk eklentileri, adaptorler, entegrasyonlar | `CONTRIB_PR_MERGED_COMMUNITY` |
| `infrastructure` | CI/CD, DevOps, araclar | `CONTRIB_PR_MERGED_COMMUNITY` |
| `documentation` | Dokumantasyon iyilestirmeleri | `CONTRIB_PR_MERGED_DOCS` |

## XP Odulleri

| Katki | Temel XP | Zorluk | Etkin XP | Max/gun | Sezon limiti |
|-------|---------|--------|---------|--------|-------------|
| PR birlestirme — ana proje | 500 | Efsanevi (×2.5) | **1.250** | 2 olay / 1.000 XP | 3.000 |
| PR birlestirme — topluluk / altyapi | 200 | Zor (×1.5) | **300** | 3 olay / 600 XP | 2.000 |
| PR birlestirme — dokumantasyon | 100 | Standart (×1.0) | **100** | 5 olay / 400 XP | 1.500 |
| Sorun bildirme | 30 | Kolay (×0.75) | **23** | 5 olay / 100 XP | 500 |
| Kod inceleme | 40 | Standart (×1.0) | **40** | 5 olay / 150 XP | 600 |

## GitHub Hesabinizi Baglama

Otomatik XP almak icin GitHub hesabinizi LenserFight profil ayarlarinizin sosyal baglantilar bolumunden baglayin. Sistem, gelen webhook olaylarini GitHub kullanici adinizla eslestirir.

GitHub'iniz bagli degilse, bir yonetici katki XP'sini manuel olarak verebilir.

## Oyun Onleme Tedbirleri

| Kontrol | Detay |
|---------|-------|
| Gunluk olay limitleri | Tek bir gunde toplu PR birlestirmenin liderlik tablosuna hakimiyetini onler |
| Sezon limitleri | Ana proje PR'lari icin sezon basina 3.000 XP maksimum |
| Dogrulama | GitHub webhook imzalari veya yonetici incelemesi ile dogrulanir |
| Baglam siniflandirmasi | Depo, baglami otomatik belirler; kendi kendine bildirilemez |
| Degistirilemez olaylar | XP olaylari olusturulduktan sonra degistirilemez |

## Yoneticiler Icin

Manuel katki XP'si vermek icin:

```sql
SELECT xp.grant_contribution_xp(
  p_lenser_id         := '<lenser-uuid>',
  p_context           := 'main_project',   -- veya 'community_plugin', 'documentation', 'infrastructure'
  p_contribution_type := 'pr_merged',      -- veya 'issue_filed', 'review_given'
  p_external_ref      := 'github:connectlens-org/lenserfight-web#456',
  p_title             := 'XP sezon limiti sorgusunu duzelt'
);
```

Gecerli `p_contribution_type` degerleri: `pr_merged`, `issue_filed`, `review_given`.

Bu fonksiyon katki ID'sini dondurur ve tum XP boru hatti mantigini (carpan, gunluk limit, sezon limiti, toplamlar, seviye yeniden hesaplama) icerir.
