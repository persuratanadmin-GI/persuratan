"use strict";
/* Restitusi SPPD - antarmuka: formulir tiga surat, input WhatsApp (format sama dengan SPPD), pratinjau, PDF/cetak,
   daftar lokasi (stempel + pejabat), riwayat, pengaturan. Data disimpan terpisah (localStorage "restitusi.v1").
   Pegawai dan tanda tangan DIPAKAI BERSAMA dari modul SPPD/Lembur (SPDB.pegawai, sigLookup); tidak ada salinan data. */
const RSK="restitusi.v1";
const rsLkId=n=>"lk-"+spNorm(n).replace(/ /g,"-");
function rsLoad(){try{const d=JSON.parse(localStorage.getItem(RSK));if(d)return{records:d.records||[],lokasi:d.lokasi||[],settings:{...RS_DEF,...d.settings}}}catch(e){}
 return{records:[],lokasi:RS_LOKASI_SEED.map(([n,k])=>({id:rsLkId(n),nama:n,kunci:k,pejabat:"",stempel:"",stAr:1,ttd:"",stW:0})),settings:{...RS_DEF}}}
let RSDB=rsLoad();
function rsSave(){try{localStorage.setItem(RSK,JSON.stringify(RSDB));$("st").textContent="Restitusi tersimpan "+new Date().toLocaleTimeString("id-ID")}catch(e){$("st").textContent="Gagal menyimpan: penyimpanan penuh/dinonaktifkan"}}
/* ===== state ===== */
let rsBatch=[],rsIdx=0,rsCur=null,rsSel=null,rsScale=1,rsDrag=null,rsLast=[],rsInc={R:1,P:1,B:1},rsFmt="gabung";
const rsNew=()=>{const r=rsBlank();r.berangkat=spTempat(SPDB.settings.kotaAsal||RSDB.settings.kotaAsal||"").v;return r};
try{const b=JSON.parse(sessionStorage.getItem("rs.batch"));if(b&&b.batch&&b.batch.length){rsBatch=b.batch;rsIdx=Math.min(b.idx||0,rsBatch.length-1);if(b.inc)rsInc=b.inc;if(b.fmt)rsFmt=b.fmt}}catch(e){}
if(!rsBatch.length)rsBatch=[rsNew()];
rsCur=rsBatch[rsIdx];
const rsPersist=()=>{try{sessionStorage.setItem("rs.batch",JSON.stringify({batch:rsBatch,idx:rsIdx,inc:rsInc,fmt:rsFmt}))}catch(e){}};
const rsLetters=()=>["R","P","B"].filter(l=>rsInc[l]);
const RSREQ=["personName","nip","jabatan","maksud","berangkat","tujuan","tglBerangkat","tglKembali","tripSap"];
const RSFULL=["maksud","jabatan","personName","rMaksud","pMaksud","bMaksud","bKet","tujuan","rTujuan","rTgl"];
const RSMONEY=["amtB","amtP","amtH"];
/* [kunci, label, jenis]. Kolom yang ada di RS_AUTO terisi otomatis dan bisa ditimpa manual (kosongkan = kembali otomatis). */
const RSF=[["#","Pegawai yang melaksanakan (dari daftar pegawai SPPD)"],["@pg"],["personName","Nama pegawai"],["grade","Grade"],["nip","NIP"],["jabatan","Jabatan (tampil di surat)"],
 ["#","Perjalanan (dipakai oleh ketiga surat)"],["maksud","Maksud perjalanan","area"],["berangkat","Tempat berangkat"],["tujuan","Tempat tujuan (beberapa tempat: pisahkan dengan koma)"],["tglBerangkat","Tanggal berangkat","date"],["tglKembali","Tanggal kembali","date"],["lama","Lama (otomatis dari tanggal)","ro"],
 ["#","1. Remburse Lumsum (Form 3)"],["tripSap","Nomor Trip SAP"],["rNama","Nama di surat"],["rTujuan","Tujuan (tampil di surat)"],["rTgl","Tgl perjalanan (tampil di surat)"],["rLama","Lama perjalanan (tampil di surat)"],["rMaksud","Maksud perjalanan (tampil di surat)","area"],
 ["@amt"],["amtB","Tiket berangkat (Rp)","money"],["stB","Keterangan tiket berangkat"],["amtP","Tiket pulang (Rp)","money"],["stP","Keterangan tiket pulang"],["amtH","Penginapan / hotel (Rp)","money"],["stH","Keterangan penginapan"],
 ["calcJ","Jumlah transportasi (otomatis)","calc"],["calcT","Total (otomatis)","calc"],["stBoard","Boarding pass"],["stCap","Cap / bukti SPPD"],["stSurat","Surat pernyataan"],["bank","Data Bank"],
 ["#","2. Surat Pernyataan"],["pNama","Nama"],["pNip","NIP"],["pJab","Jabatan"],["pMaksud","Maksud perjalanan (dalam tanda kutip, mengikuti Remburse)","area"],["pTglA","Tanggal mulai","date"],["pTglB","Tanggal sampai dengan","date"],
 ["#","3. Blangko SPPD (Lampiran VII)"],["bNama","Nama"],["bNip","NIP"],["bUnit","Unit"],["bMaksud","Maksud (mengikuti Remburse)","area"],["bPeriode","Periode"],
 ["bAsal","Berangkat dari (tempat kedudukan)"],["bAsalTgl","Pada tanggal","date"],["bPejAsal","Pejabat penandatangan (blok I dan akhir)"],
 ["@stop",1],["@stop",2],["@stop",3],
 ["bKota","Tiba kembali di"],["bKembaliTgl","Tanggal tiba kembali","date"],["bPejFinal","Pejabat yang memberi perintah (bawah)"],["bKet","Keterangan lain-lain","area"],["@note"]];
