"use strict";
/* Lembur Pegawai - antarmuka: formulir, input WhatsApp, pratinjau Form 01-05 dan Kendali Anggaran, tanda tangan, PDF, pegawai, riwayat, pengaturan.
   Data disimpan terpisah (localStorage "pegawai.v1"); tanda tangan memakai daftar yang sama dengan mode lain (DB.sigs). Tidak mengubah mode lain. */
const PGK="pegawai.v1";
function pgLoad(){try{const d=JSON.parse(localStorage.getItem(PGK));if(d)return{pegawai:d.pegawai||[],records:d.records||[],settings:{...PG_DEF,...d.settings},pack:{no1:"",no2:"",tglAjuan:"",sigPos:{},...d.pack},forms:d.forms||PG_FORMS.map(f=>f[0]),urut:d.urut||"form",fmt:d.fmt||"gabung",evOk:!!d.evOk,fsOpen:!!d.fsOpen}}catch(e){}
 return{pegawai:[],records:[],settings:{...PG_DEF},pack:{no1:"",no2:"",tglAjuan:"",sigPos:{}},forms:PG_FORMS.map(f=>f[0]),urut:"form",fmt:"gabung",evOk:true}}
function pgMigrate(){if(!PGDB.evOk){if(!PGDB.forms.includes("EV"))PGDB.forms.push("EV");PGDB.evOk=true}PGDB.forms=PG_FORMS.map(f=>f[0]).filter(k=>PGDB.forms.includes(k))}
let PGDB=pgLoad();pgMigrate();
function pgSave(){try{localStorage.setItem(PGK,JSON.stringify(PGDB));$("st").textContent="Lembur Pegawai tersimpan "+new Date().toLocaleTimeString("id-ID");return}catch(e){}
 try{localStorage.setItem(PGK,JSON.stringify({...PGDB,records:PGDB.records.map(r=>({...r,foto:[]}))}));$("st").textContent="Tersimpan tanpa foto (penyimpanan browser penuh)";toast("Foto eviden tidak ikut tersimpan di riwayat karena penyimpanan browser penuh. Foto tetap ikut PDF selama surat masih terbuka.")}
 catch(e2){$("st").textContent="Gagal menyimpan: penyimpanan penuh/dinonaktifkan"}}
let pgBatch=[],pgIdx=0,pgCur=null,pgSel=null,pgScale=1,pgDrag=null,pgLast=[];
try{const b=JSON.parse(sessionStorage.getItem("pegawai.batch"));if(b&&b.batch&&b.batch.length){pgBatch=b.batch;pgIdx=Math.min(b.idx||0,pgBatch.length-1);if(b.pack)PGDB.pack={...PGDB.pack,...b.pack}}}catch(e){}
if(!pgBatch.length)pgBatch=[pgBlank(PGDB.settings)];
pgCur=pgBatch[pgIdx];
const pgPersist=()=>{try{sessionStorage.setItem("pegawai.batch",JSON.stringify({batch:pgBatch,idx:pgIdx,pack:PGDB.pack}))}catch(e){try{sessionStorage.setItem("pegawai.batch",JSON.stringify({batch:pgBatch.map(c=>({...c,foto:[]})),idx:pgIdx,pack:PGDB.pack}))}catch(e2){}}};
const pgS=()=>({...PG_DEF,...PGDB.settings});
/* ===== formulir ===== */
const PGREQ=["nama","nip","tanggal","mulai","selesai","uraian","lokasi"],PGFULL=["uraian","rencana","rincianReal","kejadian","nama"];
const PGF=[["#","Pegawai"],["@pg"],["nama","Nama pegawai","text"],["nip","NIP","text"],["personGrade","Person Grade","text"],["positionGrade","Position Grade","text"],["jabatan","Jabatan","text"],["unit","Bidang/Unit Pelaksana/Unit Layanan (kosong = bawaan Pengaturan)","text"],
 ["#","Waktu dan pekerjaan"],["tanggal","Hari / tanggal lembur","date"],["lokasi","Lokasi pekerjaan","text"],["mulai","Jam mulai (waktu)","time"],["selesai","Jam selesai","time"],["durManual","Durasi manual (jam)","text"],["jenis","Jenis pekerjaan","@jenis"],
 ["uraian","Rincian pekerjaan (tampil di Form 01, 02, 03)","area"],["koordinator","Koordinator pekerjaan","text"],["biaya","Estimasi biaya (Rp, Form 02)","text"],
 ["#","Surat Perintah Lembur (Form 03) - nomor dipakai juga di Form 04 dan 05"],["noSpl","Nomor urut atau nomor lengkap (mis. 123 atau 123/SDM.06.01/F01/2026)","text"],["tglSurat","Tanggal surat (kosong = sama dengan tanggal lembur)","date"],
 ["#","Form 04 - rencana pekerjaan (satu butir per baris, otomatis a, b, c)"],["rencana","Rencana pekerjaan (kosong = memakai rincian pekerjaan)","area"],
 ["#","Form 05 - laporan realisasi (kosong = sama dengan rencana)"],["realMulai","Realisasi jam mulai","time"],["realSelesai","Realisasi jam selesai","time"],["rincianReal","Rincian pekerjaan yang dilaksanakan (satu butir per baris)","area"],["kejadian","Kejadian/peristiwa penting (boleh dikosongkan)","area"],["tglLaporan","Tanggal laporan (kosong = sama dengan tanggal lembur)","date"],
 ["#","Dokumen gabungan (Form 01, 02, 08) - berlaku untuk semua surat dalam daftar"],["@pk:no1","Nomor Form 01 (Surat Usulan)"],["@pk:no2","Nomor Form 02 (Surat Permohonan)"],["@pk:tglAjuan","Tanggal pengajuan / penandatanganan (kosong = tanggal lembur pertama)","date"],
 ["#","Eviden Lembur (foto) - dicetak pada halaman A4 berjudul EVIDEN LEMBUR di akhir surat"],["@foto"]];
function pgPegOpts(){return'<option value="">- pilih dari daftar pegawai -</option>'+[...PGDB.pegawai].sort((a,b)=>a.nama.localeCompare(b.nama)).map(p=>`<option value="${esc(p.id)}">${esc(p.nama)}</option>`).join("")}
function pgBuildForm(){$("pg-form").innerHTML=PGF.map(([k,l,t])=>{
 if(k==="#")return`<h4 class="sec">${l}</h4>`;
 if(k==="@foto")return`<div class="fld fw" id="pg-fotoBox"><label>Foto eviden pekerjaan lembur (maks. ${PG_FOTO_MAX} foto per surat; otomatis dikecilkan)</label><label class="fotoadd" for="pg-fotoIn"><span class="fi-ic"></span><span><b>Pilih foto</b> atau ambil dari kamera</span></label><input type="file" id="pg-fotoIn" accept="image/*" multiple hidden><div id="pg-fotoGrid"></div>
 <div class="fctl"><label class="fpp">Foto per halaman <select data-dk="fotoPerHal"><option value="auto">Otomatis</option><option value="1">1 foto</option><option value="2">2 foto</option><option value="4">4 foto</option><option value="6">6 foto</option></select></label><div id="pg-fotoSel"></div></div></div>`;
 if(k==="@pg")return`<div class="fld fw"><label>Pilih dari daftar pegawai (mengisi NIP, grade, jabatan)</label><select data-dsel="pg">${pgPegOpts()}</select></div>`;
 if(k.startsWith("@pk:")){const pk=k.slice(4);return`<div class="fld${pk==="tglAjuan"?"":" fw"}"><label>${l}</label><input data-pk="${pk}" type="${t||"text"}"></div>`}
 const rq=PGREQ.includes(k),rc=rq?' class="req"':"";let a;
 if(t==="area")a=`<textarea data-dk="${k}"${rc}></textarea>`;else if(t==="@jenis")a=`<select data-dk="${k}">${PG_JENIS.map(j=>`<option>${j}</option>`).join("")}</select>`;else a=`<input data-dk="${k}" type="${t||"text"}"${rc}>`;
 return`<div class="fld${PGFULL.includes(k)?" fw":""}${rq?" isreq":""}"><label>${l}${rq?' <span class="rq">*</span>':""}</label>${a}</div>`}).join("");pgSync()}
