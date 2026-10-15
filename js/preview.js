"use strict";
/* Pratinjau surat A4 (HTML/CSS) dan penggeseran/ubah ukuran tanda tangan. */
/* ===== Pratinjau ===== */
const V=(v,ph="................")=>v?esc(v):`<span class="empty">${ph}</span>`;
let selSig=null;
const SIG=(s,p,r)=>{if(!s)return"";const o=(r.sigPos||{})[p]||{};return`<span class="sgb${selSig===p&&r===cur?" sel":""}" data-p="${p}" title="Seret: geser · kotak biru atau roda mouse: ukuran" style="--s:${o.s||1};transform:translate(${o.x||0}mm,${o.y||0}mm) scale(${o.s||1})"><img src="${s}" alt="ttd" draggable="false"><i class="sgh"></i></span>`};
function renderSheet(r){
 const s=DB.settings,tgl=fmtDate(r.tanggal),dur=durText(r),waktu=r.mulai&&r.selesai?`${r.mulai} s/d ${r.selesai} ${s.zona}${dur?" ("+dur+")":""}`:"";
 const place=`${esc(s.kota)}, ${tgl?esc(fmtDateEn(r.tanggal)):'<span class="empty">..........</span>'}`;
 const T=(top,sz,cls,h)=>`<div class="a c ${cls}" style="top:${top}pt;font-size:${sz}pt">${h}</div>`;
 const RL=t=>`<div class="a rl" style="top:${t}pt"></div>`;
 const row=(h,a,b)=>`<tr style="height:${h}pt"><td>${a}</td><td>${b}</td></tr>`;
 const col=(dt,role,jab,sig,nm,jm,bh)=>`<div class="sc"><div style="font-size:7.4pt">${dt}</div><div style="margin-top:${role[1]}pt">${role[0]}</div><div class="b" style="margin-top:${jm}pt">${jab}</div><div class="sgi" style="height:${bh}pt">${sig}</div><div class="b nm">${nm}</div></div>`;
 const jabK=V(r.koorJab,"jabatan"),nmK=V(r.koorName,"nama");
 return`<div class="pg">
 <img class="a" src="${LOGO.pln}" alt="" style="left:48.2pt;top:31pt;width:63pt;height:21.9pt">
 ${T(34.5,10.2,"b",esc(s.ptPln))}${T(52.1,9.6,"b",esc(s.unitPln))}${T(68.4,7.4,"",esc(s.almPln))}${RL(82)}${RL(83.4)}
 ${T(86.1,10.2,"b","SURAT PERINTAH KERJA (SPK)")}${T(102.3,8,"","Nomor : "+V(r.spk,"..../..../...."))}
 <div class="fl" style="top:128.3pt"><div class="ln">Kepada Yth :</div><div class="ln b" style="margin-top:4.34pt">${esc(s.kepada)}</div><div class="ln" style="margin-top:3.94pt">Dengan ini diperintahkan untuk melaksanakan pekerjaan Operasi dan pemeliharaan lembur sebagai berikut:</div>
 <table style="margin-top:1.84pt"><colgroup><col style="width:139.3pt"><col></colgroup>${row(17.45,"Hari / Tanggal",V(fmtDay(r.tanggal)))}${row(17.45,"Lokasi",V(r.lokasi))}${row(25,"Uraian Tugas",V(r.uraian))}${row(17.4,"Waktu",V(waktu))}${row(17.4,"Durasi Terbilang",V(waktu))}</table>
 <div class="ln" style="margin-top:1.5pt">Demikian Surat Perintah Kerja ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</div>
 <div class="sg" style="margin-top:19.04pt">${col(place,["Pemberi Perintah,",7.31],V(r.pemberiJab,"jabatan"),SIG(r.sigG,"G",r),V(r.pemberiName,"nama"),7.24,31.04)}${col(place,["Penerima Perintah,",7.31],jabK,SIG(r.sigK,"K1",r),nmK,7.24,31.04)}</div></div>
 <div class="a cutl">${"<i></i>".repeat(23)}</div><div class="a c cutt" style="top:389pt;font-size:6.6pt">✂ Gunting disini  |  Lembar Atas (Arsip PLN) - Lembar Bawah (Arsip PLND) ✂</div>
 <img class="a" src="${LOGO.nd}" alt="" style="left:48.2pt;top:412.4pt;width:57.5pt;height:20.8pt">
 ${T(416,10.2,"b",esc(s.ptNd))}${T(433.5,9.6,"b",esc(s.unitNd))}<div class="a c" style="top:449.9pt;font-size:7.4pt;padding-right:12pt;box-sizing:border-box">${esc(s.almNd)}</div>${RL(462.3)}${RL(463.7)}
 ${T(466.4,10.2,"b","SURAT PERINTAH KERJA LEMBUR")}${T(482.6,8,"","Nomor : "+V(r.lemburNo,"..../..../...."))}
 <div class="fl" style="top:508.6pt"><div class="ln">Menindaklanjuti SPK PLN Nomor: ${V(r.spk,"..........")}, maka diperintahkan kepada:</div>
 <table class="nb" style="margin-top:2.19pt"><colgroup><col style="width:138.9pt"><col></colgroup>${row(17.45,"Nama Personil",`<b class="nm">${V(r.name)}</b>`)}${row(17.45,"ID / NIP",V(r.nip))}${row(17.45,"Jabatan",V(r.jabatan))}</table>
 <table style="margin-top:12.2pt"><colgroup><col style="width:139.3pt"><col></colgroup><tr style="height:17.5pt"><td colspan="2" class="b">RINCIAN PEKERJAAN:</td></tr>${row(24.35,"Uraian",V(r.uraian))}${row(17.4,"Jam Kerja",V(waktu))}</table>
 <div class="ln" style="margin-top:1.5pt">Demikian perintah ini diberikan. Segera laporkan hasil pekerjaan kepada Koordinator setelah selesai.</div>
 <div class="sg" style="margin-top:19.14pt">${col(place,["Pemberi Tugas,",7.21],jabK,SIG(r.sigK,"K2",r),nmK,9.14,38.44)}${col(place,["Pelaksana,",7.21],"PERSONIL",SIG(r.sigP,"P",r),V(r.name,"nama"),9.14,38.44)}</div></div>
 <div class="a ftr" style="top:775.9pt">Form SPK Surat Perintah Kerja Lembur</div></div>`}
