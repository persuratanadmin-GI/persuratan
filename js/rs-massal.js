"use strict";
/* Restitusi SPPD - impor massal stempel dan TTD dari satu folder.
   Aturan penamaan: nama FOLDER = lokasi; nama BERKAS memuat "Stempel", "TTD", atau "Stempel_TTD" (gambar yang menyatu).
   Berkas ber-nama "ULTG_Parepare" = stempel/TTD pejabat asal (bukan lokasi tujuan). Bila ada beberapa varian (kiri/kanan, hal1..hal6),
   dipilih varian "kiri" lalu urutan nama pertama. Tidak menimpa data yang sudah ada kecuali dicentang. */
const RSM_EXT=/\.(png|jpe?g|webp)$/i;
function rsmKind(base){return/stempel[_ \-]*ttd/i.test(base)?"gabung":/ttd/i.test(base)?"ttd":/stempel/i.test(base)?"stempel":null}
function rsmRank(f){const b=f.name.toLowerCase(),h=/hal(\d+)/.exec(b);return[/kiri/.test(b)?0:/kanan/.test(b)?1:0,h?+h[1]:0,b]}
function rsmPick(a){return a.length?[...a].sort((x,y)=>{const p=rsmRank(x),q=rsmRank(y);return p[0]-q[0]||p[1]-q[1]||(p[2]<q[2]?-1:p[2]>q[2]?1:0)})[0]:null}
function rsmWords(s){return String(s).replace(/[_\-]+/g," ").replace(/\s+/g," ").trim()}
/* files: [{path,name}] -> {grup:[{folder,nama,kunci,stempel,ttd,menyatu,lokId}], asal:{stempel,ttd}, abaikan:[]} */
function rsMassalPlan(files,lokasi){const G={},asal={stempel:[],ttd:[]},abaikan=[];
 for(const f of files){if(!RSM_EXT.test(f.name)){abaikan.push(f.name);continue}
  const base=f.name.replace(RSM_EXT,""),kind=rsmKind(base),parts=String(f.path||f.name).split("/");
  if(!kind){abaikan.push(f.name);continue}
  if(/ultg[_ \-]*parepare/i.test(base)){asal[kind==="ttd"?"ttd":"stempel"].push(f);continue}
  const folder=parts.length>1?parts[parts.length-2]:base.split(/[_ ](?:stempel|ttd)/i)[0];
  (G[folder]=G[folder]||{stempel:[],ttd:[],gabung:[]})[kind].push(f)}
 const grup=[];
 for(const folder of Object.keys(G).sort()){const g=G[folder],sp=rsmPick(g.stempel),gb=rsmPick(g.gabung),td=rsmPick(g.ttd),stempel=sp||gb;if(!stempel&&!td)continue;
  const nk=spNorm(rsmWords(folder));let lok=null;
  for(const l of lokasi||[]){const keys=String(l.kunci||"").split(",").concat([l.nama]).map(spNorm).filter(k=>k.length>=3);if(keys.some(k=>nk===k||nk.split(" ").includes(k)||k.split(" ").every(w=>nk.split(" ").includes(w)))){lok=l;break}}
  const w=rsmWords(folder).split(" ").filter(x=>x.length>=3).map(x=>x.toLowerCase());
  grup.push({folder,nama:lok?lok.nama:rsmWords(folder),kunci:lok?lok.kunci:w.join(", "),baru:!lok,lokId:lok?lok.id:null,stempel,ttd:td,menyatu:!sp&&!!gb,varian:g.stempel.length+g.gabung.length+g.ttd.length})}
 return{grup,asal:{stempel:rsmPick(asal.stempel),ttd:rsmPick(asal.ttd)},abaikan}}
