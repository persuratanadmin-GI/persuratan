/* Uji integrasi Excel (ExcelJS, tanpa browser). Jalankan: npm install && node tests/excel.test.js */
const fs = require("fs"), path = require("path"), ExcelJS = require("exceljs");
const kode = fs.readFileSync(path.join(__dirname, "..", "js", "excel.js"), "utf8");
const X = new Function("ExcelJS", kode + ";return{xlTerbilang,xlTotal,xlMenit,xlCariNama,xlParse,xlSheetBulan,xlRencana,xlTerapkan}")(ExcelJS);

let gagal = 0;
const cek = (nama, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + nama + (ok ? "" : " " + info)); if (!ok) gagal++; };
const e = (nama, iso, masuk, pulang, ket) => ({ nama, iso, masuk, pulang, ket });

(async () => {
  cek("terbilang jam.menit (4 jam 45 menit)", X.xlTotal(285).nilai === 4.45 && X.xlTotal(285).teks === "Empat koma empat puluh lima menit");
  cek("terbilang jam bulat", X.xlTotal(780).nilai === 13 && X.xlTotal(780).teks === "Tiga belas jam");
  cek("durasi lewat tengah malam (22:00-02:00 = 240 menit)", X.xlMenit("22:00", "02:00") === 240);
  cek("nama 'Budi Santoso' cocok dengan 'MUH. BUDI SANTOSO'", X.xlCariNama("Budi Santoso", ["ANDI", "MUH. BUDI SANTOSO"]) === "MUH. BUDI SANTOSO");
  cek("nama tak dikenal tidak dipaksakan cocok", X.xlCariNama("Citra", ["ANDI", "MUH. BUDI SANTOSO"]) === null);

  // 1) berkas baru dari nol
  const wb = new ExcelJS.Workbook();
  const awal = [e("BUDI SANTOSO", "2026-08-09", "16:30", "18:00", "Pekerjaan B"), e("BUDI SANTOSO", "2026-08-07", "16:30", "21:00", "Pekerjaan A"), e("BUDI SANTOSO", "2026-08-12", "22:00", "02:00", "Lewat tengah malam"), e("RAHMAT HIDAYAT", "2026-08-08", "08:00", "12:15", "Hari libur")];
  const lap = X.xlTerapkan(wb, awal, { kota: "Parepare", slot: [{ label: "Manager," }, { label: "TL A" }, { label: "TL B" }, { label: "TL C" }] });
  cek("sheet bulan baru dibuat", lap.length === 1 && lap[0].baru && wb.worksheets[0].name === "AGUSTUS 2026");
  const buf = await wb.xlsx.writeBuffer();

  // 2) baca ulang, tambah, uji duplikat dan urutan
  const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(buf);
  const m = X.xlParse(wb2.worksheets[0]);
  cek("terbaca ulang: 2 orang", m.people.length === 2 && m.bulan === "2026-08", JSON.stringify(m.people.map(p => p.name)));
  cek("baris diurutkan menurut tanggal", m.people[0].entries.map(x => x.iso).join() === "2026-08-07,2026-08-09,2026-08-12");
  const baru = [e("BUDI SANTOSO", "2026-08-07", "16:30", "21:00", "duplikat"), e("BUDI SANTOSO", "2026-08-05", "17:00", "19:30", "Disisipkan"), e("CITRA DEWI", "2026-08-20", "18:00", "20:00", "Orang baru")];
  const rc = X.xlRencana(wb2, baru);
  cek("duplikat dilewati, 2 baris baru, 1 orang baru", rc[0].dilewati === 1 && rc[0].ditambah === 2 && rc[0].orangBaru.join() === "CITRA DEWI", JSON.stringify(rc[0]));
  X.xlTerapkan(wb2, baru, { kota: "Parepare", slot: [] });
  const m2 = X.xlParse(wb2.worksheets[0]);
  const bs = m2.people.find(p => p.name === "BUDI SANTOSO");
  cek("baris sisipan masuk berurutan", bs.entries[0].iso === "2026-08-05" && bs.entries.length === 4);
  const tot = X.xlRencana(wb2, []).length === 0;
  const ring = X.xlRencana(wb2, [e("BUDI SANTOSO", "2026-08-07", "16:30", "21:00", "x")])[0].ringkas.find(r => r.nama === "BUDI SANTOSO");
  cek("total jam Budi = 2:30+4:30+1:30+4:00 -> 12.30", ring.total.nilai === 12.3, JSON.stringify(ring.total));

  // 3) bulan berbeda -> sheet baru; sheet lama utuh
  const lap3 = X.xlTerapkan(wb2, [e("BUDI SANTOSO", "2026-09-03", "16:30", "18:00", "September")], { kota: "Parepare", slot: [] });
  cek("bulan baru = sheet baru, sheet Agustus tetap", lap3[0].baru && wb2.worksheets.map(w => w.name).join() === "AGUSTUS 2026,SEPTEMBER 2026");
  cek("rumus total memakai jam.menit", /INT\(ROUND\(SUM\(F\d+:F\d+\)\*1440/.test(JSON.stringify(wb2.worksheets[0].getCell("F9").value) + JSON.stringify(wb2.worksheets[0].getCell("F10").value) + JSON.stringify(wb2.worksheets[0].getCell("F11").value) + JSON.stringify(wb2.worksheets[0].getCell("F12").value) + JSON.stringify(wb2.worksheets[0].getCell("F13").value)));

  // 4) blok pengesahan lengkap pada sheet baru: Mengetahui, tanggal, jabatan, nama (otomatis), tanggal manual bisa diubah
  const wb4 = new ExcelJS.Workbook();
  const slot = [{ label: "Manager,", nama: "PENGESAH SATU" }, { label: "TL Dua", nama: "PENGESAH DUA" }, { label: "TL Tiga", nama: "PENGESAH TIGA" }, { label: "TL Empat", nama: "PENGESAH EMPAT" }];
  X.xlTerapkan(wb4, [e("BUDI SANTOSO", "2026-10-05", "16:30", "18:00", "x")], { kota: "Parepare", slot, tglTtd: "2026-10-28" });
  const ws4 = wb4.worksheets[0], semua = [];
  ws4.eachRow(r => r.eachCell(c => { if (typeof c.value === "string") semua.push(c.value); }));
  cek("blok pengesahan: Mengetahui, jabatan, dan 4 nama terisi", ["Mengetahui", "Manager,", "TL Empat", "PENGESAH SATU", "PENGESAH EMPAT"].every(t => semua.includes(t)));
  cek("tanggal pengesahan manual dipakai", semua.includes("Parepare, 28 Oktober 2026"), semua.filter(t => /Parepare/.test(t)).join());
  const wb5 = new ExcelJS.Workbook();
  X.xlTerapkan(wb5, [e("BUDI SANTOSO", "2026-10-05", "16:30", "18:00", "x")], { kota: "Parepare", slot });
  const t5 = []; wb5.worksheets[0].eachRow(r => r.eachCell(c => { if (typeof c.value === "string" && /Parepare,/.test(c.value)) t5.push(c.value); }));
  cek("tanggal pengesahan bawaan = akhir bulan", t5[0] === "Parepare, 31 Oktober 2026", t5.join());

  // 6) regresi: personel kedua/ketiga ke file buatan aplikasi sendiri (gambar TTD berjangkar satu sel + ukuran, tanpa "br")
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  const gb = { base64: png, ext: "png", w: 100, h: 50 };
  const slotG = [{ label: "A,", nama: "PENGESAH SATU", gambar: gb }, { label: "B", nama: "PENGESAH DUA" }, { label: "C", nama: "PENGESAH TIGA", gambar: gb }, { label: "D", nama: "PENGESAH EMPAT", gambar: gb }];
  const tambah = async (buf, n, iso) => { const w = new ExcelJS.Workbook(); if (buf) await w.xlsx.load(buf); X.xlTerapkan(w, [e(n, iso, "17:00", "20:00", "y")], { kota: "Parepare", slot: slotG }); return w.xlsx.writeBuffer(); };
  let buf6 = await tambah(null, "PERSONEL SATU", "2026-10-05"), ok6 = true, info6 = "";
  for (const [n, iso] of [["PERSONEL DUA", "2026-10-07"], ["PERSONEL TIGA", "2026-10-09"]]) {
    try { buf6 = await tambah(buf6, n, iso); } catch (err) { ok6 = false; info6 = err.message; break; }
  }
  const w6 = new ExcelJS.Workbook(); await w6.xlsx.load(buf6);
  cek("personel kedua dan ketiga masuk ke file yang sama tanpa galat", ok6, info6);
  cek("3 personel tercatat dan 3 gambar tanda tangan tetap ada", ok6 && X.xlParse(w6.worksheets[0]).people.length === 3 && w6.worksheets[0].getImages().length === 3);
  const baris6 = w6.worksheets[0].getImages().map(g => g.range.tl.row), nama6 = [];
  w6.worksheets[0].eachRow(r => { const v = r.getCell(1).value; if (typeof v === "string") nama6.push([r.number, v]); });
  const barisNama = (nama6.find(x => /PENGESAH/.test(x[1])) || nama6.find(x => x[1] === "Mengetahui") || [0])[0];
  cek("gambar tanda tangan bergeser ke bawah mengikuti baris baru (di atas baris nama pengesah)", ok6 && baris6.every(r => r > 12.5 && r < barisNama), baris6.join());

  // 7) regresi: gambar berjangkar dua sel (seperti file yang disimpan ulang di Excel) tetap bisa digeser
  const w7a = new ExcelJS.Workbook(); X.xlTerapkan(w7a, [e("PERSONEL SATU", "2026-10-05", "16:30", "18:00", "x")], { kota: "Parepare", slot: slotG });
  { const ws7 = w7a.worksheets[0], lama7 = ws7.getImages().map(g => ({ id: g.imageId, col: g.range.tl.col, row: g.range.tl.row }));
    ws7._media = ws7._media.filter(m => m.type !== "image");   // ganti ke jangkar dua sel (tl + br) lewat addImage agar sah
    lama7.forEach(g => ws7.addImage(g.id, { tl: { col: g.col, row: g.row }, br: { col: g.col + 1.5, row: g.row + 1.5 }, editAs: "oneCell" })); }
  const buf7 = await w7a.xlsx.writeBuffer(), w7b = new ExcelJS.Workbook(); await w7b.xlsx.load(buf7);
  let ok7 = true, info7 = ""; try { X.xlTerapkan(w7b, [e("PERSONEL DUA", "2026-10-07", "17:00", "20:00", "y")], { kota: "Parepare", slot: slotG }); } catch (err) { ok7 = false; info7 = err.message; }
  cek("gambar berjangkar dua sel tetap bisa digeser saat personel baru ditambah", ok7 && w7b.worksheets[0].getImages().length === 3 && w7b.worksheets[0].getImages().every(g => g.range.br), info7);

  console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji Excel lulus");
  process.exit(gagal ? 1 : 0);
})();
