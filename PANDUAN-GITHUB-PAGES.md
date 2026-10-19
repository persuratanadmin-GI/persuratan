# Panduan: menayangkan lewat GitHub Pages

Hasilnya: satu alamat tetap, misalnya `https://USERNAME.github.io/surat-lembur/`. Admin cukup membuka alamat itu.
Tidak ada server yang perlu dijalankan, karena aplikasinya statis.

## Yang perlu Anda tahu dulu

1. **Repositori harus publik** pada paket GitHub gratis. Siapa pun bisa melihat kodenya, termasuk logo dan kop surat.
   Versi ini sudah dibersihkan dari NIP dan nama orang (data contoh fiktif, nama koordinator dikosongkan).
   Periksa isi `js/config.js` sekali lagi sebelum mengunggah.
2. **Situs publik:** siapa pun yang tahu alamatnya bisa membuka aplikasinya. Yang terlihat hanya aplikasi kosong, karena
   data personel, tanda tangan, dan riwayat **tidak** ada di GitHub, melainkan tersimpan di browser masing-masing pengguna.
3. **Data per browser dan per perangkat.** Dua admin atau dua komputer = dua data terpisah dan nomor urut terpisah.
   Satu admin sebaiknya selalu memakai browser yang sama, dan rutin menekan **Ekspor JSON** (tab Pengaturan).
4. Semua situs di `USERNAME.github.io` berbagi satu "tempat penyimpanan" browser yang sama. Jangan menayangkan situs lain
   yang tidak Anda percaya di akun GitHub yang sama, karena situs itu secara teknis bisa membaca data aplikasi ini.
5. Penomoran surat otomatis hanya unik di satu browser. Untuk beberapa admin sekaligus dibutuhkan database bersama dan login.

## Langkah lewat browser (tanpa memasang apa pun)

1. Buka https://github.com dan masuk (atau daftar, gratis).
2. Klik **+** di kanan atas, lalu **New repository**.
   - Repository name: `surat-lembur` (bebas).
   - Pilih **Public**.
   - Jangan centang "Add a README".
   - Klik **Create repository**.
3. Di halaman repositori yang baru, klik **uploading an existing file**.
4. Ekstrak zip ini di komputer Anda. Buka folder `aplikasi-surat-lembur`, pilih **semua isinya** (`index.html`, `css`, `js`,
   `vendor`, `tests`, `README.md`, dan seterusnya), lalu seret ke halaman GitHub.
   `index.html` harus berada di tingkat paling atas repositori, bukan di dalam folder lain.
5. Tunggu semua file terunggah, isi pesan commit (misalnya `Versi pertama`), lalu klik **Commit changes**.
6. Buka **Settings**, lalu **Pages** (menu kiri).
   - Source: **Deploy from a branch**.
   - Branch: **main**, folder: **/ (root)**, lalu **Save**.
7. Tunggu satu sampai dua menit. Muat ulang halaman Pages sampai muncul tulisan "Your site is live at ...". Itulah alamatnya.

## Langkah lewat Git (jika Anda terbiasa)

```
cd aplikasi-surat-lembur
git init -b main
git add .
git commit -m "Versi pertama"
git remote add origin https://github.com/USERNAME/surat-lembur.git
git push -u origin main
```

Lalu aktifkan Pages seperti langkah 6 di atas.

## Setelah tayang: cek ini

- Buka alamatnya di jendela privat. Halaman harus tampil tanpa galat.
- Tab **Pengaturan**: isi nama koordinator, periksa kop dan pola nomor, lalu **Simpan pengaturan**.
- Tab **Pengaturan**, tombol **Jalankan uji parser & durasi**: semua harus LULUS.
- Tab **Tanda Tangan**: daftarkan tanda tangan, buat satu surat, lalu **Unduh PDF** dan bandingkan dengan dokumen asli.
- Tekan **Ekspor JSON** (tab Pengaturan) sekali untuk memastikan berkas cadangan terunduh.
- Buat satu surat, klik **Simpan ke Excel**, pilih salinan file daftar lembur Anda (cadangkan file aslinya dulu), lalu periksa hasilnya.

## Memperbarui aplikasi

Ganti file yang berubah di repositori (**Add file**, **Upload files**, lalu timpa nama yang sama), lalu **Commit**. GitHub Pages
memperbarui situs dalam satu sampai dua menit. Data di browser admin tidak terhapus oleh pembaruan.
Jika browser masih menampilkan versi lama, muat ulang tanpa cache (Ctrl+F5).

## Masalah umum

| Gejala | Penyebab dan solusi |
|---|---|
| 404 saat membuka alamat | Pages belum aktif atau belum selesai. Cek Settings, Pages, dan pastikan `index.html` ada di akar repositori. |
| Halaman putih atau tanpa gaya | Folder `css`, `js`, `vendor` tidak ikut terunggah atau salah tingkat. Unggah ulang isi folder, bukan folder induknya. |
| Data admin "hilang" | Browser atau perangkat berbeda, atau data situs dihapus. Pulihkan lewat **Impor JSON** dari cadangan. |
| PDF tidak terunduh | Cek apakah browser memblokir unduhan dari situs. Alternatifnya **Cetak semua**, lalu simpan sebagai PDF. |
