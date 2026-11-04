/* Uji pembaca pesan yang tidak bergantung pada persis penulisan label, dan nama berkas gabungan (bulan + tahun).
   Tanpa jsdom: DOM diganti objek tiruan. Jalankan: node tests/parser-cerdas.test.js */
const vm = require("vm"), fs = require("fs"), path = require("path");
const els = {};
const el = id => els[id] || (els[id] = { textContent: "", innerHTML: "", value: "", style: {}, dataset: {}, hidden: false, children: [], onclick: null, onchange: null, oninput: null,
  classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, querySelector() { return null }, appendChild() {} });
const ctx = { console, setTimeout, clearTimeout, Image: function () {}, localStorage: { getItem() { return null }, setItem() {} }, sessionStorage: { getItem() { return null }, setItem() {} },
  document: { getElementById: el, createElement() { return { getContext() { return null }, style: {} } }, querySelectorAll() { return [] }, querySelector() { return null }, addEventListener() {}, body: { appendChild() {} } } };
ctx.window = ctx; vm.createContext(ctx);
const baca = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
vm.runInContext(["config.js", "storage.js", "logic.js", "state.js", "ui.js", "multi.js", "pdf.js", "excel.js", "excel-ui.js", "sppd-logic.js"].map(baca).join("\n") +
  ";this.X={parseWA,parseMulti,namaBerkasPdf,labelBulanTahun,xlNamaUnduh,spBlocks,spBuild,spLabel,matchLabel,semCocok}", ctx);
const X = ctx.X;
let gagal = 0;
const cek = (n, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + n + (ok ? "" : "  -> " + info)); if (!ok) gagal++; };
const P = t => X.parseWA(t);
const base = "Nama: Budi Santoso\nID Operator: 123456789XYZ\nTanggal Lembur: 07 Agustus 2026\nJam lembur: 16:30-21:00\nTL: Hasan\n";

