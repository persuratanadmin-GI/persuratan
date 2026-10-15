"use strict";
/* State surat aktif, daftar kolom formulir, penempelan tanda tangan otomatis. */
/* ===== State surat aktif ===== */
const REQ=["name","nip","tanggal","mulai","selesai","uraian","pemberiName","koorName"];
const FULL=["name","uraian"];
const FIELDS=[["#","Nomor surat"],["spk","Nomor SPK (ref. PLN)"],["lemburNo","Nomor Surat Lembur"],["#","Personel (operator)"],["@person"],["name","Nama personel"],["nip","ID / NIP"],["jabatan","Jabatan"],["#","Waktu dan pekerjaan"],["tanggal","Tanggal lembur","date"],["lokasi","Lokasi pekerjaan"],["mulai","Jam mulai","time"],["selesai","Jam selesai","time"],["durManual","Durasi manual (jam)"],["unit","Unit kerja (tidak tampil di surat)"],["uraian","Uraian pekerjaan","area"],["#","Pemberi perintah"],["@pemberi"],["pemberiName","Nama pemberi perintah"],["pemberiJab","Jabatan pemberi perintah"],["#","Penerima perintah (koordinator)"],["@koor"],["koorName","Nama penerima perintah / koordinator"],["koorJab","Jabatan koordinator"]];
function blank(){const s=DB.settings;const c={id:null,spk:"",lemburNo:"",name:"",nip:"",jabatan:s.jabPers,unit:"",tanggal:"",mulai:"",selesai:"",durManual:"",lokasi:s.lokasi,uraian:"",pemberiName:"",pemberiJab:s.jabPemberi,koorName:s.koorName,koorJab:s.kepada,sigP:"",sigG:"",sigK:sigLookup(s.koorName),sigPos:{},status:"draft",flags:{}};return c}
let cur;try{cur=JSON.parse(sessionStorage.getItem("lembur.cur"))}catch(e){}
let batch=[],idx=0;try{const b=JSON.parse(sessionStorage.getItem("lembur.batch"));if(b&&b.batch&&b.batch.length){batch=b.batch;idx=Math.min(b.idx||0,batch.length-1);cur=batch[idx]}}catch(e){}
if(!cur){cur=blank()}
if(!batch.length){batch=[cur];idx=0}
function persistCur(){try{sessionStorage.setItem("lembur.batch",JSON.stringify({batch,idx}))}catch(e){}}
function norm(s){return(s||"").toLowerCase().replace(/\s+/g," ").trim()}
function sigEntry(name){const n=norm(name);return n?DB.sigs.find(x=>norm(x.name)===n):null}
function sigLookup(name){const e=sigEntry(name);if(e&&e.sig)return e.sig;const p=DB.people.find(x=>x.sig&&norm(x.name)===norm(name));return p&&norm(name)?p.sig:""}
function autoSig(w){const m={G:["pemberiName","sigG"],K:["koorName","sigK"],P:["name","sigP"]}[w];cur[m[1]]=sigLookup(cur[m[0]])}
function autoAll(){["G","K","P"].forEach(autoSig)}
function sigOpts(){return'<option value="">- pilih dari tanda tangan terdaftar -</option>'+DB.sigs.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}
function activePeople(){return DB.people.filter(p=>p.aktif!==false)}
function personOpts(sel){return'<option value="">- pilih dari daftar -</option>'+activePeople().map(p=>`<option value="${p.id}">${esc(p.name)}${p.nip?" · "+esc(p.nip):""}</option>`).join("")}
function buildForm(){
 $("form").innerHTML=FIELDS.map(([k,l,t])=>{
  if(k==="#")return`<h4 class="sec">${l}</h4>`;
  if(k==="@person")return`<div class="fld fw"><label>Pilih dari daftar personel</label><select data-sel="P">${personOpts()}</select></div>`;
  if(k==="@pemberi")return`<div class="fld fw"><label>Pilih dari tanda tangan terdaftar</label><select data-sel="G">${sigOpts()}</select></div>`;
  if(k==="@koor")return`<div class="fld fw"><label>Pilih dari tanda tangan terdaftar</label><select data-sel="K">${sigOpts()}</select></div>`;
  const rc=REQ.includes(k)?' class="req"':"";const a=t==="area"?`<textarea data-k="${k}"${rc}></textarea>`:`<input data-k="${k}" type="${t||"text"}"${rc}>`;
  const extra=k==="spk"?` <a href="#" data-auto="spk">isi otomatis</a>`:k==="lemburNo"?` <a href="#" data-auto="lem">isi otomatis</a>`:"";
  return`<div class="fld${FULL.includes(k)?" fw":""}${REQ.includes(k)?" isreq":""}"><label>${l}${REQ.includes(k)?' <span class="rq">*</span>':''}${extra}</label>${a}</div>`}).join("");
 syncForm()}
function syncForm(){document.querySelectorAll("[data-k]").forEach(el=>{el.value=cur[el.dataset.k]??"";el.classList.toggle("warn",!!cur.flags?.[el.dataset.k]);el.title=cur.flags?.[el.dataset.k]||"";el.classList.toggle("need",REQ.includes(el.dataset.k)&&!String(el.value).trim())})}
$("form").addEventListener("input",e=>{const k=e.target.dataset.k;if(!k)return;cur[k]=e.target.value;e.target.classList.toggle("need",REQ.includes(k)&&!e.target.value.trim());if(k==="pemberiName"){autoSig("G");const en=sigEntry(cur.pemberiName);if(en&&en.jabatan){cur.pemberiJab=en.jabatan;document.querySelector('[data-k=pemberiJab]').value=en.jabatan}}else if(k==="koorName")autoSig("K");else if(k==="name")autoSig("P");if(cur.flags?.[k]){delete cur.flags[k];e.target.classList.remove("warn")}update()});
$("form").addEventListener("change",e=>{const w=e.target.dataset.sel;if(!w)return;const p=(w==="P"?DB.people:DB.sigs).find(x=>x.id===e.target.value);if(!p)return;
 if(w==="P"){Object.assign(cur,{name:p.name,nip:p.nip,jabatan:p.jabatan||DB.settings.jabPers,unit:p.unit,sigP:p.sig||sigLookup(p.name),pId:p.id})}
 if(w==="G"){Object.assign(cur,{pemberiName:p.name,pemberiJab:p.jabatan||DB.settings.jabPemberi,sigG:p.sig||""})}
 if(w==="K"){Object.assign(cur,{koorName:p.name,koorJab:p.jabatan||DB.settings.kepada,sigK:p.sig||""})}
 syncForm();update()});
$("form").addEventListener("click",e=>{const a=e.target.dataset.auto;if(!a)return;e.preventDefault();if(a==="spk")cur.spk=nextNo("spk");else cur.lemburNo=nextNo("lem");syncForm();update()});
function missing(c=cur){const m=[];[["name","nama personel"],["nip","ID/NIP"],["tanggal","tanggal"],["mulai","jam mulai"],["selesai","jam selesai"],["uraian","uraian"],["pemberiName","pemberi perintah"],["koorName","koordinator"]].forEach(([k,l])=>{if(!c[k])m.push(l)});return m}
