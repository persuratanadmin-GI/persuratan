"use strict";
/* Lembur Driver - antarmuka: formulir, input WhatsApp, pratinjau, tanda tangan, PDF, driver, riwayat, pengaturan, Excel.
   Data disimpan terpisah (localStorage "driver.v1"); tanda tangan memakai daftar yang sama dengan Surat Lembur HAR (DB.sigs). */
const DVK="driver.v1";
function dvLoad(){try{const d=JSON.parse(localStorage.getItem(DVK));if(d)return{drivers:d.drivers||[],records:d.records||[],settings:{...DV_DEF,...d.settings}}}catch(e){}return{drivers:[],records:[],settings:{...DV_DEF}}}
let DVDB=dvLoad();
function dvSave(){try{localStorage.setItem(DVK,JSON.stringify(DVDB));$("st").textContent="Driver tersimpan "+new Date().toLocaleTimeString("id-ID")}catch(e){$("st").textContent="Gagal menyimpan: penyimpanan penuh/dinonaktifkan"}}
let dvBatch=[],dvIdx=0,dvCur=null,dvSel=null,dvScale=1,dvDrag=null,dvLast=[];
try{const b=JSON.parse(sessionStorage.getItem("driver.batch"));if(b&&b.batch&&b.batch.length){dvBatch=b.batch;dvIdx=Math.min(b.idx||0,dvBatch.length-1)}}catch(e){}
if(!dvBatch.length)dvBatch=[dvBlank(DVDB.settings)];
dvCur=dvBatch[dvIdx];
const dvPersist=()=>{try{sessionStorage.setItem("driver.batch",JSON.stringify({batch:dvBatch,idx:dvIdx}))}catch(e){}};
const dvSet0=()=>({...DV_DEF,...DVDB.settings});
/* ===== formulir ===== */
const DVREQ=["tanggal","mulai","selesai","tujuan","pemberiName"],DVFULL=["tujuan","driver"];
const DVF=[["#","Waktu dan keperluan"],["tanggal","Hari / tanggal lembur","date"],["mulai","Jam mulai (waktu)","time"],["selesai","Jam selesai","time"],["durManual","Durasi manual (jam)"],["tujuan","Uraian Tugas","area"],
 ["#","Driver (tidak tampil di surat; dipakai untuk Excel dan nama berkas)"],["@dr"],["driver","Nama driver (beberapa driver dipisah koma)"],
 ["#","Pemberi perintah (TL)"],["@pm"],["pemberiName","Nama pemberi perintah"],["pemberiJab","Jabatan pemberi perintah"],
 ["#","Surat"],["tglSurat","Tanggal surat (kosong = sama dengan tanggal lembur)","date"]];
function dvDrOpts(){return'<option value="">- pilih dari daftar driver -</option>'+[...DVDB.drivers].sort((a,b)=>a.nama.localeCompare(b.nama)).map(d=>`<option value="${d.id}">${esc(d.nama)}</option>`).join("")}
function dvBuildForm(){$("dv-form").innerHTML=DVF.map(([k,l,t])=>{
 if(k==="#")return`<h4 class="sec">${l}</h4>`;
 if(k==="@dr")return`<div class="fld fw"><label>Tambahkan dari daftar driver</label><select data-dsel="dr">${dvDrOpts()}</select></div>`;
 if(k==="@pm")return`<div class="fld fw"><label>Pilih dari tanda tangan terdaftar</label><select data-dsel="pm">${sigOpts()}</select></div>`;
 const rq=DVREQ.includes(k),rc=rq?' class="req"':"";const a=k==="tujuan"?`<textarea data-dk="${k}"${rc}></textarea>`:`<input data-dk="${k}" type="${t||"text"}"${rc}>`;
 return`<div class="fld${DVFULL.includes(k)?" fw":""}${rq?" isreq":""}"><label>${l}${rq?' <span class="rq">*</span>':""}</label>${a}</div>`}).join("");dvSync()}
function dvSync(){document.querySelectorAll("[data-dk]").forEach(el=>{const k=el.dataset.dk;el.value=dvCur[k]??"";el.classList.toggle("warn",!!dvCur.flags?.[k]);el.title=dvCur.flags?.[k]||"";el.classList.toggle("need",DVREQ.includes(k)&&!String(el.value).trim())})}
$("dv-form").addEventListener("input",e=>{const k=e.target.dataset.dk;if(!k)return;const v=e.target.value,c=dvCur;
 if(k==="tanggal"&&(!c.tglSurat||c.tglSurat===c.tanggal)){c.tglSurat=v;const t=document.querySelector('[data-dk="tglSurat"]');if(t)t.value=v}
 c[k]=v;e.target.classList.toggle("need",DVREQ.includes(k)&&!String(v).trim());
 if(k==="pemberiName"){const en=sigEntry(v);if(en&&en.jabatan){c.pemberiJab=en.jabatan;const j=document.querySelector('[data-dk="pemberiJab"]');if(j)j.value=en.jabatan}}
 if(c.flags?.[k]){delete c.flags[k];e.target.classList.remove("warn")}dvUpdate()});
$("dv-form").addEventListener("change",e=>{const w=e.target.dataset.dsel;if(!w)return;
 if(w==="dr"){const d=DVDB.drivers.find(x=>x.id===e.target.value);if(!d)return;const n=dvNames(dvCur.driver);if(!n.some(x=>dvNorm(x)===dvNorm(d.nama)))n.push(d.nama);dvCur.driver=n.join(", ");e.target.value=""}
 else{const p=DB.sigs.find(x=>x.id===e.target.value);if(!p)return;dvCur.pemberiName=p.name;dvCur.pemberiJab=p.jabatan||dvSet0().jabPemberi;delete dvCur.flags.pemberiName}
 dvSync();dvUpdate()});