/* ===== 1. Label uraian bermacam penulisan ===== */
for (const lab of ["Maksud Lembur", "Pekerjaan Lembur", "Keperluan", "Keperluan Lembur", "Kegiatan Lembur", "Aktivitas", "Alasan Lembur", "Tujuan Lembur", "Uraian Kerja", "Detail Pekerjaan", "Maksud", "Pekerjaan yang dilakukan", "Perihal"]) {
  const r = P(base + lab + ": Pemantauan CUI GI Barru");
  cek("uraian dari label '" + lab + "'", r.f.uraian === "Pemantauan CUI GI Barru" && r.st.uraian.s === "ok", JSON.stringify(r.f.uraian) + " " + r.st.uraian.s + r.st.uraian.m);
}
/* ===== 2. Label kolom lain ===== */
const v = (lab, k, nilai, tambah = "") => { const t = (k === "nama" ? "" : "Nama: Budi\n") + lab + ": " + nilai + "\n" + tambah; const r = P(t); return r.f[k] === (k === "tanggal" ? "2026-10-07" : k === "mulai" ? "16:30" : k === "selesai" ? "21:00" : nilai) ? r : r; };
const uji = (lab, k, nilai, ex) => { const r = P((k === "nama" ? "" : "Nama: Budi\n") + lab + ": " + nilai); const ok = r.f[k] === ex && r.st[k].s === "ok"; cek("'" + lab + "' -> " + k, ok, JSON.stringify(r.f[k]) + " " + r.st[k].s + " " + r.st[k].m); };
uji("Nama Lengkap", "nama", "Budi Santoso", "Budi Santoso"); uji("Nama Operator", "nama", "Budi", "Budi"); uji("Nama Personel Lembur", "nama", "Budi", "Budi"); uji("Nama Pegawai", "nama", "Budi", "Budi");
uji("No. ID", "nip", "123456789XYZ", "123456789XYZ"); uji("NIK", "nip", "123456789", "123456789"); uji("Nomor Induk Pegawai", "nip", "123456789", "123456789"); uji("ID Pegawai", "nip", "123456789", "123456789");
uji("Posisi", "jabatan", "Operator GI", "Operator GI"); uji("Divisi", "unit", "ULTG Parepare", "ULTG Parepare");
uji("Tgl Lembur", "tanggal", "07 Oktober 2026", "2026-10-07"); uji("Tanggal Pelaksanaan", "tanggal", "17/10/2026", "2026-10-17"); uji("Hari/Tgl", "tanggal", "Rabu, 7 Oktober 2026", "2026-10-07");
uji("Jam Mulai Lembur", "mulai", "16.30", "16:30"); uji("Waktu Mulai", "mulai", "16.30", "16:30"); uji("Mulai Lembur", "mulai", "16:30 WITA", "16:30"); uji("Jam Mulai", "mulai", "jam 16.30", "16:30");
uji("Jam Selesai Lembur", "selesai", "21.00", "21:00"); uji("Selesai Lembur", "selesai", "21:00", "21:00"); uji("Waktu Selesai", "selesai", "21.00", "21:00"); uji("Jam Berakhir", "selesai", "21.00", "21:00");
uji("Nama Atasan", "pemberi", "Rahmat", "Rahmat"); uji("Nama Pemberi Perintah", "pemberi", "Rahmat", "Rahmat"); uji("Disetujui oleh", "pemberi", "Rahmat", "Rahmat"); uji("Supervisor", "pemberi", "Rahmat", "Rahmat"); uji("Pemberi Tugas Lembur", "pemberi", "Rahmat", "Rahmat");
uji("Lokasi Kerja", "lokasi", "GI Barru", "GI Barru"); uji("Lokasi Lembur", "lokasi", "GI Barru", "GI Barru");
{ const r = P("Nama: Budi\nWaktu Pelaksanaan: 16.30 - 21.00 WITA"); cek("'Waktu Pelaksanaan' berisi rentang jam", r.f.mulai === "16:30" && r.f.selesai === "21:00", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nAtasan Langsung: Rahmat"); cek("label dengan kata tambahan asing: terbaca & ditandai 'periksa'", r.f.pemberi === "Rahmat" && r.st.pemberi.s === "warn", JSON.stringify(r.st.pemberi)); }
{ const r = P("Nama: Budi\nTanggal & Jam Lembur: Rabu, 7 Oktober 2026 (16.30-21.00 WITA)"); cek("tanggal dan jam dalam satu baris", r.f.tanggal === "2026-10-07" && r.f.mulai === "16:30" && r.f.selesai === "21:00", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nTanggal: Rabu 7-10-2026\nJam: 16.30-21.00"); cek("tanggal diawali nama hari + format dd-mm-yyyy", r.f.tanggal === "2026-10-07", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nTanggal: 07/10/2026\nJam Mulai: 16.30 - 21.00"); cek("'Jam Mulai' berisi rentang jam", r.f.mulai === "16:30" && r.f.selesai === "21:00", JSON.stringify(r.f)); }

/* ===== 3. Susunan baris yang berbeda ===== */
{ const r = P("📌 Nama: Budi Santoso\n▪️ NIP: 123456789XYZ\n✅ Maksud Lembur: Pemantauan CUI\n- Tgl: 07 Oktober 2026\n• Jam: 16.30-21.00\n➡️ Nama Atasan: Rahmat"); cek("emoji/simbol di awal baris", r.f.nama === "Budi Santoso" && r.f.nip === "123456789XYZ" && r.f.uraian === "Pemantauan CUI" && r.f.tanggal === "2026-10-07" && r.f.mulai === "16:30" && r.f.pemberi === "Rahmat", JSON.stringify(r.f)); }
{ const r = P("Nama:\nBudi Santoso\nNIP:\n123456789XYZ\nMaksud Lembur:\nPemantauan CUI GI Barru\nTanggal: 07 Oktober 2026\nJam: 16.30-21.00"); cek("nilai di baris berikutnya", r.f.nama === "Budi Santoso" && r.f.nip === "123456789XYZ" && r.f.uraian === "Pemantauan CUI GI Barru", JSON.stringify(r.f)); }
{ const r = P("Nama Budi Santoso\nNIP 123456789XYZ\nMaksud Lembur Pemantauan CUI GI Ballusu\nTgl 10 Oktober 2026\nJam 16:30-21:30\nNama Atasan Rahmat Hidayat"); cek("tanpa titik dua dengan label sinonim", r.f.uraian === "Pemantauan CUI GI Ballusu" && r.f.pemberi === "Rahmat Hidayat" && r.f.nama === "Budi Santoso", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nNIP: 123456789\nTopik Kerjaan: Pemantauan trafo GI Barru\nTanggal: 07/10/2026\nJam: 16.30-21.00"); cek("label tak dikenal -> dipakai sebagai uraian & ditandai periksa", r.f.uraian === "Pemantauan trafo GI Barru" && r.st.uraian.s === "warn" && r.unk.length === 0, JSON.stringify([r.f.uraian, r.st.uraian, r.unk])); }
{ const r = P("Nama: Budi\nCatatan: tolong dibantu segera ya pak\nTanggal: 07/10/2026"); cek("'Catatan' tidak dijadikan uraian", !r.f.uraian && r.st.uraian.s === "missing", JSON.stringify(r.f)); }
{ const r = P("Budi Santoso\n123456789XYZ\n7 Agu 2026\n16.30 s/d 21.00 WITA"); cek("tanpa label: nama ditebak (ditandai periksa)", r.f.nama === "Budi Santoso" && r.st.nama.s === "warn", JSON.stringify([r.f.nama, r.st.nama])); }
{ const r = P("Selamat pagi pak\nNIP 123456789XYZ\nTgl 7 Agu 2026"); cek("sapaan tidak dianggap nama", !r.f.nama, JSON.stringify(r.f)); }

/* ===== 4. Banyak surat dalam satu pesan, label sinonim ===== */
{ const t = "Nama: Budi Santoso\nNIP: 123456789XYZ\nMaksud Lembur: A\nTanggal: 07 Agustus 2026\nJam: 16:30-21:00\nAtasan: Hasan\n\nNIP: 123456789XYZ\nMaksud Lembur: B\nTanggal: 09 Agustus 2026\nJam: 22:00-02:00\nAtasan: Rahmat";
  const h = X.parseMulti(t); cek("2 surat dari label sinonim, nama mengikuti NIP", h.length === 2 && h[1].f.nama === "Budi Santoso" && h[1].f.uraian === "B" && h[1].f.pemberi === "Rahmat", JSON.stringify(h.map(x => x.f))); }
{ const t = "Nama: Budi\nNIP: 111\nMaksud Lembur: A\nTanggal: 07/08/2026\nJam: 16:30-21:00\nNama: Andi\nNIP: 222\nMaksud Lembur: B\nTanggal: 08/08/2026\nJam: 16:30-21:00";
  cek("blok baru dikenali dari label yang berulang (sinonim)", X.parseMulti(t).length === 2); }

/* ===== 5. Perilaku lama tidak berubah (salinan uji bawaan aplikasi) ===== */
{ const p = P("nama: Andi\nID Operator: OP001\nTanggal Lembur: 12/10/2026\nJam Mulai: 18.00\nJam Selesai: 22:00\nPekerjaan: Pemeliharaan\nlanjutan baris\nPemberi Perintah: Supervisor");
  cek("lama: nama, NIP, tanggal, jam titik, uraian multi-baris", p.f.nama === "Andi" && p.f.nip === "OP001" && p.f.tanggal === "2026-10-12" && p.f.mulai === "18:00" && p.f.uraian === "Pemeliharaan\nlanjutan baris" && p.st.tanggal.s === "warn" && p.f.pemberi === "Supervisor", JSON.stringify(p.f)); }
{ const q = P("Nama: Budi\nTanggal: 31/02/2026\nJam Mulai: 25:00"); cek("lama: tanggal/jam tidak valid -> error, NIP hilang", q.st.tanggal.s === "error" && q.st.mulai.s === "error" && q.st.nip.s === "missing", JSON.stringify(q.st)); }
{ const w = P("Nama: Budi\nTanggl Lembur: 07/08/2026\nPekerjaan: x"); cek("lama: salah ketik label dibaca & ditandai", w.f.tanggal === "2026-08-07" && w.st.tanggal.s === "warn", JSON.stringify(w.st.tanggal)); }
{ const nc = P("Nama Budi Santoso\nNIP 123456789XYZ\nPekerjaan: Pemantauan CUI GI Ballusu\nTgl 10 Oktober 2026\nJam 16:30-21:30\nTL: Rahmat Hidayat"); cek("lama: tanpa titik dua", nc.f.nama === "Budi Santoso" && nc.f.nip === "123456789XYZ" && nc.f.tanggal === "2026-10-10" && nc.f.mulai === "16:30" && nc.f.selesai === "21:30" && nc.f.pemberi === "Rahmat Hidayat" && nc.f.uraian === "Pemantauan CUI GI Ballusu" && ["nama", "nip", "tanggal", "mulai", "selesai", "uraian", "pemberi"].every(k => nc.st[k].s === "ok"), JSON.stringify(nc.f)); }
{ const ty = P("Nama: Budi\nTanggl 10 Oktober 2026\nPekerjaan: x"); cek("lama: salah ketik tanpa titik dua", ty.f.tanggal === "2026-10-10" && ty.st.tanggal.s === "warn", JSON.stringify(ty.st.tanggal)); }
{ const mb = X.parseMulti("Nama Budi\nNIP 111\nTgl 10 Oktober 2026\nJam 16:30-18:00\n\nNIP 111\nTgl 12 Oktober 2026\nJam 18:00-20:00"); cek("lama: banyak blok tanpa titik dua", mb.length === 2 && mb[1].f.nama === "Budi"); }
{ const z = P("Budi Santoso\n123456789XYZ\n7 Agu 2026\n16.30 s/d 21.00 WITA"); cek("lama: tanpa label, tanggal/jam/NIP ditebak & ditandai", z.f.tanggal === "2026-08-07" && z.f.mulai === "16:30" && z.st.mulai.s === "warn" && z.f.nip === "123456789XYZ"); }
{ const r = P("Nama: Budi\nUraian Pekerjaan: Penanganan kabel optik ADSS rute Parepare\u2013Polmas\nJam: 16:30-21:00"); cek("lama: uraian berisi tanda baca & jam 'Jam: 16:30-21:00'", r.f.uraian.startsWith("Penanganan kabel optik") && r.f.mulai === "16:30"); }
{ const r = P("Nama: Budi\nPekerjaan: Pemantauan GI: trafo 2 dan kabel\nTanggal: 07/10/2026"); cek("lama: titik dua di dalam nilai uraian tidak memotong", r.f.uraian === "Pemantauan GI: trafo 2 dan kabel", r.f.uraian); }
{ const r = P("Nama: Budi\nPekerjaan pemantauan trafo GI: Ballusu\nTanggal: 07/10/2026"); cek("lama: 'Pekerjaan <isi dengan titik dua>' utuh", r.f.uraian === "pemantauan trafo GI: Ballusu", r.f.uraian); }
{ const r = P("[12/10/26 18.00] Admin: Nama: Budi\nTanggal: 12/10/2026"); cek("lama: awalan salinan WhatsApp dibuang", r.f.nama === "Budi", JSON.stringify(r.f)); }

/* ===== 6. Nama berkas gabungan: bulan + tahun ===== */
cek("PDF satu surat tidak berubah", X.namaBerkasPdf([{ name: "Budi Santoso", tanggal: "2026-08-07" }]) === "LEMBUR BUDI SANTOSO 07 AGUSTUS 2026.pdf");
cek("PDF gabungan satu orang + bulan tahun", X.namaBerkasPdf([{ name: "Budi Santoso", tanggal: "2026-10-05" }, { name: "budi santoso", tanggal: "2026-10-20" }]) === "DAFTAR FILE LEMBUR BUDI SANTOSO OKTOBER 2026.pdf", X.namaBerkasPdf([{ name: "Budi Santoso", tanggal: "2026-10-05" }, { name: "budi santoso", tanggal: "2026-10-20" }]));
cek("PDF gabungan beberapa orang + bulan tahun", X.namaBerkasPdf([{ name: "Andi", tanggal: "2026-10-05" }, { name: "Budi", tanggal: "2026-10-06" }]) === "DAFTAR FILE LEMBUR ANDI & BUDI OKTOBER 2026.pdf");
cek("PDF gabungan >3 orang: DKK + bulan tahun", X.namaBerkasPdf(["A", "B", "C", "D"].map(n => ({ name: n, tanggal: "2026-11-02" }))) === "DAFTAR FILE LEMBUR A DKK NOVEMBER 2026.pdf");
cek("PDF gabungan lintas bulan (satu tahun)", X.namaBerkasPdf([{ name: "Andi", tanggal: "2026-10-30" }, { name: "Andi", tanggal: "2026-11-02" }]) === "DAFTAR FILE LEMBUR ANDI OKTOBER-NOVEMBER 2026.pdf");
cek("PDF gabungan lintas tahun", X.namaBerkasPdf([{ name: "Andi", tanggal: "2026-12-30" }, { name: "Andi", tanggal: "2027-01-02" }]) === "DAFTAR FILE LEMBUR ANDI DESEMBER 2026-JANUARI 2027.pdf");
cek("PDF gabungan tanpa tanggal: tetap seperti semula", X.namaBerkasPdf([{ name: "Budi Santoso" }, { name: "Budi Santoso" }]) === "DAFTAR FILE LEMBUR BUDI SANTOSO.pdf");
cek("labelBulanTahun", X.labelBulanTahun(["2026-10-05", "2026-10-31"]) === "OKTOBER 2026" && X.labelBulanTahun([]) === "" && X.labelBulanTahun(["", null]) === "");
vm.runInContext('xlS={namaFile:""}', ctx);
cek("Excel baru: daftar-lembur-bulan-tahun", X.xlNamaUnduh([{ mk: "2026-10" }]) === "daftar-lembur-oktober-2026.xlsx", X.xlNamaUnduh([{ mk: "2026-10" }]));
cek("Excel baru lintas bulan", X.xlNamaUnduh([{ mk: "2026-10" }, { mk: "2026-11" }]) === "daftar-lembur-oktober-november-2026.xlsx", X.xlNamaUnduh([{ mk: "2026-10" }, { mk: "2026-11" }]));
vm.runInContext('xlS={namaFile:"DAFTAR LEMBUR TAHUN INI.xlsx"}', ctx);
cek("Excel dari berkas lama: ditambah bulan tahun", X.xlNamaUnduh([{ mk: "2026-10" }]) === "DAFTAR LEMBUR TAHUN INI-diperbarui-oktober-2026.xlsx", X.xlNamaUnduh([{ mk: "2026-10" }]));
vm.runInContext('xlS={namaFile:"Lembur Oktober 2026.xlsx"}', ctx);
cek("Excel dari berkas yang sudah memuat bulan tahun: tidak digandakan", X.xlNamaUnduh([{ mk: "2026-10" }]) === "Lembur Oktober 2026-diperbarui.xlsx", X.xlNamaUnduh([{ mk: "2026-10" }]));

/* ===== 7. SPPD / Restitusi: label bebas ===== */
const peg = [{ nama: "IKHWAN ALWI", grade: 12, nip: "9617047FBY", jabatan: "TL K3 & KAM" }];
{ const b = X.spBlocks("Pegawai: Ikhwan\nTujuan Perjalanan: Parepare - Pinrang\nKeperluan Dinas: Koordinasi TJSL\nLama Perjalanan: 1 hari\nTgl Berangkat: 13 Oktober 2026\nKendaraan: Mobil dinas");
  const r = X.spBuild(b[0], peg, {}).surat[0];
  cek("SPPD: label sinonim terbaca semua", r.personName === "Ikhwan Alwi" && r.tujuan === "Kab. Pinrang" && r.maksud === "Koordinasi TJSL" && r.tglBerangkat === "2026-10-13" && r.transport === "Mobil Dinas" && r.lama === 1, JSON.stringify(r)); }
{ const b = X.spBlocks("📍 Nama Personil: Ikhwan\n📍 Rute: Parepare - Polman\n📍 Agenda: Rapat\n📍 Jadwal: 13 Oktober 2026\n📍 Tgl Pulang: 15 Oktober 2026\n📍 Moda Transportasi: Kendaraan dinas");
  const r = X.spBuild(b[0], peg, {}).surat[0];
  cek("SPPD: emoji + 'Tgl Pulang' = tanggal kembali", r.maksud === "Rapat" && r.tglBerangkat === "2026-10-13" && r.tglKembali === "2026-10-15" && r.lama === 3 && r.transport === "Kendaraan Dinas", JSON.stringify(r)); }
cek("SPPD: label lama tetap", X.spLabel("Maksud SPPD") === "maksud" && X.spLabel("Destinasi SPPD") === "destinasi" && X.spLabel("Tanggal Kembali") === "kembali" && X.spLabel("Tujuan") === "destinasi" && X.spLabel("Tanggal") === "tanggal" && X.spLabel("Estimasi") === "estimasi");
cek("SPPD: 'Tujuan Kegiatan' = maksud, 'Tujuan Perjalanan Dinas' = destinasi", X.spLabel("Tujuan Kegiatan") === "maksud" && X.spLabel("Tujuan Perjalanan Dinas") === "destinasi", X.spLabel("Tujuan Kegiatan") + " " + X.spLabel("Tujuan Perjalanan Dinas"));
cek("SPPD: kalimat biasa bukan label", X.spLabel("Rapat koordinasi") === null && X.spLabel("1. Ikhwan") === null);

/* ===== 8. Tambahan: label alias persis tanpa titik dua tidak boleh tertelan jadi lanjutan uraian ===== */
{ const r = P("Nama: Budi\nUraian Tugas Cek relay\nPemberi Tugas Hasan\nTanggal: 05/05/2026"); cek("'Pemberi Tugas Hasan' tanpa titik dua tetap pemberi, bukan lanjutan uraian", r.f.pemberi === "Hasan" && r.f.uraian === "Cek relay", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nUnit Kerja ULTG Parepare\nTanggal: 05/05/2026"); cek("nilai yang diawali kata label ('ULTG') tidak ikut jadi label", r.f.unit === "ULTG Parepare", JSON.stringify(r.f)); }
{ const r = P("Nama: Budi\nMaksud Lembur: Pemantauan CUI\nmelakukan pengecekan suhu\nTanggal: 07/10/2026"); cek("uraian beberapa baris dengan label sinonim", r.f.uraian === "Pemantauan CUI\nmelakukan pengecekan suhu", JSON.stringify(r.f.uraian)); }
{ const r = P("Nama: Budi\nPekerjaan: Cek GI\nTempat parkir: dekat pos\nTanggal: 07/10/2026"); cek("baris berlabel mirip di tengah uraian tidak mengganti kolom lain", r.f.uraian && r.f.uraian.startsWith("Cek GI") && !r.f.lokasi, JSON.stringify(r.f)); }

console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji lulus");
process.exit(gagal ? 1 : 0);
