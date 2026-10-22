/* Uji regresi di browser sungguhan (Playwright + Chromium).
   Jalankan:  NODE_PATH=$(npm root -g) node tests/browser-regression.js [folder-aplikasi] [--out hasil.json]
   Tidak menyentuh data pengguna: setiap uji memakai profil browser baru yang kosong. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const appDir = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(__dirname, ".."));
const outIdx = process.argv.indexOf("--out"); const outFile = outIdx > 0 ? process.argv[outIdx + 1] : null;
const URL_ = "file://" + path.join(appDir, "index.html");
const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAeCAYAAAC7Q5mxAAABJUlEQVR4nO1ZwQ2EMAwLNwNv5mQE5uTNDvBC6qHSJqkbgog/9zkcx3VQVIgCgUAgEPCAcZr39PcLGFBEOdO2dYHxe8UPQXKXOOskjtO8W9dsTghHsEUSn5qApgR6GNtS6iwSCRnhE6d5VxN7NXHHm6vfS4M6LVdBueRx/oOqz9WA1qFKoPY0USmQmLKty9AzkeKTkJ4oMgHckZVytCRS9KC2OEI0wjy0JiKBga0FW57v+R5r5TZtADH+2to1aHs0Gb8S3x2XpXm1uqWaRTG9RqdmopcFnaNBZGDPPe7k9mBeipoe9vsH3QR3D/Nyo5PqTTVlF2mLGw2OMV7MI8ov5ESZBFqPkLeRleIvgU80c72AeJN5RJUEvq0ZN/jSN41AIBAI6HEAclPtYt53kNcAAAAASUVORK5CYII=";
let fail = 0, pass = 0; const log = [];
const ok = (n, c, i = "") => { (c ? pass++ : fail++); const l = (c ? "LULUS  " : "GAGAL  ") + n + (c ? "" : "  " + i); console.log(l); log.push(l); };
const hasDelete = fs.readFileSync(path.join(appDir, "js/manage.js"), "utf8").includes("hapusPersonel");

const SEED = {
  people: [
    { id: "p1", name: "Budi Santoso", nip: "111", jabatan: "Operator", unit: "ULTG A", sig: SIG, aktif: true },
    { id: "p2", name: "Budi Santosa", nip: "222", jabatan: "Operator", unit: "ULTG B", sig: "", aktif: true },
    { id: "p3", name: "Budi Santoso", nip: "333", jabatan: "Teknisi", unit: "ULTG C", sig: SIG, aktif: false },
    { id: "p4", name: "Citra Lestari", nip: "444", jabatan: "Operator", unit: "ULTG A", sig: "", aktif: true }
  ],
  sigs: [{ id: "s1", name: "Rahmat Hidayat", jabatan: "Supervisor", sig: SIG }, { id: "s2", name: "Budi Santoso", jabatan: "", sig: SIG }],
  records: [
    { id: "r1", spk: "001/SPK/X/2026", lemburNo: "001/LEM/X/2026", name: "Budi Santoso", nip: "111", jabatan: "Operator", unit: "ULTG A", tanggal: "2026-08-07", mulai: "16:30", selesai: "21:00", durManual: "", lokasi: "GI Barru", uraian: "Pemantauan", pemberiName: "Rahmat Hidayat", pemberiJab: "Supervisor", koorName: "Hasan", koorJab: "Koordinator", sigP: SIG, sigG: SIG, sigK: "", sigPos: {}, status: "selesai", pId: "p1", createdAt: 1, updatedAt: 2 },
    { id: "r2", spk: "002", lemburNo: "002", name: "Dewi Anggraini", nip: "555", jabatan: "Operator", unit: "", tanggal: "2026-08-09", mulai: "18:00", selesai: "20:00", durManual: "", lokasi: "", uraian: "X", pemberiName: "Rahmat Hidayat", pemberiJab: "Supervisor", koorName: "Hasan", koorJab: "Koordinator", sigP: "", sigG: "", sigK: "", sigPos: {}, status: "draft", createdAt: 1, updatedAt: 2 }
  ],
  settings: {}
};

async function fresh(browser, seed) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
  const errs = [];
  const page = await ctx.newPage();
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  if (seed) {
    await page.goto(URL_);
    await page.evaluate(s => { const d = JSON.parse(localStorage.getItem("lembur.v1") || "{}"); localStorage.setItem("lembur.v1", JSON.stringify({ ...d, people: s.people, sigs: s.sigs, records: s.records, settings: { ...(d.settings || {}), ...s.settings } })); }, seed);
    await page.reload();
  } else await page.goto(URL_);
  await page.waitForSelector("#form [data-k=name]");
  return { ctx, page, errs };
}
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("lembur.v1")));
const names = page => page.$$eval("#peList table.t tr td:first-child b", e => e.map(x => x.textContent));

(async () => {
  const browser = await chromium.launch();
  const result = { app: appDir, fingerprints: {} };

  /* ---------- A. Regresi fungsi lama ---------- */
  {
    const { ctx, page, errs } = await fresh(browser, SEED);
    ok("A1 halaman termuat tanpa error JS", errs.length === 0, errs.join(" | "));
    for (const t of ["pe", "ri", "tt", "se", "in"]) { await page.click(`#tabs button[data-t=${t}]`); ok("A2 tab " + t + " terbuka", await page.isVisible("#tab-" + t)); }
    // personel: tambah, edit
    await page.click("#tabs button[data-t=pe]");
    ok("A3 daftar personel menampilkan 4 entri", (await names(page)).length === 4, "ditemukan: " + JSON.stringify(await names(page)));
    await page.fill("#pn", "Eko Prasetyo"); await page.fill("#pi", "777"); await page.fill("#pj", "Operator"); await page.fill("#pu", "ULTG Z");
    await page.click("#peSave");
    ok("A4 tambah personel bekerja", (await stored(page)).people.some(p => p.name === "Eko Prasetyo" && p.nip === "777"));
    await page.click('#peList button[data-e="p2"]');
    ok("A5 Edit memuat data ke formulir", (await page.inputValue("#pn")) === "Budi Santosa" && (await page.textContent("#peT")) === "Edit personel");
    await page.fill("#pj", "Operator Senior"); await page.click("#peSave");
    ok("A6 simpan hasil edit", (await stored(page)).people.find(p => p.id === "p2").jabatan === "Operator Senior");
    // pencarian
    await page.fill("#peQ", "citra"); ok("A7 pencarian personel", (await names(page)).join() === "Citra Lestari"); await page.fill("#peQ", "");
    // tanda tangan
    await page.click("#tabs button[data-t=tt]");
    ok("A8 daftar tanda tangan tampil", (await page.$$("#ttList table.t tr")).length === 2);
    // Riwayat
    await page.click("#tabs button[data-t=ri]");
    ok("A9 riwayat menampilkan 2 catatan", (await page.$$("#rList table.t tr")).length === 2);
    await page.fill("#rQ", "dewi"); ok("A10 pencarian riwayat", (await page.$$("#rList table.t tr")).length === 1); await page.fill("#rQ", "");
    await page.fill("#rA", "2026-08-08"); ok("A11 filter tanggal riwayat", (await page.$$("#rList table.t tr")).length === 1); await page.fill("#rA", "");
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click('#rList button[data-p="r1"]')]);
    ok("A12 PDF satu surat diunduh (.pdf)", /\.pdf$/i.test(dl.suggestedFilename()), dl.suggestedFilename());
    await page.click('#rList button[data-c="r1"]');
    ok("A13 Duplikat membuka formulir sebagai draft baru", (await page.inputValue('[data-k=name]')) === "Budi Santoso" && (await page.isVisible("#tab-in")));
    await page.click("#tabs button[data-t=ri]");
    await page.click('#rList button[data-x="r2"]'); await page.click(".ask-danger button.d, [data-r='1']");
    ok("A14 hapus surat di riwayat bekerja", (await stored(page)).records.length === 1 && (await stored(page)).records[0].id === "r1");
    await page.click('#rList button[data-o="r1"]');
    ok("A15 Buka memuat surat", (await page.inputValue('[data-k=uraian]')) === "Pemantauan");
    ok("A16 pratinjau A4 dirender", (await page.$$("#sheets .sheet")).length === 1);
    // pengaturan, cadangan
    await page.click("#tabs button[data-t=se]"); await page.fill('[data-s=kota]', "Parepare"); await page.click("#seSave");
    ok("A17 pengaturan tersimpan", (await stored(page)).settings.kota === "Parepare");
    const [ex] = await Promise.all([page.waitForEvent("download"), page.click("#exp")]);
    const bak = JSON.parse(fs.readFileSync(await ex.path(), "utf8"));
    ok("A18 ekspor JSON memuat people/records/sigs", Array.isArray(bak.people) && Array.isArray(bak.records) && Array.isArray(bak.sigs));
    await page.click("#selfTest"); const so = await page.textContent("#testOut");
    ok("A19 uji parser & durasi bawaan semua LULUS", /LULUS/.test(so) && !/GAGAL/.test(so), so.split("\n").filter(x => /GAGAL/.test(x)).join(";"));
    // impor kembali cadangan
    await page.setInputFiles("#imp", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bak)) });
    await page.click("[data-r='1']");
    await page.waitForTimeout(200);
    ok("A20 impor JSON mengembalikan data", (await stored(page)).people.length === bak.people.length);
    // WhatsApp multi surat
    await page.click("#tabs button[data-t=in]"); await page.click("#m-wa");
    await page.fill("#waText", "Nama: Budi Santoso\nID Operator: 111\nUraian Pekerjaan: A\nTanggal Lembur: 07 Agustus 2026\nJam lembur: 16:30-21:00\nTL: Rahmat Hidayat\n\nID Operator: 111\nUraian Pekerjaan: B\nTanggal Lembur: 09 Agustus 2026\nJam lembur: 16:30-18:00\nTL: Rahmat Hidayat");
    await page.click("#parse");
    ok("A21 parsing WhatsApp menampilkan hasil", await page.isVisible("#parseOut #applyMulti, #parseOut #apply"));
    const ap = await page.$("#apply, #applyMulti"); if (ap) await ap.click();
    await page.waitForTimeout(150);
    const cf = await page.$("[data-r='1']"); if (cf) await cf.click(); /* konfirmasi "isi formulir akan diganti" */
    await page.waitForTimeout(300);
    ok("A22 banyak surat dari satu pesan", (await page.$$("#sheets .sheet")).length >= 2, "jumlah sheet=" + (await page.$$("#sheets .sheet")).length);
    await page.click("#bDraft"); await page.waitForTimeout(200);
    ok("A23 Simpan draft (banyak surat) menambah riwayat", (await stored(page)).records.length >= 3);
    const lbl = await page.textContent("#bDraft"); ok("A24 label tombol memuat jumlah surat", /\(\d+\)/.test(lbl), lbl);
    ok("A25 tombol aksi utama ada & aktif", await page.isEnabled("#bPdf") && await page.isEnabled("#bPrint") && await page.isEnabled("#bXl") && await page.isEnabled("#bDone") && await page.isEnabled("#bNew"));
    // sidik jari tata letak surat (isi HTML + gaya terhitung) layar & cetak
    const fp = () => page.evaluate(() => { const sh = document.querySelector("#sheets .sheet"); const props = ["position", "left", "top", "width", "height", "fontSize", "fontFamily", "lineHeight", "fontWeight", "transform", "borderTopWidth", "borderLeftWidth", "paddingLeft", "marginLeft", "textAlign", "display", "color", "backgroundColor", "overflow", "whiteSpace"]; const out = []; [sh, ...sh.querySelectorAll("*")].forEach(e => { const cs = getComputedStyle(e); out.push(e.tagName + "|" + props.map(p => cs[p]).join("|")); }); return { html: sh.innerHTML.length, n: out.length, sig: out.join("\n") }; });
    result.fingerprints.screen = await fp();
    await page.emulateMedia({ media: "print" }); result.fingerprints.print = await fp(); await page.emulateMedia({ media: "screen" });
    const errs2 = errs.filter(e => !/favicon/.test(e)); ok("A26 tidak ada error JS selama alur regresi", errs2.length === 0, errs2.join(" | "));
    await ctx.close();
  }

  /* ---------- B. Fitur hapus personel ---------- */
  if (!hasDelete) { console.log("(Fitur hapus personel tidak ada pada versi ini - bagian B dilewati)"); }
  else {
    const { ctx, page, errs } = await fresh(browser, SEED);
    await page.click("#tabs button[data-t=pe]");
    const rows = await page.$$("#peList table.t tr");
    ok("B1 tombol Hapus muncul pada setiap entri", (await page.$$('#peList button[data-x]')).length === rows.length && rows.length === 4);
    ok("B2 tombol Edit tetap ada di setiap entri", (await page.$$('#peList button[data-e]')).length === 4);
    const before = await stored(page);
    // Batal
    await page.click('#peList button[data-x="p1"]');
    const dlg = await page.textContent(".ask-danger");
    ok("B3 dialog konfirmasi menyebut nama personel", dlg.includes("Hapus Data Personel?") && dlg.includes("Budi Santoso") && dlg.includes("111") && dlg.includes("Data surat dan riwayat yang sudah dibuat tetap dipertahankan"), dlg);
    ok("B4 data belum berubah saat dialog tampil", JSON.stringify(await stored(page)) === JSON.stringify(before));
    ok("B5 tombol Batal fokus awal (aman)", await page.evaluate(() => document.activeElement.dataset.r === "0"));
    await page.click('.ask-danger [data-r="0"]');
    ok("B6 Batal: dialog tertutup & data tidak berubah", !(await page.$(".ask-danger")) && JSON.stringify(await stored(page)) === JSON.stringify(before));
    // klik latar
    await page.click('#peList button[data-x="p1"]'); await page.mouse.click(5, 5);
    ok("B7 klik latar menutup dialog tanpa mengubah data", !(await page.$(".ask-danger")) && JSON.stringify(await stored(page)) === JSON.stringify(before));
    // Hapus p1 (ada nama kembar p3 dan mirip p2)
    await page.click('#peList button[data-x="p1"]'); await page.click('.ask-danger [data-r="1"]'); await page.waitForTimeout(150);
    const after = await stored(page);
    ok("B8 hanya personel terpilih (p1) terhapus", after.people.length === 3 && !after.people.some(p => p.id === "p1"));
    ok("B9 personel kembar nama (p3) & mirip (p2) tidak ikut terhapus", after.people.some(p => p.id === "p3") && after.people.some(p => p.id === "p2"));
    ok("B10 atribut personel lain tidak berubah", JSON.stringify(after.people) === JSON.stringify(before.people.filter(p => p.id !== "p1")));
    ok("B11 records/sigs/settings tidak berubah", JSON.stringify(after.records) === JSON.stringify(before.records) && JSON.stringify(after.sigs) === JSON.stringify(before.sigs) && Object.keys(before.settings).every(k => JSON.stringify(after.settings[k]) === JSON.stringify(before.settings[k])));  /* save() lama selalu menulis pengaturan bawaan yang belum ada; nilai yang sudah tersimpan tidak boleh berubah */
    ok("B12 daftar diperbarui di layar", (await names(page)).length === 3);
    ok("B13 toast sukses tampil setelah tersimpan", /dihapus/.test(await page.textContent("#toast")));
    ok("B14 key localStorage tetap lembur.v1 & skema sama", JSON.stringify(Object.keys(after).sort()) === JSON.stringify(Object.keys(before).sort()) && (await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("lembur")).join())) === "lembur.v1");
    await page.reload(); await page.click("#tabs button[data-t=pe]");
    ok("B15 tetap terhapus setelah reload", (await names(page)).length === 3 && !(await stored(page)).people.some(p => p.id === "p1"));
    const pg2 = await ctx.newPage(); await pg2.goto(URL_); await pg2.click("#tabs button[data-t=pe]");
    ok("B16 tetap terhapus setelah aplikasi dibuka kembali (tab baru)", (await names(pg2)).length === 3); await pg2.close();
    // dampak ke surat/riwayat
    await page.click("#tabs button[data-t=ri]");
    ok("B17 riwayat surat masih lengkap, termasuk surat milik personel terhapus", (await page.$$("#rList table.t tr")).length === 2 && (await page.textContent("#rList")).includes("Budi Santoso"));
    await page.click('#rList button[data-o="r1"]');
    ok("B18 surat lama tetap terbuka utuh (nama, tanda tangan)", (await page.inputValue("[data-k=name]")) === "Budi Santoso" && (await page.$$eval("#sheets .sheet img", i => i.length)) >= 1);
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), (async () => { await page.click("#tabs button[data-t=ri]"); await page.click('#rList button[data-p="r1"]'); })()]);
    ok("B19 PDF surat lama tetap bisa diunduh", /\.pdf$/i.test(dl.suggestedFilename()));
    ok("B20 daftar Tanda Tangan (milik tab lain) tidak berubah", JSON.stringify((await stored(page)).sigs) === JSON.stringify(before.sigs));
    // dropdown form
    await page.click("#tabs button[data-t=in]");
    const opts = await page.$$eval('[data-sel=P] option', o => o.map(x => x.textContent));
    ok("B21 pilihan personel di formulir ikut diperbarui (p1 hilang, p3 nonaktif tetap tak tampil)", !opts.some(t => t.includes("111")) && opts.some(t => t.includes("222")) && !opts.some(t => t.includes("333")));
    // hapus saat sedang diedit
    await page.click("#tabs button[data-t=pe]"); await page.click('#peList button[data-e="p2"]');
    await page.click('#peList button[data-x="p2"]'); await page.click('.ask-danger [data-r="1"]'); await page.waitForTimeout(100);
    ok("B22 menghapus personel yang sedang diedit mengosongkan formulir edit", (await page.inputValue("#pn")) === "" && (await page.textContent("#peT")) === "Tambah personel");
    await page.click("#peSave").catch(() => {});
    ok("B23 setelah itu 'Simpan' tanpa nama tidak membuat/memulihkan data", (await stored(page)).people.length === 2);
    // tambah personel baru masih bekerja
    await page.fill("#pn", "Fajar"); await page.click("#peSave"); ok("B24 tambah personel setelah menghapus tetap bekerja", (await stored(page)).people.some(p => p.name === "Fajar"));
    // pencarian + hapus pada daftar terfilter
    await page.fill("#peQ", "citra"); await page.click('#peList button[data-x="p4"]'); const d4 = await page.textContent(".ask-danger");
    ok("B25 hapus pada daftar terfilter menyebut target yang benar", d4.includes("Citra Lestari")); await page.click('.ask-danger [data-r="1"]'); await page.waitForTimeout(100);
    ok("B26 yang terhapus hanya Citra", !(await stored(page)).people.some(p => p.id === "p4") && (await stored(page)).people.some(p => p.id === "p3"));
    // surat hapus (riwayat) tetap terpisah dari hapus personel
    await page.fill("#peQ", ""); await page.click("#tabs button[data-t=ri]"); await page.click('#rList button[data-x="r2"]'); await page.click(".ask-danger [data-r='1'], [data-r='1']");
    ok("B27 hapus surat tidak menyentuh personel", (await stored(page)).records.length === 1 && (await stored(page)).people.length === 2);
    ok("B28 tidak ada error JS baru pada alur hapus", errs.length === 0, errs.join(" | "));
    await ctx.close();

    // Kegagalan penyimpanan
    {
      const { ctx, page, errs } = await fresh(browser, SEED);
      await page.click("#tabs button[data-t=pe]"); const before = await stored(page);
      await page.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "lembur.v1") throw new Error("QuotaExceeded"); return o.call(this, k, v); }; });
      await page.click('#peList button[data-x="p4"]'); await page.click('.ask-danger [data-r="1"]'); await page.waitForTimeout(150);
      ok("B29 gagal simpan: pesan kesalahan jelas, bukan sukses palsu", /Gagal menghapus/.test(await page.textContent("#toast")) && !/dihapus\./.test(await page.textContent("#toast")));
      ok("B30 gagal simpan: personel tetap tampil & data tetap utuh", (await names(page)).includes("Citra Lestari") && JSON.stringify(await stored(page)) === JSON.stringify(before));
      ok("B31 gagal simpan: tidak ada error JS tak tertangani", errs.filter(e => !/QuotaExceeded/.test(e)).length === 0, errs.join("|"));
      await page.evaluate(() => { delete Storage.prototype.setItem; });
      await ctx.close();
    }
    // Data lama tanpa id / id kembar
    {
      const seed = JSON.parse(JSON.stringify(SEED));
      seed.people.push({ name: "Tanpa Id", nip: "900", jabatan: "X", unit: "", sig: "", aktif: true });
      seed.people.push({ id: "dup", name: "Kembar A", nip: "901", jabatan: "", unit: "", sig: "", aktif: true });
      seed.people.push({ id: "dup", name: "Kembar B", nip: "902", jabatan: "", unit: "", sig: "", aktif: true });
      const { ctx, page } = await fresh(browser, seed); await page.click("#tabs button[data-t=pe]"); const before = await stored(page);
      await page.fill("#peQ", "kembar");
      await page.click('#peList button[data-x="dup"]'); await page.waitForTimeout(100);
      ok("B32 id ganda: penghapusan ditolak, tidak ada dialog & tidak ada perubahan data", !(await page.$(".ask-danger")) && JSON.stringify(await stored(page)) === JSON.stringify(before) && /tidak dapat dipastikan/.test(await page.textContent("#toast")));
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\nRingkasan: ${pass} lulus, ${fail} gagal`);
  result.pass = pass; result.fail = fail; result.log = log;
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(result));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("UJI BERHENTI:", e); process.exit(2); });
