"use strict";
/* Tab, input WhatsApp (satu pesan), tombol aksi, simpan/cetak. */
/* ===== Tab & aksi ===== */
function showTab(t){for(const x of["in","pe","ri","tt","se"])$("tab-"+x).hidden=x!==t;document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="tt")renderSigs();if(t==="ri")renderRiwayat();if(t==="pe")renderPeople();if(t==="se")buildSettings()}
$("tabs").onclick=e=>{if(e.target.dataset.t)showTab(e.target.dataset.t)};
$("m-man").onclick=()=>{$("wa").hidden=true;$("m-man").classList.add("on");$("m-wa").classList.remove("on")};
$("m-wa").onclick=()=>{$("wa").hidden=false;$("m-wa").classList.add("on");$("m-man").classList.remove("on")};
let lastParse=null;
const parseSingleUI=()=>{const t=$("waText").value.trim();if(!t){$("parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 lastParse=fillNames([parseWA(t)])[0];{const j=lastParse.f.jabatan;if(j){const d=DB.settings.jabPers;lastParse.st.jabatan=norm(j)===norm(d)?{s:"ok",m:""}:{s:"warn",m:"Tidak dipakai: jabatan personel dikunci "+d+" (ubah manual jika perlu)"}}}const L={nama:"Nama",nip:"ID/NIP",jabatan:"Jabatan",unit:"Unit kerja",tanggal:"Tanggal",mulai:"Jam mulai",selesai:"Jam selesai",uraian:"Uraian",lokasi:"Lokasi (opsional)",pemberi:"Pemberi perintah"};
 $("parseOut").innerHTML=`<table class="t">${Object.keys(L).map(k=>{const s=lastParse.st[k];return`<tr><td>${L[k]}</td><td>${esc(lastParse.f[k]??"")}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${{ok:"terbaca",warn:"periksa",missing:"hilang",error:"gagal"}[s.s]}</span></td></tr>`}).join("")}</table>${lastParse.unk.length?`<p class="hint w">Baris tidak dikenali (diabaikan): ${lastParse.unk.map(esc).join(" | ")}</p>`:""}<div class="acts"><button class="b" id="apply">Terapkan ke formulir</button></div>`;
 $("apply").onclick=applyParse};
function applyParse(){const{f,st}=lastParse;const map={nama:"name",nip:"nip",unit:"unit",tanggal:"tanggal",mulai:"mulai",selesai:"selesai",uraian:"uraian",lokasi:"lokasi",pemberi:"pemberiName"};cur.flags={};
 for(const k in map){const s=st[k];if(f[k]!==undefined&&s.s!=="error")cur[map[k]]=f[k];if(s.s!=="ok"&&!(s.s==="missing"&&(k==="lokasi"||k==="unit")))cur.flags[map[k]]=s.m||"Perlu diisi"}
 const q=(f.nama||"").toLowerCase(),n=(f.nip||"").toLowerCase();
 const p=DB.people.find(x=>(n&&x.nip.toLowerCase()===n)||(q&&x.name.toLowerCase()===q));
 if(p){Object.assign(cur,{name:p.name,nip:p.nip,jabatan:p.jabatan||DB.settings.jabPers,unit:p.unit,sigP:p.sig||sigLookup(p.name),pId:p.id});delete cur.flags.name;delete cur.flags.nip}
 else if(f.nama||f.nip){cur.flags.name=cur.flags.name||"Nama belum ada di daftar personel - periksa ejaan";cur.sigP=sigLookup(cur.name)}
 const g=DB.sigs.find(x=>f.pemberi&&norm(x.name)===norm(f.pemberi));
 if(g){Object.assign(cur,{pemberiName:g.name,pemberiJab:g.jabatan||DB.settings.jabPemberi,sigG:g.sig||""});delete cur.flags.pemberiName}
 else if(f.pemberi){cur.flags.pemberiName="Nama belum terdaftar di tab Tanda Tangan - tanda tangan tidak terpasang otomatis"}
 if(!cur.jabatan)cur.jabatan=DB.settings.jabPers;if(!cur.pemberiJab)cur.pemberiJab=DB.settings.jabPemberi;if(!cur.koorName){cur.koorName=DB.settings.koorName;cur.koorJab=cur.koorJab||DB.settings.kepada}autoAll();if(QUIET)return;buildForm();update();$("m-man").click()}
function resetNo(){if(!cur.spk)cur.spk=nextNo("spk");if(!cur.lemburNo)cur.lemburNo=nextNo("lem")}
$("bNew").onclick=async()=>{if((batch.length>1||((cur.name||cur.uraian)&&!cur.id))&&!await ask(batch.length>1?"Daftar "+batch.length+" surat akan ditutup (yang belum disimpan hilang). Lanjutkan?":"Isi formulir saat ini yang belum disimpan akan hilang. Lanjutkan?"))return;cur=blank();resetNo();buildForm();update()};
function saveRec(status){
 cur.status=status;cur.updatedAt=Date.now();const rec=JSON.parse(JSON.stringify(cur));
 if(!rec.id){rec.id=uid();cur.id=rec.id;rec.createdAt=Date.now()}
 const i=DB.records.findIndex(x=>x.id===rec.id);if(i>=0)DB.records[i]=rec;else DB.records.push(rec);
 bumpSeq();save();return true}
$("bDraft").onclick=()=>simpanBatch("draft");
$("bDone").onclick=()=>simpanBatch("selesai");
$("bPrint").onclick=async()=>{const bad=batch.map((c,i)=>missing(c).length?"surat "+(i+1)+": "+missing(c).join(", "):"").filter(Boolean);if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap cetak?"))return;window.print()};
