# Aplikasi Admin Surat Lembur

Aplikasi web statis (HTML + CSS + JavaScript, tanpa backend) untuk membuat **SPK PLN** dan **SPK Lembur PLN Nusa Daya**
dalam satu lembar A4 per surat, mengikuti template pada `Bahan_Proyek.pdf`.

Aplikasi ini adalah alat bantu administrasi. Persetujuan dan kewenangan pemberi perintah tetap mengikuti prosedur resmi.

## Menjalankan

**Cara termudah:** klik dua kali `index.html` (Chrome atau Edge). Tidak perlu instalasi dan tidak perlu internet,
karena semua pustaka sudah ada di folder `vendor/`.

**Lewat server lokal** (disarankan jika ingin alamat tetap):

```
npm start          # atau: python3 -m http.server 8080
```

lalu buka `http://localhost:8080`.

> Data tersimpan di penyimpanan browser per alamat. `index.html` dibuka langsung dari folder dan
> `http://localhost:8080` dianggap dua tempat berbeda, jadi pilih satu cara dan pakai terus.

## Struktur folder

```
index.html            kerangka halaman
css/style.css         tampilan aplikasi dan template surat (satuan pt, koordinat dari PDF asli)
js/logo.js            logo PLN dan PLN Nusa Daya (diambil dari Bahan_Proyek.pdf)
js/config.js          nilai bawaan organisasi (kop, jabatan, pola nomor) dan data contoh fiktif
js/storage.js         penyimpanan (localStorage), struktur data bawaan, pengaturan bawaan
js/logic.js           fungsi murni: tanggal, durasi, parser WhatsApp, nomor surat
js/state.js           state surat aktif, daftar kolom formulir, tanda tangan otomatis
js/preview.js         pratinjau surat A4 dan penggeseran/ubah ukuran tanda tangan
js/ui.js              tab, input WhatsApp, simpan, cetak
js/multi.js           banyak surat dari satu pesan, daftar surat
js/pdf.js             ekspor PDF vektor (jsPDF) dan hapus semua riwayat
js/manage.js          personel, tanda tangan per nama, riwayat, pengaturan, cadangan, uji bawaan
js/main.js            inisialisasi
vendor/               jsPDF 2.5.1 (lisensi MIT, lihat LICENSE-jspdf.txt)
tests/                uji otomatis dan uji visual terhadap dokumen referensi
```

File JavaScript dimuat berurutan (lihat bagian bawah `index.html`). Semuanya memakai lingkup global yang sama,
jadi urutannya penting.

## Cara pakai singkat

1. **Tanda Tangan:** daftarkan nama dan gambar tanda tangan (misalnya pemberi perintah dan koordinator).
   Latar putih gambar otomatis dihapus. Jika nama pada surat sama dengan nama terdaftar, tanda tangan terpasang sendiri.
2. **Input:** isi manual, atau tab **Dari WhatsApp**, tempel pesan, tekan **Proses Pesan**, periksa hasilnya, lalu buat surat.
3. Satu pesan boleh berisi banyak blok. Blok dipisah baris kosong, atau oleh label yang berulang.
   Setiap blok menjadi satu surat. Blok tanpa nama memakai nama dari ID/NIP yang sama.
4. Tanda tangan di pratinjau bisa digeser (seret) dan diubah ukurannya (kotak biru di sudut, atau roda mouse).
5. **Unduh PDF semua surat** (satu halaman A4 per surat) atau **Cetak semua**.
6. **Simpan draft** / **Simpan semua draft** menyimpan ke tab **Riwayat** (cari, filter tanggal, buka, duplikat, hapus, hapus semua).

Contoh pesan:

```
Nama: Budi Santoso
ID Operator: 123456789XYZ
Uraian Pekerjaan: Pemantauan CUI Parepare
Unit Kerja: ULTG Pare-Pare
Tanggal Lembur: 07 Agustus 2026
Jam lembur: 16:30-21:00
TL: Rahmat Hidayat

ID Operator: 123456789XYZ
Uraian Pekerjaan: Pemantauan trafo GI Barru
Tanggal Lembur: 09 Agustus 2026
Jam lembur: 16:30-18:00
TL: Hasan
```

Label yang dikenali ada di `ALIAS` pada `js/logic.js` (misalnya `TL`, `Team Leader`, `Pemberi Perintah` untuk pemberi perintah).
Urutan baris bebas, salah ketik ringan dimaklumi, dan hasil tebakan selalu ditandai kuning agar diperiksa.