function update(){
 if(cur!==batch[idx]){batch=[cur];idx=0}
 if($("sheets").children.length!==batch.length)buildSheets();else if(!SKIP){const lw=$("sheets").children[idx];lw.querySelector(".sheet").innerHTML=renderSheet(cur);lw.querySelector(".lt").textContent=letterTitle(idx)}
 persistCur();if(selSig&&!document.querySelector('#sheets .lw.act .sgb[data-p="'+selSig+'"]'))sgSelect(null);
 const d=calcDur(cur.mulai,cur.selesai);
 $("durHint").className="hint"+(d&&(d.over||d.same)?" w":"");
 $("durHint").textContent=d?`Durasi: ${durLabel(d.min)} (${durHuman(d.min)})${d.over?" · lewat tengah malam":""}${d.same?" · 24 jam":""}`:"";
 const m=missing(),sn=[];if(cur.pemberiName&&!cur.sigG)sn.push("pemberi perintah");if(cur.koorName&&!cur.sigK)sn.push("koordinator");if(cur.name&&!cur.sigP)sn.push("personel");$("hint").textContent=[m.length?"Belum lengkap: "+m.join(", "):"",sn.length?"Tanda tangan belum terdaftar: "+sn.join(", "):""].filter(Boolean).join(" · ")}
