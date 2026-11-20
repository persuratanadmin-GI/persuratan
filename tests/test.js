/* Uji otomatis tanpa browser sungguhan (jsdom). Jalankan: npm install && npm test */
const { JSDOM } = require("jsdom");
const path = require("path");

const pesan3 = `Nama: Budi Santoso
ID Operator: 123456789XYZ
Uraian Pekerjaan: Pemantauan CUI Parepare
Unit Kerja: ULTG Pare-Pare
Tanggal Lembur: 07 Agustus 2026
Jam lembur: 16:30-21:00
TL: Hasan

ID Operator: 123456789xyz
Uraian Pekerjaan: Pemantauan trafo GI Barru
Tanggal Lembur: 09 Agustus 2026
Jam lembur: 22:00-02:00
TL: Rahmat Hidayat

ID Operator: 123456789XYZ
Uraian Pekerjaan: Pergantian relay GI Ballusu
Tanggal Lembur: 12/08/2026
Jam lembur: 16:30-18:00
TL: Rahmat Hidayat`;

let gagal = 0;
const cek = (nama, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + nama + (ok ? "" : " " + info)); if (!ok) gagal++; };

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, "..", "index.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    beforeParse(w) { w.confirm = () => false; w.alert = () => {}; }
  });
  const w = dom.window, d = w.document;
  await new Promise(r => w.addEventListener("load", r));
  await new Promise(r => setTimeout(r, 300));

  // 1. uji logika bawaan (parser, durasi, tanggal): dulu tombol "Uji parser" di aplikasi, kini dijalankan dari tests/fixtures
  const baris = w.eval("(function(){" + require("fs").readFileSync(path.join(__dirname, "fixtures", "uji-lembur.js"), "utf8") + "})()");
  cek("uji logika lembur (parser, durasi, tanggal)", baris.filter(x => x.startsWith("GAGAL")).length === 0 && baris.filter(x => x.startsWith("LULUS")).length >= 20, baris.filter(x => x.startsWith("GAGAL")).join(";"));

  // 2. satu pesan -> tiga surat, nama mengikuti NIP, jam lewat tengah malam
  const hasil = w.eval(`parseMulti(${JSON.stringify(pesan3)})`);
  cek("3 surat terdeteksi", hasil.length === 3);
  cek("nama mengikuti ID/NIP yang sama (huruf besar/kecil diabaikan)", hasil[1].f.nama === "Budi Santoso" && hasil[2].f.nama === "Budi Santoso");
  cek("tanggal nama bulan & dd/mm/yyyy", hasil[0].f.tanggal === "2026-08-07" && hasil[2].f.tanggal === "2026-08-12");
  cek("rentang jam 'Jam lembur'", hasil[0].f.mulai === "16:30" && hasil[0].f.selesai === "21:00");
  cek("alias TL = pemberi perintah", hasil[0].f.pemberi === "Hasan");
  cek("durasi lewat tengah malam = 4 jam", w.eval(`calcDur("22:00","02:00").min`) === 240);
  cek("durasi 16:30-21:00 = 4.5 Jam", w.eval(`durLabel(calcDur("16:30","21:00").min)`) === "4.5 Jam");

  // 2b. pesan tanpa tanda ":" tetap terbaca
  const tanpa = w.eval(`parseWA(${JSON.stringify("Nama Budi Santoso\nNIP 123456789XYZ\nPekerjaan: Pemantauan CUI GI Ballusu\nTgl 10 Oktober 2026\nJam 16:30-21:30\nTL: Rahmat Hidayat")})`);
  cek("tanpa ':' : nama & NIP", tanpa.f.nama === "Budi Santoso" && tanpa.f.nip === "123456789XYZ");
  cek("tanpa ':' : 'Tgl' dan 'Jam 16:30-21:30'", tanpa.f.tanggal === "2026-10-10" && tanpa.f.mulai === "16:30" && tanpa.f.selesai === "21:30");
  cek("tanpa ':' : semua kolom wajib terisi tanpa tanda periksa", ["nama","nip","tanggal","mulai","selesai","uraian","pemberi"].every(k => tanpa.st[k].s === "ok"));

  // 2c. nama berkas PDF otomatis
  cek("nama PDF satu surat: LEMBUR NAMA DD BULAN YYYY", w.eval(`namaBerkasPdf([{name:"Budi Santoso",tanggal:"2026-08-07"}])`) === "LEMBUR BUDI SANTOSO 07 AGUSTUS 2026.pdf");
  cek("nama PDF daftar: DAFTAR FILE LEMBUR NAMA", w.eval(`namaBerkasPdf([{name:"Budi Santoso"},{name:"Budi Santoso"},{name:"Budi Santoso"}])`) === "DAFTAR FILE LEMBUR BUDI SANTOSO.pdf");
  cek("nama PDF daftar beberapa orang", w.eval(`namaBerkasPdf([{name:"Andi"},{name:"Budi"}])`) === "DAFTAR FILE LEMBUR ANDI & BUDI.pdf");

  // 3. buat surat + nomor otomatis berurutan
  d.getElementById("waText").value = pesan3; d.getElementById("parse").click(); d.getElementById("applyMulti").click();
  await new Promise(r => setTimeout(r, 50));
  cek("3 surat tampil di pratinjau", d.querySelectorAll("#sheets .lw").length === 3);
  const nomor = w.eval(`batch.map(c=>c.spk+"|"+c.lemburNo)`);
  cek("nomor surat: urut '....', pola dan bulan tetap", nomor.every(n => n === "..../ULTGPAREPARE/VIII/2026|..../VIII/PLNND/2026"), nomor.join(" "));
  cek("fmtNo contoh ..../ULTGPAREPARE/X/2026", w.eval(`fmtNo("{n}/ULTGPAREPARE/{rom}/{yyyy}",7,"2026-10-05")`) === "..../ULTGPAREPARE/X/2026");
  w.eval(`DB.settings.nomorKosong=false`);
  cek("nomor urut angka (bila opsi '....' dimatikan) tetap 001", w.eval(`fmtNo("{n}/X",1,"2026-10-05")`) === "001/X");
  w.eval(`DB.settings.nomorKosong=true`);
  cek("kolom wajib kosong terdeteksi", w.eval(`missing(blank()).length`) >= 6);

  // 4. tata letak A4
  const css = require("fs").readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");
  cek("ukuran lembar 210x297 mm & @page A4", /\.sheet\{width:210mm;height:297mm/.test(css) && /@page\{size:A4;margin:0\}/.test(css));

  // logo PLN Nusa Daya yang bisa diganti (unggah foto)
  const bawaan = w.eval("logoNdInfo({})");
  cek("logo ND bawaan: posisi dan ukuran asli tidak berubah", !bawaan.custom && bawaan.x === 48.2 && bawaan.y === 412.4 && bawaan.w === 57.5 && bawaan.h === 20.8);
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const lebar = w.eval(`logoNdInfo({logoNd:"${png}",logoNdAr:4,logoNdSkala:100})`), tinggi = w.eval(`logoNdInfo({logoNd:"${png}",logoNdAr:0.5,logoNdSkala:100})`);
  cek("logo ND kustom: muat di kotak asal dan proporsi terjaga", lebar.custom && Math.abs(lebar.w / lebar.h - 4) < 1e-6 && lebar.w <= 57.5 + 1e-6 && tinggi.h <= 20.8 + 1e-6 && Math.abs(tinggi.w / tinggi.h - 0.5) < 1e-6);
  cek("logo ND kustom: skala dibatasi 50-200% dan lebar maks 110 pt", w.eval(`logoNdInfo({logoNd:"${png}",logoNdAr:1,logoNdSkala:999})`).h <= 41.6 + 1e-6 && w.eval(`logoNdInfo({logoNd:"${png}",logoNdAr:9,logoNdSkala:200})`).w <= 110 + 1e-6);
  cek("logo ND: data tidak valid kembali ke logo bawaan", !w.eval('logoNdInfo({logoNd:"http://x/y.png",logoNdAr:2})').custom && !w.eval(`logoNdInfo({logoNd:"${png}",logoNdAr:0})`).custom);

  // efek listrik: elemen dekoratif ada, tombol petir bisa mematikan/menyalakan, tidak menyentuh lembar surat
  const tb = d.querySelector(".fx-zap"), sebelum = d.documentElement.classList.contains("zap-off");
  tb.click(); const sesudah = d.documentElement.classList.contains("zap-off"); tb.click();
  cek("efek listrik: elemen dekoratif ada dan tombol petir bergantian aktif/mati", !!d.querySelector(".zap-wave") && !!d.querySelector(".zap-line") && sebelum !== sesudah && d.documentElement.classList.contains("zap-off") === sebelum);
  cek("efek listrik: tidak ada elemen efek di dalam lembar surat", !d.querySelector(".pg .zap-wave, .pg .zap-line, .sheet .zap-line"));

  console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji lulus");
  process.exit(gagal ? 1 : 0);
})();