const PG_FOTO_MAX=12;
function pgSync(){$("pg-form").querySelectorAll("[data-dk]").forEach(el=>{const k=el.dataset.dk;el.value=pgCur[k]??"";el.classList.toggle("warn",!!pgCur.flags?.[k]);el.title=pgCur.flags?.[k]||"";el.classList.toggle("need",PGREQ.includes(k)&&!String(el.value).trim())});
 $("pg-form").querySelectorAll("[data-pk]").forEach(el=>{el.value=PGDB.pack[el.dataset.pk]||""});pgFotoRender()}
let pgFotoSel=null;
function pgFotoRender(){const g=$("pg-fotoGrid");if(!g)return;const f=pgCur.foto||[];if(pgFotoSel!=null&&pgFotoSel>=f.length)pgFotoSel=null;
 g.innerHTML=f.length?f.map((x,i)=>`<figure class="fth${pgFotoSel===i?" sel":""}" data-fi="${i}" title="Klik untuk mengatur ukuran dan urutan"><img src="${x.src}" alt="Foto ${i+1}"><button type="button" class="fx" data-fx="${i}" title="Hapus foto ${i+1}" aria-label="Hapus foto ${i+1}">&times;</button><figcaption>${i+1}</figcaption><span class="szb"${(+x.skala||100)===100?" hidden":""}>${+x.skala||100}%</span></figure>`).join("")+`<button type="button" class="g fall" data-fall="1">Hapus semua foto</button>`:'<p class="hint">Belum ada foto. Foto yang dipilih tampil di sini dan masuk ke halaman Eviden Lembur.</p>';
 const c=$("pg-fotoSel");if(!c)return;
 if(pgFotoSel==null){c.innerHTML=f.length?'<p class="hint">Klik sebuah foto di atas, atau langsung di surat, untuk mengatur ukuran, posisi, dan urutannya.</p>':"";return}
 const v=+f[pgFotoSel].skala||100;
 c.innerHTML=`<div class="fsz"><b>Foto ${pgFotoSel+1}</b><span>Ukuran</span><input type="range" id="pg-fotoSz" min="20" max="250" step="5" value="${v}" aria-label="Ukuran foto"><input type="number" id="pg-fotoPct" min="20" max="250" step="5" value="${v}" aria-label="Ukuran foto dalam persen">%<span class="fbtn"><button type="button" class="g" data-fmv="-1" title="Pindahkan ke depan"${pgFotoSel===0?" disabled":""}>&#9664;</button><button type="button" class="g" data-fmv="1" title="Pindahkan ke belakang"${pgFotoSel===f.length-1?" disabled":""}>&#9654;</button><button type="button" class="g" data-frs="1" title="Kembalikan ukuran dan posisi ke bawaan">Reset</button></span></div><p class="hint">Bisa juga langsung di surat: seret foto untuk menggeser, tarik kotak biru di sudut kanan bawah atau putar roda mouse untuk ukuran, tombol panah untuk geser halus.</p>`}
function pgFotoSkala(v,tulis){if(pgFotoSel==null)return;v=Math.min(250,Math.max(20,Math.round(+v||100)));const f=pgCur.foto[pgFotoSel];if(v===100)delete f.skala;else f.skala=v;
 const sz=$("pg-fotoSz"),pc=$("pg-fotoPct");if(sz)sz.value=v;if(pc&&tulis)pc.value=v;
 const b=document.querySelector(`#pg-fotoGrid [data-fi="${pgFotoSel}"] .szb`);if(b){b.textContent=v+"%";b.hidden=v===100}pgUpdate()}
/* ----- foto langsung di surat: seret = geser, kotak biru / roda mouse = ukuran, panah = geser halus ----- */
let pgFD=null;
function pgFotoApply(fi){const f=pgCur.foto&&pgCur.foto[fi];if(!f)return;const k=Math.min(250,Math.max(20,+f.skala||100))/100;
 document.querySelectorAll(`#pg-sheets .lw[data-i="${pgIdx}"] .pg-fo[data-fi="${fi}"]`).forEach(el=>{const w=+el.dataset.bw*k,h=+el.dataset.bh*k;el.style.width=w+"pt";el.style.height=h+"pt";el.style.left=(+el.dataset.cx-w/2+(+f.dx||0))+"pt";el.style.top=(+el.dataset.y0+(+f.dy||0))+"pt"})}
function pgFotoMark(){document.querySelectorAll("#pg-sheets .pg-fo").forEach(el=>{const lw=el.closest(".lw");el.classList.toggle("sel",pgFotoSel!=null&&!!lw&&+lw.dataset.i===pgIdx&&+el.dataset.fi===pgFotoSel)})}
function pgFotoPilih(i){if(pgSel)pgSelect(null);pgFotoSel=i;pgFotoRender();pgFotoMark()}
function pgFotoPanel(f){const v=Math.round(+f.skala||100),sz=$("pg-fotoSz"),pc=$("pg-fotoPct");if(sz)sz.value=v;if(pc)pc.value=v;
 const b=document.querySelector(`#pg-fotoGrid [data-fi="${pgFotoSel}"] .szb`);if(b){b.textContent=v+"%";b.hidden=v===100}}
const pgSkalaSet=(f,v)=>{v=Math.min(250,Math.max(20,Math.round(v)));if(v===100)delete f.skala;else f.skala=v};
$("pg-sheets").addEventListener("pointerdown",e=>{const fo=e.target.closest&&e.target.closest(".pg-fo");if(!fo)return;e.preventDefault();const lw=fo.closest(".lw"),i=+lw.dataset.i,fi=+fo.dataset.fi;
 if(i!==pgIdx){pgActive(i);pgFotoPilih(fi);return}
 pgFotoPilih(fi);const f=pgCur.foto[fi];if(!f)return;const r=fo.getBoundingClientRect();
 pgFD={fi,mode:e.target.classList.contains("fh")?"size":"move",x0:e.clientX,y0:e.clientY,dx0:+f.dx||0,dy0:+f.dy||0,s0:+f.skala||100,w0:r.width||1};fo.setPointerCapture(e.pointerId)});
$("pg-sheets").addEventListener("pointermove",e=>{if(!pgFD)return;const f=pgCur.foto[pgFD.fi];if(!f)return;
 if(pgFD.mode==="size")pgSkalaSet(f,pgFD.s0*(1+((e.clientX-pgFD.x0)+(e.clientY-pgFD.y0))/2/pgFD.w0));
 else{const k=.75/(pgScale||1);f.dx=+(pgFD.dx0+(e.clientX-pgFD.x0)*k).toFixed(1);f.dy=+(pgFD.dy0+(e.clientY-pgFD.y0)*k).toFixed(1)}
 pgFotoApply(pgFD.fi);pgFotoPanel(f)});
const pgFEnd=()=>{if(pgFD){pgFD=null;pgPersist()}};$("pg-sheets").addEventListener("pointerup",pgFEnd);$("pg-sheets").addEventListener("pointercancel",pgFEnd);
$("pg-sheets").addEventListener("wheel",e=>{const fo=e.target.closest&&e.target.closest(".pg-fo");if(!fo)return;e.preventDefault();const lw=fo.closest(".lw"),i=+lw.dataset.i,fi=+fo.dataset.fi;
 if(i!==pgIdx)pgActive(i);if(pgFotoSel!==fi)pgFotoPilih(fi);const f=pgCur.foto[fi];if(!f)return;pgSkalaSet(f,(+f.skala||100)*(e.deltaY<0?1.06:1/1.06));pgFotoApply(fi);pgFotoPanel(f);pgPersist()},{passive:false});
