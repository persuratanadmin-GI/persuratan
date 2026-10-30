/* Uji logika impor massal stempel/TTD (tanpa browser). Jalankan: node tests/rs-massal.test.js */
const vm = require("vm"), fs = require("fs"), path = require("path");
const ctx = { window: {}, document: { getElementById() { return null; } }, console };
vm.createContext(ctx);
const baca = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
vm.runInContext(baca("logic.js") + baca("sppd-logic.js") + baca("rs-massal.js") + ";this.X={rsMassalPlan}", ctx);
const X = ctx.X;
let gagal = 0;
const cek = (n, ok, info = "") => { console.log((ok ? "LULUS  " : "GAGAL  ") + n + (ok ? "" : " " + info)); if (!ok) gagal++; };
const F = p => ({ path: "Stempel_dan_TTD/" + p, name: p.split("/").pop() });
const lok = [{ id: "a", nama: "GI Pangkep", kunci: "pangkep, pangkajene" }, { id: "b", nama: "GI Barru", kunci: "barru" }, { id: "c", nama: "GI Bakaru", kunci: "bakaru" }, { id: "d", nama: "GI Polmas", kunci: "polmas, polewali, polman" }, { id: "e", nama: "GI Palopo", kunci: "palopo" }, { id: "f", nama: "ULTG Maros", kunci: "maros" }, { id: "g", nama: "GI Bantaeng", kunci: "bantaeng, bantaneg" }];
const files = ["Bakaru/Bakaru_Stempel_ULTG_Parepare.png", "Bakaru/Bakaru_TTD_ULTG_Parepare.png", "Bakaru/Bakaru_hal2_Stempel_TTD_kanan.png", "Bakaru/Bakaru_hal1_Stempel_TTD_kanan.png", "Bakaru/Bakaru_hal1_Stempel_TTD_kiri.png",
  "Palopo/Palopo_Stempel.png", "Palopo/Palopo_TTD.png", "Pandaan/Pandaan_Stempel_UPDL.png", "Pandaan/Pandaan_TTD.png", "Pandaan/Pandaan_Stempel_ULTG_Parepare.png", "Pandaan_UPDL/Pandaan_UPDL_TTD_ULTG_Parepare.png",
  "Pangkep/Pangkep_Stempel_kanan.png", "Pangkep/Pangkep_Stempel_kiri.png", "Semarang/Semarang_TTD_kiri.png", "Makassar_UIP3B_Sulawesi/Makassar_UIP3B_Sulawesi_Stempel_TTD_kiri.png", "Polmas/Polmas_Stempel_ULTG_Parepare.png", "Makassar_UPT/Makassar_UPT_TTD_ULTG_Parepare.png", "catatan.txt"].map(F);
const P = X.rsMassalPlan(files, lok), G = n => P.grup.find(g => g.folder === n);
cek("folder yang hanya berisi berkas ULTG_Parepare tidak dianggap lokasi", !G("Polmas") && !G("Makassar_UPT") && !G("Pandaan_UPDL"));
cek("lokasi yang sudah ada dikenali lewat nama folder", G("Bakaru").lokId === "c" && G("Palopo").lokId === "e" && G("Pangkep").lokId === "a" && !G("Palopo").baru);
cek("Stempel_TTD menyatu: dipilih varian kiri, halaman terkecil", G("Bakaru").stempel.name === "Bakaru_hal1_Stempel_TTD_kiri.png" && G("Bakaru").menyatu && !G("Bakaru").ttd);
cek("stempel dan TTD terpisah masing-masing terpasang", G("Palopo").stempel.name === "Palopo_Stempel.png" && G("Palopo").ttd.name === "Palopo_TTD.png" && !G("Palopo").menyatu);
cek("Pandaan_Stempel_UPDL = stempel lokasi (bukan asal), lokasi baru", G("Pandaan").stempel.name === "Pandaan_Stempel_UPDL.png" && G("Pandaan").ttd.name === "Pandaan_TTD.png" && G("Pandaan").baru);
cek("hanya TTD (Semarang): tetap lokasi baru tanpa stempel", G("Semarang").stempel === null && !!G("Semarang").ttd && G("Semarang").baru);
cek("lokasi baru: nama dan kata kunci dari nama folder", G("Makassar_UIP3B_Sulawesi").nama === "Makassar UIP3B Sulawesi" && G("Makassar_UIP3B_Sulawesi").kunci === "makassar, uip3b, sulawesi");
cek("pejabat asal: stempel dan TTD dari berkas ULTG_Parepare", /ULTG_Parepare/.test(P.asal.stempel.name) && /TTD_ULTG_Parepare/.test(P.asal.ttd.name));
cek("berkas bukan gambar diabaikan", P.abaikan.includes("catatan.txt") && P.grup.length === 6, P.grup.map(g => g.folder).join(","));
cek("tanpa berkas -> rencana kosong", (r => r.grup.length === 0 && !r.asal.stempel && !r.asal.ttd)(X.rsMassalPlan([], lok)));
cek("tanpa folder (hanya nama berkas) tetap terbaca", (r => r.grup.length === 1 && r.grup[0].nama === "GI Barru")(X.rsMassalPlan([{ path: "Barru_Stempel.png", name: "Barru_Stempel.png" }], lok)));
process.exit(gagal ? 1 : 0);