/* ===== bagian antarmuka (hanya bila halaman Restitusi ada) ===== */
(()=>{const tab=typeof document!=="undefined"&&document.getElementById("rs-tab-lk");if(!tab||typeof RSDB==="undefined")return;
 tab.insertAdjacentHTML("afterbegin",`<div class="panel" id="rs-ms"><h4 class="ph">Impor massal stempel dan TTD dari folder</h4>
  <p class="hint">Pilih satu folder induk. Nama folder = lokasi, nama berkas memuat <b>Stempel</b>, <b>TTD</b>, atau <b>Stempel_TTD</b> (menyatu). Berkas bernama <b>ULTG_Parepare</b> dipakai untuk pejabat asal. Sebelum disimpan, hasilnya ditampilkan dulu.</p>
  <input type="file" id="rs-msF" webkitdirectory multiple>
  <label><input type="checkbox" id="rs-msO" style="width:auto"> Timpa stempel/TTD yang sudah terdaftar</label>
  <div id="rs-msOut"></div></div>`);
 const toData=f=>new Promise((res,rej)=>{if(f.size>1048576){rej(new Error(f.name+": lebih dari 1 MB"));return}let t=setTimeout(()=>rej(new Error(f.name+": gambar tidak dapat dibaca")),15000);readSig(f,d=>{clearTimeout(t);res(d)})});
 let plan=null;
 const row=(g)=>`<tr><td><b>${esc(g.nama)}</b> ${g.baru?'<span class="bd warn">lokasi baru</span>':'<span class="bd ok">lokasi ada</span>'}<div class="hint">folder: ${esc(g.folder)}${g.varian>1?" · "+g.varian+" varian, dipilih satu":""}</div></td><td class="hint">${g.stempel?esc(g.stempel.name)+(g.menyatu?" (stempel+TTD menyatu)":""):"-"}<br>${g.ttd?esc(g.ttd.name):(g.menyatu?"(ikut di gambar stempel)":"-")}</td></tr>`;
 $("rs-msF").onchange=e=>{const fs=[...e.target.files].map(f=>({path:f.webkitRelativePath||f.name,name:f.name,file:f}));e.target.value="";if(!fs.length)return;
  plan=rsMassalPlan(fs,RSDB.lokasi);const S=RSDB.settings,pa=S.pejabat;
  const asalTxt=plan.asal.stempel||plan.asal.ttd?`<p class="hint"><b>Pejabat asal (ULTG Parepare)</b>: stempel ${plan.asal.stempel?esc(plan.asal.stempel.name):"-"}${S.stempelAsal?" (sudah ada)":""}; TTD ${plan.asal.ttd?esc(plan.asal.ttd.name)+" akan didaftarkan atas nama \""+esc(pa||"?")+"\" di Tanda Tangan":"-"}.</p>`:"";
  $("rs-msOut").innerHTML=plan.grup.length||asalTxt?`<p class="hint"><b>${plan.grup.length} lokasi terdeteksi</b></p>${plan.grup.length?`<table class="t">${plan.grup.map(row).join("")}</table>`:""}${asalTxt}${plan.abaikan.length?`<p class="hint w">Diabaikan (bukan gambar/nama tidak dikenali): ${plan.abaikan.slice(0,6).map(esc).join(", ")}${plan.abaikan.length>6?" ...":""}</p>`:""}<p class="hint">Nama pejabat tiap lokasi tidak ada di berkas; isi lewat Edit setelah impor.</p><div class="acts"><button class="b" id="rs-msGo">Terapkan</button></div>`:'<p class="hint w">Tidak ada berkas Stempel/TTD yang dikenali. Periksa penamaan folder dan berkas.</p>';
  const go=$("rs-msGo");if(go)go.onclick=apply};
 async function apply(){const ov=$("rs-msO").checked,S=RSDB.settings,rep=[];$("rs-msGo").disabled=true;
  try{for(const g of plan.grup){let l=g.lokId&&RSDB.lokasi.find(x=>x.id===g.lokId);const baru=!l;
    if(baru){l={id:(typeof rsLkId==="function"?rsLkId(g.nama):g.folder.toLowerCase())+"-"+uid(),nama:g.nama,kunci:g.kunci,pejabat:"",stempel:"",stAr:1,ttd:"",stW:0};}
    const isi=[];
    if(g.stempel&&(!l.stempel||ov)){const d=await toData(g.stempel.file);l.stempel=d;l.stAr=await rsImgAr(d);isi.push("stempel")}
    if(g.ttd&&(!l.ttd||ov)){l.ttd=await toData(g.ttd.file);isi.push("TTD")}
    if(isi.includes("TTD"))l.menyatu=false;else if(g.menyatu&&isi.includes("stempel")&&!l.ttd)l.menyatu=true;   /* TTD sudah ikut di gambar stempel: tidak perlu diperingatkan */
    if(baru&&isi.length)RSDB.lokasi.push(l);
    rep.push(g.nama+": "+(isi.length?isi.join(" + "):"dilewati (sudah terisi)"))}
   if(plan.asal.stempel&&(!S.stempelAsal||ov)){const d=await toData(plan.asal.stempel.file);S.stempelAsal=d;S.stempelAr=await rsImgAr(d);rep.push("Stempel pejabat asal: terisi")}
   if(plan.asal.ttd&&S.pejabat&&typeof DB!=="undefined"){const nm=S.pejabat,ex=DB.sigs.find(s=>norm(s.name)===norm(nm));
    if(!ex||ov){const d=await toData(plan.asal.ttd.file);if(ex)ex.sig=d;else DB.sigs.push({id:uid(),name:nm,jabatan:"",sig:d});save();rep.push("TTD "+nm+": terdaftar")}else rep.push("TTD "+nm+": dilewati (sudah ada)")}
   rsSave();rsRenderLk();rsBuildForm();rsUpdate();$("rs-msOut").innerHTML='<p class="hint"><b>Selesai.</b></p><ul>'+rep.map(x=>"<li class=\"hint\">"+esc(x)+"</li>").join("")+"</ul>";toast("Impor selesai.")
  }catch(err){$("rs-msOut").insertAdjacentHTML("beforeend",'<p class="hint w">Gagal: '+esc(err&&err.message||err)+" (sebagian mungkin sudah tersimpan)</p>");rsSave();rsRenderLk()}}
})();
