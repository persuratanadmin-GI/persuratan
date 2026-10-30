/* Uji logika Restitusi SPPD (Remburse Lumsum, Surat Pernyataan, Blangko) tanpa browser. Jalankan: node tests/rs.test.js */
const vm = require("vm"), fs = require("fs"), path = require("path");
const ctx = { window: {}, document: { getElementById() { return null; } }, console };
vm.createContext(ctx);
const baca = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
vm.runInContext(baca("logic.js") + baca("sppd-logic.js") + baca("rs-assets.js") + baca("rs-logic.js") +
  ";this.X={spBlocks,spBuild,rsFromSp,rsGet,rsSet,rsIsMan,rsNum,rsRp,rsTotals,rsLama,rsCariLokasi,rsStops,rsMissing,rsLayoutR,rsLayoutP,rsLayoutB,rsBlank,RS_AUTO,RS_DEF}", ctx);
const X = ctx.X;
let gagal = 0;
const cek = (n, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + n + (ok ? "" : " " + info)); if (!ok) gagal++; };
const peg = [{ nama: "ANHAR FITRA NUR SATYA", grade: 12, nip: "9518163ZY", jabatan: "TL Har Proteksi" }, { nama: "IKHWAN ALWI", grade: 12, nip: "9617047FBY", jabatan: "TL K3 & KAM" }];
const wa = "Form SPPD:\nPersonil :\n1. Anhar\n\nDestinasi SPPD : Parepare - Makassar\n\nMaksud SPPD : Undangan Seminar Insulation Component Power Transformer\nEstimasi : 3 hari\nTanggal : 12-14 Oktober 2026\nTransportasi : Kendaraan dinas PP";
const sp = X.spBuild(X.spBlocks(wa)[0], peg, {}).surat[0];
const r = X.rsFromSp(sp);
const teks = el => el.filter(e => e.k === "t").map(e => e.t);