const rsFmtMoney=v=>{const n=rsNum(v);return n?String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"."):""};
const rsLokOpts=()=>'<option value="">(tidak ada)</option><option value="-">Tanpa stempel/TTD</option>'+RSDB.lokasi.map(l=>`<option value="${esc(l.id)}">${esc(l.nama)}</option>`).join("");
function rsField(k,l,t){const rq=RSREQ.includes(k),rc=rq?' class="req"':"";let a;
 if(t==="area")a=`<textarea data-rk="${k}"${rc}></textarea>`;
 else if(t==="ro"||t==="calc")a=`<input data-rk="${k}" data-ro="1" readonly tabindex="-1" class="calc">`;
 else if(t==="sel")a=`<select data-rk="${k}">${rsLokOpts()}</select>`;
 else a=`<input data-rk="${k}" type="${t==="date"?"date":"text"}"${t==="money"?' inputmode="numeric" placeholder="kosong = tidak ada"':""}${k==="personName"?' list="rs-dl" autocomplete="off"':""}${rc}>`;
 return`<div class="fld${RSFULL.includes(k)?" fw":""}${rq?" isreq":""}"><label>${l}${rq?' <span class="rq">*</span>':""}</label>${a}</div>`}
function rsBuildForm(){$("rs-form").innerHTML=RSF.map(([k,l,t])=>{
 if(k==="#")return`<h4 class="sec">${l}</h4>`;
 if(k==="@note")return`<p class="hint fw">Kolom berwarna biru diisi manual. Kosongkan kolom itu (lalu pindah ke kolom lain) agar kembali mengikuti isian otomatis. Kutipan dan tanggal Surat Pernyataan serta Maksud Blangko selalu mengikuti Remburse Lumsum kecuali Anda menimpanya.</p>`;
 if(k==="@amt")return`<p class="hint fw">Isi nominal tanpa titik/koma, mis. 150000. Nominal kosong: keterangan otomatis "-"; ada nominal: otomatis "Cash". Jumlah dan Total dihitung otomatis.</p>`;
 if(k==="@stop")return`<h4 class="sec">Pemberhentian ${l}${l===1?" (blok II)":l===2?" (blok III)":" (blok IV)"} - stempel dan tanda tangan lokasi</h4>`+rsField("s"+l+"n","Tiba di / berangkat dari")+rsField("s"+l+"l","Lokasi (stempel &amp; TTD)","sel")+rsField("s"+l+"t","Tiba pada tanggal","date")+rsField("s"+l+"b","Berangkat pada tanggal","date");
 if(k==="@pg")return`<div class="fld fw"><label>Pilih dari daftar pegawai</label><datalist id="rs-dl">${SPDB.pegawai.map(p=>`<option value="${esc(spName(p.nama))}"></option>`).join("")}</datalist><select data-sel="pg"><option value="">- ${SPDB.pegawai.length?"pilih pegawai":"daftar kosong: isi di tab Pegawai (mode SPPD)"} -</option>${[...SPDB.pegawai].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p=>`<option value="${esc(p.nip)}">${esc(spName(p.nama))} · ${esc(p.nip)}</option>`).join("")}</select></div>`;
 return rsField(k,l,t)}).join("");rsSync()}
function rsShowVal(k){const r=rsCur;if(k==="lama"){const n=spLamaOf(r);return n?String(n):""}
 if(k==="calcJ"){const t=rsTotals(r);return t.jumlah?"Rp. "+rsRp(t.jumlah):""}if(k==="calcT"){const t=rsTotals(r);return t.total?"Rp. "+rsRp(t.total):""}
 if(RSMONEY.includes(k))return rsFmtMoney(r[k]);return rsGet(r,k)}
function rsSync(skip){document.querySelectorAll("[data-rk]").forEach(el=>{const k=el.dataset.rk;if(el!==skip)el.value=rsShowVal(k);
 el.classList.toggle("man",rsIsMan(rsCur,k));const fk=k==="personName"?"personName":k;el.classList.toggle("warn",!!rsCur.flags?.[fk]);el.title=rsCur.flags?.[fk]||(rsIsMan(rsCur,k)?"Diisi manual - kosongkan untuk kembali otomatis":"");
 el.classList.toggle("need",RSREQ.includes(k)&&!String(el.value).trim())})}
function rsPegFill(p){Object.assign(rsCur,{grade:String(p.grade||""),nip:p.nip,jabatan:spJab(p.jabatan,SPDB.settings.sufiksUnit)});if(rsCur.flags){delete rsCur.flags.grade;delete rsCur.flags.nip;delete rsCur.flags.jabatan}}
function rsSetLama(){rsCur.lama=spLamaOf(rsCur)||rsCur.lama}
function rsApply(k,v){const c=rsCur;
 if(k==="personName"){c.personName=v;const h=spCari(SPDB.pegawai,v);if(h.p){rsPegFill(h.p);c.autoPeg=true;delete c.flags.personName}else if(c.autoPeg){c.grade="";c.nip="";c.jabatan="";c.autoPeg=false}return}
 if(k==="tglBerangkat"){c.tglBerangkat=v;if(v)c.tglKembali=spAddDays(v,(c.lama||1)-1);rsSetLama();return}
 if(k==="tglKembali"){c.tglKembali=v;rsSetLama();if(c.tglBerangkat&&v&&!spLamaOf(c))c.flags.tglKembali="Tanggal kembali sebelum tanggal berangkat";else delete c.flags.tglKembali;return}
 if(k==="tujuan"){c.tujuan=v;return}
 rsSet(c,k,v);if(c.flags&&c.flags[k])delete c.flags[k]}
$("rs-form").addEventListener("input",e=>{const k=e.target.dataset.rk;if(!k||e.target.dataset.ro)return;rsApply(k,e.target.value);rsSync(e.target);rsUpdate()});
$("rs-form").addEventListener("change",e=>{const el=e.target;
 if(el.dataset.sel==="pg"){const p=SPDB.pegawai.find(x=>x.nip===el.value);if(!p)return;rsCur.personName=spName(p.nama);rsPegFill(p);rsCur.autoPeg=true;delete rsCur.flags.personName;rsSync();rsUpdate();return}
 const k=el.dataset.rk;if(!k)return;
 if(k==="personName"){const h=spCari(SPDB.pegawai,el.value);if(h.p){rsCur.personName=spName(h.p.nama);rsPegFill(h.p)}}
 if(RSMONEY.includes(k))rsCur[k]=rsFmtMoney(el.value);
 rsSync();rsUpdate()});
