# Essensiana

Aplikasi baca materi/ebook pribadi. Impor naskah mentah (tempel teks atau unggah
file), aplikasi mengubahnya jadi ebook yang bisa dibaca per bagian, lengkap
dengan blok "latihan/refleksi" yang bisa langsung diketik jawabannya dan
tersimpan otomatis ke akunmu.

Dibangun vanilla HTML/CSS/JS (tanpa build tool) + Firebase (Authentication
email/password, dan Firestore untuk data). Dirancang supaya **upgrade fitur
cukup ganti `index.html`** saja.

## Struktur file

```
icons/              -> ikon PWA berbagai ukuran, dari logo Essensiana. Jarang berubah.
.nojekyll            -> supaya GitHub Pages tidak memproses folder lewat Jekyll.
README.md            -> dokumen ini.
index.html           -> SELURUH tampilan + logika aplikasi. Ini satu-satunya
                         file yang perlu kamu ganti saat upgrade.
firebase-config.js    -> kredensial proyek Firebase kamu. Terpisah dari index.html
                         supaya tidak perlu ikut diedit saat upgrade.
manifest.json         -> metadata PWA (nama, warna, ikon). Jarang berubah.
service-worker.js     -> strategi cache "network-first" untuk index.html, jadi
                         update otomatis kepakai tanpa perlu bump versi cache
                         setiap rilis. Cuma perlu diedit kalau kamu mengubah
                         STRATEGI cache-nya sendiri, bukan tiap kali konten berubah.
```

## Cara upgrade aplikasi

1. Edit `index.html` versi baru di komputer kamu (atau minta dibuatkan).
2. Upload/replace file `index.html` itu saja ke repo GitHub.
3. Selesai — pengguna yang online akan otomatis mendapat versi terbaru berkat
   strategi network-first di `service-worker.js`. Tidak perlu menyentuh file
   lain kecuali kamu memang mengganti kredensial Firebase, ikon, atau strategi
   cache-nya sendiri.

## Firebase yang dipakai

- **Authentication** — email & password (termasuk lupa kata sandi).
- **Firestore** — menyimpan data materi & jawaban latihan, dengan struktur:

```
users/{uid}
users/{uid}/books/{bookId}                       -> metadata buku (judul, jumlah bagian, dst)
users/{uid}/books/{bookId}/modules/{index}        -> isi tiap bagian/bab (blocks JSON)
users/{uid}/books/{bookId}/answers/{index}        -> jawaban latihan per bagian
```

- **Storage** — *sengaja tidak dipakai untuk menyimpan file mentah secara
  default*. Hanya dipakai kalau pengguna secara eksplisit mencentang "simpan
  file asli sebagai cadangan" saat impor (dan dibatasi maksimal 3MB per file)
  di path `users/{uid}/originals/...`.

### Rekomendasi Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Rekomendasi Storage Security Rules (kalau fitur "simpan file asli" dipakai)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 3 * 1024 * 1024;
    }
  }
}
```

## Kenapa cuma menyimpan teks, bukan file aslinya?

Ini keputusan desain utama supaya kuota Firebase (terutama Firestore &
Storage) tidak cepat penuh:

| Format sumber   | Perkiraan ukuran | Disimpan ke Firebase sebagai            |
|-----------------|------------------|------------------------------------------|
| `.md` / `.txt`  | puluhan KB       | teks hasil parsing (paling kecil)         |
| `.docx`         | ratusan KB–MB    | hanya teks hasil ekstraksi (`mammoth.js`) |
| `.pdf`          | bisa puluhan MB  | hanya teks hasil ekstraksi (`pdf.js`)     |
| foto/scan       | besar per file   | **tidak disarankan** — perlu OCR, berat   |

Rekomendasi urutan pemakaian: **.md paling baik → .txt → .docx → .pdf** (hasil
ekstraksi PDF kadang kurang rapi urutannya, terutama PDF dengan desain visual
seperti brosur/majalah). File asli (PDF/DOCX/gambar) dibuang setelah teksnya
diambil, kecuali pengguna sengaja mencentang opsi cadangan.

## Format naskah yang dikenali

Judul bagian/bab bisa ditandai dengan salah satu:

```
# Judul Modul       (markdown heading)
MODUL 01: Judul
BAB 1 — Judul
CHAPTER 1: Judul
```

Blok latihan yang menghasilkan kolom jawaban yang bisa diketik:

```
:::latihan Judul Latihan (opsional)
- Pertanyaan pertama
- Pertanyaan kedua
:::
```

Kalau file sumbernya (hasil ekstraksi `.docx`/`.pdf`) tidak memakai sintaks
di atas, Essensiana tetap mencoba menebak: bab lewat kata kunci `MODUL`/`BAB`/
`CHAPTER`/`PART`, dan blok latihan lewat baris yang mengandung kata `LATIHAN`.
Hasil tebakan ini tidak serapi format `.md` manual, jadi tetap disarankan
merapikan naskah ke `.md` dulu kalau ingin hasil terbaik.

## Menjalankan / deploy

Karena tidak ada build step, tinggal:

1. Push semua file di folder ini ke repo GitHub.
2. Aktifkan GitHub Pages (branch `main`, folder root).
3. Pastikan domain GitHub Pages kamu ditambahkan di Firebase Console →
   Authentication → Settings → Authorized domains.
