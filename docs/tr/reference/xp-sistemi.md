# XP Sistemi

LenserFight, platform genelindeki anlamli aksiyonlar icin deneyim puanlari (XP) verir. XP, seviyenizi, rozetlerinizi, serilerinizi ve sezonluk siralamanizi belirler.

## Tasarim Ilkeleri

- **Oncelik adalet.** XP, sansa degil cabaya baglidir. Zor aksiyonlar kolay olanlardan daha fazla kazanir.
- **Parayla kazanma yok.** XP satin alinamaz, takas edilemez veya paraya cevrilemez.
- **Oyun onleme.** Bekleme sureleri, gunluk limitler ve sezonluk sinirlar XP farming'i onler.
- **Coklu uygulama farkindailigi.** Forum, Arena ve CLI, farkli zorluk profillerine sahip ayri uygulamalardir.

## XP Nasil Calisir

Her XP kazandiran aksiyonun bir **kurali** vardir:

1. **Temel XP** — olceklendirme oncesi ham miktar
2. **Zorluk** — `kolay`, `standart`, `zor` veya `efsanevi`
3. **Bekleme suresi** — tekrar oduller arasi minimum saniye
4. **Gunluk limit** — o aksiyon icin gunde maksimum XP
5. **Sezon limiti** — katki aksiyonlari icin sezon basina maksimum XP

Zorluk carpani temel XP'yi olceklendirir:

| Zorluk | Carpan | Ornek |
|--------|--------|-------|
| Kolay | 0.80x | Reaksiyon verme (5 temel = 4 XP) |
| Standart | 1.00x | Prompt olusturma (30 temel = 30 XP) |
| Zor | 1.50x | Savasa katilma (150 temel = 225 XP) |
| Efsanevi | 3.00x | Savas kazanma (300 temel = 900 XP) |

## Uygulamalar ve Zorluk

LenserFight'in farkli bolumleri farkli zorluk derecelerine sahiptir:

### Forum (Kolay)
Konu olusturma, yanitlama, reaksiyon verme. Forum giris noktasidir — aksiyonlar hafif ve siktir.

### Arena (Zor)
Savas olusturma, diger lenser'lara karsi yarisma, kazanma. Arena aksiyonlari hazirlik, beceri ve rekabetci caba gerektirir.

### CLI (Zor)
CLI baslatma, komut satirindan dagitim. Bu aksiyonlar teknik kurulum ve gelistirici becerileri gerektirir.

### Auth (Kolay)
Hesap olusturma ve profil tamamlama. Kucuk XP odulleri ile tek seferlik aksiyonlar.

## Seviyeler

Her uygulamanin kendi seviye egrisi vardir. Forum seviyeleri Arena seviyelerine gore daha kolay ulasilir. Seviye egrileri us-kanun formulunu izler: yuksek seviyeler katlanarak daha fazla XP gerektirir.

## Seriler

Bazi aksiyonlar gunluk serileri takip eder. Ardisik gunlerde aksiyonu gerceklestirirseniz seri sayaciniz artar. Seri kilometre taslari rozet kazandirir:

- 7 gunluk seri
- 30 gunluk seri
- 100 gunluk seri

## Sezonlar

XP sezonlari 90 gun surer. Bir sezon boyunca sezonluk XP'niz ayri bir liderlik tablosunda birikinir. Bir sezon bittiginde:

- Sezonluk XP'niz arsivlenir (asla silinmez)
- Yeni bir sezon otomatik olarak baslar
- Tum zamanlar XP'niz ve seviyeniz etkilenmez

## Katkici XP'si

LenserFight'a acik kaynak katkida bulunanlar calismalari icin XP kazanir.

| Katki | Etkin XP |
|-------|---------|
| PR birlestirme (ana proje) | 1500 |
| PR birlestirme (topluluk eklentisi) | 300 |
| PR birlestirme (dokumantasyon) | 100 |
| Kod inceleme | 75 |
| Sorun bildirme | 30 |

## XP Ne Degildir

- XP, ozelliklere erisim saglamaz
- XP, savas sonuclarini etkilemez
- XP, token veya paraya cevrilemez
- XP, icerige erisimi sinirlamak icin kullanilmaz

XP, katilim ve katkinin sosyal bir sinyalidir.