document.addEventListener("pointerdown",e=>{if(pgFotoSel!=null&&!e.target.closest(".pg-fo")&&!e.target.closest("#pg-fotoBox")){pgFotoSel=null;pgFotoRender();pgFotoMark()}});
document.addEventListener("keydown",e=>{if(pgFotoSel==null||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;
 const f=pgCur.foto[pgFotoSel];if(!f)return;e.preventDefault();const st=e.shiftKey?5:1;f.dx=+((+f.dx||0)+d[0]*st).toFixed(1);f.dy=+((+f.dy||0)+d[1]*st).toFixed(1);pgFotoApply(pgFotoSel);pgPersist()});
function pgFotoBaca(file,max=1100,q=.74){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=()=>rej(new Error("berkas tidak terbaca"));r.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error("bukan gambar yang didukung"));
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*k)),h=Math.max(1,Math.round(im.naturalHeight*k)),cv=document.createElement("canvas");cv.width=w;cv.height=h;const cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);res({src:cv.toDataURL("image/jpeg",q),w,h,name:file.name})};im.src=r.result};r.readAsDataURL(file)})}
async function pgFotoTambah(files){files=[...files].filter(f=>/^image\//.test(f.type)||/\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(f.name));if(!files.length){toast("Pilih berkas gambar (JPG, PNG, atau WebP).");return}
 pgCur.foto=pgCur.foto||[];const sisa=PG_FOTO_MAX-pgCur.foto.length;if(sisa<=0){toast("Sudah "+PG_FOTO_MAX+" foto pada surat ini. Hapus sebagian dulu.");return}
 let n=0,gagal=0;for(const f of files.slice(0,sisa)){try{pgCur.foto.push(await pgFotoBaca(f));n++}catch(e){gagal++}}
 pgFotoRender();pgUpdate();pgSave();toast(n+" foto ditambahkan"+(files.length>sisa?" ("+(files.length-sisa)+" dilewati karena melebihi batas "+PG_FOTO_MAX+")":"")+(gagal?"; "+gagal+" gagal dibaca":"")+".")}
$("pg-form").addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-fx],[data-fall],[data-fmv],[data-frs],.fth");if(!t)return;
 if(t.dataset.fmv){const d=+t.dataset.fmv,i=pgFotoSel,j=i+d,f=pgCur.foto;if(i==null||j<0||j>=f.length)return;[f[i],f[j]]=[f[j],f[i]];pgFotoSel=j;pgFotoRender();pgUpdate();return}
 if(t.dataset.frs){if(pgFotoSel!=null){const f=pgCur.foto[pgFotoSel];delete f.dx;delete f.dy}pgFotoSkala(100,true);return}
 if(t.dataset.fall){if(!await ask("Hapus semua "+pgCur.foto.length+" foto eviden pada surat ini?"))return;pgCur.foto=[];pgFotoSel=null}
 else if(t.dataset.fx!==undefined){const i=+t.dataset.fx;pgCur.foto.splice(i,1);if(pgFotoSel!=null){if(pgFotoSel===i)pgFotoSel=null;else if(pgFotoSel>i)pgFotoSel--}}
 else{pgFotoPilih(+t.dataset.fi);return}
 pgFotoRender();pgUpdate();pgSave()});
$("pg-form").addEventListener("input",e=>{if(e.target.id==="pg-fotoSz"){pgFotoSkala(e.target.value,true);return}if(e.target.id==="pg-fotoPct"){if(e.target.value!=="")pgFotoSkala(e.target.value,false);return}
 const pk=e.target.dataset.pk;if(pk){PGDB.pack[pk]=e.target.value;pgUpdate();return}
 const k=e.target.dataset.dk;if(!k)return;const v=e.target.value,c=pgCur;
 if(k==="tanggal"&&(!c.tglSurat||c.tglSurat===c.tanggal)){c.tglSurat=v;const t=$("pg-form").querySelector('[data-dk="tglSurat"]');if(t)t.value=v}
 c[k]=v;e.target.classList.toggle("need",PGREQ.includes(k)&&!String(v).trim());
 if(k==="nama"||k==="nip"){const p=pgCariPeg(PGDB.pegawai,v);if(p&&pgNorm(p.nama)===pgNorm(c.nama)){["nip","personGrade","positionGrade","jabatan"].forEach(f=>{if(!c[f]&&p[f]){c[f]=p[f];const el=$("pg-form").querySelector(`[data-dk="${f}"]`);if(el)el.value=p[f]}})}}
 if(c.flags?.[k]){delete c.flags[k];e.target.classList.remove("warn")}pgUpdate()});
$("pg-form").addEventListener("change",e=>{if(e.target.id==="pg-fotoPct"){pgFotoSkala(e.target.value,true);return}if(e.target.id==="pg-fotoIn"){const fl=[...e.target.files];e.target.value="";pgFotoTambah(fl);return}
 if(e.target.dataset.dsel!=="pg")return;const p=PGDB.pegawai.find(x=>x.id===e.target.value);if(!p)return;
 ["nama","nip","personGrade","positionGrade","jabatan"].forEach(f=>pgCur[f]=p[f]||"");e.target.value="";delete pgCur.flags.nama;pgSync();pgUpdate()});
/* ===== pratinjau ===== */
function pgStoreOf(pg){return pg.store==="e"?pgBatch[pg.i]:PGDB.pack}
const pgStKey=pg=>pg.store==="e"?"e"+pg.i:"k";
function pgStoreByKey(s){return s==="k"?PGDB.pack:pgBatch[+s.slice(1)]}
function pgHtml(pg){const o=[],st=pgStoreOf(pg);if(!st)return"";
 for(const e of pg.items){
  if(e.k==="t"){const al=e.a==="c"?"width:500pt;text-align:center;":e.a==="r"?"width:500pt;text-align:right;":"",x=e.a==="c"?e.x-250:e.a==="r"?e.x-500:e.x;
   o.push(`<div class="pg-t" style="left:${x.toFixed(2)}pt;top:${e.y.toFixed(2)}pt;font-size:${e.s}pt;line-height:${(e.s*1.117).toFixed(2)}pt;${al}${e.b?"font-weight:bold;":""}${e.i?"font-style:italic;":""}">${esc(e.t)}</div>`)}
  else if(e.k==="l"){const h=e.y1===e.y2;o.push(`<div class="pg-l" style="left:${(h?e.x1:e.x1-e.w/2).toFixed(2)}pt;top:${(h?e.y1-e.w/2:e.y1).toFixed(2)}pt;width:${h?(e.x2-e.x1).toFixed(2):e.w}pt;height:${h?e.w:(e.y2-e.y1).toFixed(2)}pt"></div>`)}
  else if(e.k==="i"){const on=pg.store==="e"&&pg.i===pgIdx&&pgFotoSel===e.fi;o.push(`<div class="pg-fo${on?" sel":""}" data-fi="${e.fi}" data-cx="${e.cx0.toFixed(2)}" data-y0="${e.y0.toFixed(2)}" data-bw="${e.bw.toFixed(2)}" data-bh="${e.bh.toFixed(2)}" title="Seret: geser · tarik kotak biru atau roda mouse: ukuran" style="left:${e.x.toFixed(2)}pt;top:${e.y.toFixed(2)}pt;width:${e.w.toFixed(2)}pt;height:${e.h.toFixed(2)}pt"><img alt="" draggable="false" src="${e.src}"><i class="fh"></i></div>`)}
  else if(e.k==="w")o.push(`<div class="pg-l" style="background:#fff;left:${e.x.toFixed(2)}pt;top:${e.y.toFixed(2)}pt;width:${e.w}pt;height:${e.h.toFixed(2)}pt"></div>`);
  else if(e.k==="s"){const s=e.src||(e.nama?sigLookup(e.nama):"");if(!s)continue;const p=(st.sigPos||{})[e.key]||{},bw=e.w||105,bh=e.h||56,sk=pgStKey(pg),on=pgSel&&pgSel.p===e.key&&pgSel.s===sk;
   o.push(`<div class="pg-sig" style="left:${(e.cx-bw/2).toFixed(2)}pt;top:${(e.cy-bh/2).toFixed(2)}pt;width:${bw}pt;height:${bh}pt"><span class="sgb${on?" sel":""}" data-p="${e.key}" data-s="${sk}" title="Seret: geser · roda mouse: ukuran" style="--s:${p.s||1};transform:translate(${p.x||0}mm,${p.y||0}mm) scale(${p.s||1})"><img src="${s}" alt="" draggable="false" style="max-width:${bw}pt;max-height:${bh}pt"><i class="sgh"></i></span></div>`)}}
 return`<div class="pg-pg">${o.join("")}</div>`}
