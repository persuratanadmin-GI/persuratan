"use strict";
/* SPPD - antarmuka: mode, formulir, input WhatsApp, pratinjau, PDF, pegawai, riwayat, pengaturan.
   Data SPPD disimpan terpisah (localStorage "sppd.v1"), tidak menyentuh data surat lembur. */
const SPK="sppd.v1";
function spLoad(){try{const d=JSON.parse(localStorage.getItem(SPK));if(d){const st={...d.settings};["pjNama","pjGrade","pjNip","pjJab","pjTtdJab","gmNama","gmJab"].forEach(k=>{if(!st[k])delete st[k]});return{pegawai:d.pegawai||[],records:d.records||[],settings:{...SP_DEF,...st}}}}catch(e){}return{pegawai:[],records:[],settings:{...SP_DEF}}}
let SPDB=spLoad();
function spSave(){try{localStorage.setItem(SPK,JSON.stringify(SPDB));$("st").textContent="SPPD tersimpan "+new Date().toLocaleTimeString("id-ID")}catch(e){$("st").textContent="Gagal menyimpan: penyimpanan penuh/dinonaktifkan"}}
/* ===== state ===== */
let spBatch=[],spIdx=0,spCur=null,spSel=null,spScale=1,spDrag=null,spLast=[];
try{const b=JSON.parse(sessionStorage.getItem("sppd.batch"));if(b&&b.batch&&b.batch.length){spBatch=b.batch;spIdx=Math.min(b.idx||0,spBatch.length-1)}}catch(e){}
if(!spBatch.length)spBatch=[spBlank(SPDB.settings)];
spCur=spBatch[spIdx];
const spPersist=()=>{try{sessionStorage.setItem("sppd.batch",JSON.stringify({batch:spBatch,idx:spIdx}))}catch(e){}};
const SPREQ=["personName","grade","nip","jabatan","maksud","transport","berangkat","tujuan","tglBerangkat","lama","tglKembali"];
const SPFULL=["maksud","jabatan","personName"];
const SPF=[["#","Pegawai yang diperintah"],["@pg"],["personName","Nama pegawai"],["grade","Grade"],["nip","NIP"],["jabatan","Jabatan (tampil di surat)"],
 ["#","Perjalanan dinas"],["maksud","Maksud perjalanan dinas","area"],["transport","Transportasi"],["berangkat","Tempat berangkat"],["tujuan","Tempat tujuan"],["tglBerangkat","Tanggal berangkat","date"],["tglKembali","Tanggal harus kembali","date"],["lama","Lama (otomatis dari tanggal)","number"],
 ["#","Penerbitan"],["kotaTerbit","Dikeluarkan di"],["@note"]];
function spBuildForm(){$("sp-form").innerHTML=SPF.map(([k,l,t])=>{
 if(k==="#")return`<h4 class="sec">${l}</h4>`;
 if(k==="@note")return`<p class="hint fw">Baris 7 (Urgensi) otomatis "Melaksanakan" + maksud. "Pada tanggal" selalu sama dengan tanggal berangkat. Pejabat yang memberi perintah dan General Manager tetap, diatur di tab Pengaturan.</p>`;
 if(k==="@pg")return`<div class="fld fw"><label>Pilih dari daftar pegawai</label><datalist id="sp-dl">${SPDB.pegawai.map(p=>`<option value="${esc(spName(p.nama))}"></option>`).join("")}</datalist><select data-sel="pg"><option value="">- ${SPDB.pegawai.length?"pilih pegawai":"daftar kosong: impor di tab Pegawai"} -</option>${[...SPDB.pegawai].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p=>`<option value="${esc(p.nip)}">${esc(spName(p.nama))} · ${esc(p.nip)}</option>`).join("")}</select></div>`;
 const rq=SPREQ.includes(k),rc=rq?' class="req"':"";const a=t==="area"?`<textarea data-sk="${k}"${rc}></textarea>`:`<input data-sk="${k}" type="${t||"text"}"${t==="number"?' readonly tabindex="-1" style="background:#eef1f6"':""}${k==="personName"?' list="sp-dl" autocomplete="off"':""}${rc}>`;
 return`<div class="fld${SPFULL.includes(k)?" fw":""}${rq?" isreq":""}"><label>${l}${rq?' <span class="rq">*</span>':""}</label>${a}</div>`}).join("");spSync()}
