"use strict";
/* Fungsi murni: tanggal, durasi, parser pesan WhatsApp, nomor surat. Tidak menyentuh antarmuka. */
/* ===== Util ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const HARI=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const BLN_EN=["january","february","march","april","may","june","july","august","september","october","november","december"];
const ROM=["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const pad2=n=>String(n).padStart(2,"0");
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* Dialog buatan sendiri: confirm()/alert() bawaan diblokir di halaman yang di-host (sandbox). */
function ask(msg){return new Promise(res=>{const o=document.createElement("div");o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:99;padding:16px";
 o.innerHTML=`<div style="background:#fff;color:#1b2433;border-radius:8px;padding:16px;max-width:420px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.3)"><p style="margin:0 0 14px;white-space:pre-line">${esc(msg)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="g" data-r="0" style="color:#1b2433">Batal</button><button class="b" data-r="1">Lanjutkan</button></div></div>`;
 o.onclick=e=>{const r=e.target.dataset.r;if(r===undefined&&e.target!==o)return;o.remove();res(r==="1")};document.body.appendChild(o);o.querySelector("button.b").focus()})}
function toast(m){let t=document.getElementById("toast");if(!t){t=document.createElement("div");t.id="toast";t.style.cssText="position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#0b2a5b;color:#fff;padding:9px 16px;border-radius:8px;z-index:100;max-width:90vw;box-shadow:0 4px 16px rgba(0,0,0,.3)";document.body.appendChild(t)}t.textContent=m;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>{t.hidden=true},4000)}
window.alert=toast;
/* ===== Logika murni: tanggal, durasi, parser, nomor ===== */
function fmtDate(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);return pad2(d)+" "+BLN[m-1]+" "+y}
function fmtDateEn(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);const n=BLN_EN[m-1];return pad2(d)+" "+n[0].toUpperCase()+n.slice(1)+" "+y}
function fmtDay(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);return HARI[new Date(y,m-1,d).getDay()]+", "+fmtDate(iso)}
function toMin(t){const m=/^(\d{1,2}):(\d{2})$/.exec(t||"");if(!m||+m[1]>23||+m[2]>59)return null;return+m[1]*60+ +m[2]}
function calcDur(s,e){const a=toMin(s),b=toMin(e);if(a==null||b==null)return null;let d=b-a,over=false;if(d<=0){d+=1440;over=true}return{min:d,over,same:b===a}}
function durLabel(min){const h=+(min/60).toFixed(2);return h+" Jam"}
function durHuman(min){const h=Math.floor(min/60),m=min%60;return(h?h+" jam":"")+(h&&m?" ":"")+(m?m+" menit":"")}
function durText(r){const m=(r.durManual||"").trim();if(m){const n=parseFloat(m.replace(",","."));return isNaN(n)?m:n+" Jam"}const d=calcDur(r.mulai,r.selesai);return d?durLabel(d.min):""}
const ALIAS={nama:["nama","nama lengkap","nama operator","nama personel","nama personil","operator","personel","personil"],nip:["id operator","id/nip","id / nip","nip","id","no id","id pegawai","nomor id","nomor induk"],jabatan:["jabatan","posisi"],unit:["unit kerja","unit","ultg","bagian"],tanggal:["tanggal lembur","tanggal","tgl","tgl lembur","hari/tanggal","hari tanggal"],mulai:["jam mulai","mulai","jam awal","jam masuk","dari jam"],selesai:["jam selesai","selesai","jam akhir","jam keluar","sampai jam","jam pulang"],jam:["jam lembur","jam","waktu","waktu lembur","jam kerja","pukul"],uraian:["uraian pekerjaan","pekerjaan","uraian","uraian tugas","kegiatan","tugas","deskripsi"],pemberi:["pemberi perintah","pemberi tugas","pemberi izin","izin dari","yang memerintah","diperintah oleh","atasan","tl","team leader","spv","supervisor"],lokasi:["lokasi pekerjaan","lokasi","lokasi kerja","tempat"]};
const LOOKUP=(()=>{const l={};for(const k in ALIAS)ALIAS[k].forEach(a=>l[a]=k);return l})();
const RANGE=/(\d{1,2}[:.]\d{2})\s*(?:wita|wib|wit)?\s*(?:-|–|—|s\/d|s\.d\.?|sd|sampai|hingga|to)\s*(\d{1,2}[:.]\d{2})/i;
const DATE_ANY=/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}\b/;
function parseDate(s){s=s.trim();let m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s),d,mo,y,warn="";
 if(m){d=+m[1];mo=+m[2];y=+m[3];if(d<=12&&mo<=12&&d!==mo)warn="Dibaca sebagai hari/bulan/tahun - periksa"}
 else if(m=/^(?:[A-Za-z']+,?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s)){d=+m[1];y=+m[3];const n=m[2].toLowerCase();mo=BLN.findIndex(b=>b.toLowerCase()===n)+1||BLN_EN.indexOf(n)+1;if(!mo)return{err:"Nama bulan tidak dikenali"}}
 else return{err:"Format tanggal tidak dikenali"};
 const t=new Date(y,mo-1,d);if(t.getFullYear()!==y||t.getMonth()!==mo-1||t.getDate()!==d)return{err:"Tanggal tidak valid"};
 return{iso:y+"-"+pad2(mo)+"-"+pad2(d),warn}}
function parseTime(s){const m=/^(?:(?:jam|pukul|pkl)\.?\s*)?(\d{1,2})[:.](\d{2})(?:\s*(?:wita|wib|wit))?$/i.exec(s.trim());if(!m||+m[1]>23||+m[2]>59)return{err:"Format jam harus HH:MM"};return{v:pad2(+m[1])+":"+m[2]}}
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++)d[i]=[i];for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
/* Cocokkan label pesan ke kolom: persis dulu, lalu toleransi salah ketik (jarak edit kecil, tidak boleh seri). */
function matchLabel(raw){const l=raw.toLowerCase().replace(/[^a-z\/ ]/g," ").replace(/\s+/g," ").trim();if(!l)return null;if(LOOKUP[l])return{k:LOOKUP[l]};
 if(l.length<5)return null;let best=null,bd=9,tie=false;for(const a in LOOKUP){if(a.length<5)continue;const x=lev(l,a);if(x<bd){bd=x;best=LOOKUP[a];tie=false}else if(x===bd&&LOOKUP[a]!==best)tie=true}
 return best&&!tie&&bd<=(l.length>8?2:1)?{k:best,fuzzy:true}:null}
/* Bersihkan awalan salinan WhatsApp ("[12/10/26 18.00] Nama:"), tanda tebal, dan butir daftar. */
function cleanLine(line){return line.replace(/^\s*\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?::\d{2})?\]?\s*-?\s*[^:]{1,40}:\s+(?=\S)/,"").replace(/[*~`]/g,"").replace(/^\s*(?:[-•]|\d+[.)])\s+/,"").replace(/^[^\p{L}\p{N}]+/u,"")}
/* ===== Pembaca label berbasis MAKNA (tidak bergantung pada penulisan persis) =====
   Setiap kata pada label dinilai: kata kunci (punya bobot untuk satu kolom), kata pengisi (diabaikan, mis. "lembur", "yang"),
   atau kata asing. Kolom dengan bobot total tertinggi menang; seri dianggap tidak jelas. Salah ketik ringan pada kata kunci dimaklumi.
   Satu kata asing (>= 4 huruf) masih boleh, tetapi hasilnya ditandai "periksa" (loose/fuzzy). Label berisi angka tidak pernah dianggap label. */
function semBangun(def,fill){const kw={};for(const k in def)def[k].forEach(([t,w])=>{kw[t]=[k,w]});return{kw,fill:new Set(fill)}}
function semNilai(raw,V){
 raw=String(raw==null?"":raw);if(/\d/.test(raw))return null;
 const tk=raw.toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ").filter(Boolean);if(!tk.length||tk.length>6)return null;
 const sk={};let unk=0,typo=false,hit=0;
 const cari=t=>{if(t.length<5)return null;let bd=9,ls=[];for(const w in V.kw){if(w.length<5)continue;const d=lev(t,w);if(d<bd){bd=d;ls=[w]}else if(d===bd)ls.push(w)}
  if(bd>(t.length>8?2:1))return null;return new Set(ls.map(w=>V.kw[w][0])).size===1?V.kw[ls[0]]:null};
 for(const t of tk){let e=V.kw[t];
  if(!e){if(V.fill.has(t))continue;e=cari(t);if(e)typo=true}
  if(e){sk[e[0]]=(sk[e[0]]||0)+e[1];hit++}else{unk+=t.length>=4?1:99}}
 if(!hit||unk>1)return null;
 const r=Object.entries(sk).sort((a,b)=>b[1]-a[1]);if(r[0][1]<3||(r[1]&&r[1][1]>=r[0][1]))return null;
 return{k:r[0][0],fuzzy:typo||unk>0,loose:unk>0}}
const SEM_L={nama:[["nama",3],["operator",2],["personel",2],["personil",2],["pegawai",2],["karyawan",2],["petugas",2],["pelaksana",2]],
 nip:[["nip",6],["nik",6],["id",5],["induk",6]],jabatan:[["jabatan",6],["posisi",6]],
 unit:[["unit",6],["ultg",6],["divisi",6],["bagian",4],["upt",5],["satker",5],["seksi",5],["departemen",5]],
 tanggal:[["tanggal",5],["tgl",5],["hari",3],["date",5]],mulai:[["mulai",6],["awal",5],["masuk",5],["start",5]],
 selesai:[["selesai",6],["akhir",5],["berakhir",6],["pulang",5],["keluar",5],["sampai",5],["hingga",5],["usai",5],["end",5]],
 jam:[["jam",3],["waktu",3],["pukul",3],["pkl",3]],
 uraian:[["uraian",6],["pekerjaan",6],["kerjaan",6],["maksud",6],["keperluan",6],["kegiatan",5],["tugas",5],["deskripsi",5],["aktivitas",6],["alasan",5],["tujuan",4],["perihal",5],["rincian",4],["keterangan",3],["agenda",5]],
 pemberi:[["pemberi",9],["atasan",9],["tl",9],["leader",8],["spv",9],["supervisor",9],["disetujui",9],["menyetujui",9],["memerintah",8],["diperintah",8],["izin",3],["perintah",2],["team",2]],
 lokasi:[["lokasi",9],["tempat",7],["lapangan",5],["site",5]]};
const SEM_VOC_L=semBangun(SEM_L,"lembur kerja yang dilakukan dikerjakan di untuk dari oleh ke pada spk surat pelaksanaan nya detail lengkap no nomor dan data info informasi ini".split(" "));
function semCocok(raw){const l=String(raw||"").toLowerCase().replace(/[^a-z\/ ]/g," ").replace(/\s+/g," ").trim();if(!l)return null;if(LOOKUP[l])return{k:LOOKUP[l]};return semNilai(raw,SEM_VOC_L)}
/* Label tanpa tanda baca: pilih rentang kata terpanjang (2-4 kata) yang seluruhnya kata label. Rentang yang berakhir pada kata sekolom
   dengan kata sebelumnya (mis. "Unit Kerja ULTG") dipendekkan, supaya nilai yang diawali kata kunci tidak ikut tertelan. */
function labelTanpaTanda(w,V,LK,maks,min){
 for(let n=Math.min(maks,w.length-1);n>=min;n--){const lab=w.slice(0,n);if(lab.some(x=>!/^[A-Za-z]+$/.test(x)))continue;const sp=lab.join(" ").toLowerCase();
  if(LK[sp])return{k:LK[sp],n,exact:true};
  const r=semNilai(sp,V);if(!r||r.loose)continue;
  if(n>=2){const e=V.kw[lab[n-1].toLowerCase()];if(e&&e[0]===r.k&&e[1]>=4&&lab.slice(0,n-1).some(x=>{const f=V.kw[x.toLowerCase()];return f&&f[0]===r.k}))continue}
  return{k:r.k,n,fuzzy:r.fuzzy?lab.join(" "):undefined}}
 return null}
/* Label "lemah" boleh dipakai tanpa titik dua hanya jika ada tanda ":" atau "="; label lain boleh ditulis langsung diikuti nilai. */
const LABEL_LEMAH=new Set(["tempat","tugas","kegiatan","deskripsi","bagian","posisi","operator","personel","personil","ultg","unit","atasan"]);
const ALIAS_URUT=Object.keys(LOOKUP).sort((a,b)=>b.length-a.length).map(a=>({a,re:new RegExp("^"+a.split("/").map(p=>p.trim().split(" ").map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("\\s+")).join("\\s*\\/\\s*")+"(?=[\\s:=]|$)","i")}));
/* Membaca satu baris menjadi {k: kolom, v: nilai}. Mendukung "Nama: x", "Nama = x", "Nama - x", dan "Nama x" (tanpa tanda baca),
   termasuk nilai yang memuat titik dua seperti "Jam 16:30-21:30". Salah ketik ringan pada label juga dimaklumi. */
function bacaBaris(baris){
 const t=cleanLine(baris).trim();if(!t)return null;
 /* 1. Label sebelum ":" / "=" pertama, dicocokkan menurut maknanya ("Maksud Lembur:", "Nama Atasan:", "Tgl Pelaksanaan:" ...). */
 {const m=/^([^:=\n\d]{2,40}?)\s*[:=]\s*(.*)$/.exec(t);if(m){const lm=semCocok(m[1]);if(lm)return{k:lm.k,v:m[2].trim(),fuzzy:lm.fuzzy?m[1].trim():undefined,loose:!!lm.loose}}}
 /* 2. Tanpa tanda baca, label dua kata atau lebih ("Maksud Lembur Pemantauan ...", "Nama Atasan Rahmat"). */
 {const w=t.split(/\s+/);if(w.length>=3){const r=labelTanpaTanda(w,SEM_VOC_L,LOOKUP,4,2);if(r)return{k:r.k,v:w.slice(r.n).join(" ").trim(),fuzzy:r.fuzzy,loose:!r.exact}}}
 for(const {a,re} of ALIAS_URUT){const m=re.exec(t);if(!m)continue;const sisa=t.slice(m[0].length);
  const sep=/^\s*[:=]\s*/.exec(sisa);if(sep)return{k:LOOKUP[a],v:sisa.slice(sep[0].length).trim()};
  if(LABEL_LEMAH.has(a))continue;
  if(!sisa.trim())return{k:LOOKUP[a],v:""};
  const s2=/^\s*[-–—]\s+|^\s+/.exec(sisa);if(s2){const v=sisa.slice(s2[0].length).trim();if(v)return{k:LOOKUP[a],v}}}
 const m=/^\s*([^:=\n]{2,30}?)\s*[:=]\s*(.*)$/.exec(t);
 if(m){const lm=matchLabel(m[1]);if(lm)return{k:lm.k,v:m[2].trim(),fuzzy:m[1].trim()}}
 const w=t.split(/\s+/);let huruf=0;while(huruf<w.length&&huruf<3&&/^[A-Za-z\/.]+$/.test(w[huruf]))huruf++;
 for(let n=Math.min(huruf,w.length-1);n>=1;n--){const lm=matchLabel(w.slice(0,n).join(" "));if(lm&&lm.fuzzy)return{k:lm.k,v:w.slice(n).join(" ").trim(),fuzzy:w.slice(0,n).join(" ")}}
 return null}
const BLN_ABR={ags:"Agustus",agt:"Agustus",agst:"Agustus",nop:"November",dec:"Desember",oct:"Oktober",aug:"Agustus"};
function normDate(s){let w="";s=s.trim().replace(/^(?:sen(?:in)?|sel(?:asa)?|rab(?:u)?|kam(?:is)?|jum(?:'?at)?|sab(?:tu)?|min(?:ggu)?|ahad)\b[,.\s]*(?=\d)/i,"").replace(/^(\d{1,2}[\/\-.]\d{1,2}[\/\-.])(\d{2})$/,(_,a,b)=>{w="Tahun 2 digit dibaca 20"+b;return a+"20"+b});
 s=s.replace(/[A-Za-z]{3,}/g,x=>{if(BLN_ABR[x.toLowerCase()])return BLN_ABR[x.toLowerCase()];const i=BLN.findIndex(b=>b.toLowerCase().startsWith(x.toLowerCase()));return i>=0?BLN[i]:x});
 const r=parseDate(s);if(w&&!r.err)r.warn=(r.warn?r.warn+"; ":"")+w;return r}
const SEM_SAPA=new Set("selamat pagi siang sore malam pak bu bapak ibu mas mbak kak om salam assalamualaikum assalamu alaikum waalaikumsalam halo hai hi mohon tolong permisi terima kasih laporan lapor siap ok oke baik ya yth dengan hormat berikut form format pesan infokan dibantu bantu ijin".split(" "));
function layakNama(s){if(s.length<2||s.length>40)return false;if(!/^\p{L}[\p{L}.'\u2019-]*(?:\s+\p{L}[\p{L}.'\u2019-]*){0,4}$/u.test(s))return false;
 return s.toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ").filter(Boolean).every(t=>!SEM_VOC_L.kw[t]&&!SEM_VOC_L.fill.has(t)&&!SEM_SAPA.has(t))}
function parseWA(text){
 const raw={},cnt={},fz={},unk=[],bebas=[];let cur=null,nb=0;
 for(const baris of text.split(/\r?\n/)){
  const line=cleanLine(baris);if(!line.trim())continue;nb++;
  let b=bacaBaris(line);
  /* Label "longgar" (ada kata asing / tanpa tanda baca) yang sudah pernah muncul, atau muncul di tengah uraian, dianggap lanjutan isi, bukan label baru. */
  if(b&&b.loose&&(cnt[b.k]||cur==="uraian"))b=null;
  if(b){const k=b.k;cnt[k]=(cnt[k]||0)+1;if(cnt[k]===1){raw[k]=b.v;cur=k;if(b.fuzzy)fz[k]=b.fuzzy}else cur=null}
  else if(cur&&raw[cur]===""&&cnt[cur]===1)raw[cur]=line.trim(); /* nilai ditulis di baris berikutnya ("Nama:" lalu "Budi") */
  else if(cur==="uraian"&&!RANGE.test(line)&&!/^\s*\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\s*$/.test(line))raw.uraian+="\n"+line.trim();
  else if(/[:=]/.test(line))unk.push(line.trim().slice(0,60));
  else bebas.push({t:line.trim(),n:nb});
 }
 /* Tanggal dan jam dalam satu isian ("Rabu, 7 Oktober 2026 (16.30-21.00 WITA)"): pisahkan, jam dipakai bila belum ada. */
 if(raw.tanggal){const rg=RANGE.exec(raw.tanggal);if(rg){const sisa=raw.tanggal.replace(rg[0]," ").replace(/\b(?:wita|wib|wit|jam|pukul|pkl)\b/gi," ").replace(/[()\[\]]/g," ").replace(/\s+/g," ").replace(/[,\-\u2013\u2014@\s]+$/,"").trim();
  if(sisa&&!normDate(sisa).err){raw.tanggal=sisa;if(!raw.jam&&!raw.mulai)raw.jam=rg[0]}}}
 const f={},st={};
 const set=(k,v,w)=>{f[k]=v;st[k]={s:w?"warn":"ok",m:w||""}};
 const bad=(k,msg)=>{st[k]={s:"error",m:msg};if(raw[k]!==undefined)f[k]=raw[k]};
 const note=k=>[cnt[k]>1?"Label muncul "+cnt[k]+"x, memakai yang pertama":"",fz[k]?"Label '"+fz[k]+"' dibaca sebagai kolom ini":""].filter(Boolean).join("; ");
 for(const k of ["nama","nip","jabatan","unit","uraian","pemberi","lokasi"])if(raw[k])set(k,raw[k],note(k));
 if(raw.tanggal){const r=normDate(raw.tanggal);r.err?bad("tanggal",r.err+": "+raw.tanggal):set("tanggal",r.iso,[r.warn,note("tanggal")].filter(Boolean).join("; "))}
 let a=raw.mulai,b=raw.selesai;
 /* "Jam Mulai: 16.30 - 21.00": isian mulai/selesai yang berisi rentang dipecah. */
 {const rm=a&&RANGE.exec(a),rs=b&&RANGE.exec(b);if(rm){a=rm[1];if(!b)b=rm[2]}if(rs){if(!rm)a=a||rs[1];b=rs[2]}}
 if(raw.jam&&(!a||!b)){const r=RANGE.exec(raw.jam);if(r){a=a||r[1];b=b||r[2]}else bad("jam","Rentang jam tidak terbaca: "+raw.jam)}
 [["mulai",a],["selesai",b]].forEach(([k,v])=>{if(!v)return;const r=parseTime(v);r.err?bad(k,r.err+": "+v):set(k,r.v,note(k))});
 /* Cadangan tanpa label: cari pola di seluruh teks, selalu ditandai 'periksa'. */
 if(!f.tanggal&&!st.tanggal){const r=DATE_ANY.exec(text);if(r){const d=normDate(r[0]);if(!d.err)set("tanggal",d.iso,"Ditebak dari teks tanpa label - periksa"+(d.warn?"; "+d.warn:""))}}
 if(!f.mulai&&!f.selesai&&!st.mulai&&!st.selesai){const r=RANGE.exec(text);if(r){const x=parseTime(r[1]),y=parseTime(r[2]);if(!x.err&&!y.err){set("mulai",x.v,"Ditebak dari rentang jam tanpa label - periksa");set("selesai",y.v,"Ditebak dari rentang jam tanpa label - periksa")}}}
 if(!f.nip){const r=/\b\d{6,}[A-Za-z]{0,4}\b/.exec(text);if(r)set("nip",r[0],"Ditebak dari teks tanpa label - periksa")}
 /* Nama tanpa label: baris huruf biasa (bukan sapaan/kata label) di antara 3 baris pertama; selalu ditandai periksa. */
 if(!f.nama&&!st.nama){const c=bebas.find(x=>x.n<=3&&layakNama(x.t));if(c)set("nama",c.t,"Ditebak dari teks tanpa label - periksa")}
 for(const k of ["nama","nip","jabatan","unit","tanggal","mulai","selesai","uraian","pemberi","lokasi"])if(!st[k])st[k]={s:"missing",m:"Tidak ditemukan"};
 if(f.mulai&&f.selesai&&f.mulai===f.selesai)st.selesai={s:"warn",m:"Jam mulai = jam selesai (dihitung 24 jam)"};
 return{f,st,unk}}
/* Daftar kunci bulan "YYYY-MM" -> "OKTOBER 2026" | "OKTOBER-NOVEMBER 2026" | "DESEMBER 2026-JANUARI 2027" ("" bila kosong). */
function rentangBulanTeks(mks){const u=[...new Set((mks||[]).filter(x=>/^\d{4}-\d{2}$/.test(x||"")))].sort();if(!u.length)return"";
 const a=u[0],b=u[u.length-1],nm=k=>BLN[+k.slice(5,7)-1].toUpperCase(),th=k=>k.slice(0,4);
 return a===b?nm(a)+" "+th(a):th(a)===th(b)?nm(a)+"-"+nm(b)+" "+th(a):nm(a)+" "+th(a)+"-"+nm(b)+" "+th(b)}
function nextNo(type){const s=DB.settings,seq=(type==="spk"?s.seqSpk:s.seqLem)+1;return fmtNo(type==="spk"?s.polaSpk:s.polaLem,seq,cur.tanggal)}
/* Nomor urut ditulis "...." (diisi tangan setelah dicetak) selama Pengaturan "Nomor urut ditulis ...." aktif; bulan Romawi, tahun, dan kode unit tetap otomatis. */
function fmtNo(pola,n,iso){const d=iso?new Date(iso+"T00:00"):new Date();return pola.replace("{n}",DB.settings.nomorKosong?"....":String(n).padStart(DB.settings.pad,"0")).replace("{rom}",ROM[d.getMonth()]).replace("{yyyy}",d.getFullYear()).replace("{mm}",pad2(d.getMonth()+1))}
function bumpSeq(){const b=(no,k)=>{const n=parseInt(no,10);if(!isNaN(n)&&n>DB.settings[k])DB.settings[k]=n};b(cur.spk,"seqSpk");b(cur.lemburNo,"seqLem")}