/* ===== pratinjau ===== */
function rsHtml(L,c){const o=[],k=e=>`left:${e.x}pt;top:${e.y.toFixed(2)}pt;`;
 for(const e of rsLayout(c,L)){
  if(e.k==="t"){const ce=e.a==="c",ri=e.a==="r",st=`font-size:${e.s}pt;line-height:${(e.s*1.117).toFixed(2)}pt;${e.b?"font-weight:bold;":""}`;
   const pos=e.j?`left:${e.x}pt;width:${e.j}pt;white-space:nowrap;text-align:justify;text-align-last:justify;`:ce?`left:${e.x-250}pt;width:500pt;text-align:center;`:ri?`left:${e.x-500}pt;width:500pt;text-align:right;`:`left:${e.x}pt;`;
   o.push(`<div class="sp-t" style="${pos}top:${e.y.toFixed(2)}pt;${st}">${esc(e.t)}</div>`)}
  else if(e.k==="l"){const h=e.y1===e.y2;o.push(`<div class="sp-l" style="left:${h?e.x1:e.x1-e.w/2}pt;top:${(h?e.y1-e.w/2:e.y1).toFixed(2)}pt;width:${h?e.x2-e.x1:e.w}pt;height:${h?e.w:e.y2-e.y1}pt"></div>`)}
  else if(e.k==="rr")o.push(`<div class="sp-l" style="background:none;border:${e.lw}pt solid #000;border-radius:${e.r}pt;left:${e.x}pt;top:${e.y}pt;width:${e.w-e.lw*2}pt;height:${e.h-e.lw*2}pt"></div>`);
  else if(e.k==="i"){if(e.src)o.push(`<img class="sp-i" src="${e.src}" alt="" style="left:${e.x}pt;top:${e.y}pt;width:${e.w}pt;height:${e.h}pt">`)}
  else if(e.k==="s"){if(!e.src)continue;const p=(c.sigPos||{})[e.key]||{},bw=e.w||105,bh=e.h||56;
   o.push(`<div class="sp-sig" style="left:${(e.cx-bw/2).toFixed(2)}pt;top:${(e.cy-bh/2).toFixed(2)}pt;width:${bw}pt;height:${bh}pt"><span class="sgb${rsSel===e.key&&c===rsCur?" sel":""}" data-p="${e.key}" title="Seret: geser · roda mouse: ukuran" style="--s:${p.s||1};transform:translate(${p.x||0}mm,${p.y||0}mm) scale(${p.s||1})"><img src="${e.src}" alt="" draggable="false"${e.ex?` style="width:${bw.toFixed(2)}pt;height:${bh.toFixed(2)}pt;max-width:none;max-height:none"`:` style="max-width:${bw}pt;max-height:${bh}pt"`}><i class="sgh"></i></span></div>`)}}
 return`<div class="sp-pg">${o.join("")}</div>`}
function rsTitle(i,L){const c=rsBatch[i];return"Restitusi "+(i+1)+" dari "+rsBatch.length+" · "+(c.personName||"(belum ada nama)")+" · "+RS_LETTERS[L]}
function rsBuildSheets(){const ls=rsLetters();
 $("rs-sheets").innerHTML=ls.length?rsBatch.map((c,i)=>ls.map(L=>`<div class="lw${i===rsIdx?" act":""}" data-i="${i}" data-l="${L}"><div class="lbar"><span class="lt">${esc(rsTitle(i,L))}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${rsHtml(L,c)}</div></div></div></div>`).join("")).join(""):'<p class="hint">Pilih minimal satu surat pada kotak Keluaran.</p>';
 const bb=$("rs-batchbar");bb.hidden=rsBatch.length<2;bb.innerHTML=`<b>${rsBatch.length} pegawai</b> ${rsBatch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" ")} <button class="b nv" id="rs-pdfAktif">PDF pegawai ini</button> <button class="g" id="rs-hapusAktif">Hapus pegawai ini</button>`;rsFit()}
function rsFit(){const p=$("rs-pane"),w=p.clientWidth-48;if(w<=0)return;const s=Math.min(1,w/794);rsScale=s;document.querySelectorAll("#rs-sheets .shbox").forEach(b=>b.style.transform=`scale(${s})`);document.querySelectorAll("#rs-sheets .shwrap").forEach(b=>{b.style.height=1123*s+"px";b.style.width=794*s+"px"})}
window.addEventListener("resize",()=>{if(!$("rs-pane").hidden)rsFit()});
function rsPaint(i){for(const L of rsLetters()){const lw=document.querySelector(`#rs-sheets .lw[data-i="${i}"][data-l="${L}"]`);if(!lw)continue;lw.querySelector(".sheet").innerHTML=rsHtml(L,rsBatch[i]);lw.querySelector(".lt").textContent=rsTitle(i,L)}}
function rsHintText(){const c=rsCur,x=rsCtx(),m=rsMissing(c),sn=[];
 if(c.personName&&!rsSigOf(c.personName))sn.push("pegawai "+c.personName);
 if(rsInc.B){const pa=rsGet(c,"bPejAsal",x);if(pa&&!rsSigOf(pa))sn.push("pejabat asal "+pa);if(!x.S.stempelAsal)sn.push("stempel pejabat asal (Pengaturan)");
  [1,2,3].forEach(i=>{const s=rsStopInfo(c,i,x);if(!s.n)return;if(!s.lok)sn.push("lokasi "+s.n+" belum terdaftar (tab Lokasi)");else{if(!s.lok.stempel)sn.push("stempel "+s.lok.nama);if(!s.ttd&&!s.lok.menyatu)sn.push("TTD "+(s.pej||"pejabat "+s.lok.nama))}})}
 return[m.length?"Belum lengkap: "+m.join(", "):"",sn.length?"Belum terdaftar: "+sn.join(", ")+" (tab Lokasi / Tanda Tangan)":""].filter(Boolean).join(" · ")}