/* ===== pratinjau ===== */
const dvSigImg=n=>n?sigLookup(n):"";
function dvHtml(c){const o=[];for(const e of dvLayout(c,dvSet0())){
 if(e.k==="t"){const al=e.a==="c"?"width:500pt;text-align:center;":e.a==="r"?"width:500pt;text-align:right;":"";const x=e.a==="c"?e.x-250:e.a==="r"?e.x-500:e.x;
  o.push(`<div class="dv-t" style="left:${x.toFixed(2)}pt;top:${e.y.toFixed(2)}pt;font-size:${e.s.toFixed(2)}pt;line-height:${(e.s*1.117).toFixed(2)}pt;${al}${e.b?"font-weight:bold;":""}${e.col?"color:"+e.col+";":""}">${esc(e.t)}</div>`)}
 else if(e.k==="i"){if(e.src)o.push(`<img class="dv-i" src="${e.src}" alt="" style="left:${e.x.toFixed(2)}pt;top:${e.y.toFixed(2)}pt;width:${e.w.toFixed(2)}pt;height:${e.h.toFixed(2)}pt">`)}
 else if(e.k==="s"){const s=e.src||dvSigImg(e.nama);if(!s)continue;const p=(c.sigPos||{})[e.key]||{},bw=e.w||105,bh=e.h||56;
  o.push(`<div class="dv-sig" style="left:${(e.cx-bw/2).toFixed(2)}pt;top:${(e.cy-bh/2).toFixed(2)}pt;width:${bw.toFixed(2)}pt;height:${bh.toFixed(2)}pt"><span class="sgb${dvSel===e.key&&c===dvCur?" sel":""}" data-p="${e.key}" title="Seret: geser · roda mouse: ukuran" style="--s:${p.s||1};transform:translate(${p.x||0}mm,${p.y||0}mm) scale(${p.s||1})"><img src="${s}" alt="ttd" draggable="false" style="${e.ex?`width:${e.w.toFixed(2)}pt;height:${e.h.toFixed(2)}pt;`:""}max-width:${bw.toFixed(2)}pt;max-height:${bh.toFixed(2)}pt"><i class="sgh"></i></span></div>`)}}
 return`<div class="dv-pg">${o.join("")}</div>`}
function dvTitleOf(i){const c=dvBatch[i];return"Surat "+(i+1)+" dari "+dvBatch.length+" · "+(dvLabelDriver([c])||"(driver belum diisi)")+" · "+(c.tanggal?fmtDate(c.tanggal):"(tanggal?)")+(c.excelAt?" · Excel \u2714":"")}
function dvBuildSheets(){$("dv-sheets").innerHTML=dvBatch.map((c,i)=>`<div class="lw${i===dvIdx?" act":""}" data-i="${i}"><div class="lbar"><span class="lt">${esc(dvTitleOf(i))}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${dvHtml(c)}</div></div></div></div>`).join("");
 const bb=$("dv-batchbar");bb.hidden=dvBatch.length<2;bb.innerHTML=`<b>${dvBatch.length} surat</b> ${dvBatch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" ")} <button class="b nv" id="dv-pdfAktif">PDF surat ini</button> <button class="g" id="dv-hapusAktif">Hapus surat ini</button>`;dvFit()}
function dvFit(){const p=$("dv-pane"),w=p.clientWidth-48;if(w<=0)return;const s=Math.min(1,w/794);dvScale=s;document.querySelectorAll("#dv-sheets .shbox").forEach(b=>b.style.transform=`scale(${s})`);document.querySelectorAll("#dv-sheets .shwrap").forEach(b=>{b.style.height=1123*s+"px";b.style.width=794*s+"px"})}
window.addEventListener("resize",()=>{if(!$("dv-pane").hidden)dvFit()});
function dvUpdate(){if(dvCur!==dvBatch[dvIdx]){dvBatch=[dvCur];dvIdx=0}
 if($("dv-sheets").children.length!==dvBatch.length)dvBuildSheets();else{const lw=$("dv-sheets").children[dvIdx];lw.querySelector(".sheet").innerHTML=dvHtml(dvCur);lw.querySelector(".lt").textContent=dvTitleOf(dvIdx)}
 dvPersist();dvButtons();if(dvSel&&!document.querySelector('#dv-sheets .lw.act .sgb[data-p="'+dvSel+'"]'))dvSelect(null);
 const m=dvMissing(dvCur),sn=[],S=dvSet0();if(dvCur.pemberiName&&!dvSigImg(dvCur.pemberiName))sn.push("pemberi perintah");if(S.mgrNama&&!dvSigImg(S.mgrNama))sn.push("manager");if(!dvSet0().paraf)sn.push("paraf (unggah di Pengaturan)");
 $("dv-hint").textContent=[m.length?"Belum lengkap: "+m.join(", "):"",sn.length?"Tanda tangan belum terdaftar: "+sn.join(", ")+" (tab Tanda Tangan)":""].filter(Boolean).join(" · ")}