## Nilai bawaan dan pengaturan

Tab **Pengaturan** memuat kop surat, kota, zona waktu, koordinator default (kosong di versi ini; isi sendiri), jabatan personel default (PEMELIHARAAN),
jabatan pemberi perintah default (TL HAR JAR), serta pola dan nomor urut surat. Semuanya bisa diubah.

Pola nomor saat ini (`{n}/ULTGPAREPARE/{rom}/{yyyy}` dan `{n}/{rom}/PLNND/{yyyy}`) **hanya berdasarkan satu contoh dokumen**.
Konfirmasikan aturan sebenarnya, lalu ubah di Pengaturan atau di `defaults` pada `js/config.js`.

Nama koordinator sengaja dikosongkan di `js/config.js` agar tidak ikut terunggah ke repositori publik. Isi sekali di tab
**Pengaturan** (tersimpan di browser Anda), atau isi di `js/config.js` pada salinan pribadi yang tidak dipublikasikan.

## Template surat

- Posisi, ukuran huruf, garis, dan tabel diambil dari koordinat `Bahan_Proyek.pdf` (Letter, satuan pt).
- Di A4 isi diskalakan seragam setinggi halaman (x1,063) dan dipusatkan secara horizontal.
- Tampilan layar dan cetak: `css/style.css` (kelas `.pg`). PDF unduhan: `pdfLetter()` di `js/pdf.js`.
  Jika mengubah tata letak, ubah **keduanya** agar tetap sama.

## Penyimpanan, keamanan, dan batasan

- Data (personel, tanda tangan, riwayat, pengaturan) tersimpan di `localStorage` browser: **tidak dienkripsi**, hanya ada di
  browser dan perangkat itu, dan tidak dibagi antar admin. Gunakan **Ekspor cadangan** (tab Pengaturan atau Riwayat) secara berkala.
- Menghapus data situs di browser akan menghapus semuanya.
- Gambar tanda tangan hanya gambar, bukan tanda tangan elektronik tersertifikasi.
- Nomor urut hanya unik di satu browser. Untuk beberapa admin sekaligus diperlukan database bersama, login, dan
  penomoran di sisi server (misalnya Supabase atau Firebase paket gratis). Itu belum ada di sini.
- Logo masih resolusi rendah dari PDF contoh; ganti isi `js/logo.js` bila ada file logo resmi.
- Pada PDF unduhan, huruf kaki halaman memakai Helvetica (Calibri tidak tersedia), tanda pisah panjang (–) menjadi tanda hubung,
  dan simbol gunting digambar sebagai garis.
- Cetak lewat browser: pilih A4, margin **None**, skala **100%**, matikan header/footer, aktifkan background graphics.

## Hosting gratis (opsional)

Panduan langkah demi langkah untuk GitHub Pages ada di **PANDUAN-GITHUB-PAGES.md**.

Karena statis, folder ini bisa diunggah apa adanya:

- **GitHub Pages:** buat repositori, unggah isi folder, lalu Settings, Pages, branch `main`, folder `/ (root)`.
- **Netlify / Cloudflare Pages / Vercel:** tarik-lepas folder atau hubungkan repositori (tanpa perintah build, direktori publish = folder ini).

Perhatikan: situs publik bisa dibuka siapa saja yang tahu alamatnya (datanya tetap di browser masing-masing),
dan kuota serta ketentuan layanan gratis bisa berubah. Jangan mengunggah data personel atau tanda tangan asli ke repositori publik.

## Pengujian

```
npm install
npm test                                  # uji otomatis (jsdom): parser, nama via NIP, durasi, nomor surat, ukuran A4
python tests/compare_template.py Bahan_Proyek.pdf hasil.pdf   # uji visual terhadap dokumen referensi (pip install pymupdf)
```

Tab **Pengaturan**, tombol **Jalankan uji parser & durasi** menjalankan uji bawaan langsung di aplikasi.
Pada pengembangan, tata letak diverifikasi dengan Chrome headless terhadap `Bahan_Proyek.pdf`:
selisih garis dasar teks rata-rata 0,02 pt, ketebalan garis sama (0,85 pt setelah diskalakan).
Pengujian cetak pada printer dan browser Anda sendiri tetap perlu dilakukan sebelum dipakai sebagai arsip.