function rsUpdate(){if(rsCur!==rsBatch[rsIdx]){rsBatch=[rsCur];rsIdx=0}
 if($("rs-sheets").querySelectorAll(".lw").length!==rsBatch.length*rsLetters().length)rsBuildSheets();else rsPaint(rsIdx);
 rsPersist();rsButtons();if(rsSel&&!document.querySelector('#rs-sheets .lw.act .sgb[data-p="'+rsSel+'"]'))rsSelect(null);$("rs-hint").textContent=rsHintText()}
function rsButtons(){const s=rsBatch.length>1?" ("+rsBatch.length+")":"";[["rs-bDraft","Simpan draft"],["rs-bDone","Tandai selesai"],["rs-bPdf",rsBatch.length>1?"Unduh semua PDF":"Unduh PDF"],["rs-bPrint","Cetak"]].forEach(([id,t])=>{$(id).textContent=t+s})}
function rsActive(i){rsIdx=i;rsCur=rsBatch[i];document.querySelectorAll("#rs-sheets .lw").forEach(e=>e.classList.toggle("act",+e.dataset.i===i));rsSelect(null);rsSync();rsUpdate()}
$("rs-batchbar").onclick=async e=>{if(e.target.id==="rs-pdfAktif"){rsPdf([rsCur]);return}
 if(e.target.id==="rs-hapusAktif"&&rsBatch.length>1&&await ask("Hapus pegawai ke-"+(rsIdx+1)+" dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){rsBatch.splice(rsIdx,1);rsIdx=Math.min(rsIdx,rsBatch.length-1);rsCur=rsBatch[rsIdx];rsBuildForm();rsBuildSheets();rsUpdate();return}
 const g=e.target.dataset.go;if(g!==undefined){rsActive(+g);const w=document.querySelector(`#rs-sheets .lw[data-i="${g}"]`);if(w)w.scrollIntoView({block:"nearest"})}};
$("rs-sheets").addEventListener("click",e=>{const lw=e.target.closest(".lw");if(!lw)return;const i=+lw.dataset.i;if(i!==rsIdx)rsActive(i)});
document.querySelectorAll("[data-inc]").forEach(b=>{b.checked=!!rsInc[b.dataset.inc];b.onchange=()=>{rsInc[b.dataset.inc]=b.checked?1:0;rsBuildSheets();rsUpdate()}});
$("rs-fmt").value=rsFmt;$("rs-fmt").onchange=e=>{rsFmt=e.target.value;rsPersist()};
/* ===== tanda tangan / stempel: seret, ubah ukuran (posisi disimpan per pegawai) ===== */
function rsSgLabel(k){const m=/^S(\d)([LR])\.(cap|ttd)$/.exec(k);if(m)return"Blok "+(+m[1]+2)+(m[2]==="L"?" tiba":" berangkat")+" · "+(m[3]==="cap"?"stempel":"tanda tangan");
 return{"R.TTD":"Tanda tangan pegawai (Remburse)","P.TTD":"Tanda tangan pegawai (Pernyataan)","A.ttd":"TTD pejabat blok I","A.cap":"Stempel blok I","F.ttd":"TTD pejabat (tiba kembali)","F.cap":"Stempel (tiba kembali)"}[k]||k}
function rsPos(p){rsCur.sigPos=rsCur.sigPos||{};return rsCur.sigPos[p]=rsCur.sigPos[p]||{x:0,y:0,s:1}}
function rsSgApply(p){const o=rsPos(p);document.querySelectorAll("#rs-sheets .lw.act .sgb").forEach(i=>{if(i.dataset.p!==p)return;i.style.setProperty("--s",o.s);i.style.transform=`translate(${o.x}mm,${o.y}mm) scale(${o.s})`})}
function rsSelect(p){rsSel=p;document.querySelectorAll("#rs-sheets .lw .sgb[data-p]").forEach(i=>i.classList.toggle("sel",i.closest(".lw").classList.contains("act")&&i.dataset.p===p));$("rs-sgctl").hidden=!p;$("rs-sgbar").hidden=!p;if(p){$("rs-sgName").textContent=rsSgLabel(p);const s=Math.round(rsPos(p).s*100);$("rs-sgSize").value=s;$("rs-sgPct").value=s}}
function rsNudge(n,st){if(!rsSel)return;const o=rsPos(rsSel);if(n==="l")o.x=+(o.x-st).toFixed(1);if(n==="r")o.x=+(o.x+st).toFixed(1);if(n==="u")o.y=+(o.y-st).toFixed(1);if(n==="d")o.y=+(o.y+st).toFixed(1);rsSgApply(rsSel);rsPersist()}
$("rs-sheets").addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const p=b.dataset.p,lw=b.closest(".lw");if(+lw.dataset.i!==rsIdx)rsActive(+lw.dataset.i);rsSelect(p);const o=rsPos(p);
 rsDrag={p,mode:e.target.classList.contains("sgh")?"size":"move",x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,s0:o.s,w:b.getBoundingClientRect().width||1};b.setPointerCapture(e.pointerId)});
$("rs-sheets").addEventListener("pointermove",e=>{if(!rsDrag)return;const o=rsPos(rsDrag.p);
 if(rsDrag.mode==="size"){const d=((e.clientX-rsDrag.x0)+(e.clientY-rsDrag.y0))/2;o.s=+Math.min(4,Math.max(.2,rsDrag.s0*(1+2*d/rsDrag.w))).toFixed(2);const v=Math.round(o.s*100);$("rs-sgSize").value=v;$("rs-sgPct").value=v}
 else{const k=25.4/96/(rsScale||1);o.x=+(rsDrag.ox+(e.clientX-rsDrag.x0)*k).toFixed(1);o.y=+(rsDrag.oy+(e.clientY-rsDrag.y0)*k).toFixed(1)}
 rsSgApply(rsDrag.p)});