const pgFormName=k=>(PG_FORMS.find(f=>f[0]===k)||[,k])[1];
function pgTitleOf(pg,n,tot){const c=pg.i!=null?pgBatch[pg.i]:null;return pgFormName(pg.f)+" · "+(PG_FORMS.find(f=>f[0]===pg.f)||[])[2]+(pg.n?" (lanjutan)":"")+(c?" · "+(c.nama||"(nama belum diisi)")+" · "+(c.tanggal?pgTgl3(c.tanggal):"(tanggal?)"):" · seluruh daftar")+" · hal. "+(n+1)+"/"+tot}
let pgPgs=[];
function pgCompute(){pgPgs=pgPages(pgBatch,pgS(),PGDB.pack,PGDB.forms,PGDB.urut)}
function pgBuildSheets(){pgCompute();const box=$("pg-sheets");
 box.innerHTML=pgPgs.length?pgPgs.map((pg,n)=>`<div class="lw${pg.i===pgIdx?" act":""}" data-n="${n}"${pg.i!=null?` data-i="${pg.i}"`:""}><div class="lbar"><span class="lt">${esc(pgTitleOf(pg,n,pgPgs.length))}</span></div><div class="shwrap"><div class="shbox"><div class="sheet">${pgHtml(pg)}</div></div></div></div>`).join(""):'<p class="hint w" style="margin:14px">Pilih minimal satu form pada kotak Keluaran di atas.</p>';
 const bb=$("pg-batchbar"),many=pgBatch.length>1;bb.hidden=false;bb.innerHTML=`<b>${pgBatch.length} surat</b> ${many?pgBatch.map((c,i)=>`<button class="g" data-go="${i}">${i+1}</button>`).join(" "):""} <button class="g" id="pg-tambah" title="Tambah pegawai berikutnya ke daftar (tanggal, jam, lokasi, dan rincian disalin dari surat yang sedang dibuka)">+ Tambah pegawai</button>${many?' <button class="b nv" id="pg-pdfAktif">PDF surat ini</button> <button class="g" id="pg-hapusAktif">Hapus surat ini</button>':""}`;pgFit()}
function pgFit(){const p=$("pg-pane"),w=p.clientWidth-48;if(w<=0)return;const s=Math.min(1,w/794);pgScale=s;document.querySelectorAll("#pg-sheets .shbox").forEach(b=>b.style.transform=`scale(${s})`);document.querySelectorAll("#pg-sheets .shwrap").forEach(b=>{b.style.height=1123*s+"px";b.style.width=794*s+"px"})}
window.addEventListener("resize",()=>{if(!$("pg-pane").hidden)pgFit()});
function pgUpdate(){if(!pgBatch.includes(pgCur)){pgBatch=[pgCur];pgIdx=0}
 pgCompute();const box=$("pg-sheets");
 if(box.querySelectorAll(".lw").length!==pgPgs.length||$("pg-batchbar").querySelectorAll("[data-go]").length!==(pgBatch.length>1?pgBatch.length:0))pgBuildSheets();
 else pgPgs.forEach((pg,n)=>{if(pg.i!==null&&pg.i!==pgIdx)return;const lw=box.children[n];lw.querySelector(".sheet").innerHTML=pgHtml(pg);lw.querySelector(".lt").textContent=pgTitleOf(pg,n,pgPgs.length)});
 pgPersist();pgButtons();if(pgSel&&!document.querySelector(`#pg-sheets .sgb[data-p="${pgSel.p}"][data-s="${pgSel.s}"]`))pgSelect(null);
 const m=pgMissing(pgCur),sn=[],S=pgS(),ok=n=>n&&sigLookup(n);
 if(!ok(S.asmanNama))sn.push("Asman/MUL");if(!ok(S.mdNama))sn.push("MD/MDPU");if(!ok(S.mgrNama))sn.push("Manager");if(pgCur.nama&&!ok(pgCur.nama))sn.push("pegawai");
 const ks=[];if(!S.mgrNama)ks.push("Manager");if(!S.asmanNama)ks.push("Asman");if(!S.mdNama)ks.push("MD");
 $("pg-hint").textContent=[m.length?"Belum lengkap: "+m.join(", "):"",ks.length?"Nama penandatangan belum diisi di Pengaturan: "+ks.join(", "):"",sn.length&&!ks.length?"Tanda tangan belum terdaftar: "+sn.join(", ")+" (tab Tanda Tangan)":""].filter(Boolean).join(" · ")}
function pgButtons(){const s=pgBatch.length>1?" ("+pgBatch.length+")":"";[["pg-bDraft","Simpan draft"],["pg-bDone","Tandai selesai"],["pg-bPdf","Unduh PDF"],["pg-bPrint","Cetak"]].forEach(([id,t])=>{const e=$(id);e.textContent=t;if(s){const k=document.createElement("span");k.className="cnt";k.textContent=s;e.appendChild(k)}e.title=t+s})}
function pgActive(i){pgIdx=i;pgCur=pgBatch[i];pgFotoSel=null;document.querySelectorAll("#pg-sheets .lw").forEach(e=>e.classList.toggle("act",e.dataset.i!==undefined&&+e.dataset.i===i));pgSelect(null);pgSync();pgUpdate()}
$("pg-batchbar").onclick=async e=>{if(e.target.id==="pg-tambah"){pgTambah();return}
 if(e.target.id==="pg-pdfAktif"){pgPdf([pgCur],true);return}
 if(e.target.id==="pg-hapusAktif"&&pgBatch.length>1&&await ask("Hapus surat "+(pgIdx+1)+" dari daftar? (Riwayat yang sudah tersimpan tidak terhapus.)")){pgBatch.splice(pgIdx,1);pgIdx=Math.min(pgIdx,pgBatch.length-1);pgCur=pgBatch[pgIdx];pgBuildForm();pgBuildSheets();pgUpdate();return}
 const g=e.target.dataset.go;if(g!==undefined){pgActive(+g);const t=[...$("pg-sheets").children].find(x=>x.dataset.i===g);if(t)t.scrollIntoView({block:"nearest"})}};
$("pg-sheets").addEventListener("click",e=>{const lw=e.target.closest(".lw");if(!lw||lw.dataset.i===undefined)return;const i=+lw.dataset.i;if(i!==pgIdx)pgActive(i)});
/* tambah pegawai berikutnya: data pekerjaan disalin dari surat yang sedang dibuka, data pegawai dikosongkan */
function pgTambah(){const c=pgBlank(PGDB.settings),s=pgCur;
 ["unit","tanggal","mulai","selesai","durManual","lokasi","uraian","jenis","koordinator","tglSurat","rencana","realMulai","realSelesai","rincianReal","tglLaporan","biaya","fotoPerHal"].forEach(k=>c[k]=s[k]||c[k]||"");
 c.noSpl=/^\d+$/.test(String(s.noSpl||"").trim())?String(+s.noSpl+1):"";
 pgBatch.push(c);pgIdx=pgBatch.length-1;pgCur=c;pgSelect(null);pgBuildForm();pgBuildSheets();pgUpdate();
 const l=$("pg-left");if(l)l.scrollTop=0;const n=$("pg-form").querySelector('[data-dk="nama"]');if(n)n.focus();toast("Surat "+pgBatch.length+" ditambahkan. Isi nama pegawai berikutnya.")}
