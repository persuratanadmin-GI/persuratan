"use strict";
/* Paraf SPPD - tab Paraf: daftarkan gambar paraf per nama.
   Hanya dipakai surat SPPD. Disimpan di SPDB.paraf (localStorage "sppd.v1"), terpisah dari tanda tangan (DB.sigs)
   dan tidak pernah dibaca oleh surat lembur. Pencarian paraf: spParafLookup() di sppd-logic.js.
   Memakai readSig() dari manage.js (memperkecil gambar dan menghapus latar putih, sama seperti tanda tangan). */
let spEditPa=null,spPaImg="";
function spRenderPa(){const l=[...SPDB.paraf].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 $("sp-paList").innerHTML=l.length?`<table class="t">${l.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td><img src="${x.sig}" style="height:30px;max-width:90px" alt=""></td><td style="white-space:nowrap"><button class="g" data-e="${x.id}">Edit</button> <button class="d" data-x="${x.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada paraf terdaftar.</p>'}
function spPaReset(){spEditPa=null;spPaImg="";$("sp-pan").value="";$("sp-paf").value="";$("sp-pas").removeAttribute("src");$("sp-paT").textContent="Tambah paraf"}
$("sp-paReset").onclick=spPaReset;
$("sp-paf").onchange=e=>{readSig(e.target.files[0],d=>{spPaImg=d;$("sp-pas").src=d})};
$("sp-paList").onclick=async e=>{const d=e.target.dataset,x=SPDB.paraf.find(p=>p.id===(d.e||d.x));if(!x)return;
 if(d.x){if(await ask("Hapus paraf "+x.name+"? Surat SPPD yang sudah tersimpan tidak berubah, tetapi parafnya tidak akan tampil lagi."))
  {SPDB.paraf=SPDB.paraf.filter(p=>p!==x);if(spEditPa===x.id)spPaReset();spSave();spRenderPa();spUpdate()}return}
 spEditPa=x.id;spPaImg=x.sig||"";$("sp-pan").value=x.name;$("sp-pas").src=spPaImg;$("sp-paT").textContent="Edit paraf"};
$("sp-paSave").onclick=()=>{const n=$("sp-pan").value.trim();if(!n){alert("Nama wajib diisi.");return}if(!spPaImg){alert("Pilih gambar paraf.");return}
 const d={name:n,sig:spPaImg},ex=SPDB.paraf.find(p=>p.id===spEditPa)||SPDB.paraf.find(p=>spNorm(p.name)===spNorm(n));
 if(ex)Object.assign(ex,d);else SPDB.paraf.push({id:uid(),...d});
 spSave();spPaReset();spRenderPa();spUpdate()};