const rsEnd=()=>{if(rsDrag){rsDrag=null;rsPersist()}};$("rs-sheets").addEventListener("pointerup",rsEnd);$("rs-sheets").addEventListener("pointercancel",rsEnd);
$("rs-sheets").addEventListener("wheel",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const lw=b.closest(".lw");if(+lw.dataset.i!==rsIdx)rsActive(+lw.dataset.i);rsSelect(b.dataset.p);const o=rsPos(b.dataset.p);o.s=+Math.min(4,Math.max(.2,o.s*(e.deltaY<0?1.06:1/1.06))).toFixed(2);rsSgApply(b.dataset.p);$("rs-sgSize").value=Math.round(o.s*100);$("rs-sgPct").value=Math.round(o.s*100);rsPersist()},{passive:false});
document.addEventListener("pointerdown",e=>{if(rsSel&&!e.target.closest("#rs-sgbar")&&!e.target.closest(".sgb"))rsSelect(null)});
$("rs-sgSize").oninput=e=>{if(!rsSel)return;rsPos(rsSel).s=e.target.value/100;$("rs-sgPct").value=e.target.value;rsSgApply(rsSel);rsPersist()};
$("rs-sgPct").onchange=e=>{if(!rsSel)return;const v=Math.min(400,Math.max(20,+e.target.value||100));e.target.value=v;rsPos(rsSel).s=v/100;$("rs-sgSize").value=v;rsSgApply(rsSel);rsPersist()};
$("rs-sgbar").onclick=e=>{const n=e.target.dataset.n;if(n)rsNudge(n,0.5);if(e.target.id==="rs-sgReset"&&rsSel){rsCur.sigPos[rsSel]={x:0,y:0,s:1};rsSgApply(rsSel);rsSelect(rsSel);rsPersist()}};
document.addEventListener("keydown",e=>{if(!rsSel||$("rs-pane").hidden||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const n={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];if(n){e.preventDefault();rsNudge(n,e.shiftKey?2:0.5)}});
/* ===== input WhatsApp (format dan parser sama dengan SPPD) ===== */
$("rs-parse").onclick=()=>{const t=$("rs-wa").value.trim();if(!t){$("rs-parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 const bl=spBlocks(t);if(!bl.length){$("rs-parseOut").innerHTML='<p class="hint w">Tidak ada baris berlabel yang dikenali (Personil, Destinasi SPPD, Maksud SPPD, Estimasi, Tanggal, Transportasi).</p>';return}
 const unk=[];rsLast=bl.flatMap(b=>{const r=spBuild(b,SPDB.pegawai,SPDB.settings);unk.push(...r.unk);return r.surat.map(c=>({rec:rsFromSp(c),st:c.st}))});
 const rows=x=>Object.keys(SPLB).map(k=>{const v=spShow(x.rec,k),s=x.st[k]||(v?{s:"ok",m:""}:{s:"missing",m:"Belum terisi"});return`<tr><td>${SPLB[k]}</td><td>${esc(v)}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${SPMS[s.s]}</span></td></tr>`}).join("");
 $("rs-parseOut").innerHTML=`<p class="hint"><b>${rsLast.length} pegawai terdeteksi</b> - masing-masing mendapat Remburse Lumsum, Surat Pernyataan, dan Blangko.</p>`+rsLast.map((x,i)=>{const n=Object.keys(SPLB).filter(k=>{const v=spShow(x.rec,k),s=x.st[k]||(v?{s:"ok"}:{s:"missing"});return s.s!=="ok"}).length;return`<details${n?" open":""}><summary><b>Pegawai ${i+1}</b> · ${esc(x.rec.personName||"nama?")} · ${esc(x.rec.tglBerangkat?fmtDate(x.rec.tglBerangkat):"tanggal?")} · ${n?n+" kolom perlu diperiksa":"semua terbaca"}</summary><table class="t">${rows(x)}</table></details>`}).join("")+(unk.length?`<p class="hint w">Baris tidak dikenali (diabaikan): ${unk.map(esc).join(" | ")}</p>`:"")+`<div class="acts"><button class="b" id="rs-apply">Buat ${rsLast.length} set surat</button></div>`;
 $("rs-apply").onclick=rsApplyParse};
async function rsApplyParse(){if((rsBatch.length>1||rsCur.personName||rsCur.maksud)&&!await ask("Isi formulir/daftar restitusi saat ini akan diganti dengan "+rsLast.length+" set surat baru. Lanjutkan?"))return;
 rsBatch=rsLast.map(x=>JSON.parse(JSON.stringify(x.rec)));rsIdx=0;rsCur=rsBatch[0];rsBuildForm();rsBuildSheets();rsUpdate();toast(rsBatch.length+" set restitusi dibuat. Isi Nomor Trip SAP dan nominal biaya di formulir.");$("rs-pane").scrollTop=0}
/* ===== simpan, cetak ===== */
function rsSaveRec(status){const c=rsCur;c.status=status;c.updatedAt=Date.now();const r=JSON.parse(JSON.stringify(c));if(!r.id){r.id=uid();c.id=r.id;r.createdAt=Date.now()}
 const i=RSDB.records.findIndex(x=>x.id===r.id);if(i>=0)RSDB.records[i]=r;else RSDB.records.push(r);rsSave()}
const rsBad=()=>rsBatch.map((c,i)=>rsMissing(c).length?"pegawai "+(i+1)+": "+rsMissing(c).join(", "):"").filter(Boolean);
async function rsSimpan(status){const bad=status==="selesai"?rsBad():[];if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap tandai selesai?"))return;
 const keep=rsIdx;rsBatch.forEach((c,i)=>{rsCur=c;rsIdx=i;rsSaveRec(status)});rsIdx=keep;rsCur=rsBatch[keep];rsPersist();toast(rsBatch.length+" restitusi "+(status==="selesai"?"ditandai selesai dan tersimpan.":"tersimpan sebagai draft."))}
$("rs-bDraft").onclick=()=>rsSimpan("draft");$("rs-bDone").onclick=()=>rsSimpan("selesai");
$("rs-bNew").onclick=async()=>{if((rsBatch.length>1||((rsCur.personName||rsCur.maksud)&&!rsCur.id))&&!await ask(rsBatch.length>1?"Daftar "+rsBatch.length+" restitusi akan ditutup (yang belum disimpan hilang). Lanjutkan?":"Isi formulir saat ini yang belum disimpan akan hilang. Lanjutkan?"))return;
 rsCur=rsNew();rsBatch=[rsCur];rsIdx=0;rsBuildForm();rsBuildSheets();rsUpdate()};
$("rs-bPrint").onclick=async()=>{if(!rsLetters().length){toast("Pilih minimal satu surat.");return}const bad=rsBad();if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap cetak?"))return;window.print()};
$("rs-bTtd").onclick=()=>{setMode("L");showTab("tt")};
$("rs-bPeg").onclick=()=>{setMode("S");spTab("pe")};
/* ===== PDF ===== */
const rsTxt=v=>String(v==null?"":v).replace(/[\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[^\x20-\x7E\xA0-\xFF\u201C\u201D]/g,"?");
async function rsPdfPage(pdf,c,L){pdf.setTextColor(0,0,0);pdf.setDrawColor(0,0,0);const sigs=[];
 for(const e of rsLayout(c,L)){
  if(e.k==="t"){pdf.setFont("helvetica",e.b?"bold":"normal");pdf.setFontSize(e.s);const y=e.y+.905*e.s,t=rsTxt(e.t);
   if(e.j){const w=t.split(" "),tw=w.map(x=>pdf.getTextWidth(x)),gap=w.length>1?(e.j-tw.reduce((a,b)=>a+b,0))/(w.length-1):0;let x=e.x;w.forEach((x2,i)=>{pdf.text(x2,x,y);x+=tw[i]+gap})}
   else pdf.text(t,e.x,y,{align:e.a==="c"?"center":e.a==="r"?"right":"left"})}
  else if(e.k==="l"){pdf.setLineWidth(e.w);pdf.line(e.x1,e.y1,e.x2,e.y2)}
  else if(e.k==="rr"){pdf.setLineWidth(e.lw);pdf.roundedRect(e.x,e.y,e.w,e.h,e.r,e.r,"S")}
  else if(e.k==="i"){if(e.src)try{pdf.addImage(e.src,e.fmt||"PNG",e.x,e.y,e.w,e.h)}catch(x){}}
  else if(e.k==="s"){if(e.src)sigs.push(e)}}
 for(const g of sigs){const im=await loadImg(g.src);if(!im)continue;const o=((c.sigPos||{})[g.key])||{x:0,y:0,s:1},bw=g.w||105,bh=g.h||56;
  const k=Math.min(1,bw/(im.naturalWidth*.75),bh/(im.naturalHeight*.75)),w=g.ex?bw*(o.s||1):im.naturalWidth*.75*k*(o.s||1),h=g.ex?bh*(o.s||1):im.naturalHeight*.75*k*(o.s||1);
  try{pdf.addImage(g.src,"PNG",g.cx+(o.x||0)*PX-w/2,g.cy+(o.y||0)*PX-h/2,w,h)}catch(x){}}}
const RSPFX={R:"REMBURSE LUMSUM",P:"SURAT PERNYATAAN",B:"BLANGKO SPPD"};
const rsNamaFile=(c,L)=>((L?RSPFX[L]:"RESTITUSI SPPD")+" "+(namaAman(c.personName)||"TANPA NAMA")+" (SPPD "+spTglRentang(c)+")").replace(/\s+/g," ").trim()+".pdf";
function rsNamaUnik(names){const pakai={};return names.map(n=>{if(pakai[n]){const k=++pakai[n];return n.replace(/\.pdf$/,"("+k+").pdf")}pakai[n]=1;return n})}
async function rsPdf(list){if(pdfBusy)return;if(!list.length){toast("Tidak ada surat.");return}const ls=rsLetters();if(!ls.length){toast("Pilih minimal satu surat pada kotak Keluaran.");return}
 const bad=list.map((c,i)=>rsMissing(c).length?"pegawai "+(i+1)+": "+rsMissing(c).join(", "):"").filter(Boolean);
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap buat PDF?"))return;
 if(!window.jspdf){toast("Pustaka PDF gagal dimuat. Gunakan tombol Cetak sebagai gantinya.");return}
 pdfBusy=true;let ok=0,dibatal=false;
 try{let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
  const jobs=[];list.forEach(c=>{if(rsFmt==="gabung")jobs.push({c,ls,name:rsNamaFile(c)});else ls.forEach(L=>jobs.push({c,ls:[L],name:rsNamaFile(c,L)}))});
  const names=rsNamaUnik(jobs.map(j=>j.name));
  for(let i=0;i<jobs.length;i++){toast("Membuat PDF "+(i+1)+" dari "+jobs.length+": "+names[i]);
   const pdf=new window.jspdf.jsPDF({unit:"pt",format:"a4",orientation:"portrait",compress:true});
   for(let p=0;p<jobs[i].ls.length;p++){if(p)pdf.addPage("a4","portrait");await rsPdfPage(pdf,jobs[i].c,jobs[i].ls[p])}
   try{await spSimpanFile(pdf,names[i],dl);ok++}catch(e){if(e&&e.code==="declined"){dibatal=true;break}throw e}
   if(i<jobs.length-1)await spJeda(700)}
  toast(dibatal?"Unduhan dibatalkan ("+ok+" dari "+jobs.length+" file tersimpan).":ok===1?"PDF dibuat: "+names[0]:"Selesai: "+ok+" file PDF diunduh.")
 }catch(e){toast("Gagal membuat PDF: "+(e&&e.message||e))}finally{pdfBusy=false}}
$("rs-bPdf").onclick=()=>rsPdf(rsBatch);
/* ===== lokasi (stempel + pejabat) ===== */
let rsEditLk=null,rsLkStamp={src:"",ar:1},rsLkTtd="";
function rsImgAr(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth/(i.naturalHeight||1)||1);i.onerror=()=>r(1);i.src=src})}
/* Foto/scan stempel -> PNG transparan berisi warna stempel saja (biru/ungu), tanpa latar kertas dan tulisan hitam. */
function rsStampExtract(f,cb){const img=new Image,u=URL.createObjectURL(f);img.onload=()=>{const sc=Math.min(1,700/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));
 const x=c.getContext("2d");x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);const d=x.getImageData(0,0,c.width,c.height),p=d.data;let sr=0,sg=0,sb=0,n=0;
 for(let i=0;i<p.length;i+=4){const ch=p[i+2]-(p[i]+p[i+1])/2;if(ch>25){sr+=p[i];sg+=p[i+1];sb+=p[i+2];n++}}
 if(n<40){cb(null);return}const R=Math.round(sr/n),G=Math.round(sg/n),B=Math.round(sb/n);let x0=c.width,y0=c.height,x1=0,y1=0;
 for(let i=0,j=0;i<p.length;i+=4,j++){const ch=p[i+2]-(p[i]+p[i+1])/2,a=Math.max(0,Math.min(1,(ch-8)/40));p[i]=R;p[i+1]=G;p[i+2]=B;p[i+3]=Math.round(a*255);if(a>.2){const px=j%c.width,py=(j/c.width)|0;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py}}
 x.putImageData(d,0,0);const w=x1-x0+1,h=y1-y0+1,o=document.createElement("canvas");o.width=w;o.height=h;o.getContext("2d").drawImage(c,x0,y0,w,h,0,0,w,h);cb(o.toDataURL("image/png"))};
 img.onerror=()=>{URL.revokeObjectURL(u);alert("Gambar tidak dapat dibaca.");cb(undefined)};img.src=u}