/* kotak keluaran: form yang dibuat, susunan halaman, bentuk berkas */
function pgFselSum(){const n=PGDB.forms.length,t=PG_FORMS.length;const el=document.querySelector("#pg-fsel .fs-sum");if(el)el.textContent=(n===t?"Semua form":n+" dari "+t+" form")+" · "+(PGDB.urut==="pegawai"?"Per pegawai":"Per form")+" · "+(PGDB.fmt==="form"?"PDF per form":"PDF satu berkas")}
function pgBuildFsel(){const open=!!PGDB.fsOpen;$("pg-fsel").classList.toggle("open",open);
 $("pg-fsel").innerHTML=`<button type="button" class="fs-head" id="pg-fsHead" aria-expanded="${open}" aria-controls="pg-fsBody" title="Buka/tutup pengaturan keluaran"><span class="fs-t">Keluaran</span><span class="fs-sum"></span><i class="fs-chev" aria-hidden="true"></i></button><div id="pg-fsBody"${open?"":" hidden"}><div class="fs-row"><span class="fs-l">Form</span><div class="fs-chips">`
 +PG_FORMS.map(([k,n,t,l])=>{const on=PGDB.forms.includes(k);return`<label class="chip${on?" on":""}" title="${esc(l?"Lampiran "+l+" - "+t:t)}"><input type="checkbox" data-f="${k}"${on?" checked":""}><span class="ck" aria-hidden="true"></span>${n}</label>`}).join("")+`</div></div>`
 +`<div class="fs-row"><label class="fs-sel" title="Per form: semua Form 03, lalu semua Form 04, lalu 05. Per pegawai: Form 03, 04, 05 milik tiap pegawai berurutan"><span>Susunan</span><select id="pg-urut"><option value="form"${PGDB.urut==="form"?" selected":""}>Per form</option><option value="pegawai"${PGDB.urut==="pegawai"?" selected":""}>Per pegawai</option></select></label>`
 +`<label class="fs-sel" title="Satu berkas: semua form digabung. Per form: satu berkas PDF untuk tiap form"><span>PDF</span><select id="pg-fmt"><option value="gabung"${PGDB.fmt==="gabung"?" selected":""}>Satu berkas</option><option value="form"${PGDB.fmt==="form"?" selected":""}>Per form</option></select></label></div></div>`;pgFselSum()}
$("pg-fsel").addEventListener("click",e=>{const h=e.target.closest&&e.target.closest("#pg-fsHead");if(!h)return;PGDB.fsOpen=!PGDB.fsOpen;$("pg-fsel").classList.toggle("open",PGDB.fsOpen);h.setAttribute("aria-expanded",PGDB.fsOpen);$("pg-fsBody").hidden=!PGDB.fsOpen;pgSave()});
$("pg-fsel").addEventListener("change",e=>{if(e.target.dataset.f){const k=e.target.dataset.f;const ch=e.target.closest(".chip");if(ch)ch.classList.toggle("on",e.target.checked);PGDB.forms=PG_FORMS.map(f=>f[0]).filter(x=>x===k?e.target.checked:PGDB.forms.includes(x))}
 else if(e.target.id==="pg-urut")PGDB.urut=e.target.value;else if(e.target.id==="pg-fmt")PGDB.fmt=e.target.value;else return;pgFselSum();pgSave();pgBuildSheets();pgUpdate()});
/* tanda tangan: seret dan ubah ukuran (posisi disimpan per surat; untuk Form 01, 02, 08 per daftar) */
const PGSGN={MD:"Menyetujui (MD/MDPU)",AS:"Yang memberi perintah (Asman/MUL)",PG:"Pegawai",MG:"Manager",
 "F04.AS":"Atasan Pegawai (Form 04)","F04.PG":"Pegawai (Form 04)","F04.MD":"Atasan-atasan langsung (Form 04)","F05.AS":"Atasan Pegawai (Form 05)","F05.PG":"Pegawai (Form 05)","F05.MD":"Atasan-atasan langsung (Form 05)",
 "F01.MG":"Manager (Form 01)","F02.AS":"Diajukan oleh (Form 02)","F02.MG":"Dievaluasi oleh (Form 02)","F08.MG":"Manager (Form 08)"};
function pgPos(p,s){const st=pgStoreByKey(s);st.sigPos=st.sigPos||{};return st.sigPos[p]=st.sigPos[p]||{x:0,y:0,s:1}}
function pgSgApply(p,s){const o=pgPos(p,s);document.querySelectorAll(`#pg-sheets .sgb[data-p="${p}"][data-s="${s}"]`).forEach(i=>{i.style.setProperty("--s",o.s);i.style.transform=`translate(${o.x}mm,${o.y}mm) scale(${o.s})`})}
function pgSelect(x){if(x&&pgFotoSel!=null){pgFotoSel=null;pgFotoRender();pgFotoMark()}pgSel=x;document.querySelectorAll("#pg-sheets .sgb[data-p]").forEach(i=>i.classList.toggle("sel",!!x&&i.dataset.p===x.p&&i.dataset.s===x.s));$("pg-sgctl").hidden=!x;$("pg-sgbar").hidden=!x;
 if(x){$("pg-sgName").textContent=PGSGN[x.p]||x.p;const v=Math.round(pgPos(x.p,x.s).s*100);$("pg-sgSize").value=v;$("pg-sgPct").value=v}}
function pgNudge(n,st){if(!pgSel)return;const o=pgPos(pgSel.p,pgSel.s);if(n==="l")o.x=+(o.x-st).toFixed(1);if(n==="r")o.x=+(o.x+st).toFixed(1);if(n==="u")o.y=+(o.y-st).toFixed(1);if(n==="d")o.y=+(o.y+st).toFixed(1);pgSgApply(pgSel.p,pgSel.s);pgPersist()}
$("pg-sheets").addEventListener("pointerdown",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const p=b.dataset.p,s=b.dataset.s,lw=b.closest(".lw");if(lw.dataset.i!==undefined&&+lw.dataset.i!==pgIdx)pgActive(+lw.dataset.i);
 pgSelect({p,s});const o=pgPos(p,s);pgDrag={p,s,mode:e.target.classList.contains("sgh")?"size":"move",x0:e.clientX,y0:e.clientY,ox:o.x,oy:o.y,s0:o.s,w:b.getBoundingClientRect().width||1};b.setPointerCapture(e.pointerId)});
$("pg-sheets").addEventListener("pointermove",e=>{if(!pgDrag)return;const o=pgPos(pgDrag.p,pgDrag.s);
 if(pgDrag.mode==="size"){const d=((e.clientX-pgDrag.x0)+(e.clientY-pgDrag.y0))/2;o.s=+Math.min(4,Math.max(.2,pgDrag.s0*(1+2*d/pgDrag.w))).toFixed(2);const v=Math.round(o.s*100);$("pg-sgSize").value=v;$("pg-sgPct").value=v}
 else{const k=25.4/96/(pgScale||1);o.x=+(pgDrag.ox+(e.clientX-pgDrag.x0)*k).toFixed(1);o.y=+(pgDrag.oy+(e.clientY-pgDrag.y0)*k).toFixed(1)}
 pgSgApply(pgDrag.p,pgDrag.s)});
