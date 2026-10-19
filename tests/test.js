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

  // 1. uji bawaan aplikasi (parser, durasi, tanggal)
  d.querySelector("[data-t=se]").click(); d.getElementById("selfTest").click();
  const baris = d.getElementById("testOut").textContent.split("\n");
  cek("uji bawaan aplikasi", baris.filter(x => x.startsWith("GAGAL")).length === 0 && baris.filter(x => x.startsWith("LULUS")).length >= 20, baris.filter(x => x.startsWith("GAGAL")).join(";"));
  d.querySelector("[data-t=in]").click();

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
  cek("nomor surat berurutan 001-003", /^001\//.test(nomor[0]) && /^002\//.test(nomor[1]) && /^003\//.test(nomor[2]), nomor.join(" "));
  cek("kolom wajib kosong terdeteksi", w.eval(`missing(blank()).length`) >= 6);

  // 4. tata letak A4
  const css = require("fs").readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");
  cek("ukuran lembar 210x297 mm & @page A4", /\.sheet\{width:210mm;height:297mm/.test(css) && /@page\{size:A4;margin:0\}/.test(css));

  console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji lulus");
  process.exit(gagal ? 1 : 0);
})();
