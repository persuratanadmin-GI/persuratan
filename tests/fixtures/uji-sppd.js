/* Pernyataan uji logika (parser, durasi, tata letak) yang dulu menjadi tombol "Uji parser" di aplikasi.
   Dijalankan dari tests/*.js di dalam halaman aplikasi (fungsi global tersedia); hasilnya larik baris "LULUS ..."/"GAGAL ...". */
const T=[],t=(n,c)=>T.push((c?"LULUS ":"GAGAL ")+n);
 const peg=[{nama:"IKHWAN ALWI",grade:12,nip:"9617047FBY",jabatan:"TL K3 & KAM"},{nama:"SAMSU ALAM",grade:14,nip:"7293107F",jabatan:" MANAGER"},{nama:"MUARIS ",grade:10,nip:"9515022FY",jabatan:"JTC HAR GI"},{nama:"MUH. APRIZAL A",grade:12,nip:"96191146ZY",jabatan:"TL HAR PROTEK"}];
 const wa="Form SPPD:\nPersonil :\n1. \u2060Ikhwan\n\nDestinasi SPPD : Parepare - Pinrang\n\nMaksud SPPD : Koordinasi TJSL TPS3R Tadokkong\nEstimasi : 1 hari\nTanggal : 13 Oktober 2026\n\u2060Transportasi : Kendaraan dinas PP";
 const r=spBuild(spBlocks(wa)[0],peg,{}).surat[0];
 t("parser: pegawai dicocokkan",r.personName==="Ikhwan Alwi"&&r.grade==="12"&&r.nip==="9617047FBY");t("parser: jabatan + akhiran unit",r.jabatan==="TL K3 & KAM ULTG Parepare");
 t("parser: rute & awalan",r.berangkat==="Kota Parepare"&&r.tujuan==="Kab. Pinrang");t("parser: tanggal & kembali",r.tglBerangkat==="2026-10-13"&&r.tglKembali==="2026-10-13"&&r.lama===1);
 t("tata letak: baris 7 = Melaksanakan + maksud",spLayout(r).some(e=>e.t===": Melaksanakan Koordinasi TJSL TPS3R Tadokkong"));t("parser: karakter tak terlihat diabaikan",r.transport==="Kendaraan Dinas PP");
 const m=spBuild(spBlocks("Personil:\n1. Samsu\n2. Muaris\nDestinasi: Pare-Pare - Polman\nMaksud: Rapat\nEstimasi: 3 hari\nTanggal: 13 Oktober 2026\nTransportasi: Kendaraan dinas")[0],peg,{}).surat;
 t("multi personil -> 2 surat",m.length===2&&m[1].personName==="Muaris");t("estimasi 3 hari -> kembali 15 Oktober",m[0].tglKembali==="2026-10-15"&&spLama(3)==="3 ( Tiga ) hari");
 t("rute 'Pare-Pare' tidak terbelah",spRute("Pare-Pare - Polman").b==="Pare-Pare"&&spRute("Parepare-Pinrang").t==="Pinrang");
 const g=spBuild(spBlocks("Personil: Budi\nDestinasi: Makassar\nMaksud: X\nTanggal: 13-15 Oktober 2026\nTransportasi: Mobil")[0],peg,{}).surat[0];t("rentang tanggal 13-15 = 3 hari",g.tglBerangkat==="2026-10-13"&&g.tglKembali==="2026-10-15"&&g.lama===3);
 t("pegawai tak dikenal diberi tanda",g.flags.personName&&!g.nip);t("dua blok 'Form SPPD'",spBlocks(wa+"\n\nForm SPPD:\nPersonil: Muaris\nDestinasi: A - B").length===2);
 t("Pada tanggal = tanggal berangkat",spLayout(r).some(e=>e.t===": 13 Oktober 2026"&&e.y>600)&&spLamaOf({tglBerangkat:"2026-10-13",tglKembali:"2026-10-15"})===3);
 return T;
