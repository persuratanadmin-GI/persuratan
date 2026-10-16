"use strict";
/* Antarmuka "Simpan ke Excel": pilih berkas Excel (opsional), cocokkan nama, lihat rencana, lalu simpan. */
const XL_MIME="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let xlS=null;
const xlKunci=c=>String(c.nip||c.name||"").trim().toLowerCase();
const xlRapi=t=>String(t||"").replace(/\s+/g," ").trim();

function xlNamaDiFile(){const out=[];if(!xlS.wb)return out;
 xlS.wb.worksheets.forEach(ws=>{if(xlSheetBulan(ws))xlParse(ws).people.forEach(p=>{if(!out.includes(p.name))out.push(p.name)})});return out}
function xlNamaAwal(){const ada=xlNamaDiFile(),peta=DB.settings.excelMap||{};
 xlS.letters.forEach(c=>{const k=xlKunci(c);if(xlS.diubah[k])return;
  const simpan=peta[k];xlS.nama[k]=(simpan&&(!ada.length||ada.includes(simpan))?simpan:xlCariNama(c.name,ada))||xlRapi(c.name).toUpperCase()})}
function xlEntri(){return xlS.letters.map(c=>({nama:xlRapi(xlS.nama[xlKunci(c)]||c.name).toUpperCase(),iso:c.tanggal,masuk:c.mulai,pulang:c.selesai,ket:xlRapi(c.uraian)}))}

function bukaExcel(sumber){
 if(typeof ExcelJS==="undefined"){toast("Pustaka Excel gagal dimuat (cek koneksi atau folder vendor).");return}
 const sah=sumber.filter(c=>c.name&&c.tanggal&&c.mulai&&c.selesai);
 if(!sah.length){toast("Tidak ada surat yang lengkap (nama, tanggal, jam mulai dan selesai).");return}
 xlS={letters:sah,abaikan:sumber.length-sah.length,wb:null,namaFile:"",handle:null,nama:{},diubah:{},sibuk:false,tglTtd:"",ttd:[1,2,3,4].map(i=>({label:DB.settings["xlLbl"+i]||"",nama:DB.settings["xlNama"+i]||""}))};
 const o=document.createElement("div");o.className="mdl";o.innerHTML='<div id="xlBox"></div>';document.body.appendChild(o);xlS.el=o;
 o.addEventListener("click",xlKlik);o.addEventListener("input",xlInput);o.addEventListener("change",xlUbahBerkas);
 xlNamaAwal();xlGambar()}
function xlTutup(){if(xlS&&xlS.el)xlS.el.remove();xlS=null}
function xlGambar(){
 const names=xlNamaDiFile(),b=$("xlBox"),dup=xlS.letters.filter(c=>c.excelAt).length,manual=xlS.letters.filter(c=>(c.durManual||"").trim()).length;
 b.innerHTML=`<h3>Simpan ke Excel</h3>
 <div class="hint">${xlS.letters.length} surat${xlS.abaikan?`, ${xlS.abaikan} dilewati karena nama, tanggal, atau jam belum lengkap`:""}${dup?` \u00b7 ${dup} sudah pernah dicatat (otomatis dilewati)`:""}</div>
 ${manual?`<div class="hint w">${manual} surat memakai durasi manual. Excel menghitung dari jam masuk dan pulang.</div>`:""}
 <div class="xlf"><button class="g" data-x="pilih">Pilih file Excel\u2026</button><input type="file" id="xlFile" accept=".xlsx" hidden>
  <span>${xlS.wb?esc(xlS.namaFile)+" \u00b7 sheet: "+xlS.wb.worksheets.map(w=>esc(w.name)+(xlSheetBulan(w)?" ("+xlBulanLabel(xlSheetBulan(w))+")":"")).join(", "):"Tanpa file: dibuat file Excel baru"}</span>
  ${xlS.wb?'<button class="g" data-x="lepas">Lepas</button>':""}</div>
 <h4>Nama di Excel</h4><datalist id="xlDL">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
 <table class="t"><tr><th>Nama di surat</th><th>Ditulis di Excel sebagai</th></tr>${[...new Map(xlS.letters.map(c=>[xlKunci(c),c])).values()].map(c=>`<tr><td>${esc(c.name)}</td><td><input list="xlDL" data-k="${esc(xlKunci(c))}" value="${esc(xlS.nama[xlKunci(c)]||"")}"></td></tr>`).join("")}</table>
 <h4>Blok pengesahan <span class="hint">(sheet baru; sheet yang sudah ada memakai blok miliknya)</span></h4>
 <table class="t"><tr><th>Jabatan</th><th>Nama</th><th></th></tr>${xlS.ttd.map((t,i)=>`<tr><td><input data-tl="${i}" value="${esc(t.label)}"></td><td><input data-tn="${i}" value="${esc(t.nama)}"></td><td id="xlTt${i}" style="white-space:nowrap">${t.nama&&sigLookup(t.nama)?"\u2714 ttd":""}</td></tr>`).join("")}</table>
 <div class="xlf"><span>Tanggal pengesahan</span><input type="date" data-tg="1" value="${esc(xlS.tglTtd)}" style="width:auto"><span class="hint">kosong = akhir bulan</span></div>
 <h4>Rencana</h4><div id="xlPlan"></div>
 <div class="acts" style="justify-content:flex-end"><button class="g" data-x="batal">Batal</button><button class="b" data-x="simpan" id="xlSimpan">Simpan Excel</button></div>`;
 xlRencanaTampil()}