function fit(){const p=$("pane"),w=p.clientWidth-24-24,s=Math.min(1,w/794);scale1=s;document.querySelectorAll("#sheets .shbox").forEach(b=>b.style.transform=`scale(${s})`);document.querySelectorAll("#sheets .shwrap").forEach(b=>{b.style.height=1123*s+"px";b.style.width=794*s+"px"})}
window.addEventListener("resize",fit);
/* ===== Tanda tangan di surat: seret & ubah ukuran (posisi disimpan per surat) ===== */
const SGN={G:"Pemberi perintah",K1:"Penerima perintah (SPK)",K2:"Pemberi tugas (Surat Lembur)",P:"Pelaksana"};
let scale1=1,drag=null;
function sgPos(p){cur.sigPos=cur.sigPos||{};return cur.sigPos[p]=cur.sigPos[p]||{x:0,y:0,s:1}}
function sgApply(p){const o=sgPos(p);document.querySelectorAll('#sheets .lw.act .sgb[data-p="'+p+'"]').forEach(i=>{i.style.setProperty('--s',o.s);i.style.transform=`translate(${o.x}mm,${o.y}mm) scale(${o.s})`})}
function sgSelect(p){selSig=p;document.querySelectorAll("#sheets .lw .sgb[data-p]").forEach(i=>i.classList.toggle("sel",i.closest(".lw").classList.contains("act")&&i.dataset.p===p));$("sgctl").hidden=!p;$("sgbar").hidden=!p;if(p){$("sgName").textContent=SGN[p];const s=Math.round(sgPos(p).s*100);$("sgSize").value=s;$("sgPct").textContent=s+"%"}}
function sgNudge(n,step){if(!selSig)return;const o=sgPos(selSig);if(n==="l")o.x=+(o.x-step).toFixed(1);if(n==="r")o.x=+(o.x+step).toFixed(1);if(n==="u")o.y=+(o.y-step).toFixed(1);if(n==="d")o.y=+(o.y+step).toFixed(1);sgApply(selSig);persistCur()}
function sgSelectUI(){if(!selSig)return;const v=Math.round(sgPos(selSig).s*100);$("sgSize").value=v;$("sgPct").textContent=v+"%"}
$("sheets").addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const p=b.dataset.p,lw=b.closest(".lw");if(+lw.dataset.i!==idx)setActive(+lw.dataset.i);sgSelect(p);const o=sgPos(p);
 drag={p,mode:e.target.classList.contains("sgh")?"size":"move",x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,s0:o.s,w:b.getBoundingClientRect().width||1};b.setPointerCapture(e.pointerId)});
$("sheets").addEventListener("pointermove",e=>{if(!drag)return;const o=sgPos(drag.p);
 if(drag.mode==="size"){const d=((e.clientX-drag.x0)+(e.clientY-drag.y0))/2;o.s=+Math.min(4,Math.max(.2,drag.s0*(1+2*d/drag.w))).toFixed(2);sgSelectUI()}
 else{const k=25.4/96/(scale1||1);o.x=+(drag.ox+(e.clientX-drag.x0)*k).toFixed(1);o.y=+(drag.oy+(e.clientY-drag.y0)*k).toFixed(1)}
 sgApply(drag.p)});
const sgEnd=()=>{if(drag){drag=null;persistCur()}};
$("sheets").addEventListener("pointerup",sgEnd);$("sheets").addEventListener("pointercancel",sgEnd);
$("sheets").addEventListener("wheel",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const lw=b.closest(".lw");if(+lw.dataset.i!==idx)setActive(+lw.dataset.i);sgSelect(b.dataset.p);const o=sgPos(b.dataset.p);o.s=+Math.min(4,Math.max(.2,o.s*(e.deltaY<0?1.06:1/1.06))).toFixed(2);sgApply(b.dataset.p);sgSelectUI();persistCur()},{passive:false});
document.addEventListener("pointerdown",e=>{if(selSig&&!e.target.closest("#sgbar")&&!e.target.closest(".sgb"))sgSelect(null)});
$("sgSize").oninput=e=>{if(!selSig)return;sgPos(selSig).s=e.target.value/100;$("sgPct").textContent=e.target.value+"%";sgApply(selSig);persistCur()};
$("sgbar").onclick=e=>{const n=e.target.dataset.n;if(n)sgNudge(n,0.5);if(e.target.id==="sgReset"&&selSig){cur.sigPos[selSig]={x:0,y:0,s:1};sgApply(selSig);sgSelect(selSig);persistCur()}};
document.addEventListener("keydown",e=>{if(!selSig||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const n={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];if(n){e.preventDefault();sgNudge(n,e.shiftKey?2:0.5)}});