const pgEnd=()=>{if(pgDrag){pgDrag=null;pgPersist()}};$("pg-sheets").addEventListener("pointerup",pgEnd);$("pg-sheets").addEventListener("pointercancel",pgEnd);
$("pg-sheets").addEventListener("wheel",e=>{const b=e.target.closest&&e.target.closest(".sgb");if(!b)return;e.preventDefault();const lw=b.closest(".lw");if(lw.dataset.i!==undefined&&+lw.dataset.i!==pgIdx)pgActive(+lw.dataset.i);pgSelect({p:b.dataset.p,s:b.dataset.s});
 const o=pgPos(b.dataset.p,b.dataset.s);o.s=+Math.min(4,Math.max(.2,o.s*(e.deltaY<0?1.06:1/1.06))).toFixed(2);pgSgApply(b.dataset.p,b.dataset.s);const v=Math.round(o.s*100);$("pg-sgSize").value=v;$("pg-sgPct").value=v;pgPersist()},{passive:false});
document.addEventListener("pointerdown",e=>{if(pgSel&&!e.target.closest("#pg-sgbar")&&!e.target.closest(".sgb"))pgSelect(null)});
$("pg-sgSize").oninput=e=>{if(!pgSel)return;pgPos(pgSel.p,pgSel.s).s=e.target.value/100;$("pg-sgPct").value=e.target.value;pgSgApply(pgSel.p,pgSel.s);pgPersist()};
$("pg-sgPct").onchange=e=>{if(!pgSel)return;const v=Math.min(400,Math.max(20,+e.target.value||100));e.target.value=v;pgPos(pgSel.p,pgSel.s).s=v/100;$("pg-sgSize").value=v;pgSgApply(pgSel.p,pgSel.s);pgPersist()};
$("pg-sgbar").onclick=e=>{const n=e.target.dataset.n;if(n)pgNudge(n,.5);if(e.target.id==="pg-sgReset"&&pgSel){const st=pgStoreByKey(pgSel.s);st.sigPos[pgSel.p]={x:0,y:0,s:1};pgSgApply(pgSel.p,pgSel.s);pgSelect(pgSel);pgPersist()}};
document.addEventListener("keydown",e=>{if(!pgSel||/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const n={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];if(n){e.preventDefault();pgNudge(n,e.shiftKey?2:.5)}});
/* ===== input manual / WhatsApp ===== */
$("pg-m-man").onclick=()=>{$("pg-wa").hidden=true;$("pg-m-man").classList.add("on");$("pg-m-wa").classList.remove("on")};
$("pg-m-wa").onclick=()=>{$("pg-wa").hidden=false;$("pg-m-wa").classList.add("on");$("pg-m-man").classList.remove("on")};
const PGLB={nama:"Nama pegawai",nip:"NIP",tanggal:"Tanggal",mulai:"Jam mulai",selesai:"Jam selesai",uraian:"Rincian pekerjaan",lokasi:"Lokasi"},PGMS={ok:"terbaca",warn:"periksa",missing:"hilang",error:"gagal"};
$("pg-parse").onclick=()=>{const t=$("pg-waText").value.trim();if(!t){$("pg-parseOut").innerHTML='<p class="hint w">Tempel pesan terlebih dahulu.</p>';return}
 const r=pgBuildAll(t,pgS(),PGDB.pegawai);if(!r.surat.length){$("pg-parseOut").innerHTML='<p class="hint w">Tidak ada baris berlabel yang dikenali (Nama, NIP, Tanggal, Waktu/Pukul/Jam, Uraian/Pekerjaan, Lokasi).</p>';return}
 pgLast=r.surat;const unk=r.unk;
 const rows=c=>Object.keys(PGLB).map(k=>{const s=c.st[k]||{s:"missing",m:"Tidak ditemukan"},v=k==="tanggal"&&c.tanggal?fmtDate(c.tanggal):(c[k]??"");return`<tr><td>${PGLB[k]}</td><td>${esc(v)}${s.m?`<div class="hint">${esc(s.m)}</div>`:""}</td><td><span class="bd ${s.s}">${PGMS[s.s]}</span></td></tr>`}).join("");
 $("pg-parseOut").innerHTML=`<p class="hint"><b>${pgLast.length} surat terdeteksi</b></p>`+pgLast.map((c,i)=>{const n=Object.keys(PGLB).filter(k=>(c.st[k]||{s:"missing"}).s!=="ok").length;return`<details${n?" open":""}><summary><span class="sn">Surat ${i+1}</span><span class="sm">${esc(c.nama||"nama?")} · ${esc(c.tanggal?fmtDate(c.tanggal):"tanggal?")}</span><span class="sb ${n?"warn":"ok"}">${n?n+" perlu diperiksa":"terbaca semua"}</span></summary><table class="t">${rows(c)}</table></details>`}).join("")
 +(unk.length?`<p class="hint w">Baris tidak dikenali (diabaikan): ${unk.map(esc).join(" | ")}</p>`:"")+`<div class="acts"><button class="b" id="pg-apply">Buat ${pgLast.length} surat</button></div>`;$("pg-apply").onclick=pgApply};
async function pgApply(){if((pgBatch.length>1||pgCur.uraian||pgCur.nama)&&!await ask("Isi formulir/daftar surat saat ini akan diganti dengan "+pgLast.length+" surat baru. Lanjutkan?"))return;
 pgBatch=pgLast.map(c=>{const x=JSON.parse(JSON.stringify(c));delete x.st;return x});pgIdx=0;pgCur=pgBatch[0];pgBuildForm();pgBuildSheets();pgUpdate();$("pg-m-man").click();toast(pgBatch.length+" surat dibuat.");$("pg-pane").scrollTop=0}
/* ===== simpan, cetak ===== */
function pgSaveRec(status){const c=pgCur;c.status=status;c.updatedAt=Date.now();const r=JSON.parse(JSON.stringify(c));delete r.st;if(!r.id){r.id=uid();c.id=r.id;r.createdAt=Date.now()}
 const i=PGDB.records.findIndex(x=>x.id===r.id);if(i>=0)PGDB.records[i]=r;else PGDB.records.push(r);pgSave()}
const pgBad=()=>pgBatch.map((c,i)=>pgMissing(c).length?"surat "+(i+1)+": "+pgMissing(c).join(", "):"").filter(Boolean);
async function pgSimpan(status){const bad=status==="selesai"?pgBad():[];if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap tandai selesai?"))return;
 const keep=pgIdx;pgBatch.forEach((c,i)=>{pgCur=c;pgIdx=i;pgSaveRec(status)});pgIdx=keep;pgCur=pgBatch[keep];pgPersist();toast(pgBatch.length+" surat "+(status==="selesai"?"ditandai selesai dan tersimpan.":"tersimpan sebagai draft."))}
$("pg-bDraft").onclick=()=>pgSimpan("draft");$("pg-bDone").onclick=()=>pgSimpan("selesai");
$("pg-bNew").onclick=async()=>{if((pgBatch.length>1||((pgCur.uraian||pgCur.nama)&&!pgCur.id))&&!await ask(pgBatch.length>1?"Daftar "+pgBatch.length+" surat akan ditutup (yang belum disimpan hilang). Lanjutkan?":"Isi formulir saat ini yang belum disimpan akan hilang. Lanjutkan?"))return;
 pgCur=pgBlank(PGDB.settings);pgBatch=[pgCur];pgIdx=0;pgBuildForm();pgBuildSheets();pgUpdate()};
$("pg-bPrint").onclick=async()=>{const bad=pgBad();if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap cetak?"))return;window.print()};
/* ===== PDF ===== */
const pgTxt=v=>String(v==null?"":v).replace(/[\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[^\x20-\x7E\xA0-\xFF\u201C\u201D]/g,"?");
async function pgPdfPage(pdf,pg,list,pk){pdf.setTextColor(0,0,0);pdf.setDrawColor(0,0,0);const sigs=[],st=(pg.store==="e"?list[pg.i]:pk)||{};
 for(const e of pg.items){
  if(e.k==="t"){pdf.setFont("helvetica",e.b&&e.i?"bolditalic":e.b?"bold":e.i?"italic":"normal");pdf.setFontSize(e.s);pdf.text(pgTxt(e.t),e.x,e.y+.905*e.s,{align:e.a==="c"?"center":e.a==="r"?"right":"left"})}
  else if(e.k==="l"){pdf.setLineWidth(e.w);pdf.line(e.x1,e.y1,e.x2,e.y2)}
  else if(e.k==="w"){pdf.setFillColor(255,255,255);pdf.rect(e.x,e.y,e.w,e.h,"F")}
  else if(e.k==="i"){try{pdf.addImage(e.src,"JPEG",e.x,e.y,e.w,e.h,undefined,"FAST")}catch(x){}pdf.setDrawColor(0,0,0);pdf.setLineWidth(.6);pdf.rect(e.x,e.y,e.w,e.h,"S")}
  else if(e.k==="s"){const s=e.src||(e.nama?sigLookup(e.nama):"");if(s)sigs.push({src:s,key:e.key,cx:e.cx,cy:e.cy,bw:e.w||105,bh:e.h||56})}}
 for(const g of sigs){const im=await loadImg(g.src);if(!im)continue;const o=((st.sigPos||{})[g.key])||{x:0,y:0,s:1};
  const k=Math.min(1,g.bw/(im.naturalWidth*.75),g.bh/(im.naturalHeight*.75)),w=im.naturalWidth*.75*k*(o.s||1),h=im.naturalHeight*.75*k*(o.s||1);
  try{pdf.addImage(g.src,"PNG",g.cx+(o.x||0)*PX-w/2,g.cy+(o.y||0)*PX-h/2,w,h)}catch(x){}}}
/* list = daftar surat yang diproses; soloPeg = hanya Form 03-05 untuk satu surat (tombol "PDF surat ini") */
async function pgPdf(list,solo){if(pdfBusy)return;if(!list.length){toast("Tidak ada surat.");return}
 const forms=solo?PGDB.forms.filter(k=>["F03","F04","F05","EV"].includes(k)):PGDB.forms;if(!forms.length){toast("Pilih minimal satu form pada kotak Keluaran.");return}
 const bad=list.map((c,i)=>pgMissing(c).length?"surat "+(i+1)+": "+pgMissing(c).join(", "):"").filter(Boolean);
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap buat PDF?"))return;
 if(!window.jspdf){toast("Pustaka PDF gagal dimuat. Gunakan tombol Cetak sebagai gantinya.");return}
 pdfBusy=true;let ok=0,dibatal=false;
 try{let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
  const S=pgS(),pk=PGDB.pack,all=pgPages(list,S,pk,forms,PGDB.urut),kode=solo?"SOLO":forms.length===1?forms[0]:"ALL";
  const jobs=PGDB.fmt==="form"&&!solo&&forms.length>1?forms.map(k=>({k,pages:all.filter(p=>p.f===k)})).filter(j=>j.pages.length).map(j=>({...j,name:pgNamaBerkas(list,j.k)})):[{k:kode,pages:all,name:pgNamaBerkas(list,kode)}];
  for(let j=0;j<jobs.length;j++){const job=jobs[j];toast("Membuat PDF "+(j+1)+" dari "+jobs.length+": "+job.name);
   const pdf=new window.jspdf.jsPDF({unit:"pt",format:"a4",compress:true});
   for(let n=0;n<job.pages.length;n++){if(n)pdf.addPage("a4","portrait");await pgPdfPage(pdf,job.pages[n],list,pk)}
   try{await spSimpanFile(pdf,job.name,dl);ok++}catch(e){if(e&&e.code==="declined"){dibatal=true;break}throw e}
   if(j<jobs.length-1)await spJeda(700)}
  toast(dibatal?"Unduhan dibatalkan ("+ok+" dari "+jobs.length+" file tersimpan).":ok===1?"PDF dibuat: "+jobs[0].name:"Selesai: "+ok+" file PDF diunduh.")
 }catch(e){toast("Gagal membuat PDF: "+(e&&e.message||e))}finally{pdfBusy=false}}
$("pg-bPdf").onclick=()=>pgPdf(pgBatch,false);
/* ===== tab ===== */
function pgTab(t){for(const x of["in","pe","ri","se"])$("pg-tab-"+x).hidden=x!==t;document.querySelectorAll("#pg-tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));if(t==="pe")pgRenderPeg();if(t==="ri")pgRenderRi();if(t==="se")pgBuildSet()}
$("pg-tabs").onclick=e=>{if(e.target.dataset.t&&e.target.dataset.t!=="tt")pgTab(e.target.dataset.t)};
/* ===== pegawai ===== */
let pgEditP=null;
function pgRenderPeg(){const q=pgNorm($("pg-peQ").value),l=PGDB.pegawai.filter(p=>pgNorm(p.nama+" "+p.nip+" "+p.jabatan).includes(q)).sort((a,b)=>a.nama.localeCompare(b.nama));
 $("pg-peList").innerHTML=l.length?`<p class="hint">${PGDB.pegawai.length} pegawai tersimpan di browser ini.</p><table class="t">${l.map(p=>`<tr><td><b>${esc(p.nama)}</b><div class="hint">${esc(p.nip||"-")} · PG ${esc(p.personGrade||"-")} · Pos ${esc(p.positionGrade||"-")} · ${esc(p.jabatan||"")}</div></td><td style="white-space:nowrap"><button class="g" data-e="${esc(p.id)}">Edit</button> <button class="d" data-x="${esc(p.id)}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada pegawai. Tambahkan di bawah (satu per satu atau tempel banyak sekaligus).</p>'}
$("pg-peQ").oninput=pgRenderPeg;
$("pg-peList").onclick=async e=>{const id=e.target.dataset.e||e.target.dataset.x;if(!id)return;const p=PGDB.pegawai.find(x=>x.id===id);if(!p)return;
 if(e.target.dataset.e){pgEditP=id;$("pg-peT").textContent="Ubah pegawai";["pn","pi","pg1","pg2","pj"].forEach((k,i)=>$("pg-"+k).value=[p.nama,p.nip,p.personGrade,p.positionGrade,p.jabatan][i]||"");$("pg-pn").focus()}
 else if(await ask("Hapus pegawai "+p.nama+"?")){PGDB.pegawai=PGDB.pegawai.filter(x=>x.id!==id);pgSave();pgRenderPeg();pgBuildForm()}};
function pgPegReset(){pgEditP=null;$("pg-peT").textContent="Tambah pegawai";["pn","pi","pg1","pg2","pj"].forEach(k=>$("pg-"+k).value="")}
$("pg-peReset").onclick=pgPegReset;
$("pg-peSave").onclick=()=>{const nama=$("pg-pn").value.trim();if(!nama){toast("Nama pegawai wajib diisi.");return}
 const o={nama,nip:$("pg-pi").value.trim(),personGrade:$("pg-pg1").value.trim(),positionGrade:$("pg-pg2").value.trim(),jabatan:$("pg-pj").value.trim()};
 if(pgEditP){Object.assign(PGDB.pegawai.find(x=>x.id===pgEditP),o)}else PGDB.pegawai.push({id:uid(),...o});pgSave();pgPegReset();pgRenderPeg();pgBuildForm()};
$("pg-peBulk").onclick=()=>{const t=$("pg-peBulkText").value;const rows=t.split(/\r?\n/).map(l=>l.split(/\t|;/).map(x=>x.trim())).filter(r=>r[0]);let n=0,u=0;
 rows.forEach(r=>{let nip=r[0],nama=r[1];if(r[0]&&!/\d/.test(r[0])&&r[1]){nama=r[0];nip=r[1]}if(!nama)return;const o={nama,nip:nip||"",personGrade:r[2]||"",positionGrade:r[3]||"",jabatan:r[4]||""};
  const h=PGDB.pegawai.find(p=>(o.nip&&pgNorm(p.nip)===pgNorm(o.nip))||pgNorm(p.nama)===pgNorm(o.nama));if(h){Object.assign(h,o);u++}else{PGDB.pegawai.push({id:uid(),...o});n++}});
 if(!n&&!u){toast("Tidak ada baris yang dikenali. Format: NIP; Nama; Person Grade; Position Grade; Jabatan");return}
 pgSave();$("pg-peBulkText").value="";pgRenderPeg();pgBuildForm();toast(n+" pegawai ditambah, "+u+" diperbarui.")};
/* ===== riwayat ===== */
function pgRiFilter(){const q=pgNorm($("pg-rQ").value),a=$("pg-rA").value,b=$("pg-rB").value;return PGDB.records.filter(r=>(!q||pgNorm((r.nama||"")+" "+(r.uraian||"")+" "+(r.lokasi||"")).includes(q))&&(!a||(r.tanggal||"")>=a)&&(!b||(r.tanggal||"")<=b)).sort((x,y)=>(y.tanggal||"").localeCompare(x.tanggal||"")||(y.updatedAt||0)-(x.updatedAt||0))}
function pgRenderRi(){const l=pgRiFilter();$("pg-rList").innerHTML=l.length?`<p class="hint">${l.length} dari ${PGDB.records.length} surat.</p><table class="t">${l.map(r=>`<tr><td><b>${esc(r.nama||"(tanpa nama)")}</b> · ${esc(r.tanggal?pgTgl3(r.tanggal):"tanpa tanggal")}<div class="hint">${esc((r.uraian||"").slice(0,70))} · ${r.status==="selesai"?"selesai":"draft"}</div></td><td style="white-space:nowrap"><button class="g" data-o="${esc(r.id)}">Buka</button> <button class="d" data-x="${esc(r.id)}">Hapus</button></td></tr>`).join("")}</table>`:'<p class="hint">Belum ada surat tersimpan.</p>'}
["pg-rQ","pg-rA","pg-rB"].forEach(i=>$(i).oninput=pgRenderRi);
$("pg-rList").onclick=async e=>{const id=e.target.dataset.o||e.target.dataset.x;if(!id)return;const r=PGDB.records.find(x=>x.id===id);if(!r)return;
 if(e.target.dataset.o){pgCur=JSON.parse(JSON.stringify(r));pgCur.flags=pgCur.flags||{};pgBatch=[pgCur];pgIdx=0;pgBuildForm();pgBuildSheets();pgUpdate();pgTab("in");toast("Surat dibuka dari riwayat.")}
 else if(await ask("Hapus surat ini dari riwayat?")){PGDB.records=PGDB.records.filter(x=>x.id!==id);pgSave();pgRenderRi()}};
$("pg-rPdf").onclick=()=>pgPdf(pgRiFilter().map(r=>({...pgBlank(pgS()),...JSON.parse(JSON.stringify(r))})),false);
$("pg-rDelAll").onclick=async()=>{if(PGDB.records.length&&await ask("Hapus SEMUA "+PGDB.records.length+" surat dari riwayat? Tidak bisa dibatalkan.")){PGDB.records=[];pgSave();pgRenderRi()}};
/* ===== pengaturan ===== */
const PGSF=[["#","Unit dan kop"],["unitInduk","Unit Induk"],["unitPelaksana","Unit Pelaksana"],["unitLayanan","Unit Layanan (bidang/unit bawaan)"],["kota","Kota/tempat surat"],["ptInduk","Nama perusahaan (Form 01 dan 02)","full"],["kodeUnit","Kode unit pada nomor surat (mis. F01080000)"],["zona","Zona waktu"],
 ["#","Penandatangan (nama harus sama dengan tab Tanda Tangan agar gambar terpasang)"],["mgrNama","Manager UPT - nama"],["mgrNip","Manager UPT - NIP"],["mgrJab","Jabatan di Form 01 (Menyetujui)"],["mgrUptJab","Jabatan di Form 02 dan Form 08"],
 ["asmanNama","Asman/MUL - nama"],["asmanNip","Asman/MUL - NIP"],["asmanJab","Jabatan Asman/MUL (Form 03, 04, 05)"],["asmanAjuJab","Jabatan pengaju (Form 02, \"Diajukan oleh\")"],["mdNama","MD/MDPU - nama"],["mdJab","Jabatan MD/MDPU"],
 ["#","Bawaan formulir"],["jenisDef","Jenis pekerjaan bawaan"],["koordDef","Koordinator pekerjaan bawaan"],
 ["#","Form Kendali Anggaran (Lampiran VIII)"],["kBulan","Bulan form","month"],["kPagu","Pagu anggaran lembur (Rp)"],["kTglPagu","Tanggal pagu","date"],["kRealNilai","Realisasi bulan lalu - nilai (Rp)"],["kRealTgl","Realisasi bulan lalu - tanggal","date"],["kRealKet","Realisasi - keterangan (kosong = otomatis)","full"],
 ["kEstNilai","Estimasi bulan ini - nilai (kosong = jumlah biaya Form 02)"],["kEstTgl","Estimasi bulan ini - tanggal","date"],["kEstKet","Estimasi - keterangan (kosong = otomatis)","full"]];
function pgBuildSet(){const S=pgS(),nm=DB.sigs.map(p=>`<option value="${esc(p.name)}">`).join("");
 $("pg-seForm").innerHTML=`<datalist id="pg-dlSig">${nm}</datalist>`+PGSF.map(([k,l,t])=>{if(k==="#")return`<h4 class="sec">${l}</h4>`;const ty=t==="date"?"date":t==="month"?"month":"text",ls=/Nama$|nama$/.test(l)&&k.endsWith("Nama")?' list="pg-dlSig"':"";
  return`<div class="fld${t==="full"?" fw":""}"><label>${l}</label><input data-sk="${k}" type="${ty}"${ls} value="${esc(S[k]??"")}"></div>`}).join("")}
$("pg-seSave").onclick=()=>{$("pg-seForm").querySelectorAll("[data-sk]").forEach(el=>{PGDB.settings[el.dataset.sk]=el.value.trim()});pgSave();pgUpdate();toast("Pengaturan Lembur Pegawai disimpan.")};
$("pg-exp").onclick=()=>{const b=new Blob([JSON.stringify(PGDB,null,1)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="lembur-pegawai-cadangan.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$("pg-imp").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const d=JSON.parse(r.result);if(!d||typeof d!=="object")throw 0;
  if(!await ask("Data Lembur Pegawai saat ini akan diganti dengan isi berkas cadangan. Lanjutkan?"))return;
  PGDB={pegawai:d.pegawai||[],records:d.records||[],settings:{...PG_DEF,...d.settings},pack:{no1:"",no2:"",tglAjuan:"",sigPos:{},...d.pack},forms:d.forms||PG_FORMS.map(x=>x[0]),urut:d.urut||"form",fmt:d.fmt||"gabung",evOk:!!d.evOk,fsOpen:!!d.fsOpen};pgMigrate();
  pgSave();pgBuildFsel();pgBuildForm();pgBuildSheets();pgUpdate();pgBuildSet();toast("Cadangan diimpor.")}catch(x){toast("Berkas cadangan tidak valid.")}e.target.value=""};r.readAsText(f)};
/* ===== masuk mode ===== */
function pgEnter(){pgBuildFsel();pgBuildForm();pgBuildSheets();pgUpdate();setTimeout(pgFit,50)}
try{if(sessionStorage.getItem("app.mode")==="P")setMode("P")}catch(e){}