function xlRencanaTampil(){
 let rc;try{rc=xlRencana(xlS.wb,xlEntri())}catch(e){$("xlPlan").innerHTML='<div class="hint w">Berkas tidak bisa dibaca: '+esc(e.message||e)+"</div>";return}
 $("xlPlan").innerHTML=rc.map(p=>`<div class="pl"><b>${p.baru?'Sheet baru "'+esc(xlBulanLabel(p.mk))+'"':'Sheet "'+esc(p.sheet)+'" (bulan '+esc(xlBulanLabel(p.mk))+")"}</b>
  <div class="hint">+${p.ditambah} baris lembur${p.dilewati?`, ${p.dilewati} sudah ada (dilewati)`:""}${!p.baru&&p.orangBaru.length?` \u00b7 orang baru di sheet ini: ${esc(p.orangBaru.join(", "))}`:""}</div>
  <table class="t">${p.ringkas.map(r=>`<tr><td>${esc(r.nama)}</td><td>${r.n} lembur</td><td>${r.total.nilai.toFixed(2)} (${esc(r.total.teks)})</td></tr>`).join("")}</table></div>`).join("")}
async function xlMuat(f){xlS.sibuk=true;try{const wb=new ExcelJS.Workbook();await wb.xlsx.load(await f.arrayBuffer());xlS.wb=wb;xlS.namaFile=f.name;xlS.diubah={};xlNamaAwal();xlGambar()}
 catch(e){toast("File Excel tidak bisa dibuka: "+(e&&e.message||e));xlS.wb=null;xlS.handle=null}finally{xlS.sibuk=false}}
function xlUbahBerkas(e){if(e.target.id==="xlFile"&&e.target.files[0]){xlS.handle=null;xlMuat(e.target.files[0])}}
function xlInput(e){const d=e.target.dataset||{};if(!xlS)return;
 if(d.tl!==undefined){xlS.ttd[+d.tl].label=e.target.value;return}
 if(d.tn!==undefined){xlS.ttd[+d.tn].nama=e.target.value;const c=$("xlTt"+d.tn);if(c)c.textContent=e.target.value&&sigLookup(e.target.value)?"\u2714 ttd":"";return}
 if(d.tg!==undefined){xlS.tglTtd=e.target.value;return}
 const k=d.k;if(!k)return;xlS.nama[k]=e.target.value;xlS.diubah[k]=true;xlRencanaTampil()}
