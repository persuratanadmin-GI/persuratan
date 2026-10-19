"use strict";
/* Banyak surat dari satu pesan WhatsApp, daftar surat, simpan semua. */
/* ===== Banyak surat dari satu pesan WhatsApp ===== */
let QUIET=false,SKIP=false,lastMulti=[];
function lineKey(line){const b=bacaBaris(line);return b?b.k:null}
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
function buildSheets(){$("sheets").innerHTML=batch.map((c,i)=>`<div class="lw${i===idx?" act":""}" data-i="${i}"><div class="lbar"><span class="lt">${esc(letterTitle(i))}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${renderSheet(c)}</div></div></div></div>`).join("");
 $("batchbar").hidden=batch.length<2;$("batchbar").innerHTML=`<b>${batch.length} surat</b> ${batch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" ")} <button class="b nv" id="pdfAktif" title="Unduh PDF hanya untuk surat yang sedang dibuka">PDF surat ini</button> <button class="g" id="hapusAktif" title="Keluarkan surat yang sedang dibuka dari daftar">Hapus surat ini</button>`;fit()}
function setActive(i){idx=i;cur=batch[i];document.querySelectorAll("#sheets .lw").forEach((e,j)=>e.classList.toggle("act",j===i));sgSelect(null);syncForm();SKIP=true;update();SKIP=false}
/* Aksi simpan memakai semua surat dalam daftar (satu surat = satu surat). Label tombol menampilkan jumlahnya. */
async function simpanBatch(status){
 const bad=status==="selesai"?batch.map((c,i)=>missing(c).length?"surat "+(i+1)+": "+missing(c).join(", "):"").filter(Boolean):[];
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap tandai selesai?"))return;
 const keep=idx;let n=0;for(let i=0;i<batch.length;i++){cur=batch[i];idx=i;if(saveRec(status))n++}
 idx=keep;cur=batch[keep];persistCur();
 toast(n>1?n+" surat "+(status==="selesai"?"ditandai selesai dan tersimpan.":"tersimpan sebagai draft."):(status==="selesai"?"Ditandai selesai dan tersimpan.":"Draft tersimpan."))}
function segarTombol(){const s=batch.length>1?" ("+batch.length+")":"";
 [["bDraft","Simpan draft"],["bDone","Tandai selesai"],["bXl","Simpan ke Excel"],["bPdf","Unduh PDF"],["bPrint","Cetak"]].forEach(([id,t])=>{const e=$(id);if(e)e.textContent=t+s})}
$("batchbar").onclick=async e=>{if(e.target.id==="pdfAktif"){exportPdf([cur]);return}if(e.target.id==="hapusAktif"&&batch.length>1&&await ask("Hapus surat "+(idx+1)+" dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){batch.splice(idx,1);idx=Math.min(idx,batch.length-1);cur=batch[idx];buildForm();buildSheets();update();return}const g=e.target.dataset.go;if(g!==undefined){setActive(+g);$("sheets").children[+g].scrollIntoView({behavior:"smooth",block:"start"})}};
$("sheets").addEventListener("click",e=>{const lw=e.target.closest(".lw");if(!lw)return;const i=+lw.dataset.i;if(i!==idx)setActive(i)});
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
