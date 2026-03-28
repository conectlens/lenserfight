# XP Sistemi

LenserFight, platform genelindeki anlamli aksiyonlar icin deneyim puanlari (XP) verir. XP, seviyenizi, serilerinizi ve sezonluk siralamanizi belirler.

## Tasarim Ilkeleri

- **Oncelik adalet.** XP, sansa degil cabaya baglidir. Zor aksiyonlar kolay olanlardan daha fazla kazanir.
- **Parayla kazanma yok.** XP satin alinamaz, takas edilemez veya paraya cevrilemez.
- **Oyun onleme.** Bekleme sureleri, gunluk limitler ve sezonluk sinirlar XP farming'i onler.
- **Gorunurluk donustu.** Yalnizca herkese acik icerikler olusturma XP'si kazandirir. Icerik gizli yapildiginda XP geri alinir.
- **Kendi iceriginle etkilesim engeli.** Kendi konuna reaksiyon vermek veya yanit vermek "alindi" tipinde XP kazandirmaz.

## XP Nasil Calisir

Her XP kazandiran aksiyonun bir **kurali** vardir:

1. **Temel XP** — olceklendirme oncesi ham miktar
2. **Zorluk** — `kolay`, `standart`, `zor` veya `efsanevi`
3. **Bekleme suresi** — tekrar oduller arasi minimum saniye
4. **Gunluk limit** — o aksiyon icin gunde maksimum XP
5. **Sezon limiti** — 90 gunluk sezon boyunca o aksiyon turunden maksimum XP

Zorluk carpani temel XP'yi olceklendirir:

| Zorluk | Carpan | Ornek |
|--------|--------|-------|
| Kolay | ×0.75 | Reaksiyon verme (5 temel → 4 XP) |
| Standart | ×1.00 | Konu olusturma (30 temel → 30 XP) |
| Zor | ×1.50 | Lens yayinlama (80 temel → 120 XP) |
| Efsanevi | ×2.50 | Savas kazanma (150 temel → 375 XP) |

## Uygulamalar

| Uygulama | Odak alani |
|----------|-----------|
| **Forum** (`...0001`) | Icerik, sosyal, katkilar |
| **Battles** (`...0002`) | Rekabetci savas aksiyonlari |

## XP Kazandiran Aksiyonlar

### Icerik Olusturma

Yalnizca **herkese acik + yayinlanmis** icerik olusturma XP'si kazandirir. Taslaklarin ve gizli iceriklerin XP'si yoktur.

| Aksiyon | Kazanilan XP |
|---------|-------------|
| Lens yayinla (herkese acik) | **120** |
| Is akisi yayinla (herkese acik) | **90** |
| Konu olustur (herkese acik) | **30** |
| Yanit gonder | **12** |

> Herkese acik bir lens veya konuyu **gizli** yaparsan olusturma XP'si geri alinir. Yeniden yayinlarsan XP bir kez daha verilir.

### Sosyal — Verme

| Aksiyon | Kazanilan XP | Bekleme |
|---------|-------------|---------|
| Reaksiyon ver | **4** | 60 s |
| Is akisini begeni | **4** | 2 dak |
| Is akisini kaydet | **6** | 5 dak |
| Is akisini catal | **20** | 30 dak |
| Lens catal | **20** | 30 dak |

### Sosyal — Alma

Kendi icerigine kendisi etkilesim yaparak "alindi" XP kazanilmaz.

| Aksiyon | Kazanilan XP | Gunluk limit |
|---------|-------------|-------------|
| Reaksiyon al | **6** | 50 olay / 300 XP |
| Yanit al | **8** | 30 olay / 200 XP |
| Is akisi begeni al | **6** | 30 olay / 200 XP |
| Is akisi kaydet al | **9** | 20 olay / 200 XP |
| Is akisi catal al | **25** | 10 olay / 200 XP |
| Lens catal al | **25** | 10 olay / 200 XP |
| Yeni takipci | **4** | 20 olay / 80 XP |

### Savaslar

| Aksiyon | Kazanilan XP | Notlar |
|---------|-------------|-------|
| Savas olustur | **50** | Taslak disindaki savaslar; max 2/gun |
| Savasa katil | **150** | Savas kapandiginda verilir |
| Savas kazan | **375** | Katilim XP'sine ek olarak |
| Savasta oy ver | **8** | 10 dak bekleme |

### Gunluk Aktivite ve Seriler

| Aksiyon | Kazanilan XP | Notlar |
|---------|-------------|-------|
| Gunluk giris | **8** | 23 saat bekleme (gunde bir) |
| 7 gunluk seri bonusu | **50** | 7 ardisik gun sonunda |
| 30 gunluk seri bonusu | **225** | 30 ardisik gun sonunda |

### Katki XP'si

| Katki | Etkin XP |
|-------|---------|
| PR birlestirme (ana proje) | **1.250** |
| PR birlestirme (topluluk / altyapi) | **300** |
| PR birlestirme (dokumantasyon) | **100** |
| Kod inceleme | **40** |
| Sorun bildirme | **23** |

## Seviyeler

Her iki uygulama da ayni 100 seviyeli egriye sahiptir (`temel=150, kuvvet=0.75`):

| Seviye | Gereken XP |
|--------|-----------|
| 10 | ~4.400 |
| 25 | ~22.500 |
| 50 | ~92.000 |
| 100 | ~330.000 |

## Sezonlar

XP sezonlari 90 gun surer. Bir sezon boyunca sezonluk XP'niz ayri bir liderlik tablosunda birikinir. Sezon bittiginde:

- Sezonluk XP'niz arsivlenir (asla silinmez)
- Yeni bir sezon otomatik olarak baslar
- Tum zamanlar XP'niz ve seviyeniz etkilenmez

## XP Ne Degildir

- XP, ozelliklere erisim saglamaz
- XP, savas sonuclarini etkilemez
- XP, token veya paraya cevrilemez
- XP, icerige erisimi sinirlamak icin kullanilmaz

XP, katilim ve katkinin sosyal bir sinyalidir. Liderlik tablolarini ve topluluk taninirligi guclendirir.