function spSync(){document.querySelectorAll("[data-sk]").forEach(el=>{const k=el.dataset.sk;el.value=spCur[k]??"";el.classList.toggle("warn",!!spCur.flags?.[k]);el.title=spCur.flags?.[k]||"";el.classList.toggle("need",SPREQ.includes(k)&&!String(el.value).trim())})}
function spField(k){return document.querySelector('[data-sk="'+k+'"]')}
function spSet(k,v){spCur[k]=v;const e=spField(k);if(e){e.value=v;e.classList.toggle("need",SPREQ.includes(k)&&!String(v).trim())}}
/* Nama diketik -> grade/NIP/jabatan dicocokkan otomatis dari daftar pegawai (hasil Excel). */
function spPegFill(p){Object.assign(spCur,{grade:String(p.grade||""),nip:p.nip,jabatan:spJab(p.jabatan,SPDB.settings.sufiksUnit)});["grade","nip","jabatan"].forEach(k=>{spSet(k,spCur[k]);delete spCur.flags[k]})}
function spSetLama(){const n=spLamaOf(spCur);spCur.lama=n;const e=spField("lama");if(e){e.value=n||"";e.classList.toggle("need",!n)}}
$("sp-form").addEventListener("input",e=>{const k=e.target.dataset.sk;if(!k||k==="lama")return;const v=e.target.value,c=spCur;c[k]=v;
 if(k==="personName"){const h=spCari(SPDB.pegawai,v);if(h.p){spPegFill(h.p);c.autoPeg=true;delete c.flags.personName;spField("personName").classList.remove("warn")}
  else if(c.autoPeg){["grade","nip","jabatan"].forEach(x=>spSet(x,""));c.autoPeg=false}}
 else if(k==="tglBerangkat"){if(v){const n=c.lama||1;spSet("tglKembali",spAddDays(v,n-1));spSet("tglTerbit",v)}spSetLama()}
 else if(k==="tglKembali"){spSetLama();if(c.tglBerangkat&&v&&!c.lama)c.flags.tglKembali="Tanggal kembali sebelum tanggal berangkat"}
 e.target.classList.toggle("need",SPREQ.includes(k)&&!String(e.target.value).trim());
 if(c.flags?.[k]&&k!=="tglKembali"){delete c.flags[k];e.target.classList.remove("warn")}spUpdate()});
$("sp-form").addEventListener("change",e=>{
 if(e.target.dataset.sk==="personName"){const h=spCari(SPDB.pegawai,e.target.value);if(h.p){spSet("personName",spName(h.p.nama));spPegFill(h.p);spUpdate()}return}
 if(e.target.dataset.sel!=="pg")return;const p=SPDB.pegawai.find(x=>x.nip===e.target.value);if(!p)return;
 spSet("personName",spName(p.nama));spPegFill(p);spCur.autoPeg=true;delete spCur.flags.personName;spSync();spUpdate()});
/* ===== pratinjau ===== */
function spSigImg(name){return name?sigLookup(name):""}
function spHtml(c){const o=[];for(const e of spLayout(c)){
 if(e.k==="t"){const ce=e.a==="c";o.push(`<div class="sp-t" style="left:${ce?e.x-250:e.x}pt;top:${e.y.toFixed(2)}pt;font-size:${e.s}pt;line-height:${(e.s*1.117).toFixed(2)}pt;${ce?"width:500pt;text-align:center;":""}${e.b?"font-weight:bold;":""}${e.i?"font-style:italic;":""}">${esc(e.t)}</div>`)}
 else if(e.k==="l"){const h=e.y1===e.y2;o.push(`<div class="sp-l" style="left:${h?e.x1:e.x1-e.w/2}pt;top:${(h?e.y1-e.w/2:e.y1).toFixed(2)}pt;width:${h?e.x2-e.x1:e.w}pt;height:${h?e.w:e.y2-e.y1}pt"></div>`)}
 else if(e.k==="i"){if(e.src)o.push(`<img class="sp-i" src="${e.src}" alt="" style="left:${e.x}pt;top:${e.y}pt;width:${e.w}pt;height:${e.h}pt">`)}
 else if(e.k==="s"){const s=e.src||spSigImg(e.nama);if(!s)continue;const p=(c.sigPos||{})[e.key]||{},bw=e.w||105,bh=e.h||56;o.push(`<div class="sp-sig" style="left:${(e.cx-bw/2).toFixed(2)}pt;top:${(e.cy-bh/2).toFixed(2)}pt;width:${bw}pt;height:${bh}pt${e.l?";justify-content:flex-start;align-items:flex-end":""}"><span class="sgb${spSel===e.key&&c===spCur?" sel":""}" data-p="${e.key}" title="Seret: geser · roda mouse: ukuran" style="--s:${p.s||1}${e.l?";transform-origin:0 100%":""};transform:translate(${p.x||0}mm,${p.y||0}mm) scale(${p.s||1})"><img src="${s}" alt="ttd" draggable="false"${e.w?` style="max-width:${e.w}pt;max-height:${e.h}pt"`:""}><i class="sgh"></i></span></div>`)}}
 return`<div class="sp-pg">${o.join("")}</div>`}
function spTitleOf(i){const c=spBatch[i];return"SPPD "+(i+1)+" dari "+spBatch.length+" · "+(c.personName||"(belum ada nama)")+" · "+(c.tglBerangkat?fmtDate(c.tglBerangkat):"(tanggal?)")}
function spBuildSheets(){$("sp-sheets").innerHTML=spBatch.map((c,i)=>`<div class="lw${i===spIdx?" act":""}" data-i="${i}"><div class="lbar"><span class="lt">${esc(spTitleOf(i))}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${spHtml(c)}</div></div></div></div>`).join("");
 const bb=$("sp-batchbar");bb.hidden=spBatch.length<2;bb.innerHTML=`<b>${spBatch.length} surat</b> ${spBatch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" ")} <button class="b nv" id="sp-pdfAktif">PDF surat ini</button> <button class="g" id="sp-hapusAktif">Hapus surat ini</button>`;spFit()}
