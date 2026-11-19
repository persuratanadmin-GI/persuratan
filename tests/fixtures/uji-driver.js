/* Pernyataan uji logika (parser, durasi, tata letak) yang dulu menjadi tombol "Uji parser" di aplikasi.
   Dijalankan dari tests/*.js di dalam halaman aplikasi (fungsi global tersedia); hasilnya larik baris "LULUS ..."/"GAGAL ...". */
const T=[],t=(n,c)=>T.push((c?"LULUS ":"GAGAL ")+n);
 const r=dvBuildAll("Driver: Syahrul\nHari/Tanggal: Jumat, 7 Agustus 2026\nPukul: 16.30-21.00 WITA\nTujuan: Antar tim ke GI Barru\nTL: Rahmat",DV_DEF,[]).surat[0];
 t("parser: tanggal, jam, tujuan",r.tanggal==="2026-08-07"&&r.mulai==="16:30"&&r.selesai==="21:00"&&r.tujuan==="Antar tim ke GI Barru");t("parser: 'Driver:' dibaca sebagai nama",r.driver==="Syahrul");t("parser: TL = pemberi perintah",r.pemberiName==="Rahmat");
 t("beberapa driver dipisah",dvNames("Syahrul, Agus & Budi dan Citra").length===4);
 const m=dvBuildAll("Nama: Syahrul\nTanggal: 7 Agustus 2026\nPukul: 16.30-18.00\nTujuan: A\nTL: Rahmat\n\nTanggal: 9 Agustus 2026\nPukul: 16.30-18.00\nTujuan: B\nTL: Rahmat",DV_DEF,[]).surat;
 t("beberapa blok -> 2 surat, nama diwarisi",m.length===2&&m[1].driver==="Syahrul"&&m[1].st.driver.s==="warn");
 t("nama berkas satu surat",dvNamaBerkas([{driver:"Syahrul",tanggal:"2026-08-07"}])==="LEMBUR DRIVER SYAHRUL 07 AGUSTUS 2026.pdf");
 t("tata letak memuat Hari/Tanggal",dvLayout(r,DV_DEF).some(e=>e.t==="Jumat, 07 Agustus 2026"));
 return T;
