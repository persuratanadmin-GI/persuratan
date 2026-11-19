/* Uji logika SPPD dan Lembur Driver (parser, rute, tanggal, tata letak). Dulu berupa tombol "Uji parser SPPD/driver" di aplikasi;
   pernyataan ujinya disimpan di tests/fixtures dan dijalankan di sini di dalam halaman aplikasi (jsdom). */
const { JSDOM } = require("jsdom");
const path = require("path"), fs = require("fs");
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

  for (const [berkas, nama, min] of [["uji-sppd.js", "SPPD", 10], ["uji-driver.js", "Lembur Driver", 6]]) {
    const baris = w.eval("(function(){" + fs.readFileSync(path.join(__dirname, "fixtures", berkas), "utf8") + "})()");
    const salah = baris.filter(x => x.startsWith("GAGAL"));
    cek("uji logika " + nama, salah.length === 0 && baris.filter(x => x.startsWith("LULUS")).length >= min, salah.join(";"));
  }
  cek("tombol uji parser sudah dihapus dari semua mode", !d.getElementById("selfTest") && !d.getElementById("sp-selfTest") && !d.getElementById("dv-selfTest"));

  console.log(gagal ? `\n${gagal} uji GAGAL` : "\nSemua uji lulus");
  process.exit(gagal ? 1 : 0);
})();