function spFit(){const p=$("sp-pane"),w=p.clientWidth-48;if(w<=0)return;const s=Math.min(1,w/794);spScale=s;document.querySelectorAll("#sp-sheets .shbox").forEach(b=>b.style.transform=`scale(${s})`);document.querySelectorAll("#sp-sheets .shwrap").forEach(b=>{b.style.height=1123*s+"px";b.style.width=794*s+"px"})}
window.addEventListener("resize",()=>{if(!$("sp-pane").hidden)spFit()});
function spUpdate(){if(spCur!==spBatch[spIdx]){spBatch=[spCur];spIdx=0}
 if($("sp-sheets").children.length!==spBatch.length)spBuildSheets();else{const lw=$("sp-sheets").children[spIdx];lw.querySelector(".sheet").innerHTML=spHtml(spCur);lw.querySelector(".lt").textContent=spTitleOf(spIdx)}
 spPersist();spButtons();if(spSel&&!document.querySelector('#sp-sheets .lw.act .sgb[data-p="'+spSel+'"]'))spSelect(null);
 const m=spMissing(spCur),sn=[],S0=SPDB.settings;if(S0.pjNama&&!spSigImg(S0.pjNama))sn.push("pejabat pemberi perintah");if(S0.gmNama&&!spSigImg(S0.gmNama))sn.push("general manager");
 $("sp-hint").textContent=[m.length?"Belum lengkap: "+m.join(", "):"",sn.length?"Tanda tangan belum terdaftar: "+sn.join(", ")+" (tab Tanda Tangan di mode Surat Lembur)":""].filter(Boolean).join(" · ")}
function spButtons(){const s=spBatch.length>1?" ("+spBatch.length+")":"";[["sp-bDraft","Simpan draft"],["sp-bDone","Tandai selesai"],["sp-bPdf","Unduh PDF"],["sp-bPrint","Cetak"]].forEach(([id,t])=>{$(id).textContent=t+s})}
function spActive(i){spIdx=i;spCur=spBatch[i];document.querySelectorAll("#sp-sheets .lw").forEach((e,j)=>e.classList.toggle("act",j===i));spSelect(null);spSync();spUpdate()}
$("sp-batchbar").onclick=async e=>{if(e.target.id==="sp-pdfAktif"){spPdf([spCur]);return}
 if(e.target.id==="sp-hapusAktif"&&spBatch.length>1&&await ask("Hapus SPPD "+(spIdx+1)+" dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){spBatch.splice(spIdx,1);spIdx=Math.min(spIdx,spBatch.length-1);spCur=spBatch[spIdx];spBuildForm();spBuildSheets();spUpdate();return}
 const g=e.target.dataset.go;if(g!==undefined){spActive(+g);$("sp-sheets").children[+g].scrollIntoView({block:"nearest"})}};
$("sp-sheets").addEventListener("click",e=>{const lw=e.target.closest(".lw");if(!lw)return;const i=+lw.dataset.i;if(i!==spIdx)spActive(i)});
/* tanda tangan: seret & ubah ukuran (posisi disimpan per surat) */
const SPSGN={GM:"Menyetujui (General Manager)",PJ:"Yang memberi perintah",PF:"Paraf"};
function spPos(p){spCur.sigPos=spCur.sigPos||{};return spCur.sigPos[p]=spCur.sigPos[p]||{x:0,y:0,s:1}}
function spSgApply(p){const o=spPos(p);document.querySelectorAll('#sp-sheets .lw.act .sgb[data-p="'+p+'"]').forEach(i=>{i.style.setProperty("--s",o.s);i.style.transform=`translate(${o.x}mm,${o.y}mm) scale(${o.s})`})}
function spSelect(p){spSel=p;document.querySelectorAll("#sp-sheets .lw .sgb[data-p]").forEach(i=>i.classList.toggle("sel",i.closest(".lw").classList.contains("act")&&i.dataset.p===p));$("sp-sgctl").hidden=!p;$("sp-sgbar").hidden=!p;if(p){$("sp-sgName").textContent=SPSGN[p];const s=Math.round(spPos(p).s*100);$("sp-sgSize").value=s;$("sp-sgPct").value=s}}
function spNudge(n,st){if(!spSel)return;const o=spPos(spSel);if(n==="l")o.x=+(o.x-st).toFixed(1);if(n==="r")o.x=+(o.x+st).toFixed(1);if(n==="u")o.y=+(o.y-st).toFixed(1);if(n==="d")o.y=+(o.y+st).toFixed(1);spSgApply(spSel);spPersist()}
$("sp-sheets").addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const p=b.dataset.p,lw=b.closest(".lw");if(+lw.dataset.i!==spIdx)spActive(+lw.dataset.i);spSelect(p);const o=spPos(p);spDrag={p,mode:e.target.classList.contains("sgh")?"size":"move",x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,s0:o.s,w:b.getBoundingClientRect().width||1};b.setPointerCapture(e.pointerId)});
$("sp-sheets").addEventListener("pointermove",e=>{if(!spDrag)return;const o=spPos(spDrag.p);
 if(spDrag.mode==="size"){const d=((e.clientX-spDrag.x0)+(e.clientY-spDrag.y0))/2;o.s=+Math.min(4,Math.max(.2,spDrag.s0*(1+2*d/spDrag.w))).toFixed(2);const v=Math.round(o.s*100);$("sp-sgSize").value=v;$("sp-sgPct").value=v}
 else{const k=25.4/96/(spScale||1);o.x=+(spDrag.ox+(e.clientX-spDrag.x0)*k).toFixed(1);o.y=+(spDrag.oy+(e.clientY-spDrag.y0)*k).toFixed(1)}
 spSgApply(spDrag.p)});
