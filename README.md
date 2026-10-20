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
js/excel.js           inti integrasi Excel (ExcelJS): baca/tulis daftar lembur bulanan, total jam, terbilang
js/excel-ui.js        dialog "Simpan ke Excel": pilih file, cocokkan nama, rencana, simpan
js/manage.js          personel, tanda tangan per nama, riwayat, pengaturan, cadangan, uji bawaan
js/main.js            inisialisasi
vendor/               jsPDF 2.5.1 dan ExcelJS 4.4.0 (lisensi MIT, lihat LICENSE-*.txt)
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
5. Semua aksi ada di bar tombol di bawah formulir. Jika ada beberapa surat, angkanya tampil di label (misalnya **Simpan draft (8)**)
   dan aksinya berlaku untuk semua surat dalam daftar: **Simpan draft**, **Tandai selesai**, **Simpan ke Excel**, **Unduh PDF**
   (satu halaman A4 per surat), dan **Cetak**. Nama berkas PDF otomatis: beberapa surat menjadi
   `DAFTAR FILE LEMBUR NAMA PERSONEL.pdf`, satu surat menjadi `LEMBUR NAMA PERSONEL DD BULAN YYYY.pdf`. **Surat baru** memulai surat kosong.
6. Surat tersimpan ada di tab **Riwayat** (cari, filter tanggal, buka, duplikat, hapus, hapus semua). Di panel pratinjau,
   tombol nomor meloncat ke surat tertentu, **PDF surat ini** mengunduh PDF hanya untuk surat yang dibuka, dan **Hapus surat ini**
   mengeluarkannya dari daftar. Di tab Riwayat, tombol **PDF** pada tiap baris mengunduh PDF surat itu.

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
Urutan baris bebas dan tanda ":" tidak wajib: `Nama: Budi`, `Nama = Budi`, `Nama - Budi`, dan `Nama Budi` semuanya terbaca,
termasuk `Tgl 10 Oktober 2026` dan `Jam 16:30-21:30`. Salah ketik ringan dimaklumi, dan hasil tebakan selalu ditandai kuning agar diperiksa.

## Simpan ke Excel (daftar lembur bulanan)

Surat yang dibuat bisa dicatat ke file Excel daftar lembur, dengan format seperti contoh (per orang: tanggal, jam masuk,
jam pulang, lembur, keterangan, lalu **Jumlah Jam Lembur** dan terbilangnya).

1. Buat surat (satu atau banyak), lalu klik **Simpan ke Excel** (di bawah formulir, di bar daftar surat, atau di tab Riwayat
   untuk surat yang tampil).
2. **Pilih file Excel...** untuk menambahkan ke file yang sudah ada, atau lewati untuk membuat file baru.
3. Periksa kolom **Nama di Excel**. Nama surat dicocokkan otomatis dengan nama di file (misalnya `Budi Santoso` dengan
   `MUH. BUDI SANTOSO`); ubah jika perlu. Pilihan Anda diingat untuk lain kali.
4. Periksa **Rencana** (berapa baris ditambah, berapa sudah ada, total jam per orang), lalu **Simpan Excel**.

Aturan yang dipakai:

- Satu sheet per bulan. Sheet bulan yang sama (dikenali dari tulisan `BULAN JULI 2026`) diperbarui; bulan baru membuat sheet baru
  yang meniru sheet terdekat (judul, lebar kolom, blok pengesahan lengkap dengan gambar tanda tangannya).
- Baris yang sama (orang, tanggal, jam masuk, jam pulang) tidak dimasukkan dua kali, jadi aman menyimpan berulang.
- Baris diurutkan menurut tanggal dan dinomori ulang; orang baru ditambahkan di bagian bawah.
- Jam lembur dihitung dari jam masuk dan pulang (lewat tengah malam ditangani). Total ditulis dengan kebiasaan di contoh:
  jam.menit (4 jam 45 menit = `4.45`) beserta teks terbilang. Teks terbilang berupa tulisan biasa, bukan rumus.
- Sheet bulan yang diperbarui ditulis ulang dengan gaya yang sama; sheet bulan lain tidak diubah.
- Penyimpanan: di Chrome atau Edge (lewat `http://localhost` atau GitHub Pages) file yang dipilih ditimpa langsung setelah
  Anda memberi izin. Jika tidak memungkinkan (misalnya file sedang terbuka di Excel, atau browser lain), salinan
  `...-diperbarui.xlsx` diunduh dan Anda tinggal menggantinya.
- **Tutup file di Excel sebelum menyimpan**, dan simpan cadangan file asli pada pemakaian pertama.

Blok pengesahan (Mengetahui, jabatan, gambar tanda tangan, nama) untuk sheet baru terisi otomatis dari Pengaturan dan dari
sheet bulan terdekat, dan bisa diubah di dialog Simpan ke Excel (jabatan, nama, tanggal pengesahan). Jika nama sebuah kolom
diganti, gambar tanda tangan lamanya dibuang dan diganti gambar terdaftar atas nama baru (tab Tanda Tangan) bila ada.
Sheet bulan yang sudah ada tetap memakai blok pengesahannya sendiri. Nama pengesah bawaan ada di `js/config.js`
(`xlNama1`-`xlNama4`); kosongkan di sana jika repositori publik.