function dvButtons(){const s=dvBatch.length>1?" ("+dvBatch.length+")":"";[["dv-bDraft","Simpan draft"],["dv-bDone","Tandai selesai"],["dv-bXl","Simpan ke Excel"],["dv-bPdf","Unduh PDF"],["dv-bPrint","Cetak"]].forEach(([id,t])=>{$(id).textContent=t+s})}
function dvActive(i){dvIdx=i;dvCur=dvBatch[i];document.querySelectorAll("#dv-sheets .lw").forEach((e,j)=>e.classList.toggle("act",j===i));dvSelect(null);dvSync();dvUpdate()}
$("dv-batchbar").onclick=async e=>{if(e.target.id==="dv-pdfAktif"){dvPdf([dvCur]);return}
 if(e.target.id==="dv-hapusAktif"&&dvBatch.length>1&&await ask("Hapus surat "+(dvIdx+1)+" dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){dvBatch.splice(dvIdx,1);dvIdx=Math.min(dvIdx,dvBatch.length-1);dvCur=dvBatch[dvIdx];dvBuildForm();dvBuildSheets();dvUpdate();return}
 const g=e.target.dataset.go;if(g!==undefined){dvActive(+g);$("dv-sheets").children[+g].scrollIntoView({block:"nearest"})}};
$("dv-sheets").addEventListener("click",e=>{const lw=e.target.closest(".lw");if(!lw)return;const i=+lw.dataset.i;if(i!==dvIdx)dvActive(i)});
/* tanda tangan: seret & ubah ukuran (posisi disimpan per surat) */
const DVSGN={G:"Pemberi perintah (TL)",M:"Mengetahui (Manager)",PF:"Paraf"};
function dvPos(p){dvCur.sigPos=dvCur.sigPos||{};return dvCur.sigPos[p]=dvCur.sigPos[p]||{x:0,y:0,s:1}}
function dvSgApply(p){const o=dvPos(p);document.querySelectorAll('#dv-sheets .lw.act .sgb[data-p="'+p+'"]').forEach(i=>{i.style.setProperty("--s",o.s);i.style.transform=`translate(${o.x}mm,${o.y}mm) scale(${o.s})`})}
function dvSelect(p){dvSel=p;document.querySelectorAll("#dv-sheets .lw .sgb[data-p]").forEach(i=>i.classList.toggle("sel",i.closest(".lw").classList.contains("act")&&i.dataset.p===p));$("dv-sgctl").hidden=!p;$("dv-sgbar").hidden=!p;if(p){$("dv-sgName").textContent=DVSGN[p];const s=Math.round(dvPos(p).s*100);$("dv-sgSize").value=s;$("dv-sgPct").value=s}}
function dvNudge(n,st){if(!dvSel)return;const o=dvPos(dvSel);if(n==="l")o.x=+(o.x-st).toFixed(1);if(n==="r")o.x=+(o.x+st).toFixed(1);if(n==="u")o.y=+(o.y-st).toFixed(1);if(n==="d")o.y=+(o.y+st).toFixed(1);dvSgApply(dvSel);dvPersist()}
$("dv-sheets").addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const p=b.dataset.p,lw=b.closest(".lw");if(+lw.dataset.i!==dvIdx)dvActive(+lw.dataset.i);dvSelect(p);const o=dvPos(p);
 dvDrag={p,mode:e.target.classList.contains("sgh")?"size":"move",x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,s0:o.s,w:b.getBoundingClientRect().width||1};b.setPointerCapture(e.pointerId)});
$("dv-sheets").addEventListener("pointermove",e=>{if(!dvDrag)return;const o=dvPos(dvDrag.p);
 if(dvDrag.mode==="size"){const d=((e.clientX-dvDrag.x0)+(e.clientY-dvDrag.y0))/2;o.s=+Math.min(4,Math.max(.2,dvDrag.s0*(1+2*d/dvDrag.w))).toFixed(2);const v=Math.round(o.s*100);$("dv-sgSize").value=v;$("dv-sgPct").value=v}
 else{const k=25.4/96/(dvScale||1);o.x=+(dvDrag.ox+(e.clientX-dvDrag.x0)*k).toFixed(1);o.y=+(dvDrag.oy+(e.clientY-dvDrag.y0)*k).toFixed(1)}
 dvSgApply(dvDrag.p)});
