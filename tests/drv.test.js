/* Uji Lembur Driver (logika surat + Excel) tanpa browser/jsdom. Jalankan: node tests/drv.test.js
   ExcelJS dibaca dari vendor/exceljs.min.js (bawaan repositori). */
const vm = require("vm"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const baca = f => fs.readFileSync(path.join(root, f), "utf8");
const ExcelJS = require(path.join(root, "vendor", "exceljs.min.js"));
let gagal = 0;
const cek = (n, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + n + (ok ? "" : " " + info)); if (!ok) gagal++; };

// --- logika surat ---
const ctx = { window: {}, document: { getElementById() { return null; } }, console };
vm.createContext(ctx);
vm.runInContext(["js/logic.js", "js/sppd-logic.js", "js/drv-assets.js", "js/drv-logic.js"].map(baca).join("\n") + ";this.X={dvBuildAll,dvLayout,dvNames,dvNamaBerkas,dvMissing,dvPrep,DV_DEF}", ctx);
const X = ctx.X;
const pesan = "Driver: Syahrul & Agus\nHari/Tanggal: Jumat, 7 Agustus 2026\nPukul: 16.30-21.00 WITA\nTujuan: Antar tim ke GI Barru\nTL: Rahmat Hidayat\n\nTanggal: 9 Agustus 2026\nPukul: 22.00-02.00\nTujuan: Jemput tim\nTL: Rahmat Hidayat";
const r = X.dvBuildAll(pesan, X.DV_DEF, [{ name: "Rahmat Hidayat", jabatan: "TL HAR GI" }]);
cek("dua blok -> dua surat", r.surat.length === 2);
const a = r.surat[0], b = r.surat[1];
cek("surat 1: tanggal, jam, tujuan", a.tanggal === "2026-08-07" && a.mulai === "16:30" && a.selesai === "21:00" && a.tujuan === "Antar tim ke GI Barru");
cek("label 'Driver:' dibaca sebagai nama, dua driver", X.dvNames(a.driver).join("|") === "Syahrul|Agus");
cek("jabatan TL diambil dari tanda tangan terdaftar", a.pemberiJab === "TL HAR GI" && !a.flags.pemberiName);
cek("surat 2 mewarisi nama driver dan ditandai periksa", b.driver === a.driver && b.st.driver.s === "warn");
cek("tanggal surat mengikuti tanggal lembur", a.tglSurat === "2026-08-07");
cek("kalimat berawalan 'driver' tanpa titik dua tidak dianggap label", X.dvPrep("Driver standby di kantor") === "Driver standby di kantor");
cek("kelengkapan: surat kosong lima kolom wajib", X.dvMissing({}).length === 5 && X.dvMissing(a).length === 0);
const teks = X.dvLayout(a, X.DV_DEF).filter(e => e.k === "t").map(e => e.t);
cek("tata letak: label Waktu dan Uraian Tugas (bukan Pukul/Tujuan)", teks.includes("Waktu") && teks.includes("Uraian Tugas") && !teks.includes("Pukul") && !teks.includes("Tujuan") && teks.includes("Jumat, 07 Agustus 2026") && teks.includes("16:30 s/d 21:00 WITA (4.5 Jam)") && teks.includes("Antar tim ke GI Barru"));
cek("tata letak: Parepare + tanggal, TL, manager", teks.includes("Parepare, 07 Agustus 2026") && teks.includes("RAHMAT HIDAYAT") && teks.includes("SAMSU ALAM"));
const panjang = Object.assign({}, a, { tujuan: "Mengantar tim pemeliharaan ke GI Barru untuk penggantian relay proteksi dan pengecekan panel kontrol sekaligus membawa material tambahan dari gudang" });
const yTtd = l => l.find(e => e.t === "SAMSU ALAM").y;
cek("tujuan panjang menggeser blok tanda tangan ke bawah", yTtd(X.dvLayout(panjang, X.DV_DEF)) > yTtd(X.dvLayout(a, X.DV_DEF)));
cek("nama berkas satu surat", X.dvNamaBerkas([{ driver: "Syahrul", tanggal: "2026-08-07" }]) === "LEMBUR DRIVER SYAHRUL 07 AGUSTUS 2026.pdf");
cek("nama berkas beberapa surat memuat bulan-tahun", X.dvNamaBerkas([{ driver: "Syahrul", tanggal: "2026-08-07" }, { driver: "Agus", tanggal: "2026-08-09" }]) === "DAFTAR FILE LEMBUR DRIVER SYAHRUL & AGUS AGUSTUS 2026.pdf");