Batasan: format yang dibaca adalah format contoh (baris `NO` di kolom A, nama orang pada baris sendiri, baris `Jumlah Jam Lembur`).
Jam yang tertulis sebagai teks (misalnya `12.00.`) dibaca sebagai 12:00 pada sheet yang diperbarui. Gambar, bagan, atau
objek lain di luar blok pengesahan pada sheet yang diperbarui tidak ikut dipertahankan.

## Nilai bawaan dan pengaturan

Tab **Pengaturan** memuat kop surat, kota, zona waktu, koordinator default (kosong di versi ini; isi sendiri), jabatan personel default (PEMELIHARAAN),
jabatan pemberi perintah default (TL HAR JAR), serta pola dan nomor urut surat. Semuanya bisa diubah.

Nomor urut pada nomor surat ditulis **`....`** (diisi tangan setelah dicetak), sedangkan bagian lain tetap otomatis, misalnya
`..../ULTGPAREPARE/X/2026` dan `..../X/PLNND/2026`. Untuk angka urut otomatis (001, 002, ...), matikan **Nomor urut ditulis ....** di Pengaturan.
Pola nomor (`{n}/ULTGPAREPARE/{rom}/{yyyy}` dan `{n}/{rom}/PLNND/{yyyy}`) **hanya berdasarkan satu contoh dokumen**.
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
  browser dan perangkat itu, dan tidak dibagi antar admin. Gunakan **Ekspor JSON** (tab Pengaturan) secara berkala.
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
npm test                                  # uji otomatis: parser, nama via NIP, durasi, nomor surat, ukuran A4, integrasi Excel
python tests/compare_template.py Bahan_Proyek.pdf hasil.pdf   # uji visual terhadap dokumen referensi (pip install pymupdf)
```

Tab **Pengaturan**, tombol **Jalankan uji parser & durasi** menjalankan uji bawaan langsung di aplikasi.
Pada pengembangan, tata letak diverifikasi dengan Chrome headless terhadap `Bahan_Proyek.pdf`:
selisih garis dasar teks rata-rata 0,02 pt, ketebalan garis sama (0,85 pt setelah diskalakan).
Pengujian cetak pada printer dan browser Anda sendiri tetap perlu dilakukan sebelum dipakai sebagai arsip.


## Surat Perintah Perjalanan Dinas (SPPD)

Tombol **SPPD** di pojok atas beralih ke mode SPPD (tombol **Surat Lembur** kembali ke mode lama; keduanya tidak saling mengubah).
Tata letak mengikuti `Format Surat Dinas.docx` (satu A4 per surat, pratinjau dan PDF memakai daftar elemen yang sama).

1. **Pegawai:** tab Pegawai, **Impor dari Excel** (kolom NAMA dan NIP; GRADE dan JABATAN/PEKERJAAN bila ada). Data digabung per NIP dan
   hanya tersimpan di browser (kunci `sppd.v1`), tidak ikut di kode. Bisa juga ditambah/diedit manual.
2. **Pengaturan:** pejabat yang memberi perintah (baris 1 dan blok tanda tangan) dan General Manager bersifat tetap di semua surat; ubah hanya lewat tab Pengaturan.
   Bawaan: Kamran, grade 17, NIP 7493103F. Jika repositori publik, kosongkan NIP di `js/sppd-logic.js` (SP_DEF) lalu isi lewat Pengaturan.
3. **Input:** tempel pesan WhatsApp lalu **Proses Pesan**. Contoh:

```
Form SPPD:
Personil :
1. Ikhwan

Destinasi SPPD : Parepare - Pinrang
Maksud SPPD : Koordinasi TJSL TPS3R Tadokkong
Estimasi : 1 hari
Tanggal : 13 Oktober 2026
Transportasi : Kendaraan dinas PP
```

   Aturan: satu personil = satu surat. Di formulir, mengetik nama (mis. "ikhwan", "samsu alam") otomatis mengisi Grade, NIP, dan Jabatan dari
   daftar pegawai (jabatan diberi akhiran unit dari Pengaturan). "Pinrang" menjadi "Kab. Pinrang"; Parepare/Makassar/Palopo menjadi "Kota ...".
   Baris 7 (Urgensi) selalu "Melaksanakan " + isi baris 3 (Maksud). Lama perjalanan selalu mengikuti tanggal berangkat dan tanggal kembali
   (mengubah tanggal berangkat menggeser tanggal kembali dengan lama yang sama; mengubah tanggal kembali menghitung ulang lama).
   "Pada tanggal" di kanan bawah selalu sama dengan tanggal berangkat. Rentang seperti "13-15 Oktober 2026" juga dibaca. Beberapa blok
   (diawali "Form SPPD:" atau label berulang) menjadi beberapa surat.
4. Tanda tangan memakai tab **Tanda Tangan** yang sama dengan surat lembur (tombol **Kelola tanda tangan**). Tanda tangan di pratinjau bisa
   digeser dan diubah ukurannya. Nama berkas PDF: `SPPD NAMA DD BULAN YYYY.pdf`.
5. Riwayat SPPD, cadangan JSON, dan **Uji parser SPPD** ada di tab Riwayat/Pengaturan. Uji otomatis: `node tests/sppd.test.js`.