cek("pesan WA SPPD -> data restitusi", r.personName === "Anhar Fitra Nur Satya" && r.nip === "9518163ZY" && r.jabatan === "TL Har Proteksi ULTG Parepare" && r.tglBerangkat === "2026-10-12" && r.tglKembali === "2026-10-14" && r.lama === 3);
cek("nominal & nomor trip kosong saat awal", r.amtB === "" && r.amtP === "" && r.amtH === "" && r.tripSap === "");
/* ---- Remburse ---- */
cek("turunan otomatis: tujuan/tanggal/lama", X.rsGet(r, "rTujuan") === "Kota Parepare - Kota Makassar" && X.rsGet(r, "rTgl") === "12 Oktober 2026 s/d 14 Oktober 2026" && X.rsGet(r, "rLama") === "3 (Tiga) hari", X.rsGet(r, "rTujuan"));
cek("nominal kosong -> status \"-\"", X.rsGet(r, "stB") === "-" && X.rsGet(r, "stP") === "-" && X.rsGet(r, "stH") === "-");
r.amtP = "150000"; r.amtH = "1.590.000"; r.tripSap = "5230092824";
cek("nominal ada -> status \"Cash\"", X.rsGet(r, "stP") === "Cash" && X.rsGet(r, "stH") === "Cash" && X.rsGet(r, "stB") === "-");
const t = X.rsTotals(r);
cek("Jumlah dan Total otomatis", t.jumlah === 150000 && t.total === 1740000, JSON.stringify(t));
cek("format rupiah", X.rsRp(150000) === "150.000,-" && X.rsRp(1740000) === "1.740.000,-" && X.rsRp(0) === "" && X.rsNum("1.590.000,-") === 1590000 && X.rsNum("Rp 150.000") === 150000);
let R = teks(X.rsLayoutR(r));
cek("Remburse memuat isi sesuai contoh", ["PERNYATAAN RESTITUSI PERJALANAN DINAS", ": Anhar Fitra Nur Satya", ": 5230092824", ": Kota Parepare - Kota Makassar", ": 12 Oktober 2026 s/d 14 Oktober 2026", ": 3 (Tiga) hari", "150.000,-", "1.590.000,-", "1.740.000,-", "ANHAR FITRA NUR SATYA", "Cash", "Ada"].every(s => R.includes(s)), R.join("|"));
cek("status manual bisa diubah, lalu kembali otomatis bila dikosongkan", (() => { X.rsSet(r, "stP", "Transfer"); const a = X.rsGet(r, "stP") === "Transfer" && X.rsIsMan(r, "stP"); X.rsSet(r, "stP", ""); return a && X.rsGet(r, "stP") === "Cash" && !X.rsIsMan(r, "stP") })());
cek("menulis nilai sama dengan otomatis tidak dianggap manual", (() => { X.rsSet(r, "stP", "Cash"); return !X.rsIsMan(r, "stP") })());
cek("tabel Remburse konsisten saat nominal diubah (Total ikut)", (() => { r.amtB = "200000"; const tt = X.rsTotals(r); const L = teks(X.rsLayoutR(r)); r.amtB = ""; return tt.total === 1940000 && L.includes("1.940.000,-") && L.includes("350.000,-") })());
/* ---- Pernyataan: kutipan & tanggal mengikuti Remburse ---- */
let P = X.rsLayoutP(r).filter(e => e.k === "t");
const par = P.filter(e => e.j || e.y > 285 && e.y < 360).map(e => e.t).join(" ");
cek("Pernyataan: kutipan mengikuti maksud Remburse", par.includes("\u201CUndangan Seminar Insulation Component Power Transformer\u201D"), par);
cek("Pernyataan: tanggal mengikuti Remburse", par.includes("12 Oktober 2026 sampai dengan 14 Oktober 2026"), par);
r.maksud = "Rapat Koordinasi"; r.tglBerangkat = "2026-10-20"; r.tglKembali = "2026-10-21";
P = X.rsLayoutP(r).filter(e => e.k === "t").map(e => e.t).join(" ");
cek("ubah maksud/tanggal sumber -> Pernyataan ikut berubah", P.includes("\u201CRapat Koordinasi\u201D") && P.includes("20 Oktober 2026 sampai dengan 21 Oktober 2026"));
X.rsSet(r, "rMaksud", "Seminar Trafo");
P = X.rsLayoutP(r).filter(e => e.k === "t").map(e => e.t).join(" ");
cek("ubah maksud di Remburse -> Pernyataan dan Blangko ikut", P.includes("\u201CSeminar Trafo\u201D") && X.rsGet(r, "bMaksud") === "Seminar Trafo");
X.rsSet(r, "pMaksud", "Judul khusus Pernyataan");
P = X.rsLayoutP(r).filter(e => e.k === "t").map(e => e.t).join(" ");
cek("kolom manual Pernyataan menimpa tanpa mengubah Remburse", P.includes("\u201CJudul khusus Pernyataan\u201D") && X.rsGet(r, "rMaksud") === "Seminar Trafo");
X.rsSet(r, "pMaksud", ""); X.rsSet(r, "rMaksud", ""); r.maksud = "Undangan Seminar Insulation Component Power Transformer"; r.tglBerangkat = "2026-10-12"; r.tglKembali = "2026-10-14";
cek("Pernyataan: pegawai, NIP, jabatan", (() => { const L = teks(X.rsLayoutP(r)); return L.includes(": Anhar Fitra Nur Satya") && L.includes(": 9518163ZY") && L.includes(": TL Har Proteksi ULTG Parepare") && L.includes("ANHAR FITRA NUR SATYA") })());
cek("Pernyataan: paragraf rata kiri-kanan kecuali baris terakhir", (() => { const L = X.rsLayoutP(r).filter(e => e.k === "t" && e.y > 285 && e.y < 360); return L.length >= 4 && L.slice(0, -1).every(e => e.j > 0) && !L[L.length - 1].j })());
/* ---- Blangko ---- */
ctx.RSDB = { settings: {}, lokasi: [{ id: "k1", nama: "GI Makassar", kunci: "makassar", pejabat: "Budi", stempel: "data:image/png;base64,AAAA", stAr: 1, ttd: "data:image/png;base64,BBBB" }, { id: "k2", nama: "GI Pangkep", kunci: "pangkep, pangkajene", pejabat: "", stempel: "" }] };
cek("lokasi dicocokkan dari nama tempat tujuan", X.rsGet(r, "s1l") === "k1" && X.rsGet(r, "s1n") === "Makassar" && X.rsCariLokasi(ctx.RSDB.lokasi, "Kab. Pangkep") === "k2" && X.rsCariLokasi(ctx.RSDB.lokasi, "Pinrang") === "");
let B = X.rsLayoutB(r), Bt = teks(B);
cek("Blangko: isian identitas, rute, tanggal", ["Anhar Fitra Nur Satya", "9518163ZY", "ULTG Parepare", "Parepare", "12 Oktober 2026", "Makassar", "14 Oktober 2026", "SAMSU ALAM"].every(s => Bt.includes(s)) && Bt.join(" ").includes("12 Oktober 2026 s/d 14 Oktober 2026"), Bt.join("|"));
cek("Blangko: tiba di tujuan tanggal berangkat, berangkat dari tujuan tanggal kembali", (() => { const tb = B.filter(e => e.k === "t" && e.x === 159); return tb.some(e => e.t === "Makassar") && tb.some(e => e.t === "12 Oktober 2026") && B.some(e => e.k === "t" && e.x === 419 && e.t === "14 Oktober 2026") })());
cek("Blangko: stempel dan TTD lokasi muncul di kiri dan kanan blok II", ["S0L.cap", "S0R.cap", "S0L.ttd", "S0R.ttd"].every(k => B.some(e => e.k === "s" && e.key === k)));
cek("Blangko: stempel memakai ukuran/rasio lokasi", (() => { const s = B.find(e => e.key === "S0L.cap"); return s && s.w === 85 && s.h === 85 && s.ex === 1 })());
cek("Blangko: nama pejabat lokasi tercetak", Bt.includes("BUDI"));
cek("Blangko: tidak ada stempel di blok kosong (III, IV)", !B.some(e => e.k === "s" && /^S[12]/.test(e.key)));
cek("Blangko: tiba kembali memuat kota dan tanggal", Bt.includes("Parepare tgl. 14 Oktober 2026"), Bt.join("|"));
X.rsSet(r, "s1l", "-");
cek("pilih \"tanpa stempel\" -> stempel/TTD lokasi hilang", !X.rsLayoutB(r).some(e => e.k === "s" && /^S0/.test(e.key)));
X.rsSet(r, "s1l", "");
r.tujuan = "Kab. Pangkep, Kota Makassar";
B = X.rsLayoutB(r);
cek("rute dua pemberhentian: blok II = Pangkep, III = Makassar", X.rsGet(r, "s1n") === "Pangkep" && X.rsGet(r, "s2n") === "Makassar" && B.some(e => e.k === "t" && e.x === 419 && e.t === "Makassar") && B.some(e => e.k === "s" && e.key === "S1L.cap"));
cek("rute dua pemberhentian: tanggal berangkat pemberhentian terakhir = tanggal kembali", X.rsGet(r, "s1b") === "2026-10-12" && X.rsGet(r, "s2b") === "2026-10-14");
cek("Remburse: tujuan memuat seluruh rute", X.rsGet(r, "rTujuan") === "Kota Parepare - Kab. Pangkep - Kota Makassar", X.rsGet(r, "rTujuan"));
r.tujuan = "Kota Makassar";
ctx.RSDB.settings = { stempelAsal: "data:image/png;base64,CCCC", stempelAr: 1 };
cek("Blangko: stempel + TTD pejabat di kiri bawah (Pejabat yang memberi perintah)", (() => { const L = X.rsLayoutB(r), c = L.find(e => e.key === "F.cap"), t = L.find(e => e.key === "F.ttd"); return c && t && c.cx === t.cx && c.w === 85 && c.ex === 1 && L.findIndex(e => e.key === "F.cap") < L.findIndex(e => e.key === "F.ttd") })());
ctx.RSDB.settings = {};
cek("tanpa stempel asal -> tidak ada stempel kiri bawah", !X.rsLayoutB(r).some(e => e.key === "F.cap"));
/* ---- umum ---- */
cek("data lengkap -> tidak ada yang hilang", X.rsMissing(r).length === 0, X.rsMissing(r).join(","));
cek("Trip SAP kosong dilaporkan", (() => { const q = JSON.parse(JSON.stringify(r)); q.tripSap = ""; return X.rsMissing(q).includes("Nomor Trip SAP") })());
cek("maksud panjang: Remburse bergeser (tidak menimpa tabel) dan tetap utuh", (() => { const q = JSON.parse(JSON.stringify(r)); q.maksud = "Undangan Seminar Insulation Component Power Transformer dan Rapat Koordinasi Pemeliharaan Peralatan Gardu Induk Sulawesi Selatan Bagian Barat"; const L = X.rsLayoutR(q); const tt = L.filter(e => e.k === "t"); const ym = Math.max(...tt.filter(e => e.x > 200 && e.x < 215 && e.y < 330).map(e => e.y)); const ytab = L.find(e => e.k === "t" && e.t === "Tiket berangkat").y; return ytab > ym + 20 && tt.filter(e => e.x >= 200 && e.y > 270 && e.y < 340).length >= 2 })());
cek("tidak ada elemen di luar halaman A4 (Remburse, Pernyataan, Blangko)", [X.rsLayoutR(r), X.rsLayoutP(r), X.rsLayoutB(r)].every(L => L.filter(e => e.k === "t").every(e => e.y > 0 && e.y < 842 && e.x > 0 && e.x < 595)));
process.exit(gagal ? 1 : 0);
