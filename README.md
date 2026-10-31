# Cam Kule: İkiz Parkur (gameengin)

3 boyutlu, cam bölmeli ikiz odalarda geçen, çok katlı prosedürel parkur, kat bazlı özel etkinlik anomalileri, gerçek zamanlı sohbet ve kazanan ödüllü 2 kişilik online WebGL/Three.js yarış oyunu.

---

## 🎮 Oyun Özellikleri

- **Cam Bölmeli İkiz Odalar**: İki oyuncu yan yana odalarda, ortadaki kırılmaz cam bölmeden birbirini anlık olarak görerek yarışır.
- **3B Yumurta Karakterler**: Kolları, bacakları, gözleri ve mimikleri olan sevimli yumurta avatarları. Her yarışta yumurta renkleri baştan oluşturulur ve asla aynı kalmaz.
- **5 Katlı Prosedürel Parkur**:
  - **Kat 1**: Zümrüt Sera (Biyo-Kubbe Başlangıç)
  - **Kat 2**: Kehribar Saat Kulesi (Salınımlı Sarkaçlar & Dişli Köprüler)
  - **Kat 3**: Kristal Buzul Laboratuvarı (Dar Geçitler & Lazer Süpürücüler)
  - **Kat 4**: Volkanik Magma Reaktörü (Pistonlar & Enerji Plakaları)
  - **Kat 5**: Gökyüzü Tacı (Şampiyonluk Podyumu & Zirve)
  - Her oyunda parkur tohumu (`seed`) sıfırdan üretilir; hiçbir parkur kendini tekrar etmez.
- **Kata Özel Anomali Etkinlikleri**: Buzlu kaygan zemin, ters kontroller, ay yerçekimi, hız koridoru, sismik yer sarsıntıları.
- **İki Oyuncu Onay Kilidi**: İki oyuncu da lobi ekranında onay vermeden yarış başlamaz (veya tek kişilik pratik için yan odaya bot eklenebilir).
- **Şampiyonluk Ödülleri**: Zirveye ilk ulaşan oyuncu özel eşya kazanır (Altın Yumurta Kanatları, Kuantum Yay Çizmeleri, Foton Sırt Roketi) ve sonraki oyunda çift zıplama ile havada atılma gücünü kullanabilir.
- **Gerçek Zamanlı Sohbet**: `[T]` tuşuna basarak anlık mesajlaşma.
- **Anti-Glitch & Hata Korumaları**: Boşluktan checkpoint'e ışınlanma, `[R]` kurtarma tuşu, alt-adımlı çarpışma fiziği ve cam duvardan geçmeyi engelleyen sınır kalkanı.

---

## 🕹️ Kontroller

| Tuş | Eylem |
|---|---|
| **W, A, S, D** veya **Yön Tuşları** | Hareket |
| **Space** | Zıplama (Özel Eşya ile Çift Zıplama) |
| **E** veya **Shift** | Havada Atılma (Özel Eşya) |
| **T** | Oyun İçi Sohbet Aç / Kapat |
| **R** | Son Checkpoint'e Kurtarma |
| **P** veya **Esc** | Duraklatma Menüsü |
| **M** | Ses Aç / Kapat |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- npm veya bun

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirici sunucusunu başlatın (Express + Socket.io + Vite):
```bash
npm run dev
```

3. Tarayıcınızda açın:
```
http://localhost:3000
```

4. Birim testlerini çalıştırmak için:
```bash
npm test
```