function rsRenderLk(){const q=spNorm($("rs-lkQ").value),l=RSDB.lokasi.filter(x=>spNorm(x.nama+" "+x.kunci+" "+x.pejabat).includes(q));
 $("rs-lkList").innerHTML=l.length?`<p class="hint">${RSDB.lokasi.length} lokasi tersimpan di browser ini.</p><table class="t">${l.map(x=>{const t=rsSigOf(x.pejabat)?"TTD terdaftar":x.ttd?"TTD diunggah":"TTD belum ada";return`<tr><td><b>${esc(x.nama)}</b><div class="hint">Kata kunci: ${esc(x.kunci||"-")} · Pejabat: ${esc(x.pejabat||"(belum diisi)")} · ${t} · ${x.stempel?"stempel ada":"stempel belum diunggah"}</div></td><td>${x.stempel?`<img class="rs-thumb" src="${x.stempel}" alt="">`:""}</td><td style="white-space:nowrap"><button class="g" data-e="${esc(x.id)}">Edit</button> <button class="d" data-x="${esc(x.id)}">Hapus</button></td></tr>`}).join("")}</table>`:'<p class="hint">Belum ada lokasi. Tambahkan di bawah.</p>'}
$("rs-lkQ").oninput=rsRenderLk;
function rsLkReset(){rsEditLk=null;rsLkStamp={src:"",ar:1};rsLkTtd="";["rs-lkN","rs-lkK","rs-lkP","rs-lkW"].forEach(i=>$(i).value="");$("rs-lkF").value="";$("rs-lkTf").value="";$("rs-lkX").checked=false;$("rs-lkS").removeAttribute("src");$("rs-lkTs").removeAttribute("src");$("rs-lkT").textContent="Tambah lokasi"}
$("rs-lkReset").onclick=rsLkReset;
$("rs-lkF").onchange=e=>{const f=e.target.files[0];if(!f)return;const done=async d=>{if(d===undefined)return;if(!d){alert("Warna stempel tidak ditemukan pada gambar. Hapus centang \"foto/scan\" untuk memakai gambar apa adanya.");return}rsLkStamp={src:d,ar:await rsImgAr(d)};$("rs-lkS").src=d};
 if($("rs-lkX").checked){if(f.size>6291456){alert("Ukuran maksimum 6 MB.");return}rsStampExtract(f,done)}else readSig(f,done)};
