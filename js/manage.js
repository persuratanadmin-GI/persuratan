"use strict";
/* Personel, tanda tangan per nama, riwayat, pengaturan, cadangan, uji bawaan. */
/* ===== Personel ===== */
let editP=null,pSig="";
function renderPeople(){const q=$("peQ").value.toLowerCase();const l=DB.people.filter(p=>(p.name+p.nip+p.jabatan).toLowerCase().includes(q));
 const n=DB.people.length,ak=DB.people.filter(p=>p.aktif!==false).length,ts=DB.people.filter(p=>p.sig).length;
 const sum=n?`<div class="fx-stats" aria-label="Ringkasan personel"><span class="fx-chip"><b>${n}</b> personel</span><span class="fx-chip ok"><b>${ak}</b> aktif</span><span class="fx-chip"><b>${ts}</b> bertanda tangan</span>${q&&l.length!==n?`<span class="fx-chip warn"><b>${l.length}</b> cocok</span>`:""}</div>`:"";
 $("peList").innerHTML=sum+(l.length?`<table class="t">${l.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="hint">${esc(p.nip)} · ${esc(p.jabatan)}${p.aktif===false?" · nonaktif":""}</div></td><td>${p.sig?"✔ ttd":"tanpa ttd"}</td><td style="white-space:nowrap"><button class="g" data-e="${p.id}">Edit</button> <button class="d" data-x="${p.id}" title="Hapus personel ini">Hapus</button></td></tr>`).join("")}</table>`:n?'<p class="hint">Tidak ada personel yang cocok dengan pencarian.</p>':'<p class="hint">Belum ada personel. Tambahkan di bawah.</p>')}
$("peQ").oninput=renderPeople;
/* Hapus personel: konfirmasi, animasi keluar, lalu bisa diurungkan. Catatan di Riwayat memakai salinan sehingga tidak ikut berubah. */
async function hapusPersonel(p,btn){
 if(!await ask("Hapus \""+p.name+"\" dari daftar personel?\nSurat yang sudah dibuat dan tersimpan di Riwayat tidak berubah."))return;
 const i=DB.people.indexOf(p);if(i<0)return;
 const row=btn&&btn.closest("tr");if(row)row.classList.add("fx-out");
 setTimeout(()=>{
  const j=DB.people.indexOf(p);if(j<0)return;
  DB.people.splice(j,1);if(editP===p.id)peReset();
  save();renderPeople();buildForm();
  toast("Personel \""+p.name+"\" dihapus.");
  const t=document.getElementById("toast");if(!t)return;
  const u=document.createElement("button");u.type="button";u.className="fx-undo";u.textContent="Urungkan";
  u.onclick=()=>{if(DB.people.includes(p))return;DB.people.splice(Math.min(i,DB.people.length),0,p);save();renderPeople();buildForm();toast("Personel \""+p.name+"\" dikembalikan.")};
  t.appendChild(u);clearTimeout(t._h);t._h=setTimeout(()=>{t.hidden=true},7000)
 },row?240:0)}
$("peList").onclick=e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset,p=DB.people.find(x=>x.id===(d.e||d.x));if(!p)return;
 if(d.x){hapusPersonel(p,b);return}
 editP=p.id;pSig=p.sig||"";$("pn").value=p.name;$("pi").value=p.nip;$("pj").value=p.jabatan;$("pu").value=p.unit;$("pa").checked=p.aktif!==false;$("ps").src=pSig;$("peT").textContent="Edit personel"};
function peReset(){editP=null;pSig="";["pn","pi","pj","pu"].forEach(i=>$(i).value="");$("pf").value="";$("ps").removeAttribute("src");$("pa").checked=true;$("peT").textContent="Tambah personel"}
$("peReset").onclick=peReset;
$("pf").onchange=e=>{const f=e.target.files[0];if(!f)return;if(!/^image\/(png|jpe?g|webp)$/.test(f.type)){alert("File harus PNG, JPG, atau WEBP.");e.target.value="";return}if(f.size>1048576){alert("Ukuran maksimum 1 MB.");e.target.value="";return}
 const img=new Image,u=URL.createObjectURL(f);img.onload=()=>{const sc=Math.min(1,400/img.width),c=document.createElement("canvas");c.width=img.width*sc;c.height=img.height*sc;c.getContext("2d").drawImage(img,0,0,c.width,c.height);stripBg(c);pSig=c.toDataURL("image/png");$("ps").src=pSig;URL.revokeObjectURL(u)};img.onerror=()=>alert("Gambar tidak dapat dibaca.");img.src=u};
$("peSave").onclick=()=>{const n=$("pn").value.trim();if(!n){alert("Nama wajib diisi.");return}
 const d={name:n,nip:$("pi").value.trim(),jabatan:$("pj").value.trim(),unit:$("pu").value.trim(),sig:pSig,aktif:$("pa").checked};
 const ex=editP&&DB.people.find(x=>x.id===editP);if(ex)Object.assign(ex,d);else DB.people.push({id:uid(),...d});
 save();peReset();renderPeople();buildForm();toast(ex?"Perubahan personel tersimpan.":"Personel ditambahkan.")}; /* catatan lama memakai salinan (snapshot), tidak berubah */
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
 riwayatShown=l;$("rList").innerHTML=l.length?`<table class="t">${l.map(r=>`<tr><td><b>${esc(r.name||"(tanpa nama)")}</b><div class="hint">${esc(fmtDate(r.tanggal))} · ${esc(r.mulai)}-${esc(r.selesai)} · ${esc(r.lemburNo)}</div></td><td><span class="bd ${r.status==="selesai"?"ok":"warn"}">${r.status}</span>${r.excelAt?' <span class="bd ok" title="Sudah dicatat di Excel">Excel</span>':""}</td><td style="white-space:nowrap"><button class="g" data-p="${r.id}" title="Unduh PDF surat ini">PDF</button> <button class="g" data-o="${r.id}">Buka</button> <button class="g" data-c="${r.id}">Duplikat</button> <button class="d" data-x="${r.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Tidak ada catatan.</p>'}
["rQ","rA","rB"].forEach(i=>$(i).oninput=renderRiwayat);
$("rList").onclick=async e=>{const t=e.target.dataset,r=DB.records.find(x=>x.id===(t.o||t.c||t.x||t.p));if(!r)return;
 if(t.p){exportPdf([r]);return}
 if(t.x){if(await ask("Hapus catatan ini secara permanen?")){DB.records=DB.records.filter(x=>x!==r);save();renderRiwayat()}return}
 cur=JSON.parse(JSON.stringify(r));cur.flags={};
 if(t.c){cur.id=null;cur.status="draft";cur.spk="";cur.lemburNo="";cur.tanggal="";resetNo()}
 buildForm();update();showTab("in")};
/* ===== Pengaturan, cadangan, uji ===== */
/* [judul bagian, [[kunci, label, lebar penuh?]...]] */
const SG=[["Kop surat",[["ptPln","PT (blok atas)",1],["unitPln","Unit (blok atas)",1],["almPln","Alamat (blok atas)",1],["ptNd","PT (blok bawah)",1],["unitNd","Unit (blok bawah)",1],["almNd","Alamat (blok bawah)",1]]],
 ["Isi surat",[["kepada","Kepada Yth / jabatan koordinator",1],["koorName","Nama koordinator default"],["jabPers","Jabatan personel default"],["jabPemberi","Jabatan pemberi perintah default"],["lokasi","Lokasi default"],["kota","Kota tanda tangan"],["zona","Zona waktu"]]],
 ["Penomoran surat",[["polaSpk","Pola nomor SPK ({n} {rom} {mm} {yyyy})",1],["polaLem","Pola nomor Surat Lembur",1],["seqSpk","Nomor urut terakhir SPK"],["seqLem","Nomor urut terakhir Lembur"],["pad","Jumlah digit nomor urut"],["nomorKosong","Nomor urut ditulis .... (diisi tangan; bulan dan tahun tetap otomatis)",1,"cb"]]],
 ["Excel (daftar lembur)",[["xlJudul","Judul daftar",1],["xlUnit","Unit"],["xlKota","Kota tanda tangan"],["xlLbl1","Jabatan pengesah 1"],["xlNama1","Nama pengesah 1"],["xlLbl2","Jabatan pengesah 2"],["xlNama2","Nama pengesah 2"],["xlLbl3","Jabatan pengesah 3"],["xlNama3","Nama pengesah 3"],["xlLbl4","Jabatan pengesah 4"],["xlNama4","Nama pengesah 4"]]]];
function buildSettings(){$("seForm").innerHTML=SG.map(([judul,f])=>`<h4 class="sec">${judul}</h4>`+f.map(([k,l,penuh,cb])=>cb?`<div class="fld fw"><label><input type="checkbox" data-s="${k}"${DB.settings[k]?" checked":""}> ${l}</label></div>`:`<div class="fld${penuh?" fw":""}"><label>${l}</label><input data-s="${k}" value="${esc(DB.settings[k])}"></div>`).join("")+(judul==="Kop surat"&&typeof logoNdPanel==="function"?logoNdPanel():"")).join("");if(typeof logoNdBind==="function")logoNdBind()}
$("seSave").onclick=()=>{document.querySelectorAll("[data-s]").forEach(el=>{const k=el.dataset.s;DB.settings[k]=el.type==="checkbox"?el.checked:["seqSpk","seqLem","pad"].includes(k)?Math.max(0,parseInt(el.value)||0):el.value});save();update();alert("Pengaturan tersimpan.")};
$("exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(DB)],{type:"application/json"}));a.download="cadangan-lembur-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("imp").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader;r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.records)||!Array.isArray(d.people))throw 0;if(!await ask("Impor akan MENGGANTI seluruh data saat ini. Lanjutkan?"))return;DB={...DEF,...d,settings:{...DEF.settings,...d.settings}};save();buildForm();update();alert("Impor berhasil.")}catch(x){alert("File cadangan tidak valid.")}};r.readAsText(f)};