async function xlKlik(e){const a=e.target.dataset&&e.target.dataset.x;if(e.target===xlS.el&&!xlS.sibuk){xlTutup();return}if(!a)return;
 if(a==="batal")xlTutup();
 else if(a==="lepas"){xlS.wb=null;xlS.namaFile="";xlS.handle=null;xlS.diubah={};xlNamaAwal();xlGambar()}
 else if(a==="pilih"){
  try{if(window.showOpenFilePicker){const [h]=await window.showOpenFilePicker({types:[{description:"Excel",accept:{[XL_MIME]:[".xlsx"]}}]});xlS.handle=h;await xlMuat(await h.getFile())}else $("xlFile").click()}
  catch(err){if(err&&err.name==="AbortError")return;$("xlFile").click()}}
 else if(a==="simpan")xlSimpanExcel()}

async function xlSlot(){const out=[];
 for(let i=1;i<=4;i++){const t=xlS.ttd[i-1],nama=t.nama||"",g=nama?sigLookup(nama):"",slot={label:t.label||"",nama};
  if(g){const im=await loadImg(g);if(im)slot.gambar={base64:g.split(",")[1],ext:"png",w:im.naturalWidth,h:im.naturalHeight}}out.push(slot)}
 return out}
async function unduhBlob(nama,blob){let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
 if(dl){await dl.save({filename:nama,data:blob});return}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nama;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
async function xlSimpanExcel(){
 if(!xlS||xlS.sibuk)return;xlS.sibuk=true;const btn=$("xlSimpan");if(btn){btn.disabled=true;btn.textContent="Menyimpan..."}
 try{
  const s=DB.settings,wb=xlS.wb||new ExcelJS.Workbook(),entri=xlEntri();
  const lap=xlTerapkan(wb,entri,{kota:s.xlKota,judul:s.xlJudul,unit:s.xlUnit,slot:await xlSlot(),tglTtd:xlS.tglTtd});
  const blob=new Blob([await wb.xlsx.writeBuffer()],{type:XL_MIME});
  let pesan="";
  if(xlS.handle){try{let izin=await xlS.handle.queryPermission({mode:"readwrite"});if(izin!=="granted")izin=await xlS.handle.requestPermission({mode:"readwrite"});
    if(izin!=="granted")throw new Error("izin ditolak");const w=await xlS.handle.createWritable();await w.write(blob);await w.close();pesan="File Excel diperbarui langsung: "+xlS.namaFile}
   catch(err){await unduhBlob(xlS.namaFile.replace(/\.xlsx$/i,"")+"-diperbarui.xlsx",blob);pesan="File asli tidak bisa ditimpa ("+(err&&err.message||err)+"). Salinan diunduh; tutup file di Excel lalu ganti file lama."}}
  else{const nama=xlS.namaFile?xlS.namaFile.replace(/\.xlsx$/i,"")+"-diperbarui.xlsx":"daftar-lembur-"+xlBulanLabel(lap[0].mk).toLowerCase().replace(/\s+/g,"-")+".xlsx";await unduhBlob(nama,blob);pesan="Excel diunduh: "+nama}
  const tambah=lap.reduce((n,l)=>n+l.ditambah,0),lewat=lap.reduce((n,l)=>n+l.dilewati,0);
  xlS.letters.forEach(c=>{c.excelAt=Date.now();const r=DB.records.find(x=>x.id&&x.id===c.id);if(r)r.excelAt=c.excelAt});
  DB.settings.excelMap=DB.settings.excelMap||{};xlS.letters.forEach(c=>{const k=xlKunci(c);DB.settings.excelMap[k]=xlRapi(xlS.nama[k]||c.name).toUpperCase()});
  xlS.ttd.forEach((t,i)=>{DB.settings["xlLbl"+(i+1)]=t.label;DB.settings["xlNama"+(i+1)]=t.nama});
  save();persistCur();if($("sheets").children.length)buildSheets();xlTutup();
  toast(pesan+" \u00b7 +"+tambah+" baris"+(lewat?", "+lewat+" dilewati":"")+".");
 }catch(e){toast("Gagal menyimpan Excel: "+(e&&e.message||e));if(xlS){xlS.sibuk=false;const b=$("xlSimpan");if(b){b.disabled=false;b.textContent="Simpan Excel"}}}}
$("bXl").onclick=()=>bukaExcel(batch);
$("rXl").onclick=()=>bukaExcel(riwayatShown);
