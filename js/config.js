"use strict";
/* Konfigurasi organisasi dan data contoh.
   - "defaults": nilai bawaan Pengaturan. Hanya dipakai oleh browser yang belum punya pengaturan tersimpan;
     setelah itu pengaturan diubah lewat tab Pengaturan.
   - "sample": data FIKTIF untuk tombol "Muat contoh" (uji tampilan surat).
   Berkas ini ikut terunggah ke GitHub Pages dan terbaca oleh siapa pun. Nama pengesah Excel (xlNama1-4) diisi
   otomatis sesuai permintaan; kosongkan di sini jika repositori publik, lalu isi lewat tab Pengaturan atau dialog Simpan ke Excel.
   Jangan menaruh NIP atau data pribadi lain di sini. */
const APP_CONFIG={
 defaults:{
  ptPln:"PT PLN (PERSERO)",unitPln:"UNIT LAYANAN TRANSMISI DAN GARDU INDUK PARE-PARE (ULTG)",almPln:"Jl. Bambu Runcing, Bumi Harapan, Kec. Bacukiki Bar., Kota Parepare, Sulawesi Selatan",
  ptNd:"PT PLN NUSADAYA",unitNd:"UNIT LAYANAN MAKASSAR,BULUKUMBA DAN WATAMPONE",almNd:"JL.BontoRamba No.9 manuruki Kec. Tamalate Kota. Makassar",
  kepada:"KOORDINATOR OPHARHGI PT.PLN NUSADAYA",koorName:"",jabPers:"PEMELIHARAAN",jabPemberi:"TL HAR JAR",
  kota:"PARE-PARE",zona:"WITA",lokasi:"ULTG PARE-PARE",
  polaSpk:"{n}/ULTGPAREPARE/{rom}/{yyyy}",polaLem:"{n}/{rom}/PLNND/{yyyy}",seqSpk:0,seqLem:0,pad:3,
  xlJudul:"DAFTAR LEMBUR PEMELIHARAAN (TENAGA ALIH DAYA) UPT MAKASSAR",xlUnit:"ULTG PAREPARE",xlKota:"Parepare",
  xlLbl1:"Manager,",xlLbl2:"TL Har Protek, MTR & OTM",xlLbl3:"TL Har GI",xlLbl4:"TL HAR JAR",xlNama1:"SAMSU ALAM",xlNama2:"MUH. APRIZAL A.",xlNama3:"ANHAR FITRA NUR SATYA",xlNama4:"ICHSAN MAHYUDDIN",excelMap:{}},
 sample:{
  spk:"001/ULTGPAREPARE/VIII/2026",lemburNo:"001/VIII/PLNND/2026",name:"NAMA PERSONEL",nip:"000000000XXX",jabatan:"PEMELIHARAAN",
  tanggal:"2026-08-07",mulai:"16:30",selesai:"21:00",lokasi:"ULTG PARE-PARE",uraian:"Penanganan kabel optik adss rute Parepare-polmas",
  pemberiJab:"TL HAR JAR",pemberiName:"NAMA PEMBERI PERINTAH",koorName:"NAMA KOORDINATOR"}
};