const spEnd=()=>{if(spDrag){spDrag=null;spPersist()}};$("sp-sheets").addEventListener("pointerup",spEnd);$("sp-sheets").addEventListener("pointercancel",spEnd);
$("sp-sheets").addEventListener("wheel",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const lw=b.closest(".lw");if(+lw.dataset.i!==spIdx)spActive(+lw.dataset.i);spSelect(b.dataset.p);const o=spPos(b.dataset.p);o.s=+Math.min(4,Math.max(.2,o.s*(e.deltaY<0?1.06:1/1.06))).toFixed(2);spSgApply(b.dataset.p);$("sp-sgSize").value=Math.round(o.s*100);$("sp-sgPct").value=Math.round(o.s*100);spPersist()},{passive:false});
document.addEventListener("pointerdown",e=>{if(spSel&&!e.target.closest("#sp-sgbar")&&!e.target.closest(".sgb"))spSelect(null)});
$("sp-sgSize").oninput=e=>{if(!spSel)return;spPos(spSel).s=e.target.value/100;$("sp-sgPct").value=e.target.value;spSgApply(spSel);spPersist()};
$("sp-sgPct").oninput=e=>{if(!spSel)return;const v=Math.min(400,Math.max(20,+e.target.value||0));if(!e.target.value||v!==+e.target.value&&(+e.target.value<20))return;spPos(spSel).s=v/100;$("sp-sgSize").value=v;spSgApply(spSel);spPersist()};
$("sp-sgPct").onchange=e=>{if(!spSel)return;const v=Math.min(400,Math.max(20,+e.target.value||100));e.target.value=v;spPos(spSel).s=v/100;$("sp-sgSize").value=v;spSgApply(spSel);spPersist()};
$("sp-sgbar").onclick=e=>{const n=e.target.dataset.n;if(n)spNudge(n,0.5);if(e.target.id==="sp-sgReset"&&spSel){spCur.sigPos[spSel]={x:0,y:0,s:1};spSgApply(spSel);spSelect(spSel);spPersist()}};
document.addEventListener("keydown",e=>{if(!spSel||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const n={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];if(n){e.preventDefault();spNudge(n,e.shiftKey?2:0.5)}});
/* ===== input WhatsApp ===== */
const SPLB={personName:"Pegawai",grade:"Grade",nip:"NIP",jabatan:"Jabatan",berangkat:"Berangkat dari",tujuan:"Tujuan",tglBerangkat:"Tanggal berangkat",lama:"Lama",tglKembali:"Tanggal kembali",maksud:"Maksud",transport:"Transportasi"};
const SPMS={ok:"terbaca",warn:"periksa",missing:"hilang",error:"gagal"};
function spShow(c,k){return k==="lama"?(spLamaOf(c)?spLama(spLamaOf(c)):""):/^tgl/.test(k)?(c[k]?fmtDate(c[k]):""):(c[k]??"")}
$("sp-parse").onclick=()=>{const t=$("sp-wa").value.trim();if(!t){$("sp-parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 const bl=spBlocks(t);if(!bl.length){$("sp-parseOut").innerHTML='<p class="hint w">Tidak ada baris berlabel yang dikenali (Personil, Destinasi SPPD, Maksud SPPD, Estimasi, Tanggal, Transportasi).</p>';return}
 const unk=[];spLast=bl.flatMap(b=>{const r=spBuild(b,SPDB.pegawai,SPDB.settings);unk.push(...r.unk);return r.surat});
 const rows=c=>Object.keys(SPLB).map(k=>{const v=spShow(c,k),s=c.st[k]||(v?{s:"ok",m:""}:{s:"missing",m:"Belum terisi"});return`<tr><td>${SPLB[k]}</td><td>${esc(v)}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${SPMS[s.s]}</span></td></tr>`}).join("");
 $("sp-parseOut").innerHTML=`<p class="hint"><b>${spLast.length} surat terdeteksi</b></p>`+spLast.map((c,i)=>{const n=Object.keys(SPLB).filter(k=>{const v=spShow(c,k),s=c.st[k]||(v?{s:"ok"}:{s:"missing"});return s.s!=="ok"}).length;return`<details${n?" open":""}><summary><b>Surat ${i+1}</b> · ${esc(c.personName||"nama?")} · ${esc(c.tglBerangkat?fmtDate(c.tglBerangkat):"tanggal?")} · ${n?n+" kolom perlu diperiksa":"semua terbaca"}</summary><table class="t">${rows(c)}</table></details>`}).join("")+(unk.length?`<p class="hint w">Baris tidak dikenali (diabaikan): ${unk.map(esc).join(" | ")}</p>`:"")+`<div class="acts"><button class="b" id="sp-apply">Buat ${spLast.length} surat</button></div>`;
 $("sp-apply").onclick=spApply};
async function spApply(){if((spBatch.length>1||spCur.personName||spCur.maksud)&&!await ask("Isi formulir/daftar SPPD saat ini akan diganti dengan "+spLast.length+" surat baru. Lanjutkan?"))return;
 spBatch=spLast.map(c=>{const x=JSON.parse(JSON.stringify(c));delete x.st;return x});spIdx=0;spCur=spBatch[0];spBuildForm();spBuildSheets();spUpdate();toast(spBatch.length+" SPPD dibuat.");$("sp-pane").scrollTop=0}
/* ===== simpan, cetak ===== */
function spSaveRec(status){const c=spCur;c.status=status;c.updatedAt=Date.now();const r=JSON.parse(JSON.stringify(c));delete r.st;if(!r.id){r.id=uid();c.id=r.id;r.createdAt=Date.now()}
 const i=SPDB.records.findIndex(x=>x.id===r.id);if(i>=0)SPDB.records[i]=r;else SPDB.records.push(r);spSave()}
async function spSimpan(status){const bad=status==="selesai"?spBatch.map((c,i)=>spMissing(c).length?"surat "+(i+1)+": "+spMissing(c).join(", "):"").filter(Boolean):[];
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap tandai selesai?"))return;
 const keep=spIdx;spBatch.forEach((c,i)=>{spCur=c;spIdx=i;spSaveRec(status)});spIdx=keep;spCur=spBatch[keep];spPersist();toast(spBatch.length+" SPPD "+(status==="selesai"?"ditandai selesai dan tersimpan.":"tersimpan sebagai draft."))}
$("sp-bDraft").onclick=()=>spSimpan("draft");$("sp-bDone").onclick=()=>spSimpan("selesai");
$("sp-bNew").onclick=async()=>{if((spBatch.length>1||((spCur.personName||spCur.maksud)&&!spCur.id))&&!await ask(spBatch.length>1?"Daftar "+spBatch.length+" SPPD akan ditutup (yang belum disimpan hilang). Lanjutkan?":"Isi formulir saat ini yang belum disimpan akan hilang. Lanjutkan?"))return;
 spCur=spBlank(SPDB.settings);spBatch=[spCur];spIdx=0;spBuildForm();spBuildSheets();spUpdate()};
$("sp-bPrint").onclick=async()=>{const bad=spBatch.map((c,i)=>spMissing(c).length?"surat "+(i+1)+": "+spMissing(c).join(", "):"").filter(Boolean);if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap cetak?"))return;window.print()};
$("sp-bTtd").onclick=()=>{setMode("L");showTab("tt")};
/* ===== PDF ===== */
async function spPdfLetter(pdf,c){pdf.setTextColor(0,0,0);pdf.setDrawColor(0,0,0);const sigs=[];
 for(const e of spLayout(c)){
  if(e.k==="t"){pdf.setFont("helvetica",e.b&&e.i?"bolditalic":e.b?"bold":e.i?"italic":"normal");pdf.setFontSize(e.s);pdf.text(pdfTxt(e.t),e.x,e.y+.905*e.s,{align:e.a==="c"?"center":"left"})}
  else if(e.k==="l"){pdf.setLineWidth(e.w);pdf.line(e.x1,e.y1,e.x2,e.y2)}
  else if(e.k==="i"){if(e.src)pdf.addImage(e.src,"PNG",e.x,e.y,e.w,e.h)}
  else if(e.k==="s"){const s=e.src||spSigImg(e.nama);if(s)sigs.push({src:s,p:e.key,cx:e.cx,cy:e.cy,bw:e.w||105,bh:e.h||56,l:e.l})}}
 for(const g of sigs){const im=await loadImg(g.src);if(!im)continue;const o=((c.sigPos||{})[g.p])||{x:0,y:0,s:1};
  const k=Math.min(1,g.bw/(im.naturalWidth*.75),g.bh/(im.naturalHeight*.75)),w=im.naturalWidth*.75*k*(o.s||1),h=im.naturalHeight*.75*k*(o.s||1);
  pdf.addImage(g.src,"PNG",g.l?g.cx-g.bw/2+(o.x||0)*PX:g.cx+(o.x||0)*PX-w/2,(g.l?g.cy+g.bh/2-h:g.cy-h/2)+(o.y||0)*PX,w,h)}}
function spNamaPdf(list){if(list.length===1){const c=list[0];return"SPPD "+(namaAman(c.personName)||"TANPA NAMA")+" "+(c.tglBerangkat?namaAman(fmtDate(c.tglBerangkat)):"TANPA TANGGAL")+".pdf"}
 const n=[...new Set(list.map(c=>namaAman(c.personName)).filter(Boolean))];return("DAFTAR FILE SPPD "+(n.length<=1?(n[0]||""):n.length<=3?n.join(" & "):n[0]+" DKK")).trim()+".pdf"}
async function spPdf(list){if(pdfBusy)return;if(!list.length){toast("Tidak ada surat.");return}
 const bad=list.map((c,i)=>spMissing(c).length?"surat "+(i+1)+": "+spMissing(c).join(", "):"").filter(Boolean);
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap buat PDF?"))return;
 if(!window.jspdf){toast("Pustaka PDF gagal dimuat. Gunakan tombol Cetak sebagai gantinya.");return}
 pdfBusy=true;
 try{const pdf=new window.jspdf.jsPDF({unit:"pt",format:"a4",orientation:"portrait",compress:true});
  for(let i=0;i<list.length;i++){toast("Membuat PDF: SPPD "+(i+1)+" dari "+list.length+"...");if(i)pdf.addPage("a4","portrait");await spPdfLetter(pdf,list[i])}
  const name=spNamaPdf(list),blob=pdf.output("blob");let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast("PDF disimpan: "+list.length+" SPPD.")}catch(e){toast(e&&e.code==="declined"?"Unduhan dibatalkan.":"Unduhan gagal ("+(e&&e.code||"error")+").")}}
  else{pdf.save(name);toast("PDF dibuat: "+list.length+" SPPD.")}
 }catch(e){toast("Gagal membuat PDF: "+(e&&e.message||e))}finally{pdfBusy=false}}
$("sp-bPdf").onclick=()=>spPdf(spBatch);
/* ===== tab, mode ===== */
function spTab(t){for(const x of["in","pe","ri","se"])$("sp-tab-"+x).hidden=x!==t;document.querySelectorAll("#sp-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="pe")spRenderPeg();if(t==="ri")spRenderRi();if(t==="se")spBuildSet()}
$("sp-tabs").onclick=e=>{if(e.target.dataset.t)spTab(e.target.dataset.t)};
function setMode(m){const S=m==="S";$("left").hidden=S;$("pane").hidden=S;$("sp-left").hidden=!S;$("sp-pane").hidden=!S;document.body.classList.toggle("mode-sppd",S);$("mdL").classList.toggle("on",!S);$("mdS").classList.toggle("on",S);
 document.querySelector("header h1").textContent=S?"Admin SPPD (Surat Perintah Perjalanan Dinas)":"Admin Surat Lembur";try{sessionStorage.setItem("app.mode",m)}catch(e){}
 if(S){spBuildForm();spBuildSheets();spUpdate();setTimeout(spFit,50)}else{try{fit()}catch(e){}setTimeout(()=>{try{fit()}catch(e){}},50)}}
$("mdL").onclick=()=>setMode("L");$("mdS").onclick=()=>setMode("S");
/* ===== pegawai ===== */
let spEditP=null;
function spRenderPeg(){const q=spNorm($("sp-peQ").value),l=SPDB.pegawai.filter(p=>spNorm(p.nama+" "+p.nip+" "+p.jabatan).includes(q)).sort((a,b)=>a.nama.localeCompare(b.nama));
 $("sp-peList").innerHTML=l.length?`<p class="hint">${SPDB.pegawai.length} pegawai tersimpan di browser ini.</p><table class="t">${l.map(p=>`<tr><td><b>${esc(spName(p.nama))}</b><div class="hint">${esc(p.nip)} · grade ${esc(p.grade||"-")} · ${esc(p.jabatan||"")}</div></td><td style="white-space:nowrap"><button class="g" data-e="${esc(p.nip)}">Edit</button> <button class="d" data-x="${esc(p.nip)}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada pegawai. Impor dari Excel atau tambahkan manual di bawah.</p>'}
$("sp-peQ").oninput=spRenderPeg;
function spPeReset(){spEditP=null;["sp-pn","sp-pg","sp-pi","sp-pj"].forEach(i=>$(i).value="");$("sp-peT").textContent="Tambah pegawai"}
$("sp-peReset").onclick=spPeReset;
$("sp-peList").onclick=async e=>{const d=e.target.dataset,p=SPDB.pegawai.find(x=>x.nip===(d.e||d.x));if(!p)return;
 if(d.x){if(await ask("Hapus "+spName(p.nama)+" dari daftar pegawai? Surat yang sudah dibuat tidak berubah.")){SPDB.pegawai=SPDB.pegawai.filter(x=>x!==p);spSave();spRenderPeg();spBuildForm()}return}
 spEditP=p.nip;$("sp-pn").value=p.nama;$("sp-pg").value=p.grade||"";$("sp-pi").value=p.nip;$("sp-pj").value=p.jabatan||"";$("sp-peT").textContent="Edit pegawai"};
$("sp-peSave").onclick=()=>{const n=$("sp-pn").value.trim(),nip=$("sp-pi").value.trim();if(!n||!nip){alert("Nama dan NIP wajib diisi.");return}
 const d={nama:n,grade:$("sp-pg").value.trim(),nip,jabatan:$("sp-pj").value.trim()},ex=SPDB.pegawai.find(x=>x.nip===(spEditP||nip));if(ex)Object.assign(ex,d);else SPDB.pegawai.push(d);spSave();spPeReset();spRenderPeg();spBuildForm()};
const spCell=c=>{let v=c&&c.value;if(v==null)return"";if(typeof v==="object"){if(v.richText)v=v.richText.map(r=>r.text).join("");else if(v.result!=null)v=v.result;else if(v.text!=null)v=v.text;else v=""}return String(v).replace(/\s+/g," ").trim()};
/* Membaca semua sheet yang punya kolom NAMA dan NIP; Grade/Jabatan/Pekerjaan dipakai bila ada. Data digabung per NIP. */
function spParseWb(wb){const map=new Map();
 wb.worksheets.forEach(ws=>{let hr=0,col={};for(let r=1;r<=Math.min(ws.rowCount,20)&&!hr;r++){const cc={};ws.getRow(r).eachCell({includeEmpty:false},(c,i)=>{const t=spNorm(spCell(c));if(t==="nama"||t==="nama pegawai")cc.nama=i;else if(t==="nip"||t==="nip pegawai")cc.nip=i;else if(t==="grade")cc.grade=i;else if(t==="jabatan")cc.jab=i;else if(t==="pekerjaan")cc.pek=i});if(cc.nama&&cc.nip){hr=r;col=cc}}
  if(!hr)return;for(let r=hr+1;r<=ws.rowCount;r++){const row=ws.getRow(r),nama=spCell(row.getCell(col.nama)),nip=spCell(row.getCell(col.nip));if(!nama||!nip||!/\d/.test(nip))continue;
   const grade=col.grade?spCell(row.getCell(col.grade)).replace(/\.0+$/,""):"",jab=col.jab?spCell(row.getCell(col.jab)):col.pek?spCell(row.getCell(col.pek)):"",k=spNorm(nip),x=map.get(k);
   if(x){if(!x.grade&&grade)x.grade=grade;if(!x.jabatan||(col.jab&&jab))x.jabatan=jab||x.jabatan}else map.set(k,{nama,grade,nip,jabatan:jab})}});
 return[...map.values()]}
$("sp-peImp").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;if(!window.ExcelJS){toast("Pustaka Excel gagal dimuat.");return}
 try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());const l=spParseWb(wb);if(!l.length){toast("Tidak ada kolom NAMA dan NIP yang terbaca di file ini.");return}
  let baru=0,upd=0;l.forEach(p=>{const ex=SPDB.pegawai.find(x=>spNorm(x.nip)===spNorm(p.nip));if(ex){upd++;ex.nama=p.nama;if(p.grade)ex.grade=p.grade;if(p.jabatan)ex.jabatan=p.jabatan}else{baru++;SPDB.pegawai.push(p)}});
  spSave();spRenderPeg();spBuildForm();toast("Impor selesai: "+baru+" pegawai baru, "+upd+" diperbarui.")}catch(x){toast("File Excel tidak dapat dibaca: "+(x&&x.message||x))}};
$("sp-peClear").onclick=async()=>{if(!SPDB.pegawai.length){toast("Daftar sudah kosong.");return}if(await ask("Hapus SEMUA "+SPDB.pegawai.length+" pegawai dari daftar? Surat yang sudah dibuat tidak berubah.")){SPDB.pegawai=[];spSave();spRenderPeg();spBuildForm()}};
/* ===== riwayat ===== */
let spShown=[];
function spRenderRi(){const q=spNorm($("sp-rQ").value),a=$("sp-rA").value,b=$("sp-rB").value;
 spShown=SPDB.records.filter(r=>spNorm(r.personName+" "+r.maksud+" "+r.tujuan).includes(q)&&(!a||r.tglBerangkat>=a)&&(!b||r.tglBerangkat<=b)).sort((x,y)=>(y.tglBerangkat||"").localeCompare(x.tglBerangkat||""));
 $("sp-rList").innerHTML=spShown.length?`<table class="t">${spShown.map(r=>`<tr><td><b>${esc(r.personName||"(tanpa nama)")}</b><div class="hint">${esc(r.tglBerangkat?fmtDate(r.tglBerangkat):"")} · ${esc(r.berangkat)} - ${esc(r.tujuan)}</div><div class="hint">${esc(r.maksud)}</div></td><td><span class="bd ${r.status==="selesai"?"ok":"warn"}">${r.status}</span></td><td style="white-space:nowrap"><button class="g" data-p="${r.id}">PDF</button> <button class="g" data-o="${r.id}">Buka</button> <button class="g" data-c="${r.id}">Duplikat</button> <button class="d" data-x="${r.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada riwayat SPPD.</p>'}
["sp-rQ","sp-rA","sp-rB"].forEach(i=>$(i).oninput=spRenderRi);$("sp-rPdf").onclick=()=>spPdf(spShown);
$("sp-rList").onclick=async e=>{const t=e.target.dataset,r=SPDB.records.find(x=>x.id===(t.o||t.c||t.x||t.p));if(!r)return;
 if(t.p){spPdf([r]);return}if(t.x){if(await ask("Hapus catatan ini secara permanen?")){SPDB.records=SPDB.records.filter(x=>x!==r);spSave();spRenderRi()}return}
 const c=JSON.parse(JSON.stringify(r));c.flags={};if(t.c){c.id=null;c.status="draft";c.tglBerangkat="";c.tglKembali="";c.tglTerbit=""}
 spCur=c;spBatch=[c];spIdx=0;spBuildForm();spBuildSheets();spUpdate();spTab("in")};
/* ===== pengaturan ===== */
const SPSG=[["Kop surat",[["kopPt","Nama perusahaan",1],["kopUnit","Unit",1],["kopAlm","Alamat",1],["kodeForm","Nomor formulir"],["revisi","Revisi"],["tglForm","Tanggal formulir"]]],
 ["Pejabat yang memberi perintah (tetap, tampil di baris 1 dan blok tanda tangan)",[["pjNama","Nama"],["pjGrade","Grade"],["pjNip","NIP"],["pjJab","Jabatan (di tabel)",1],["pjTtdJab","Jabatan (di blok tanda tangan)",1]]],
 ["Menyetujui",[["gmNama","Nama"],["gmJab","Jabatan"]]],
 ["Bawaan surat",[["kotaTerbit","Dikeluarkan di"],["kotaAsal","Tempat berangkat bawaan"],["sufiksUnit","Akhiran jabatan pegawai (mis. ULTG Parepare)",1]]]];
function spBuildSet(){$("sp-seForm").innerHTML=`<p class="hint">Perubahan berlaku untuk surat baru. NIP dan data pribadi hanya disimpan di browser ini (tidak ikut di kode program).</p>`+SPSG.map(([j,f])=>`<h4 class="sec">${j}</h4>`+f.map(([k,l,p])=>`<div class="fld${p?" fw":""}"><label>${l}</label><input data-ss="${k}" value="${esc(SPDB.settings[k])}"></div>`).join("")).join("")+spParafBlok();spParafUi()}
function spParafUi(){const v=SPDB.settings.paraf||"";const im=$("sp-parafImg");if(!im)return;if(v)im.src=v;else im.removeAttribute("src");$("sp-parafDel").hidden=!v}
function spParafBlok(){return`<h4 class="sec">Paraf (tampil di setiap surat, ujung kanan bawah)</h4><div class="fld fw"><label>Gambar paraf (PNG/JPG/WEBP, maks 1 MB)</label><input type="file" id="sp-parafFile" accept="image/png,image/jpeg,image/webp"><img id="sp-parafImg" class="sg-prev" alt="" style="height:50px;max-width:160px;margin-top:6px"><div class="acts"><button class="d" id="sp-parafDel" hidden>Hapus paraf</button></div><p class="hint">Setelah diunggah, paraf langsung muncul di semua surat SPPD. Posisi dan ukuran bisa digeser/diubah per surat dengan mengklik parafnya di pratinjau.</p></div>`}
$("sp-seForm").addEventListener("change",e=>{if(e.target.id!=="sp-parafFile")return;const f=e.target.files[0];e.target.value="";readSig(f,d=>{SPDB.settings.paraf=d;spSave();spParafUi();spUpdate();toast("Paraf tersimpan dan dipakai di semua surat.")})});
$("sp-seForm").addEventListener("click",async e=>{if(e.target.id!=="sp-parafDel")return;if(await ask("Hapus paraf dari semua surat?")){delete SPDB.settings.paraf;spSave();spParafUi();spUpdate()}});
$("sp-seSave").onclick=()=>{document.querySelectorAll("[data-ss]").forEach(el=>{const k=el.dataset.ss;SPDB.settings[k]=el.value});spSave();spUpdate();alert("Pengaturan SPPD tersimpan.")};
$("sp-exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(SPDB)],{type:"application/json"}));a.download="cadangan-sppd-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("sp-imp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader;r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.records)||!Array.isArray(d.pegawai))throw 0;if(!await ask("Impor akan MENGGANTI seluruh data SPPD (pegawai, riwayat, pengaturan). Lanjutkan?"))return;
 SPDB={pegawai:d.pegawai,records:d.records,settings:{...SP_DEF,...d.settings}};spSave();spBuildForm();alert("Impor berhasil.")}catch(x){alert("File cadangan SPPD tidak valid.")}};r.readAsText(f)};
/* ===== uji bawaan ===== */
$("sp-selfTest").onclick=()=>{const T=[],t=(n,c)=>T.push((c?"LULUS ":"GAGAL ")+n);
 const peg=[{nama:"IKHWAN ALWI",grade:12,nip:"9617047FBY",jabatan:"TL K3 & KAM"},{nama:"SAMSU ALAM",grade:14,nip:"7293107F",jabatan:" MANAGER"},{nama:"MUARIS ",grade:10,nip:"9515022FY",jabatan:"JTC HAR GI"},{nama:"MUH. APRIZAL A",grade:12,nip:"96191146ZY",jabatan:"TL HAR PROTEK"}];
 const wa="Form SPPD:\nPersonil :\n1. \u2060Ikhwan\n\nDestinasi SPPD : Parepare - Pinrang\n\nMaksud SPPD : Koordinasi TJSL TPS3R Tadokkong\nEstimasi : 1 hari\nTanggal : 13 Oktober 2026\n\u2060Transportasi : Kendaraan dinas PP";
 const r=spBuild(spBlocks(wa)[0],peg,{}).surat[0];
 t("parser: pegawai dicocokkan",r.personName==="Ikhwan Alwi"&&r.grade==="12"&&r.nip==="9617047FBY");t("parser: jabatan + akhiran unit",r.jabatan==="TL K3 & KAM ULTG Parepare");
 t("parser: rute & awalan",r.berangkat==="Kota Parepare"&&r.tujuan==="Kab. Pinrang");t("parser: tanggal & kembali",r.tglBerangkat==="2026-10-13"&&r.tglKembali==="2026-10-13"&&r.lama===1);
 t("tata letak: baris 7 = Melaksanakan + maksud",spLayout(r).some(e=>e.t===": Melaksanakan Koordinasi TJSL TPS3R Tadokkong"));t("parser: karakter tak terlihat diabaikan",r.transport==="Kendaraan Dinas PP");
 const m=spBuild(spBlocks("Personil:\n1. Samsu\n2. Muaris\nDestinasi: Pare-Pare - Polman\nMaksud: Rapat\nEstimasi: 3 hari\nTanggal: 13 Oktober 2026\nTransportasi: Kendaraan dinas")[0],peg,{}).surat;
 t("multi personil -> 2 surat",m.length===2&&m[1].personName==="Muaris");t("estimasi 3 hari -> kembali 15 Oktober",m[0].tglKembali==="2026-10-15"&&spLama(3)==="3 ( Tiga ) hari");
 t("rute 'Pare-Pare' tidak terbelah",spRute("Pare-Pare - Polman").b==="Pare-Pare"&&spRute("Parepare-Pinrang").t==="Pinrang");
 const g=spBuild(spBlocks("Personil: Budi\nDestinasi: Makassar\nMaksud: X\nTanggal: 13-15 Oktober 2026\nTransportasi: Mobil")[0],peg,{}).surat[0];t("rentang tanggal 13-15 = 3 hari",g.tglBerangkat==="2026-10-13"&&g.tglKembali==="2026-10-15"&&g.lama===3);
 t("pegawai tak dikenal diberi tanda",g.flags.personName&&!g.nip);t("dua blok 'Form SPPD'",spBlocks(wa+"\n\nForm SPPD:\nPersonil: Muaris\nDestinasi: A - B").length===2);
 t("Pada tanggal = tanggal berangkat",spLayout(r).some(e=>e.t===": 13 Oktober 2026"&&e.y>600)&&spLamaOf({tglBerangkat:"2026-10-13",tglKembali:"2026-10-15"})===3);
 $("sp-testOut").textContent=T.join("\n")};
/* ===== mulai ===== */
spBuildForm();spBuildSheets();spUpdate();spButtons();
try{if(sessionStorage.getItem("app.mode")==="S")setMode("S")}catch(e){}