$("rs-lkTf").onchange=e=>{readSig(e.target.files[0],d=>{rsLkTtd=d;$("rs-lkTs").src=d})};
$("rs-lkList").onclick=async e=>{const d=e.target.dataset,x=RSDB.lokasi.find(l=>l.id===(d.e||d.x));if(!x)return;
 if(d.x){if(await ask("Hapus lokasi "+x.nama+"? Surat yang sudah dibuat tidak berubah, tetapi stempelnya tidak akan tampil lagi.")){RSDB.lokasi=RSDB.lokasi.filter(l=>l!==x);rsSave();rsRenderLk();rsBuildForm();rsUpdate()}return}
 rsEditLk=x.id;rsLkStamp={src:x.stempel||"",ar:x.stAr||1};rsLkTtd=x.ttd||"";$("rs-lkN").value=x.nama;$("rs-lkK").value=x.kunci||"";$("rs-lkP").value=x.pejabat||"";$("rs-lkW").value=x.stW||"";
 x.stempel?$("rs-lkS").src=x.stempel:$("rs-lkS").removeAttribute("src");x.ttd?$("rs-lkTs").src=x.ttd:$("rs-lkTs").removeAttribute("src");$("rs-lkT").textContent="Edit lokasi";$("rs-lkN").scrollIntoView({block:"nearest"})};
$("rs-lkSave").onclick=()=>{const n=$("rs-lkN").value.trim();if(!n){alert("Nama lokasi wajib diisi.");return}
 const d={nama:n,kunci:$("rs-lkK").value.trim(),pejabat:$("rs-lkP").value.trim(),stempel:rsLkStamp.src,stAr:rsLkStamp.ar,ttd:rsLkTtd,stW:+$("rs-lkW").value||0},ex=RSDB.lokasi.find(l=>l.id===rsEditLk);
 if(ex)Object.assign(ex,d);else RSDB.lokasi.push({id:rsLkId(n)+(RSDB.lokasi.some(l=>l.id===rsLkId(n))?"-"+uid():""),...d});
 rsSave();rsLkReset();rsRenderLk();rsBuildForm();rsUpdate();toast("Lokasi tersimpan.")};
