"use strict";
/* Banyak surat dari satu pesan WhatsApp, daftar surat, simpan semua. */
/* ===== Banyak surat dari satu pesan WhatsApp ===== */
let QUIET=false,SKIP=false,lastMulti=[];
function cleanLine(line){return line.replace(/^\s*\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?::\d{2})?\]?\s*-?\s*[^:]{1,40}:\s+(?=\S)/,"").replace(/[*~`]/g,"").replace(/^\s*(?:[-•]|\d+[.)])\s+/,"")}
function lineKey(line){const m=/^\s*([^:=\n]{2,30}?)\s*[:=]\s*(.*)$/.exec(cleanLine(line));const lm=m&&matchLabel(m[1]);return lm?lm.k:null}
/* Pisah blok: baris kosong, atau label yang berulang (= awal surat baru). Blok tanpa label digabung ke blok sebelumnya. */
function splitBlocks(text){const out=[];let b=[],seen={};const flush=()=>{if(b.length)out.push(b);b=[];seen={}};
 for(const line of text.split(/\r?\n/)){if(!line.trim()){flush();continue}const k=lineKey(line);if(k){if(seen[k])flush();seen[k]=1}b.push(line)}
 flush();const merged=[];for(const bl of out){if(!bl.some(l=>lineKey(l))&&merged.length)merged[merged.length-1].push(...bl);else merged.push(bl)}
 return merged.map(b=>b.join("\n"))}
/* Nama kosong diisi dari ID/NIP yang sama: (1) blok lain dalam pesan, (2) personel tersimpan, (3) riwayat surat. */
function fillNames(res){const map={};
 res.forEach(r=>{const n=norm(r.f.nip||"");if(n&&r.f.nama&&r.st.nama.s!=="missing"&&!map[n])map[n]=r.f.nama});
 res.forEach((r,i)=>{if(r.st.nama.s!=="missing")return;const n=norm(r.f.nip||"");
  let src=n&&map[n],why="ID operator yang sama dalam pesan",s2="ok";
  if(!src&&n){const p=DB.people.find(x=>norm(x.nip)===n)||[...DB.records].reverse().find(x=>norm(x.nip)===n&&x.name);src=p&&p.name;why="ID operator yang sama di data tersimpan"}
  if(!src&&!n&&i&&res[i-1].f.nama){src=res[i-1].f.nama;why="surat sebelumnya (ID tidak tertera)";s2="warn";if(res[i-1].f.nip){r.f.nip=res[i-1].f.nip;r.st.nip={s:"warn",m:"ID diambil dari surat sebelumnya - periksa"}}}
  if(src){r.f.nama=src;r.st.nama={s:s2,m:"Nama otomatis dari "+why}}});
 return res}
function parseMulti(text){return fillNames(splitBlocks(text).map(b=>parseWA(b)))}
function makeLetter(pr){const sc=cur,sl=lastParse;cur=blank();lastParse=pr;QUIET=true;try{applyParse()}finally{QUIET=false;lastParse=sl}const c=cur;cur=sc;return c}
function letterTitle(i){const c=batch[i];return "Surat "+(i+1)+" dari "+batch.length+" · "+(c.name||"(belum ada nama)")+" · "+(c.tanggal?fmtDate(c.tanggal):"(tanggal?)")+(c.excelAt?" \u00b7 Excel \u2714":"")}
function buildSheets(){$("sheets").innerHTML=batch.map((c,i)=>`<div class="lw${i===idx?" act":""}" data-i="${i}"><div class="lbar"><span class="lt">${esc(letterTitle(i))}</span><span><button class="g" data-a="pdf">PDF ini</button> <button class="g" data-a="pr">Cetak ini</button>${batch.length>1?' <button class="g" data-a="rm">Hapus dari daftar</button>':""}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${renderSheet(c)}</div></div></div></div>`).join("");
 $("batchbar").hidden=batch.length<2;$("batchbar").innerHTML=`<b>${batch.length} surat</b> ${batch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" ")} <button class="b" id="saveAll">Simpan semua draft</button> <button class="b nv" id="pdfAll">Unduh PDF semua</button> <button class="b xl" id="xlAll">Simpan ke Excel</button>`;fit()}
function setActive(i){idx=i;cur=batch[i];document.querySelectorAll("#sheets .lw").forEach((e,j)=>e.classList.toggle("act",j===i));sgSelect(null);syncForm();SKIP=true;update();SKIP=false}
function printOne(){document.body.classList.add("p1");const done=()=>{document.body.classList.remove("p1");window.removeEventListener("afterprint",done)};window.addEventListener("afterprint",done);try{window.print()}catch(e){}finally{setTimeout(done,3000)}}
function saveAll(){const keep=idx;let ok=0;for(let i=0;i<batch.length;i++){cur=batch[i];idx=i;if(saveRec("draft"))ok++}idx=keep;cur=batch[keep];persistCur();alert(ok+" surat tersimpan sebagai draft.")}
$("batchbar").onclick=e=>{if(e.target.id==="saveAll")saveAll();if(e.target.id==="pdfAll")exportPdf(batch);if(e.target.id==="xlAll")bukaExcel(batch);const g=e.target.dataset.go;if(g!==undefined){setActive(+g);$("sheets").children[+g].scrollIntoView({behavior:"smooth",block:"start"})}};
$("sheets").addEventListener("click",async e=>{const lw=e.target.closest(".lw");if(!lw)return;const i=+lw.dataset.i,a=e.target.dataset.a;
 if(a==="rm"){if(batch.length>1&&await ask("Hapus surat ini dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){batch.splice(i,1);idx=Math.min(i,batch.length-1);cur=batch[idx];buildForm();buildSheets();update()}return}
 if(a==="pdf"){exportPdf([batch[i]]);return}
 if(a==="pr"){if(i!==idx)setActive(i);printOne();return}
 if(i!==idx)setActive(i)});
async function applyMulti(){if((batch.length>1||cur.name||cur.uraian)&&!await ask("Isi formulir/daftar surat saat ini akan diganti dengan "+lastMulti.length+" surat baru. Lanjutkan?"))return;
 const s=DB.settings,arr=lastMulti.map(pr=>makeLetter(pr));
 arr.forEach((c,i)=>{c.spk=fmtNo(s.polaSpk,s.seqSpk+1+i,c.tanggal);c.lemburNo=fmtNo(s.polaLem,s.seqLem+1+i,c.tanggal)});
 batch=arr;idx=0;cur=batch[0];buildForm();buildSheets();update();$("m-man").click();$("pane").scrollTop=0;toast(arr.length+" surat dibuat.")}
$("parse").onclick=()=>{const t=$("waText").value.trim();if(!t){$("parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 const list=parseMulti(t);if(list.length<2){parseSingleUI();return}lastMulti=list;
 const MS={ok:"terbaca",warn:"periksa",missing:"hilang",error:"gagal"},LB={nama:"Nama",nip:"ID/NIP",tanggal:"Tanggal",mulai:"Mulai",selesai:"Selesai",uraian:"Uraian",pemberi:"Pemberi"};
 const rows=pr=>Object.keys(LB).map(k=>{const s=pr.st[k];return`<tr><td>${LB[k]}</td><td>${esc(pr.f[k]??"")}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${MS[s.s]}</span></td></tr>`}).join("");
 $("parseOut").innerHTML=`<p class="hint"><b>${list.length} surat terdeteksi</b></p>`+list.map((pr,i)=>{const nb=Object.keys(LB).filter(k=>pr.st[k].s!=="ok").length;return`<details${nb?" open":""}><summary><b>Surat ${i+1}</b> · ${esc(pr.f.tanggal?fmtDate(pr.f.tanggal):"tanggal?")} · ${nb?nb+" kolom perlu diperiksa":"semua terbaca"}</summary><table class="t">${rows(pr)}</table></details>`}).join("")+`<div class="acts"><button class="b" id="applyMulti">Buat ${list.length} surat</button></div>`;
 $("applyMulti").onclick=applyMulti};
