# Katkilar Icin XP

LenserFight, acik kaynak katkida bulunanlarini XP ile odullendirir. Ana projeye katkida bulunmak, tum XP sistemindeki en yuksek oncelikli aksiyondur.

## Nasil Calisir

Katkiniz dogrulandiginda (GitHub webhook veya yonetici onayi ile) sistem:

1. Katkinizi uygun XP kuralina eslestir
2. Zorluk carpanini uygular
3. XP olayini kaydeder ve katki kaydina baglar
4. Toplamlarinizi, seviyenizi ve sezonluk durumunuzu gunceller

## Katki Baglamlari

Katkilar, calismanin nerede yapildigina gore siniflandirilir:

| Baglam | Aciklama | Oncelik |
|--------|---------|---------|
| `main_project` | LenserFight ana depo | En yuksek |
| `community_plugin` | Topluluk eklentileri ve entegrasyonlar | Yuksek |
| `documentation` | Dokumantasyon iyilestirmeleri | Standart |
| `infrastructure` | CI/CD, DevOps, araclar | Yuksek |

## XP Odulleri

| Katki | Temel XP | Zorluk | Etkin XP | Sezon Limiti |
|-------|---------|--------|---------|-------------|
| PR birlestirme (ana proje) | 500 | Efsanevi (3.0x) | **1500** | 15,000 |
| PR birlestirme (topluluk) | 200 | Zor (1.5x) | **300** | 8,000 |
| PR birlestirme (dokumantasyon) | 100 | Standart (1.0x) | **100** | 5,000 |
| Sorun bildirme | 30 | Standart (1.0x) | **30** | 1,500 |
| Kod inceleme | 50 | Zor (1.5x) | **75** | 2,500 |

## GitHub Hesabinizi Baglama

Katkilar icin otomatik XP almak icin, GitHub hesabinizi ayarlar sayfasindaki sosyal baglantilar bolumunden LenserFight profilinize baglayin. Sistem, gelen webhook olaylarini GitHub kullanici adinizla eslestirir.

GitHub'iniz bagli degilse, bir yonetici katki XP'sini manuel olarak verebilir.

## Oyun Onleme Tedbirleri

- **Gunluk limitler**: Aksiyon turune gore gunluk maksimum XP
- **Sezon limitleri**: Aksiyon turune gore sezon basina maksimum XP
- **Dogrulama**: Katkilar GitHub webhook imzalari veya yonetici incelemesi ile dogrulanir
- **Baglam siniflandirmasi**: Depo, baglami otomatik olarak belirler