/* ===== riwayat ===== */
let rsShown=[];
function rsRenderRi(){const q=spNorm($("rs-rQ").value),a=$("rs-rA").value,b=$("rs-rB").value;
 rsShown=RSDB.records.filter(r=>spNorm(r.personName+" "+r.maksud+" "+r.tujuan).includes(q)&&(!a||r.tglBerangkat>=a)&&(!b||r.tglBerangkat<=b)).sort((x,y)=>(y.tglBerangkat||"").localeCompare(x.tglBerangkat||""));
 $("rs-rList").innerHTML=rsShown.length?`<table class="t">${rsShown.map(r=>`<tr><td><b>${esc(r.personName||"(tanpa nama)")}</b><div class="hint">${esc(r.tglBerangkat?fmtDate(r.tglBerangkat):"")} · ${esc(r.berangkat)} - ${esc(r.tujuan)}</div><div class="hint">${esc(r.maksud)}</div></td><td><span class="bd ${r.status==="selesai"?"ok":"warn"}">${r.status}</span></td><td style="white-space:nowrap"><button class="g" data-p="${r.id}">PDF</button> <button class="g" data-o="${r.id}">Buka</button> <button class="g" data-c="${r.id}">Duplikat</button> <button class="d" data-x="${r.id}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada riwayat restitusi.</p>'}
["rs-rQ","rs-rA","rs-rB"].forEach(i=>$(i).oninput=rsRenderRi);$("rs-rPdf").onclick=()=>rsPdf(rsShown);
$("rs-rList").onclick=async e=>{const t=e.target.dataset,r=RSDB.records.find(x=>x.id===(t.o||t.c||t.x||t.p));if(!r)return;
 if(t.p){rsPdf([r]);return}if(t.x){if(await ask("Hapus catatan ini secara permanen?")){RSDB.records=RSDB.records.filter(x=>x!==r);rsSave();rsRenderRi()}return}
 const c=JSON.parse(JSON.stringify(r));c.flags={};if(t.c){c.id=null;c.status="draft";c.tglBerangkat="";c.tglKembali="";c.tripSap="";c.amtB=c.amtP=c.amtH="";c.m={}}
 rsCur=c;rsBatch=[c];rsIdx=0;rsBuildForm();rsBuildSheets();rsUpdate();rsTab("in")};
/* ===== pengaturan ===== */
const RSSG=[["Kop surat",[["uip","Baris 1 (UIP)"],["upt","Baris 2 (UPT)"],["ultg","Baris 3 (ULTG)"],["formNo","Nomor form (Remburse)"]]],
 ["Blangko SPPD",[["unit","Unit (isian Blangko)"],["kotaAsal","Tempat kedudukan / kota tiba kembali"],["pejabat","Pejabat pemberi perintah / pejabat asal (tanda tangan diambil dari tanda tangan terdaftar)",1],["stempelW","Lebar stempel bawaan (pt)"]]],
 ["Alamat kaki surat",[["almR1","Remburse baris 1",1],["almR2","Remburse baris 2",1],["almP1","Pernyataan baris 1",1],["almP2","Pernyataan baris 2",1],["telp","Telepon"],["web","Situs"]]]];
function rsBuildSet(){$("rs-seForm").innerHTML=`<p class="hint">Perubahan berlaku untuk surat berikutnya dan pratinjau. Pegawai dan tanda tangan dikelola di modul SPPD / Surat Lembur dan dipakai bersama.</p>`+RSSG.map(([j,f])=>`<h4 class="sec">${j}</h4>`+f.map(([k,l,p])=>`<div class="fld${p?" fw":""}"><label>${l}</label><input data-rss="${k}" value="${esc(RSDB.settings[k])}"></div>`).join("")).join("")+
 `<h4 class="sec">Stempel pejabat asal (dipakai di blok I dan di "Pejabat yang memberi perintah" Blangko)</h4><div class="fld fw"><label>Gambar stempel (PNG/JPG/WEBP, maks 1 MB)</label><input type="file" id="rs-stFile" accept="image/png,image/jpeg,image/webp"><img id="rs-stImg" class="sg-prev" alt="" style="height:60px;margin-top:6px"><div class="acts"><button class="d" id="rs-stDel" hidden>Hapus stempel</button></div></div>`;rsStUi()}
function rsStUi(){const v=RSDB.settings.stempelAsal||"",im=$("rs-stImg");if(!im)return;v?im.src=v:im.removeAttribute("src");$("rs-stDel").hidden=!v}
$("rs-seForm").addEventListener("change",e=>{if(e.target.id!=="rs-stFile")return;const f=e.target.files[0];e.target.value="";readSig(f,async d=>{RSDB.settings.stempelAsal=d;RSDB.settings.stempelAr=await rsImgAr(d);rsSave();rsStUi();rsUpdate();toast("Stempel asal tersimpan.")})});
$("rs-seForm").addEventListener("click",async e=>{if(e.target.id!=="rs-stDel")return;if(await ask("Hapus stempel pejabat asal?")){delete RSDB.settings.stempelAsal;delete RSDB.settings.stempelAr;rsSave();rsStUi();rsUpdate()}});
$("rs-seSave").onclick=()=>{document.querySelectorAll("[data-rss]").forEach(el=>{const k=el.dataset.rss;RSDB.settings[k]=k==="stempelW"?(+el.value||RS_DEF.stempelW):el.value});rsSave();rsSync();rsUpdate();alert("Pengaturan Restitusi tersimpan.")};
$("rs-exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(RSDB)],{type:"application/json"}));a.download="cadangan-restitusi-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("rs-imp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const r=new FileReader;r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.records)||!Array.isArray(d.lokasi))throw 0;if(!await ask("Impor akan MENGGANTI seluruh data Restitusi (lokasi, riwayat, pengaturan). Lanjutkan?"))return;
 RSDB={records:d.records,lokasi:d.lokasi,settings:{...RS_DEF,...d.settings}};rsSave();rsBuildForm();rsUpdate();alert("Impor berhasil.")}catch(x){alert("File cadangan Restitusi tidak valid.")}};r.readAsText(f)};
/* ===== tab, mode ===== */
function rsTab(t){for(const x of["in","lk","ri","se"])$("rs-tab-"+x).hidden=x!==t;document.querySelectorAll("#rs-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="lk")rsRenderLk();if(t==="ri")rsRenderRi();if(t==="se")rsBuildSet()}
$("rs-tabs").onclick=e=>{if(e.target.dataset.t)rsTab(e.target.dataset.t)};
function rsEnter(){rsBuildForm();rsBuildSheets();rsUpdate();setTimeout(rsFit,50)}
$("mdR").onclick=()=>setMode("R");
try{if(sessionStorage.getItem("app.mode")==="R")setMode("R")}catch(e){}
