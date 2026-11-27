/* Uji regresi mode Lembur Pegawai di browser sungguhan (Playwright + Chromium).
   Jalankan:  NODE_PATH=$(npm root -g) node tests/pegawai-regression.js
   Setiap uji memakai profil browser baru yang kosong; tidak menyentuh data pengguna. */
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const URL_ = "file://" + path.join(path.resolve(__dirname, ".."), "index.html");
let pass = 0, fail = 0;
const ok = (n, c, i = "") => { (c ? pass++ : fail++); console.log((c ? "LULUS  " : "GAGAL  ") + n + (c ? "" : "  " + i)); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
  const errs = []; const page = await ctx.newPage();
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await page.goto(URL_); await page.waitForSelector("#form [data-k=name]");
  await page.click("#lsP"); await page.waitForTimeout(300);
  ok("P1 mode Lembur Pegawai terbuka, judul benar, tanpa error JS", (await page.evaluate(() => document.body.classList.contains("mode-pg") && document.querySelector("header h1").textContent === "Admin Lembur Pegawai")) && errs.length === 0, errs.join("|"));
  const WA = "Nama: FULAN SATU\nNIP: 90162222Z\nHari/Tanggal: 10/11/2026\nWaktu: 16:30 - 21:00\nLokasi: GI Pangkep\nUraian: Penanganan anomali\n\nNama: FULAN DUA\nNIP: 90162222Y\nHari/Tanggal: 11/11/2026\nWaktu: 18:00 - 22:00\nLokasi: GI Barru\nUraian: Pembersihan switchyard";
  await page.evaluate(() => { PGDB.pegawai = [{ id: "a", nama: "FULAN SATU", nip: "90162222Z", personGrade: "12", positionGrade: "11", jabatan: "TL HAR JAR" }, { id: "b", nama: "FULAN DUA", nip: "90162222Y", personGrade: "11", positionGrade: "10", jabatan: "OPERATOR GI" }]; });
  await page.click("#pg-m-wa"); await page.fill("#pg-waText", WA); await page.click("#pg-parse"); await page.click("#pg-apply"); await page.waitForTimeout(300);
  ok("P2 pesan WhatsApp 2 blok menjadi 2 surat; grade dan jabatan terisi dari daftar pegawai", await page.evaluate(() => pgBatch.length === 2 && pgBatch[0].personGrade === "12" && pgBatch[1].jabatan === "OPERATOR GI" && pgBatch[0].tanggal === "2026-11-10"));
  ok("P3 urutan halaman mengikuti pedoman: F01, F02, F03 x2, F04 x2, F05 x2, Kendali", await page.evaluate(() => pgPgs.map(p => p.f).join(" ") === "F01 F02 F03 F03 F04 F04 F05 F05 F08"));
  ok("P4 susunan per pegawai: 03,04,05 tiap pegawai berurutan", await page.evaluate(() => { PGDB.urut = "pegawai"; pgBuildSheets(); const r = pgPgs.map(p => p.f + (p.i ?? "")).join(" "); PGDB.urut = "form"; pgBuildSheets(); return r === "F01 F02 F030 F040 F050 F031 F041 F051 F08"; }));
  const txt = await page.evaluate(() => { const g = k => pgPgs.filter(p => p.f === k).map(p => p.items.filter(e => e.k === "t").map(e => e.t).join("|")); return { f3: g("F03")[0], f4: g("F04")[0], f5: g("F05")[0], f1: g("F01")[0] }; });
  ok("P5 nomor surat perintah sama di Form 03, 04, 05 (tahun dari tanggal surat)", /\/SDM\.06\.01\/[^|]*\/2026/.test(txt.f3) && /Nomor: [^|]*\/SDM\.06\.01\/[^|]*\/2026/.test(txt.f4) && /Nomor: [^|]*\/SDM\.06\.01\/[^|]*\/2026/.test(txt.f5));
  ok("P6 kejadian penting dibiarkan kosong tampil titik-titik; rincian a, b, c", /pekerjaan \.\.\.\.\./.test(txt.f5) && /a\.\|/.test(txt.f4));
  ok("P7 Form 01: ada baris TOTAL dan rekap per rincian pekerjaan", /TOTAL/.test(txt.f1) && /Penanganan anomali/.test(txt.f1) && /Pembersihan switchyard/.test(txt.f1));
  const dl = page.waitForEvent("download", { timeout: 30000 });
  await page.click("#pg-bPdf");
  try { await page.getByText("Lanjutkan", { exact: true }).click({ timeout: 2000 }); } catch (e) {}
  const d = await dl, name = d.suggestedFilename(), size = fs.statSync(await d.path()).size;
  ok("P8 PDF gabungan terunduh dengan nama berkas benar dan berisi data", /^PAKET LEMBUR PEGAWAI FORM 01-05 NOVEMBER 2026\.pdf$/.test(name) && size > 5000, name + " " + size);
  await page.click("#pg-bDraft"); await page.waitForTimeout(200);
  ok("P9 simpan draft menyimpan semua surat ke riwayat Pegawai", await page.evaluate(() => JSON.parse(localStorage.getItem("pegawai.v1")).records.length === 2));
  await page.click("#pg-tambah"); await page.waitForTimeout(250);
  ok("P12 tombol Tambah pegawai menambah surat baru; tanggal, lokasi, dan rincian disalin dari surat aktif; nama dikosongkan", await page.evaluate(() => pgBatch.length === 3 && pgCur.nama === "" && pgCur.lokasi === pgBatch[0].lokasi && pgCur.tanggal === pgBatch[0].tanggal && pgCur.uraian === pgBatch[0].uraian));
  ok("P13 pegawai baru langsung muncul di Form 02 setelah dipilih dari daftar", await page.evaluate(() => { const sel = document.querySelector('#pg-form [data-dsel="pg"]'); sel.value = "a"; sel.dispatchEvent(new Event("change", { bubbles: true })); return pgCur.nama === "FULAN SATU" && pgPgs.find(p => p.f === "F02").items.filter(e => e.k === "t" && e.t === "FULAN SATU").length === 2; }));
  ok("P14 kolom mode Driver tidak ikut terisi saat mengisi formulir Pegawai", await page.evaluate(() => [...document.querySelectorAll("#dv-form [data-dk]")].every(e => e.value === "" || e.value === (typeof dvCur !== "undefined" ? dvCur[e.dataset.dk] ?? "" : ""))));
  /* Eviden Lembur: unggah foto -> halaman A4 berjudul EVIDEN LEMBUR */
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADq0X2ZrNAAAAAElFTkSuQmCC", "base64");
  ok("P15 tanpa foto tidak ada halaman Eviden", await page.evaluate(() => !pgPgs.some(p => p.f === "EV")));
  await page.setInputFiles("#pg-fotoIn", [{ name: "a.png", mimeType: "image/png", buffer: png }, { name: "b.png", mimeType: "image/png", buffer: png }]);
  await page.waitForTimeout(700);
  ok("P16 foto yang diunggah masuk halaman Eviden Lembur (judul di tengah) di paling akhir (setelah Kendali Anggaran)", await page.evaluate(() => { const ev = pgPgs.filter(p => p.f === "EV"); if (ev.length !== 1) return false; const t = ev[0].items.find(e => e.k === "t" && e.t === "EVIDEN LEMBUR"); const im = ev[0].items.filter(e => e.k === "i"); const o = pgPgs.map(p => p.f).join(" "); return !!t && t.a === "c" && im.length === 2 && /F08 EV$/.test(o); }));
  ok("P17 lebih dari 6 foto menjadi halaman Eviden berikutnya", await page.evaluate(() => { pgCur.foto = Array.from({ length: 8 }, (_, i) => ({ src: pgCur.foto[0].src, w: 10, h: 10 })); pgUpdate(); const n = pgPgs.filter(p => p.f === "EV").length; pgCur.foto = pgCur.foto.slice(0, 2); pgUpdate(); return n === 2; }));
  ok("P18 ukuran foto bisa diatur per foto (skala 20-100%) dan tampil lebih kecil di halaman", await page.evaluate(() => { pgCur.foto = [{ src: pgCur.foto[0].src, w: 100, h: 100 }, { src: pgCur.foto[0].src, w: 100, h: 100 }]; pgUpdate(); const w0 = () => pgPgs.find(p => p.f === "EV").items.filter(e => e.k === "i").map(e => e.w); const a = w0()[1]; pgCur.foto[1].skala = 50; pgUpdate(); const b = w0()[1]; pgCur.foto[1].skala = 5; pgUpdate(); const c = w0()[1]; delete pgCur.foto[1].skala; pgUpdate(); return Math.abs(b - a / 2) < 0.01 && Math.abs(c - a * .2) < 0.01; }));
  ok("P19 foto per halaman: pilihan 2 foto membagi 5 foto menjadi 3 halaman", await page.evaluate(() => { const f = pgCur.foto[0]; pgCur.foto = Array.from({ length: 5 }, () => ({ ...f })); pgCur.fotoPerHal = "2"; pgUpdate(); const n = pgPgs.filter(p => p.f === "EV").length; pgCur.fotoPerHal = "auto"; pgCur.foto = pgCur.foto.slice(0, 2); pgUpdate(); return n === 3; }));
  await page.evaluate(() => pgFotoRender());
  await page.click('#pg-fotoGrid [data-fi="1"]'); await page.fill("#pg-fotoPct", "60"); await page.waitForTimeout(150);
  ok("P20 klik miniatur memilih foto, kolom ukuran mengubah skala dan lencana persen tampil", await page.evaluate(() => pgCur.foto[1].skala === 60 && !document.querySelector('#pg-fotoGrid [data-fi="1"] .szb').hidden));
  await page.click('[data-fmv="-1"]'); await page.waitForTimeout(150);
  ok("P21 tombol geser memindahkan urutan foto bersama skalanya", await page.evaluate(() => pgCur.foto[0].skala === 60 && !pgCur.foto[1].skala));
  /* foto diedit langsung di surat */
  await page.evaluate(() => { pgCur.foto = pgCur.foto.slice(0, 2); pgCur.foto.forEach(f => { delete f.skala; delete f.dx; delete f.dy; }); pgFotoSel = null; pgUpdate(); });
  const fo = page.locator("#pg-sheets .pg-fo").first(); await fo.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  let bx = await fo.boundingBox(); const cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 50, cy + 30, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(150);
  ok("P22 seret foto di surat menggeser posisi, memilih foto, dan layout/PDF mengikuti", await page.evaluate(() => { const f = pgCur.foto[0]; pgUpdate(); const it = pgPgs.find(p => p.f === "EV").items.find(e => e.k === "i" && e.fi === 0), el = document.querySelector('#pg-sheets .pg-fo[data-fi="0"]'); return f.dx > 10 && f.dy > 5 && pgFotoSel === 0 && Math.abs(it.x - parseFloat(el.style.left)) < 0.1 && Math.abs(it.y - parseFloat(el.style.top)) < 0.1; }));
  const h = await page.locator("#pg-sheets .pg-fo.sel .fh").boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down(); await page.mouse.move(h.x + h.width / 2 - 60, h.y + h.height / 2 - 40, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(150);
  ok("P23 tarik kotak biru mengubah ukuran foto dan kolom ukuran di panel ikut berubah", await page.evaluate(() => { const f = pgCur.foto[0]; return f.skala > 20 && f.skala < 100 && +document.getElementById("pg-fotoPct").value === f.skala; }));
  bx = await fo.boundingBox(); await page.mouse.move(bx.x + 20, bx.y + 20); const sk0 = await page.evaluate(() => pgCur.foto[0].skala); await page.mouse.wheel(0, -300); await page.waitForTimeout(150);
  ok("P24 roda mouse di atas foto memperbesar ukuran", await page.evaluate(s0 => pgCur.foto[0].skala > s0, sk0));
  await page.keyboard.press("ArrowRight"); const dx1 = await page.evaluate(() => pgCur.foto[0].dx);
  ok("P25 tombol panah menggeser foto terpilih; klik area kosong membatalkan pilihan", await page.evaluate(x => pgCur.foto[0].dx > 0 && x > 0, dx1) && await (async () => { await page.mouse.click(5, 5); return page.evaluate(() => pgFotoSel === null); })());
  ok("P26 bar Keluaran terlipat secara bawaan dan ringkasannya menampilkan jumlah form", await page.evaluate(() => document.getElementById("pg-fsBody").hidden && /Semua form|dari/.test(document.querySelector("#pg-fsel .fs-sum").textContent) && document.getElementById("pg-fsHead").getAttribute("aria-expanded") === "false"));
  await page.click("#pg-fsHead"); await page.waitForTimeout(100);
  ok("P27 klik kepala Keluaran membuka dropdown (chip form, Susunan, PDF) dan keadaan tersimpan", await page.evaluate(() => !document.getElementById("pg-fsBody").hidden && !!document.getElementById("pg-urut") && !!document.querySelector('#pg-fsel .chip input[data-f="F03"]') && JSON.parse(localStorage.getItem("pegawai.v1")).fsOpen === true));
  await page.click('#pg-fsel .chip:has(input[data-f="F02"])'); await page.waitForTimeout(100);
  ok("P28 mematikan chip Form 02 menghapus halamannya dan memperbarui ringkasan", await page.evaluate(() => !pgPgs.some(p => p.f === "F02") && /dari/.test(document.querySelector("#pg-fsel .fs-sum").textContent)));
  await page.click('#pg-fsel .chip:has(input[data-f="F02"])'); await page.click("#pg-fsHead"); await page.waitForTimeout(100);
  ok("P29 klik kepala lagi melipat dropdown", await page.evaluate(() => document.getElementById("pg-fsBody").hidden && pgPgs.some(p => p.f === "F02")));
  await page.click("#lsH"); await page.waitForTimeout(300);
  ok("P10 pindah ke Lembur HAR: panel HAR tampil, panel Pegawai tersembunyi", await page.evaluate(() => !document.body.classList.contains("mode-pg") && !document.getElementById("left").hidden && document.getElementById("pg-left").hidden));
  ok("P11 tidak ada error JS selama seluruh uji Lembur Pegawai", errs.length === 0, errs.join("|"));
  await browser.close();
  console.log(`\nRingkasan: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error("UJI BERHENTI:", e); process.exit(2); });