const dvEnd=()=>{if(dvDrag){dvDrag=null;dvPersist()}};$("dv-sheets").addEventListener("pointerup",dvEnd);$("dv-sheets").addEventListener("pointercancel",dvEnd);
$("dv-sheets").addEventListener("wheel",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const lw=b.closest(".lw");if(+lw.dataset.i!==dvIdx)dvActive(+lw.dataset.i);dvSelect(b.dataset.p);const o=dvPos(b.dataset.p);o.s=+Math.min(4,Math.max(.2,o.s*(e.deltaY<0?1.06:1/1.06))).toFixed(2);dvSgApply(b.dataset.p);$("dv-sgSize").value=Math.round(o.s*100);$("dv-sgPct").value=Math.round(o.s*100);dvPersist()},{passive:false});
document.addEventListener("pointerdown",e=>{if(dvSel&&!e.target.closest("#dv-sgbar")&&!e.target.closest(".sgb"))dvSelect(null)});
$("dv-sgSize").oninput=e=>{if(!dvSel)return;dvPos(dvSel).s=e.target.value/100;$("dv-sgPct").value=e.target.value;dvSgApply(dvSel);dvPersist()};
$("dv-sgPct").onchange=e=>{if(!dvSel)return;const v=Math.min(400,Math.max(20,+e.target.value||100));e.target.value=v;dvPos(dvSel).s=v/100;$("dv-sgSize").value=v;dvSgApply(dvSel);dvPersist()};
$("dv-sgbar").onclick=e=>{const n=e.target.dataset.n;if(n)dvNudge(n,0.5);if(e.target.id==="dv-sgReset"&&dvSel){dvCur.sigPos[dvSel]={x:0,y:0,s:1};dvSgApply(dvSel);dvSelect(dvSel);dvPersist()}};
document.addEventListener("keydown",e=>{if(!dvSel||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const n={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];if(n){e.preventDefault();dvNudge(n,e.shiftKey?2:0.5)}});
/* ===== input manual / WhatsApp ===== */
$("dv-m-man").onclick=()=>{$("dv-wa").hidden=true;$("dv-m-man").classList.add("on");$("dv-m-wa").classList.remove("on")};
$("dv-m-wa").onclick=()=>{$("dv-wa").hidden=false;$("dv-m-wa").classList.add("on");$("dv-m-man").classList.remove("on")};
const DVLB={driver:"Nama driver",tanggal:"Tanggal",mulai:"Jam mulai",selesai:"Jam selesai",tujuan:"Uraian Tugas",pemberiName:"Pemberi perintah (TL)"},DVMS={ok:"terbaca",warn:"periksa",missing:"hilang",error:"gagal"};
$("dv-parse").onclick=()=>{const t=$("dv-waText").value.trim();if(!t){$("dv-parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 const r=dvBuildAll(t,dvSet0(),DB.sigs);if(!r.surat.length){$("dv-parseOut").innerHTML='<p class="hint w">Tidak ada baris berlabel yang dikenali (Tanggal, Waktu/Pukul/Jam, Uraian Tugas/Tujuan, TL, Nama driver).</p>';return}
 /* nama driver dicocokkan ke daftar driver terdaftar */
 r.surat.forEach(c=>{if(c.driver)c.driver=dvNames(c.driver).map(n=>{const h=spCari(DVDB.drivers.map(d=>({nama:d.nama})),n);return h.p?h.p.nama:n}).join(", ")});
 dvLast=r.surat;const unk=r.unk;
 const rows=c=>Object.keys(DVLB).map(k=>{const s=c.st[k]||{s:"missing",m:"Tidak ditemukan"},v=k==="tanggal"&&c.tanggal?fmtDate(c.tanggal):(c[k]??"");return`<tr><td>${DVLB[k]}</td><td>${esc(v)}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${DVMS[s.s]}</span></td></tr>`}).join("");
 $("dv-parseOut").innerHTML=`<p class="hint"><b>${dvLast.length} surat terdeteksi</b></p>`+dvLast.map((c,i)=>{const n=Object.keys(DVLB).filter(k=>(c.st[k]||{s:"missing"}).s!=="ok"&&!(k==="driver"&&!c.driver)).length;return`<details${n?" open":""}><summary><b>Surat ${i+1}</b> · ${esc(c.tanggal?fmtDate(c.tanggal):"tanggal?")} · ${n?n+" kolom perlu diperiksa":"semua terbaca"}</summary><table class="t">${rows(c)}</table></details>`}).join("")+(unk.length?`<p class="hint w">Baris tidak dikenali (diabaikan): ${unk.map(esc).join(" | ")}</p>`:"")+`<div class="acts"><button class="b" id="dv-apply">Buat ${dvLast.length} surat</button></div>`;
 $("dv-apply").onclick=dvApply};
async function dvApply(){if((dvBatch.length>1||dvCur.tujuan||dvCur.driver)&&!await ask("Isi formulir/daftar surat driver saat ini akan diganti dengan "+dvLast.length+" surat baru. Lanjutkan?"))return;
 dvBatch=dvLast.map(c=>{const x=JSON.parse(JSON.stringify(c));delete x.st;return x});dvIdx=0;dvCur=dvBatch[0];dvBuildForm();dvBuildSheets();dvUpdate();$("dv-m-man").click();toast(dvBatch.length+" surat dibuat.");$("dv-pane").scrollTop=0}
/* ===== simpan, cetak ===== */
function dvSaveRec(status){const c=dvCur;c.status=status;c.updatedAt=Date.now();const r=JSON.parse(JSON.stringify(c));delete r.st;if(!r.id){r.id=uid();c.id=r.id;r.createdAt=Date.now()}
 const i=DVDB.records.findIndex(x=>x.id===r.id);if(i>=0)DVDB.records[i]=r;else DVDB.records.push(r);dvSave()}
const dvBad=()=>dvBatch.map((c,i)=>dvMissing(c).length?"surat "+(i+1)+": "+dvMissing(c).join(", "):"").filter(Boolean);
async function dvSimpan(status){const bad=status==="selesai"?dvBad():[];if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap tandai selesai?"))return;
 const keep=dvIdx;dvBatch.forEach((c,i)=>{dvCur=c;dvIdx=i;dvSaveRec(status)});dvIdx=keep;dvCur=dvBatch[keep];dvPersist();toast(dvBatch.length+" surat "+(status==="selesai"?"ditandai selesai dan tersimpan.":"tersimpan sebagai draft."))}
$("dv-bDraft").onclick=()=>dvSimpan("draft");$("dv-bDone").onclick=()=>dvSimpan("selesai");
$("dv-bNew").onclick=async()=>{if((dvBatch.length>1||((dvCur.tujuan||dvCur.driver)&&!dvCur.id))&&!await ask(dvBatch.length>1?"Daftar "+dvBatch.length+" surat akan ditutup (yang belum disimpan hilang). Lanjutkan?":"Isi formulir saat ini yang belum disimpan akan hilang. Lanjutkan?"))return;
 dvCur=dvBlank(DVDB.settings);dvBatch=[dvCur];dvIdx=0;dvBuildForm();dvBuildSheets();dvUpdate()};
$("dv-bPrint").onclick=async()=>{const bad=dvBad();if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap cetak?"))return;window.print()};
$("dv-bTtd").onclick=()=>{setMode("L");showTab("tt")};
/* ===== PDF (semua surat dalam satu berkas, satu halaman A4 per surat) ===== */
async function dvPdfLetter(pdf,c){pdf.setTextColor(0,0,0);const sigs=[];
 for(const e of dvLayout(c,dvSet0())){
  if(e.k==="t"){pdf.setFont("helvetica",e.b?"bold":"normal");pdf.setFontSize(e.s);if(e.col){const h=e.col.replace("#","");pdf.setTextColor(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16))}else pdf.setTextColor(0,0,0);
   pdf.text(pdfTxt(e.t),e.x,e.y+.905*e.s,{align:e.a==="c"?"center":e.a==="r"?"right":"left"})}
  else if(e.k==="i"){if(e.src)pdf.addImage(e.src,"PNG",e.x,e.y,e.w,e.h)}
  else if(e.k==="s"){const s=e.src||dvSigImg(e.nama);if(s)sigs.push({src:s,p:e.key,cx:e.cx,cy:e.cy,bw:e.w||105,bh:e.h||56,ex:e.ex})}}
 for(const g of sigs){const im=await loadImg(g.src);if(!im)continue;const o=((c.sigPos||{})[g.p])||{x:0,y:0,s:1};
  const k=Math.min(1,g.bw/(im.naturalWidth*.75),g.bh/(im.naturalHeight*.75)),w=g.ex?g.bw*(o.s||1):im.naturalWidth*.75*k*(o.s||1),h=g.ex?g.bh*(o.s||1):im.naturalHeight*.75*k*(o.s||1);
  pdf.addImage(g.src,"PNG",g.cx+(o.x||0)*PX-w/2,g.cy+(o.y||0)*PX-h/2,w,h)}}
async function dvPdf(list){if(pdfBusy)return;if(!list.length){toast("Tidak ada surat.");return}
 const bad=list.map((c,i)=>dvMissing(c).length?"surat "+(i+1)+": "+dvMissing(c).join(", "):"").filter(Boolean);
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap buat PDF?"))return;
 if(!window.jspdf){toast("Pustaka PDF gagal dimuat (cek koneksi). Gunakan tombol Cetak sebagai gantinya.");return}
 pdfBusy=true;
 try{const pdf=new window.jspdf.jsPDF({unit:"pt",format:"a4",orientation:"portrait",compress:true});
  for(let i=0;i<list.length;i++){toast("Membuat PDF: surat "+(i+1)+" dari "+list.length+"...");if(i)pdf.addPage("a4","portrait");await dvPdfLetter(pdf,list[i])}
  const name=dvNamaBerkas(list),blob=pdf.output("blob");let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast("PDF disimpan: "+list.length+" surat.")}catch(e){toast(e&&e.code==="declined"?"Unduhan dibatalkan.":"Unduhan gagal ("+(e&&e.code||"error")+").")}}
  else{pdf.save(name);toast("PDF dibuat: "+list.length+" surat.")}
 }catch(e){toast("Gagal membuat PDF: "+(e&&e.message||e))}finally{pdfBusy=false}}
$("dv-bPdf").onclick=()=>dvPdf(dvBatch);
/* ===== tab, mode ===== */
function dvTab(t){for(const x of["in","pe","ri","se"])$("dv-tab-"+x).hidden=x!==t;document.querySelectorAll("#dv-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="pe")dvRenderDr();if(t==="ri")dvRenderRi();if(t==="se")dvBuildSet()}
$("dv-tabs").onclick=e=>{if(e.target.dataset.t)dvTab(e.target.dataset.t)};
function dvEnter(){dvBuildForm();dvBuildSheets();dvUpdate();setTimeout(dvFit,50)}
/* ===== driver ===== */
let dvEditD=null;
function dvRenderDr(){const q=dvNorm($("dv-peQ").value),l=DVDB.drivers.filter(d=>dvNorm(d.nama).includes(q)).sort((a,b)=>a.nama.localeCompare(b.nama));
 $("dv-peList").innerHTML=l.length?`<p class="hint">${DVDB.drivers.length} driver tersimpan di browser ini.</p><table class="t">${l.map(d=>`<tr><td><b>${esc(d.nama)}</b></td><td style="white-space:nowrap"><button class="g" data-e="${d.id}">Edit</button> <button class="d" data-x="${d.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada driver. Tambahkan di bawah; nama dipakai untuk pilihan cepat dan pencocokan pesan WhatsApp.</p>'}
$("dv-peQ").oninput=dvRenderDr;
function dvPeReset(){dvEditD=null;$("dv-pn").value="";$("dv-peT").textContent="Tambah driver"}
$("dv-peReset").onclick=dvPeReset;
$("dv-peList").onclick=async e=>{const d=e.target.dataset,x=DVDB.drivers.find(y=>y.id===(d.e||d.x));if(!x)return;
 if(d.x){if(await ask('Hapus "'+x.nama+'" dari daftar driver? Surat yang sudah dibuat tidak berubah.')){DVDB.drivers=DVDB.drivers.filter(y=>y!==x);dvSave();dvRenderDr();dvBuildForm()}return}
 dvEditD=x.id;$("dv-pn").value=x.nama;$("dv-peT").textContent="Edit driver"};
$("dv-peSave").onclick=()=>{const n=$("dv-pn").value.trim().replace(/\s+/g," ");if(!n){alert("Nama wajib diisi.");return}
 const ex=DVDB.drivers.find(y=>y.id===dvEditD);if(ex)ex.nama=n;else DVDB.drivers.push({id:uid(),nama:n});dvSave();dvPeReset();dvRenderDr();dvBuildForm();toast(ex?"Perubahan driver tersimpan.":"Driver ditambahkan.")};
/* ===== riwayat ===== */
let dvShown=[];
function dvRenderRi(){const q=dvNorm($("dv-rQ").value),a=$("dv-rA").value,b=$("dv-rB").value;
 dvShown=DVDB.records.filter(r=>dvNorm((r.driver||"")+" "+r.tujuan+" "+r.pemberiName).includes(q)&&(!a||r.tanggal>=a)&&(!b||r.tanggal<=b)).sort((x,y)=>(y.tanggal||"").localeCompare(x.tanggal||""));
 $("dv-rList").innerHTML=dvShown.length?`<table class="t">${dvShown.map(r=>`<tr><td><b>${esc(dvLabelDriver([r])||"(tanpa driver)")}</b><div class="hint">${esc(r.tanggal?fmtDate(r.tanggal):"")} · ${esc(r.mulai)}-${esc(r.selesai)} · TL ${esc(r.pemberiName||"")}</div><div class="hint">${esc(r.tujuan)}</div></td><td><span class="bd ${r.status==="selesai"?"ok":"warn"}">${r.status}</span>${r.excelAt?' <span class="bd ok" title="Sudah dicatat di Excel">Excel</span>':""}</td><td style="white-space:nowrap"><button class="g" data-p="${r.id}">PDF</button> <button class="g" data-o="${r.id}">Buka</button> <button class="g" data-c="${r.id}">Duplikat</button> <button class="d" data-x="${r.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada riwayat surat driver.</p>'}
["dv-rQ","dv-rA","dv-rB"].forEach(i=>$(i).oninput=dvRenderRi);$("dv-rPdf").onclick=()=>dvPdf(dvShown);
$("dv-rDelAll").onclick=async()=>{const n=DVDB.records.length;if(!n){toast("Riwayat sudah kosong.");return}if(!await ask("Hapus SEMUA "+n+" catatan riwayat surat driver secara permanen?\nTindakan ini tidak bisa dibatalkan."))return;DVDB.records=[];dvSave();dvRenderRi();toast(n+" catatan riwayat dihapus.")};
$("dv-rList").onclick=async e=>{const t=e.target.dataset,r=DVDB.records.find(x=>x.id===(t.o||t.c||t.x||t.p));if(!r)return;
 if(t.p){dvPdf([r]);return}if(t.x){if(await ask("Hapus catatan ini secara permanen?")){DVDB.records=DVDB.records.filter(x=>x!==r);dvSave();dvRenderRi()}return}
 const c=JSON.parse(JSON.stringify(r));c.flags={};if(t.c){c.id=null;c.status="draft";c.tanggal="";c.tglSurat="";delete c.excelAt}
 dvCur=c;dvBatch=[c];dvIdx=0;dvBuildForm();dvBuildSheets();dvUpdate();dvTab("in")};
/* ===== pengaturan ===== */
const DVSG=[["Kop dan kepada",[["kop1","Kop baris 1",1],["kop2","Kop baris 2",1],["kop3","Kop baris 3",1],["kota","Kota (Parepare, tanggal)"],["perihal","Perihal"],["kepada1","Kepada Yth (baris 1)",1],["kepada2","Kepada Yth (kota)"]]],
 ["Isi surat",[["pembuka","Kalimat pembuka",1],["penutup","Kalimat penutup",1],["zona","Zona waktu"],["jabPemberi","Jabatan pemberi perintah bawaan"],["durTampil","Tampilkan durasi di baris Waktu",1,"cb"]]],
 ["Mengetahui (tetap)",[["mgrJab","Jabatan"],["mgrNama","Nama"]]],
 ["Kaki halaman",[["alm1","Alamat baris 1",1],["alm2","Alamat baris 2",1],["web","Situs web"],["telp","Telepon"]]],
 ["Excel (daftar hadir driver)",[["xlJudul","Judul daftar",1],["xlKota","Kota tanda tangan"],["xlLbl1","Jabatan pengesah 1"],["xlNama1","Nama pengesah 1"],["xlLbl2","Jabatan pengesah 2"],["xlNama2","Nama pengesah 2"],["xlLbl3","Jabatan pengesah 3"],["xlNama3","Nama pengesah 3"],["xlLbl4","Jabatan pengesah 4"],["xlNama4","Nama pengesah 4"]]]];
function dvParafBlok(){return`<h4 class="sec">Paraf (tampil di setiap surat, di garis "Paraf" ujung bawah)</h4><div class="fld fw"><label>Gambar paraf (PNG/JPG/WEBP, maks 1 MB)</label><input type="file" id="dv-parafFile" accept="image/png,image/jpeg,image/webp"><img id="dv-parafImg" class="sg-prev" alt="" style="height:50px;max-width:160px;margin-top:6px"><div class="acts"><button class="d" id="dv-parafDel" hidden>Hapus paraf</button></div><p class="hint">Posisi dan ukuran bisa diatur per surat dengan mengklik parafnya di pratinjau.</p></div>`}
function dvParafUi(){const v=DVDB.settings.paraf||"",im=$("dv-parafImg");if(!im)return;if(v)im.src=v;else im.removeAttribute("src");$("dv-parafDel").hidden=!v}
function dvBuildSet(){const S=dvSet0();$("dv-seForm").innerHTML=`<p class="hint">Perubahan berlaku untuk surat baru dan pratinjau. Data hanya disimpan di browser ini.</p>`+DVSG.map(([j,f])=>`<h4 class="sec">${j}</h4>`+f.map(([k,l,p,cb])=>cb?`<div class="fld fw"><label><input type="checkbox" data-ds="${k}"${S[k]!==false?" checked":""}> ${l}</label></div>`:`<div class="fld${p?" fw":""}"><label>${l}</label><input data-ds="${k}" value="${esc(S[k])}"></div>`).join("")).join("")+dvParafBlok();dvParafUi()}
$("dv-seForm").addEventListener("change",e=>{if(e.target.id!=="dv-parafFile")return;const f=e.target.files[0];e.target.value="";readSig(f,async d=>{const t=await spParafTrim(d);DVDB.settings.paraf=t.src;DVDB.settings.parafAr=t.ar;[dvCur,...dvBatch].forEach(c=>{if(c.sigPos)delete c.sigPos.PF});dvSave();dvParafUi();dvUpdate();toast("Paraf tersimpan.")})});
$("dv-seForm").addEventListener("click",async e=>{if(e.target.id!=="dv-parafDel")return;if(await ask("Hapus paraf dari semua surat?")){delete DVDB.settings.paraf;delete DVDB.settings.parafAr;dvSave();dvParafUi();dvUpdate()}});
$("dv-seSave").onclick=()=>{document.querySelectorAll("[data-ds]").forEach(el=>{DVDB.settings[el.dataset.ds]=el.type==="checkbox"?el.checked:el.value});dvSave();dvUpdate();alert("Pengaturan driver tersimpan.")};
$("dv-exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(DVDB)],{type:"application/json"}));a.download="cadangan-lembur-driver-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("dv-imp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader;r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.records)||!Array.isArray(d.drivers))throw 0;if(!await ask("Impor akan MENGGANTI seluruh data lembur driver (driver, riwayat, pengaturan). Lanjutkan?"))return;
 DVDB={drivers:d.drivers,records:d.records,settings:{...DV_DEF,...d.settings}};dvSave();dvBuildForm();alert("Impor berhasil.")}catch(x){alert("File cadangan driver tidak valid.")}};r.readAsText(f)};
/* ===== Simpan ke Excel ===== */
let dxS=null;
const dxKunci=n=>String(n||"").trim().toLowerCase();
function dxEntri(){const out=[];dxS.letters.forEach(c=>dvNames(c.driver).forEach(n=>out.push({nama:xlRapi(dxS.nama[dxKunci(n)]||n).toUpperCase(),iso:c.tanggal,masuk:c.mulai,pulang:c.selesai,ket:xlRapi(c.tujuan)})));return out}
function dxNamaAwal(){const ada=dxS.wb?dxNamaDiFile(dxS.wb):[],peta=DVDB.settings.excelMap||{};
 dxS.letters.forEach(c=>dvNames(c.driver).forEach(n=>{const k=dxKunci(n);if(dxS.diubah[k])return;const sv=peta[k];dxS.nama[k]=(sv&&(!ada.length||ada.includes(sv))?sv:xlCariNama(n,ada))||xlRapi(n).toUpperCase()}))}
function bukaExcelDriver(sumber){
 if(typeof ExcelJS==="undefined"){toast("Pustaka Excel gagal dimuat (cek koneksi atau folder vendor).");return}
 const sah=sumber.filter(c=>c.tanggal&&c.mulai&&c.selesai&&dvNames(c.driver).length);
 if(!sah.length){toast("Tidak ada surat yang lengkap (nama driver, tanggal, jam mulai dan selesai).");return}
 const S=dvSet0();
 dxS={letters:sah,abaikan:sumber.length-sah.length,wb:null,namaFile:"",handle:null,nama:{},diubah:{},sibuk:false,tglTtd:"",ttd:[1,2,3,4].map(i=>({label:S["xlLbl"+i]||"",nama:S["xlNama"+i]||""}))};
 const o=document.createElement("div");o.className="mdl";o.innerHTML='<div id="dxBox"></div>';document.body.appendChild(o);dxS.el=o;
 o.addEventListener("click",dxKlik);o.addEventListener("input",dxInput);o.addEventListener("change",e=>{if(e.target.id==="dxFile"&&e.target.files[0]){dxS.handle=null;dxMuat(e.target.files[0])}});
 dxNamaAwal();dxGambar()}
function dxTutup(){if(dxS&&dxS.el)dxS.el.remove();dxS=null}
function dxGambar(){const names=dxS.wb?dxNamaDiFile(dxS.wb):[],b=$("dxBox"),dup=dxS.letters.filter(c=>c.excelAt).length;
 const daftar=[...new Set(dxS.letters.flatMap(c=>dvNames(c.driver)).map(dxKunci))].map(k=>dxS.letters.flatMap(c=>dvNames(c.driver)).find(n=>dxKunci(n)===k));
 b.innerHTML=`<h3>Simpan ke Excel (driver)</h3>
 <div class="hint">${dxS.letters.length} surat${dxS.abaikan?`, ${dxS.abaikan} dilewati karena nama driver, tanggal, atau jam belum lengkap`:""}${dup?` · ${dup} sudah pernah dicatat (otomatis dilewati bila barisnya sama)`:""}</div>
 <div class="xlf"><button class="g" data-x="pilih">Pilih file Excel\u2026</button><input type="file" id="dxFile" accept=".xlsx" hidden>
  <span>${dxS.wb?esc(dxS.namaFile)+" \u00b7 sheet: "+dxS.wb.worksheets.map(w=>esc(w.name)).join(", "):"Tanpa file: dibuat file Excel baru (satu sheet per driver)"}</span>${dxS.wb?'<button class="g" data-x="lepas">Lepas</button>':""}</div>
 <h4>Nama di Excel</h4><datalist id="dxDL">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
 <table class="t"><tr><th>Nama di surat</th><th>Ditulis di Excel sebagai (sheet driver)</th></tr>${daftar.map(n=>`<tr><td>${esc(n)}</td><td><input list="dxDL" data-k="${esc(dxKunci(n))}" value="${esc(dxS.nama[dxKunci(n)]||"")}"></td></tr>`).join("")}</table>
 <h4>Blok pengesahan <span class="hint">(sheet baru; sheet yang sudah ada memakai blok miliknya)</span></h4>
 <table class="t"><tr><th>Jabatan</th><th>Nama</th><th></th></tr>${dxS.ttd.map((t,i)=>`<tr><td><input data-tl="${i}" value="${esc(t.label)}"></td><td><input data-tn="${i}" value="${esc(t.nama)}"></td><td id="dxTt${i}" style="white-space:nowrap">${t.nama&&sigLookup(t.nama)?"\u2714 ttd":""}</td></tr>`).join("")}</table>
 <div class="xlf"><span>Tanggal pengesahan</span><input type="date" data-tg="1" value="${esc(dxS.tglTtd)}" style="width:auto"><span class="hint">kosong = akhir bulan</span></div>
 <h4>Rencana</h4><div id="dxPlan"></div>
 <div class="acts" style="justify-content:flex-end"><button class="g" data-x="batal">Batal</button><button class="b" data-x="simpan" id="dxSimpan">Simpan Excel</button></div>`;dxRencanaTampil()}
function dxRencanaTampil(){let rc;try{rc=dxRencana(dxS.wb,dxEntri())}catch(e){$("dxPlan").innerHTML='<div class="hint w">Berkas tidak bisa dibaca: '+esc(e.message||e)+"</div>";return}
 $("dxPlan").innerHTML=rc.map(p=>`<div class="pl"><b>${p.baru?'Sheet baru untuk '+esc(p.nama):'Sheet "'+esc(p.sheet)+'"'} \u00b7 ${esc(xlBulanLabel(p.mk))}</b>
  <div class="hint">+${p.ditambah} baris lembur${p.dilewati?`, ${p.dilewati} sudah ada (dilewati)`:""}</div><div class="hint">${p.ringkas.n} lembur \u00b7 total ${p.ringkas.total.nilai.toFixed(2)} (${esc(p.ringkas.total.teks)})</div></div>`).join("")}
async function dxMuat(f){dxS.sibuk=true;try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());dxS.wb=wb;dxS.namaFile=f.name;dxS.diubah={};
  if(!dxSheets(wb).length)toast("File ini tidak memiliki sheet berformat daftar hadir driver; sheet baru akan ditambahkan.");dxNamaAwal();dxGambar()}
 catch(e){toast("File Excel tidak bisa dibuka: "+(e&&e.message||e));dxS.wb=null;dxS.handle=null}finally{dxS.sibuk=false}}
function dxInput(e){const d=e.target.dataset||{};if(!dxS)return;
 if(d.tl!==undefined){dxS.ttd[+d.tl].label=e.target.value;return}
 if(d.tn!==undefined){dxS.ttd[+d.tn].nama=e.target.value;const c=$("dxTt"+d.tn);if(c)c.textContent=e.target.value&&sigLookup(e.target.value)?"\u2714 ttd":"";return}
 if(d.tg!==undefined){dxS.tglTtd=e.target.value;return}
 const k=d.k;if(!k)return;dxS.nama[k]=e.target.value;dxS.diubah[k]=true;dxRencanaTampil()}
async function dxKlik(e){const a=e.target.dataset&&e.target.dataset.x;if(e.target===dxS.el&&!dxS.sibuk){dxTutup();return}if(!a)return;
 if(a==="batal")dxTutup();
 else if(a==="lepas"){dxS.wb=null;dxS.namaFile="";dxS.handle=null;dxS.diubah={};dxNamaAwal();dxGambar()}
 else if(a==="pilih"){try{if(window.showOpenFilePicker){const[h]=await window.showOpenFilePicker({types:[{description:"Excel",accept:{[XL_MIME]:[".xlsx"]}}]});dxS.handle=h;await dxMuat(await h.getFile())}else $("dxFile").click()}
  catch(err){if(err&&err.name==="AbortError")return;$("dxFile").click()}}
 else if(a==="simpan")dxSimpanExcel()}
async function dxSlot(){const out=[];for(let i=1;i<=4;i++){const t=dxS.ttd[i-1],nama=t.nama||"",g=nama?sigLookup(nama):"",slot={label:t.label||"",nama};
 if(g){const im=await loadImg(g);if(im)slot.gambar={base64:g.split(",")[1],ext:"png",w:im.naturalWidth,h:im.naturalHeight}}out.push(slot)}return out}
function dxNamaUnduh(lap){const bt=rentangBulanTeks((lap||[]).map(l=>l.mk)),slug=bt.toLowerCase().replace(/\s+/g,"-");
 if(!dxS||!dxS.namaFile)return"absensi-lembur-driver"+(slug?"-"+slug:"")+".xlsx";
 const dasar=dxS.namaFile.replace(/\.xlsx$/i,""),n=t=>t.toLowerCase().replace(/[\s_\-.]+/g," ").trim();return dasar+"-diperbarui"+(slug&&!n(dasar).includes(n(bt))?"-"+slug:"")+".xlsx"}
async function dxSimpanExcel(){if(!dxS||dxS.sibuk)return;dxS.sibuk=true;const btn=$("dxSimpan");if(btn){btn.disabled=true;btn.textContent="Menyimpan..."}
 try{const S=dvSet0(),wb=dxS.wb||new ExcelJS.Workbook();
  const lap=dxTerapkan(wb,dxEntri(),{kota:S.xlKota,judul:S.xlJudul,slot:await dxSlot(),tglTtd:dxS.tglTtd});
  const blob=new Blob([await wb.xlsx.writeBuffer()],{type:XL_MIME});let pesan="";
  if(dxS.handle){try{let izin=await dxS.handle.queryPermission({mode:"readwrite"});if(izin!=="granted")izin=await dxS.handle.requestPermission({mode:"readwrite"});if(izin!=="granted")throw new Error("izin ditolak");
    const w=await dxS.handle.createWritable();await w.write(blob);await w.close();pesan="File Excel diperbarui langsung: "+dxS.namaFile}
   catch(err){await unduhBlob(dxNamaUnduh(lap),blob);pesan="File asli tidak bisa ditimpa ("+(err&&err.message||err)+"). Salinan diunduh; tutup file di Excel lalu ganti file lama."}}
  else{const nama=dxNamaUnduh(lap);await unduhBlob(nama,blob);pesan="Excel diunduh: "+nama}
  const tambah=lap.reduce((n,l)=>n+l.ditambah,0),lewat=lap.reduce((n,l)=>n+l.dilewati,0);
  dxS.letters.forEach(c=>{c.excelAt=Date.now();const r=DVDB.records.find(x=>x.id&&x.id===c.id);if(r)r.excelAt=c.excelAt});
  DVDB.settings.excelMap=DVDB.settings.excelMap||{};dxS.letters.forEach(c=>dvNames(c.driver).forEach(n=>{const k=dxKunci(n);DVDB.settings.excelMap[k]=xlRapi(dxS.nama[k]||n).toUpperCase()}));
  dxS.ttd.forEach((t,i)=>{DVDB.settings["xlLbl"+(i+1)]=t.label;DVDB.settings["xlNama"+(i+1)]=t.nama});
  dvSave();dvPersist();if($("dv-sheets").children.length)dvBuildSheets();dxTutup();toast(pesan+" \u00b7 +"+tambah+" baris"+(lewat?", "+lewat+" dilewati":"")+".")
 }catch(e){toast("Gagal menyimpan Excel: "+(e&&e.message||e));if(dxS){dxS.sibuk=false;const b=$("dxSimpan");if(b){b.disabled=false;b.textContent="Simpan Excel"}}}}
$("dv-bXl").onclick=()=>bukaExcelDriver(dvBatch);$("dv-rXl").onclick=()=>bukaExcelDriver(dvShown);
/* ===== mulai ===== */
dvBuildForm();dvBuildSheets();dvUpdate();dvButtons();
try{if(sessionStorage.getItem("app.mode")==="D")setMode("D")}catch(e){}
