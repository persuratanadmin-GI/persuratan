"use strict";
/* Personel, tanda tangan per nama, riwayat, pengaturan, cadangan, uji bawaan. */
/* ===== Personel ===== */
let editP=null,pSig="";
function renderPeople(){const q=$("peQ").value.toLowerCase();const l=DB.people.filter(p=>(p.name+p.nip+p.jabatan).toLowerCase().includes(q));
 $("peList").innerHTML=l.length?`<table class="t">${l.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="hint">${esc(p.nip)} · ${esc(p.jabatan)}${p.aktif===false?" · nonaktif":""}</div></td><td>${p.sig?"✔ ttd":"tanpa ttd"}</td><td><button class="g" data-e="${p.id}">Edit</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada personel. Tambahkan di bawah.</p>'}
$("peQ").oninput=renderPeople;
$("peList").onclick=e=>{const p=DB.people.find(x=>x.id===e.target.dataset.e);if(!p)return;editP=p.id;pSig=p.sig||"";$("pn").value=p.name;$("pi").value=p.nip;$("pj").value=p.jabatan;$("pu").value=p.unit;$("pa").checked=p.aktif!==false;$("ps").src=pSig;$("peT").textContent="Edit personel"};
function peReset(){editP=null;pSig="";["pn","pi","pj","pu"].forEach(i=>$(i).value="");$("pf").value="";$("ps").removeAttribute("src");$("pa").checked=true;$("peT").textContent="Tambah personel"}
$("peReset").onclick=peReset;
$("pf").onchange=e=>{const f=e.target.files[0];if(!f)return;if(!/^image\/(png|jpe?g|webp)$/.test(f.type)){alert("File harus PNG, JPG, atau WEBP.");e.target.value="";return}if(f.size>1048576){alert("Ukuran maksimum 1 MB.");e.target.value="";return}
 const img=new Image,u=URL.createObjectURL(f);img.onload=()=>{const sc=Math.min(1,400/img.width),c=document.createElement("canvas");c.width=img.width*sc;c.height=img.height*sc;c.getContext("2d").drawImage(img,0,0,c.width,c.height);stripBg(c);pSig=c.toDataURL("image/png");$("ps").src=pSig;URL.revokeObjectURL(u)};img.onerror=()=>alert("Gambar tidak dapat dibaca.");img.src=u};
$("peSave").onclick=()=>{const n=$("pn").value.trim();if(!n){alert("Nama wajib diisi.");return}
 const d={name:n,nip:$("pi").value.trim(),jabatan:$("pj").value.trim(),unit:$("pu").value.trim(),sig:pSig,aktif:$("pa").checked};
 if(editP)Object.assign(DB.people.find(x=>x.id===editP),d);else DB.people.push({id:uid(),...d});
 save();peReset();renderPeople();buildForm()}; /* catatan lama memakai salinan (snapshot), tidak berubah */
/* ===== Tanda tangan (per nama) ===== */
let editS=null,sSig="";
/* Latar putih/abu muda pada gambar tanda tangan dibuat transparan (alpha asli dihormati). */
function stripBg(c){const x=c.getContext("2d"),d=x.getImageData(0,0,c.width,c.height),p=d.data;for(let i=0;i<p.length;i+=4){const m=Math.min(p[i],p[i+1],p[i+2]);p[i+3]=Math.round(p[i+3]*(m>=235?0:m<=140?1:(235-m)/95))}x.putImageData(d,0,0)}
function readSig(f,cb){if(!f)return;if(!/^image\/(png|jpe?g|webp)$/.test(f.type)){alert("File harus PNG, JPG, atau WEBP.");return}if(f.size>1048576){alert("Ukuran maksimum 1 MB.");return}const img=new Image,u=URL.createObjectURL(f);img.onload=()=>{const sc=Math.min(1,400/img.width),c=document.createElement("canvas");c.width=img.width*sc;c.height=img.height*sc;c.getContext("2d").drawImage(img,0,0,c.width,c.height);stripBg(c);cb(c.toDataURL("image/png"));URL.revokeObjectURL(u)};img.onerror=()=>alert("Gambar tidak dapat dibaca.");img.src=u}
function renderSigs(){$("ttList").innerHTML=DB.sigs.length?`<table class="t">${DB.sigs.map(x=>`<tr><td><b>${esc(x.name)}</b><div class="hint">${esc(x.jabatan||"")}</div></td><td><img src="${x.sig}" style="height:30px;max-width:90px" alt=""></td><td style="white-space:nowrap"><button class="g" data-e="${x.id}">Edit</button> <button class="d" data-x="${x.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada tanda tangan terdaftar.</p>'}
function ttReset(){editS=null;sSig="";$("tn").value="";$("tj").value="";$("tf").value="";$("ts").removeAttribute("src");$("ttT").textContent="Tambah tanda tangan"}
$("ttReset").onclick=ttReset;
$("tf").onchange=e=>{readSig(e.target.files[0],d=>{sSig=d;$("ts").src=d});};
$("ttList").onclick=async e=>{const d=e.target.dataset,x=DB.sigs.find(s=>s.id===(d.e||d.x));if(!x)return;if(d.x){if(await ask("Hapus tanda tangan ini? Surat yang sudah tersimpan tidak berubah.")){DB.sigs=DB.sigs.filter(s=>s!==x);save();renderSigs();buildForm()}return}editS=x.id;sSig=x.sig||"";$("tn").value=x.name;$("tj").value=x.jabatan||"";$("ts").src=sSig;$("ttT").textContent="Edit tanda tangan"};
$("ttSave").onclick=()=>{const n=$("tn").value.trim();if(!n){alert("Nama wajib diisi.");return}if(!sSig){alert("Pilih gambar tanda tangan.");return}const d={name:n,jabatan:$("tj").value.trim(),sig:sSig};const ex=DB.sigs.find(s=>s.id===editS)||DB.sigs.find(s=>norm(s.name)===norm(n));if(ex)Object.assign(ex,d);else DB.sigs.push({id:uid(),...d});save();ttReset();renderSigs();autoAll();buildForm();update()};
/* ===== Riwayat ===== */
function renderRiwayat(){const q=$("rQ").value.toLowerCase(),a=$("rA").value,b=$("rB").value;
 const l=DB.records.filter(r=>(r.name+r.nip+r.spk+r.lemburNo).toLowerCase().includes(q)&&(!a||r.tanggal>=a)&&(!b||r.tanggal<=b)).sort((x,y)=>(y.tanggal||"").localeCompare(x.tanggal||""));
 riwayatShown=l;$("rList").innerHTML=l.length?`<table class="t">${l.map(r=>`<tr><td><b>${esc(r.name||"(tanpa nama)")}</b><div class="hint">${esc(fmtDate(r.tanggal))} · ${esc(r.mulai)}-${esc(r.selesai)} · ${esc(r.lemburNo)}</div></td><td><span class="bd ${r.status==="selesai"?"ok":"warn"}">${r.status}</span></td><td style="white-space:nowrap"><button class="g" data-o="${r.id}">Buka</button> <button class="g" data-c="${r.id}">Duplikat</button> <button class="d" data-x="${r.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Tidak ada catatan.</p>'}
["rQ","rA","rB"].forEach(i=>$(i).oninput=renderRiwayat);
$("rList").onclick=async e=>{const t=e.target.dataset,r=DB.records.find(x=>x.id===(t.o||t.c||t.x));if(!r)return;
 if(t.x){if(await ask("Hapus catatan ini secara permanen?")){DB.records=DB.records.filter(x=>x!==r);save();renderRiwayat()}return}
 cur=JSON.parse(JSON.stringify(r));cur.flags={};
 if(t.c){cur.id=null;cur.status="draft";cur.spk="";cur.lemburNo="";cur.tanggal="";resetNo()}
 buildForm();update();showTab("in")};
/* ===== Pengaturan, cadangan, uji ===== */
const SF=[["ptPln","PT (blok atas)"],["unitPln","Unit (blok atas)"],["almPln","Alamat (blok atas)"],["ptNd","PT (blok bawah)"],["unitNd","Unit (blok bawah)"],["almNd","Alamat (blok bawah)"],["kepada","Kepada Yth / jabatan koordinator"],["koorName","Nama koordinator default (otomatis terisi)"],["jabPers","Jabatan personel default"],["jabPemberi","Jabatan pemberi perintah default"],["kota","Kota tanda tangan"],["zona","Zona waktu (WITA)"],["lokasi","Lokasi default"],["polaSpk","Pola nomor SPK ({n} {rom} {mm} {yyyy})"],["polaLem","Pola nomor Surat Lembur"],["seqSpk","Nomor urut terakhir SPK"],["seqLem","Nomor urut terakhir Lembur"],["pad","Jumlah digit nomor urut"]];
function buildSettings(){$("seForm").innerHTML=SF.map(([k,l])=>`<label>${l}</label><input data-s="${k}" value="${esc(DB.settings[k])}">`).join("")}
$("seSave").onclick=()=>{document.querySelectorAll("[data-s]").forEach(el=>{const k=el.dataset.s;DB.settings[k]=["seqSpk","seqLem","pad"].includes(k)?Math.max(0,parseInt(el.value)||0):el.value});save();update();alert("Pengaturan tersimpan.")};
$("exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(DB)],{type:"application/json"}));a.download="cadangan-lembur-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("imp").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader;r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.records)||!Array.isArray(d.people))throw 0;if(!await ask("Impor akan MENGGANTI seluruh data saat ini. Lanjutkan?"))return;DB={...DEF,...d,settings:{...DEF.settings,...d.settings}};save();buildForm();update();alert("Impor berhasil.")}catch(x){alert("File cadangan tidak valid.")}};r.readAsText(f)};
$("selfTest").onclick=()=>{const T=[];const t=(n,c)=>T.push((c?"LULUS ":"GAGAL ")+n);
 const p=parseWA("nama: Andi\nID Operator: OP001\nTanggal Lembur: 12/10/2026\nJam Mulai: 18.00\nJam Selesai: 22:00\nPekerjaan: Pemeliharaan\nlanjutan baris\nPemberi Perintah: Supervisor");
 t("parser: nama & NIP",p.f.nama==="Andi"&&p.f.nip==="OP001");t("parser: tanggal ISO",p.f.tanggal==="2026-10-12");t("parser: jam titik",p.f.mulai==="18:00");
 t("parser: uraian multi-baris",p.f.uraian==="Pemeliharaan\nlanjutan baris");t("parser: tanggal ambigu ditandai",p.st.tanggal.s==="warn");
 const q=parseWA("Nama: Budi\nTanggal: 31/02/2026\nJam Mulai: 25:00");t("parser: tanggal tidak valid",q.st.tanggal.s==="error");t("parser: jam tidak valid",q.st.mulai.s==="error");t("parser: hilang ditandai",q.st.nip.s==="missing");
 const u=parseWA("Nama: Budi Santoso\nID Operator: 123456789XYZ\nUraian Pekerjaan: Penanganan kabel optik ADSS rute Parepare–Polmas\nUnit Kerja: ULTG Pare-Pare\nTanggal Lembur: 07 Agustus 2026\nJam lembur: 16:30-21:00\nTL: Rahmat Hidayat");t("urutan acak: tanggal nama bulan",u.f.tanggal==="2026-08-07"&&u.st.tanggal.s==="ok");t("rentang jam 'Jam lembur'",u.f.mulai==="16:30"&&u.f.selesai==="21:00");t("alias TL = pemberi perintah",u.f.pemberi==="Rahmat Hidayat");t("uraian & unit kerja",u.f.uraian.startsWith("Penanganan")&&u.f.unit==="ULTG Pare-Pare");
 const w=parseWA("Nama: Budi\nTanggl Lembur: 07/08/2026\nPekerjaan: x");t("label salah ketik dibaca & ditandai",w.f.tanggal==="2026-08-07"&&w.st.tanggal.s==="warn");
 const mm=parseMulti("Nama: Budi Santoso\nID Operator: 123456789XYZ\nUraian Pekerjaan: A\nTanggal Lembur: 07 Agustus 2026\nJam lembur: 16:30-21:00\nTL: hasan\n\nID Operator: 123456789XYZ\nUraian Pekerjaan: B\nTanggal Lembur: 09 Agustus 2026\nJam lembur: 16:30-18:00\nTL: Rahmat\n\nID Operator: 123456789XYZ\nUraian Pekerjaan: C\nTanggal Lembur: 12 Agustus 2026\nJam lembur: 16:30-18:00\nTL: Rahmat");t("multi: 3 surat",mm.length===3);t("multi: nama diwarisi & ditandai",mm[2].f.nama==="Budi Santoso"&&mm[2].st.nama.s==="ok");t("multi: tanggal & jam per surat",mm[1].f.tanggal==="2026-08-09"&&mm[1].f.selesai==="18:00"&&mm[1].f.pemberi==="Rahmat");
 const z=parseWA("Budi Santoso\n123456789XYZ\n7 Agu 2026\n16.30 s/d 21.00 WITA");t("tanpa label: ditebak & ditandai",z.f.tanggal==="2026-08-07"&&z.f.mulai==="16:30"&&z.st.mulai.s==="warn"&&z.f.nip==="123456789XYZ");
 t("durasi 16:30-21:00 = 4.5 Jam",durLabel(calcDur("16:30","21:00").min)==="4.5 Jam");const m=calcDur("22:00","02:00");t("durasi lewat tengah malam = 4 jam",m.min===240&&m.over);
 t("parseDate nama bulan",parseDate("Jumat, 07 Agustus 2026").iso==="2026-08-07");T.push("Catatan: uji tata letak A4 dan cetak harus dilakukan manual dengan Cetak/PDF.");$("testOut").textContent=T.join("\n")};