// --- Excel ---
const D = new Function("ExcelJS", baca("js/excel.js") + baca("js/drv-excel.js") + ";return{dxParse,dxRencana,dxTerapkan,dxSheets,dxCariSheet}")(ExcelJS);
const e = (nama, iso, masuk, pulang, ket) => ({ nama, iso, masuk, pulang, ket });
const slot = [{ label: "Manajer", nama: "PENGESAH SATU" }, { label: "TL Dua", nama: "PENGESAH DUA" }, { label: "TL Tiga", nama: "PENGESAH TIGA" }, { label: "TL Empat", nama: "PENGESAH EMPAT" }];
(async () => {
  const wb = new ExcelJS.Workbook();
  const awal = [e("SYAHRUL", "2026-10-09", "16:30", "21:00", "A"), e("SYAHRUL", "2026-10-03", "08:00", "12:15", "B"), e("SYAHRUL", "2026-10-12", "22:00", "02:00", "C"), e("AGUS RUSLAN", "2026-10-05", "17:00", "19:30", "D")];
  const lap = D.dxTerapkan(wb, awal, { kota: "Parepare", slot });
  cek("satu sheet per driver", wb.worksheets.map(w => w.name).join() === "AGUS RUSLAN,SYAHRUL" && lap.every(l => l.baru));
  const buf = await wb.xlsx.writeBuffer();
  const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(buf);
  const m = D.dxParse(wb2.getWorksheet("SYAHRUL"));
  cek("terbaca ulang: nama, bulan, 3 baris urut tanggal", m.nama === "SYAHRUL" && m.bulan === "2026-10" && m.entries.map(x => x.iso).join() === "2026-10-03,2026-10-09,2026-10-12", JSON.stringify(m));
  cek("total jam SYAHRUL = 4:15+4:30+4:00 -> 12.45", D.dxRencana(wb2, [e("SYAHRUL", "2026-10-03", "08:00", "12:15", "B")])[0].ringkas.total.nilai === 12.45);
  const ws = wb2.getWorksheet("SYAHRUL");
  cek("hari ditulis terpisah dari tanggal", ws.getCell("B9").value === "Sabtu" && ws.getCell("A12").value === 4);
  const rc = D.dxRencana(wb2, [e("SYAHRUL", "2026-10-03", "08:00", "12:15", "dup"), e("syahrul", "2026-10-20", "18:00", "20:00", "baru")]);
  cek("duplikat dilewati, baris baru ditambah ke sheet yang sama", rc.length === 1 && rc[0].dilewati === 1 && rc[0].ditambah === 1 && rc[0].sheet === "SYAHRUL");
  D.dxTerapkan(wb2, [e("SYAHRUL", "2026-10-20", "18:00", "20:00", "baru")], { kota: "Parepare", slot });
  cek("baris disisipkan berurutan", D.dxParse(wb2.getWorksheet("SYAHRUL")).entries.length === 4);
  const l2 = D.dxTerapkan(wb2, [e("SYAHRUL", "2026-11-02", "18:00", "20:00", "Nov")], { kota: "Parepare", slot });
  cek("bulan lain -> sheet baru bernama NAMA BULAN TAHUN", l2[0].baru && l2[0].sheet === "SYAHRUL NOVEMBER 2026" && wb2.getWorksheet("SYAHRUL").getCell("C5").value.includes("OKTOBER"), l2[0].sheet);
  // tabel melebihi 10 baris
  const banyak = Array.from({ length: 12 }, (_, i) => e("BUDI", "2026-12-" + String(i + 1).padStart(2, "0"), "18:00", "19:00", "x"));
  const wb3 = new ExcelJS.Workbook(); D.dxTerapkan(wb3, banyak, { kota: "Parepare", slot });
  const m3 = D.dxParse(wb3.worksheets[0]);
  cek("tabel bertambah melebihi 10 baris, total 12 jam", m3.entries.length === 12 && D.dxRencana(wb3, [banyak[0]])[0].ringkas.total.nilai === 12);
  const teksSemua = []; wb3.worksheets[0].eachRow(r => r.eachCell(c => { if (typeof c.value === "string") teksSemua.push(c.value); }));
  cek("blok pengesahan terisi (Mengetahui, 4 nama, tanggal akhir bulan)", ["Mengetahui :", "PENGESAH SATU", "PENGESAH EMPAT", "Parepare, 31 Desember 2026"].every(t => teksSemua.includes(t)), teksSemua.join("|"));
  console.log(gagal ? "\n" + gagal + " uji GAGAL" : "\nSemua uji lulus");
  process.exit(gagal ? 1 : 0);
})().catch(x => { console.error(x); process.exit(1); });
