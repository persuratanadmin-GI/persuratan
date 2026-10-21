"use strict";
/* SPPD (Surat Perintah Perjalanan Dinas) - logika murni: parser WhatsApp, pencocokan pegawai, tata letak surat.
   Berdiri sendiri: hanya memakai fungsi umum dari logic.js (normDate, lev, BLN, fmtDate, pad2, uid). Tidak mengubah surat lembur.
   Tata letak (koordinat pt, A4) diturunkan dari "Format Surat Dinas.docx" yang dirender ulang; satu daftar elemen dipakai
   oleh pratinjau HTML dan PDF supaya keduanya selalu sama. */
const SP_DEF={kopPt:"PT PLN (Persero)",kopUnit:"UNIT PELAKSANA TRANSMISI MAKASSAR",kopAlm:"Jl. Gunung Latimojong No.21, Gaddong, Kec. Bontoala, Kota Makassar, Sulawesi Selatan 90156",
 kodeForm:"FR.03-SDM.05",revisi:"0",tglForm:"11-11-2019",
 pjNama:"Kamran",pjGrade:"17",pjNip:"7493103F",pjJab:"Manager UPT Makassar",pjTtdJab:"MANAGER UPT MAKASSAR",
 gmNama:"FERMI TRAFIANTO",gmJab:"GENERAL MANAGER",kotaTerbit:"Makassar",kotaAsal:"Parepare",sufiksUnit:"ULTG Parepare",terbitSebelum:1};
const SP_KOTA=["makassar","parepare","palopo"];
const spClean=s=>String(s==null?"":s).replace(/[\u200b-\u200f\u2060\ufeff]/g,"").replace(/\u00a0/g," ");
const spNorm=s=>spClean(s).toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function spTitle(s){return spClean(s).trim().replace(/\s+/g," ").split(" ").map(w=>/^[A-Z0-9&.\/]{1,3}$/.test(w)&&w===w.toUpperCase()&&/[A-Z]/.test(w)&&w.length<=3?w:/^[A-Za-z]/.test(w)?w[0].toUpperCase()+w.slice(1).toLowerCase():w).join(" ")}
/* Nama orang: setiap kata berhuruf besar di awal; inisial satu huruf tetap kapital. */
function spName(s){return spClean(s).trim().replace(/\s+/g," ").split(" ").map(w=>w.length===1?w.toUpperCase():/^[A-Za-z]/.test(w)?w[0].toUpperCase()+w.slice(1).toLowerCase():w).join(" ")}
function spJab(j,suf){let t=spTitle(j);if(!t)return"";if(suf&&!/\b(ULTG|UPT|GI|GITET)\b/i.test(t))t+=" "+suf;return t}
const SP_SAT=["","Satu","Dua","Tiga","Empat","Lima","Enam","Tujuh","Delapan","Sembilan","Sepuluh","Sebelas"];
function spTerbilang(n){n=Math.floor(n);if(n<12)return n?SP_SAT[n]:"Nol";if(n<20)return SP_SAT[n-10]+" Belas";if(n<100)return SP_SAT[Math.floor(n/10)]+" Puluh"+(n%10?" "+SP_SAT[n%10]:"");return String(n)}
/* Lama perjalanan selalu mengikuti tanggal berangkat dan tanggal kembali (bila keduanya valid). */
function spLamaOf(c){if(c.tglBerangkat&&c.tglKembali){const n=spDiffDays(c.tglBerangkat,c.tglKembali)+1;return n>=1?n:0}return c.lama||0}
const spLama=n=>n?n+" ( "+spTerbilang(n)+" ) hari":"";
function spAddDays(iso,n){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number),t=new Date(y,m-1,d+n);return t.getFullYear()+"-"+pad2(t.getMonth()+1)+"-"+pad2(t.getDate())}
function spDiffDays(a,b){const f=s=>{const[y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};return Math.round((f(b)-f(a))/864e5)}
/* ---- tempat: "Pinrang" -> "Kab. Pinrang", "Parepare" -> "Kota Parepare" ---- */
function spTempat(raw){let t=spClean(raw).trim().replace(/\s+/g," ");if(!t)return{v:"",w:""};
 if(/^(kota|kab\.?|kabupaten)\s/i.test(t)){const m=/^(kota|kab\.?|kabupaten)\s+(.*)$/i.exec(t);return{v:(/^kota/i.test(m[1])?"Kota ":"Kab. ")+spTitle(m[2]),w:""}}
 const key=t.toLowerCase().replace(/[^a-z]/g,"");
 if(SP_KOTA.includes(key))return{v:"Kota "+spTitle(key==="parepare"?"Parepare":t),w:""};
 if(/^[A-Za-z]+$/.test(t))return{v:"Kab. "+spTitle(t),w:"Awalan 'Kab.' ditebak - periksa"};
 return{v:t,w:""}}
/* ---- pegawai: cocokkan nama singkat ("Ikhwan") ke daftar ---- */
function spCari(list,q){const n=spNorm(q);if(!n)return{p:null,alt:[]};
 const qt=n.split(" "),sc=list.map(p=>{const pn=spNorm(p.nama),pt=pn.split(" ");let s=0;
  if(pn===n)s=4;else if(qt.every(t=>pt.includes(t)))s=3;else if(pn.startsWith(n))s=2;else if(qt.every(t=>pt.some(x=>x.startsWith(t))))s=2;
  else if(qt.length===1&&pt.some(x=>lev(x,qt[0])<=1&&qt[0].length>=4))s=1;return{p,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
 if(!sc.length)return{p:null,alt:[]};const top=sc.filter(x=>x.s===sc[0].s);
 return top.length===1?{p:top[0].p,exact:sc[0].s>=3,fuzzy:sc[0].s===1,alt:[]}:{p:null,alt:top.map(x=>x.p)}}
/* ---- parser pesan WhatsApp ---- */
const SP_ALIAS={personil:["personil","personel","pegawai","nama","nama personil","nama pegawai","peserta"],destinasi:["destinasi sppd","destinasi","tujuan","tujuan sppd","rute","tempat tujuan","lokasi"],
 maksud:["maksud sppd","maksud","maksud perjalanan","maksud perjalanan dinas","keperluan","kegiatan","tujuan kegiatan","uraian"],estimasi:["estimasi","lama","lamanya","durasi","lama perjalanan","lamanya perjalanan"],
 tanggal:["tanggal","tgl","tanggal berangkat","tanggal sppd","tanggal perjalanan"],kembali:["tanggal kembali","tgl kembali","kembali"],transport:["transportasi","kendaraan","transport"],
 urgensi:["urgensi","justifikasi","urgensi pelaksanaan"],terbit:["tanggal terbit","dikeluarkan","tanggal surat"]};
const SP_LOOK=(()=>{const l={};for(const k in SP_ALIAS)SP_ALIAS[k].forEach(a=>l[a]=k);return l})();
function spLabel(raw){const l=spNorm(raw);if(!l)return null;if(SP_LOOK[l])return SP_LOOK[l];if(l.length<6)return null;let best=null,bd=9,tie=false;
 for(const a in SP_LOOK){if(a.length<6)continue;const x=lev(l,a);if(x<bd){bd=x;best=SP_LOOK[a];tie=false}else if(x===bd&&SP_LOOK[a]!==best)tie=true}return best&&!tie&&bd<=1?best:null}
function spLine(line){const t=spClean(line).replace(/[*~`_]/g,"").replace(/^\s*(?:[-•]\s+)/,"").trim();if(!t)return null;
 const m=/^([^:=\n]{2,30}?)\s*[:=]\s*(.*)$/.exec(t);if(m){const k=spLabel(m[1]);if(k)return{k,v:m[2].trim()}}return{k:null,v:t}}
function spSplitNames(v){return spClean(v).split(/\s*(?:,|;|\n|&|\bdan\b)\s*/i).map(x=>x.replace(/^\s*(?:\d+\s*[.)]|[-•])\s*/,"").trim()).filter(Boolean)}
function spBlocks(text){const out=[];let b=null,key=null;const mk=()=>({r:{},names:[],unk:[],seen:{}});
 for(const raw of spClean(text).split(/\r?\n/)){const t=raw.trim();if(!t){continue}
  if(/^\W*form\s+sppd\W*$/i.test(t)){if(b&&Object.keys(b.seen).length)out.push(b);b=mk();key=null;continue}
  const L=spLine(raw);if(!L)continue;if(!b)b=mk();
  if(L.k){if(b.seen[L.k]){out.push(b);b=mk()}b.seen[L.k]=1;key=L.k;if(L.k==="personil"){if(L.v)b.names.push(...spSplitNames(L.v))}else b.r[L.k]=L.v}
  else if(key==="personil")b.names.push(...spSplitNames(L.v));
  else if(key==="maksud"||key==="urgensi")b.r[key]=(b.r[key]?b.r[key]+" ":"")+L.v;
  else b.unk.push(L.v.slice(0,60))}
 if(b&&Object.keys(b.seen).length)out.push(b);return out}
function spTanggal(s){s=spClean(s).trim();if(!s)return{};
 let r=normDate(s);if(!r.err)return{a:r.iso,w:r.warn||""};
 const parts=s.split(/\s+(?:s\/d|s\.d\.?|sd|sampai|hingga)\s+|\s*[\u2013\u2014]\s*|\s+-\s+|(?<=\d)\s*-\s*(?=\d{1,2}\s+[A-Za-z])/i);
 if(parts.length===2){const right=normDate(parts[1]);if(!right.err){const[y,m]=right.iso.split("-").map(Number);let L=parts[0].trim(),left;
  if(/^\d{1,2}$/.test(L))left=normDate(L+" "+BLN[m-1]+" "+y);else if(/^\d{1,2}\s+[A-Za-z]+$/.test(L))left=normDate(L+" "+y);else left=normDate(L);
  if(!left.err)return{a:left.iso,b:right.iso,w:[left.warn,right.warn].filter(Boolean).join("; ")}}}
 return{err:"Format tanggal tidak dikenali: "+s}}
function spRute(v,asal){const t=spClean(v).trim();if(!t)return{};
 let p=t.split(/\s+[-\u2013\u2014]\s+|\s*[\u2013\u2014\u2192>]\s*|\s+(?:ke|to|s\/d)\s+/i).map(x=>x.trim()).filter(Boolean);
 if(p.length===1){const h=t.split("-").map(x=>x.trim());if(h.length===2&&h[0].length>=4&&h[1].length>=4&&h[0].toLowerCase()!==h[1].toLowerCase())p=h}
 if(p.length>=2)return{b:p[0],t:p.slice(1).join(", ")};return{b:"",t:p[0],noAsal:true}}
/* Satu blok pesan -> daftar surat (satu per personil). pegawai & settings diberikan dari luar agar fungsi ini murni. */
function spBuild(block,pegawai,S){const r=block.r,res=[],Sx={...SP_DEF,...S};
 const base={st:{},flags:{}};const fl=(k,s,m)=>{if(s!=="ok")base.flags[k]=m||"Periksa"; base.st[k]={s,m:m||""}};
 let ber="",tuj="";const rt=spRute(r.destinasi,Sx.kotaAsal);
 if(!r.destinasi)fl("tujuan","missing","Destinasi tidak ditemukan");else{const A=rt.noAsal?{v:Sx.kotaAsal?spTempat(Sx.kotaAsal).v:"",w:""}:spTempat(rt.b),B=spTempat(rt.t);ber=A.v;tuj=B.v;
  fl("berangkat",rt.noAsal?"warn":A.w?"warn":"ok",rt.noAsal?"Tempat berangkat tidak tertulis, memakai bawaan Pengaturan":A.w);fl("tujuan",B.w?"warn":"ok",B.w)}
 let a="",b="",w="",lama=r.estimasi?parseInt(/\d+/.exec(r.estimasi)?.[0]||"",10)||0:0;
 if(!r.tanggal)fl("tglBerangkat","missing","Tanggal tidak ditemukan");else{const d=spTanggal(r.tanggal);if(d.err)fl("tglBerangkat","error",d.err);else{a=d.a;b=d.b||"";fl("tglBerangkat",d.w?"warn":"ok",d.w)}}
 if(r.kembali){const d=normDate(r.kembali);if(!d.err)b=d.iso}
 if(a&&b){const n=spDiffDays(a,b)+1;if(n<1){fl("tglKembali","error","Tanggal kembali sebelum berangkat");b=""}else{if(lama&&lama!==n)fl("lama","warn","Estimasi "+lama+" hari tidak sama dengan rentang tanggal ("+n+" hari); memakai rentang");lama=n}}
 if(a&&!b){if(!lama){lama=1;fl("lama","warn","Estimasi tidak tertulis, dianggap 1 hari")}b=spAddDays(a,lama-1)}
 if(!lama&&!r.estimasi&&!base.st.lama)fl("lama","missing","Estimasi tidak ditemukan");
 if(!base.st.lama)fl("lama","ok");if(!base.st.tglKembali)fl("tglKembali",b?"ok":"missing",b?"":"Tidak dapat dihitung");
 const maksud=spClean(r.maksud||"").trim().replace(/^./,x=>x.toUpperCase());if(!maksud)fl("maksud","missing","Maksud tidak ditemukan");else fl("maksud","ok");
 const trans=r.transport?spTitle(r.transport):"";if(!trans)fl("transport","missing","Transportasi tidak ditemukan");else fl("transport","ok");
 /* Baris 7 selalu "Melaksanakan " + maksud (dibentuk saat surat digambar); "Pada tanggal" selalu = tanggal berangkat. */
 const names=block.names.length?block.names:[""];
 names.forEach(q=>{const c=spBlank(Sx);c.flags={...base.flags};c.st=JSON.parse(JSON.stringify(base.st));
  Object.assign(c,{maksud,berangkat:ber,tujuan:tuj,transport:trans,lama,tglBerangkat:a,tglKembali:b,tglTerbit:a});
  if(!q){c.st.personName={s:"missing",m:"Personil tidak ditemukan"};c.flags.personName="Personil tidak ditemukan"}
  else{const h=spCari(pegawai,q);
   if(h.p){c.personName=spName(h.p.nama);c.grade=String(h.p.grade||"");c.nip=h.p.nip||"";c.jabatan=spJab(h.p.jabatan,Sx.sufiksUnit);
    const m=h.fuzzy?"Nama '"+q+"' dicocokkan ke "+c.personName+" - periksa":"";c.st.personName={s:m?"warn":"ok",m:m||("Data lengkap dari daftar pegawai (dari '"+q+"')")};if(m)c.flags.personName=m;
    if(!c.grade){c.flags.grade="Grade belum ada di daftar pegawai"}}
   else{c.personName=spName(q);const m=h.alt.length?"Beberapa pegawai cocok: "+h.alt.map(x=>spName(x.nama)).join(", ")+" - pilih salah satu":(pegawai.length?"Tidak ada di daftar pegawai - isi Grade/NIP/Jabatan manual":"Daftar pegawai kosong - impor dari Excel di tab Pegawai, atau isi manual");
    c.st.personName={s:"warn",m};c.flags.personName=m}}
  res.push(c)});
 return{surat:res,unk:block.unk}}
function spBlank(S){S={...SP_DEF,...S};return{id:null,personName:"",grade:"",nip:"",jabatan:"",maksud:"",berangkat:S.kotaAsal?spTempat(S.kotaAsal).v:"",tujuan:"",transport:"",lama:1,tglBerangkat:"",tglKembali:"",tglTerbit:"",kotaTerbit:S.kotaTerbit,sigPos:{},status:"draft",flags:{}}}
function spMissing(c){const m=[];[["personName","nama pegawai"],["grade","grade"],["nip","NIP"],["jabatan","jabatan"],["maksud","maksud"],["berangkat","tempat berangkat"],["tujuan","tempat tujuan"],["transport","transportasi"],["tglBerangkat","tanggal berangkat"],["tglKembali","tanggal kembali"]].forEach(([k,l])=>{if(!c[k])m.push(l)});if(!spLamaOf(c))m.push("lama perjalanan (cek tanggal)");return m}
/* ---- tata letak: daftar elemen (pt, A4) ---- */
let _spCtx=null;
function spW(t,size,bold){try{if(!_spCtx&&typeof document!=="undefined"&&document.createElement){_spCtx=document.createElement("canvas").getContext("2d")}}catch(e){}
 if(_spCtx&&_spCtx.measureText){_spCtx.font=(bold?"bold ":"")+"100px Arial, 'Liberation Sans', Helvetica, sans-serif";const w=_spCtx.measureText(String(t)).width;if(w>0)return w*size/100}
 return String(t).length*size*(bold?.58:.53)}
function spWrap(text,width,size,hang,bold){const out=[];let line="",first=true;const lim=()=>first?width:width-(hang||0);
 for(const w0 of String(text).split(" ")){let w=w0;const tryl=line?line+" "+w:w;
  if(!line||spW(tryl,size,bold)<=lim()){line=tryl;if(spW(line,size,bold)>lim()&&!line.includes(" ")){while(spW(line,size,bold)>lim()&&line.length>1){let k=line.length-1;while(k>1&&spW(line.slice(0,k),size,bold)>lim())k--;out.push(line.slice(0,k));line=line.slice(k);first=false}}}
  else{out.push(line);first=false;line=w}}
 out.push(line);return out}
function spLayout(c){const S={...SP_DEF,...(typeof SPDB!=="undefined"?SPDB.settings:{})},it=[],FS=11,LH=12.3,L=36,R=582.45,c1=64,c2=260,c3=333.25;
 const T=(x,y,s,t,o)=>it.push({k:"t",x,y,s,t:String(t),b:!!(o&&o.b),i:!!(o&&o.i),a:(o&&o.a)||"l"});
 const Ln=(x1,y1,x2,y2,w)=>it.push({k:"l",x1,y1,x2,y2,w:w||.75});
 const V=v=>v||"..........";
 /* kop */
 it.push({k:"i",src:typeof SPPD_LOGO!=="undefined"?SPPD_LOGO:"",x:39,y:24,w:47.5,h:65.7});
 T(97.7,29.9,14,S.kopPt,{b:1});T(97.7,43.9,13.5,S.kopUnit,{b:1});T(97.7,64.9,11,S.kopAlm);
 Ln(L,16.2,R,16.2);Ln(L,148.6,R,148.6);Ln(L,16.2,L,148.6);Ln(R,16.2,R,148.6);Ln(L,92.8,R,92.8);Ln(375.5,92.8,375.5,148.6);
 T(205.6,114.3,15.5,"SURAT PERINTAH PERJALANAN DINAS",{b:1,a:"c"});
 [["Nomor",S.kodeForm,93.5],["Revisi",S.revisi,102.8],["Tanggal",S.tglForm,112.1],["Halaman","1 dari 1",123.6]].forEach(([a,b,y])=>{T(381.1,y,8,a,{b:1});T(453.4,y,8,":",{b:1});T(465.2,y,8,b,{b:1})});
 /* tabel */
 const T0=185.4,rh=22.7,tw=R-c2-4;let y=T0;const lines=[];
 const mid=(y0,h,n)=>y0+(h-n*LH)/2;
 const hl=(yy,a,b)=>lines.push([a,yy,b,yy]),vl=(x,a,b)=>lines.push([x,a,x,b]);
 const pj=[["Nama",": "+V(S.pjNama)],["@",": "+(S.pjGrade||"..")+" / "+V(S.pjNip)],["Jabatan",": "+V(S.pjJab)]];
 const pg=[["Nama",": "+V(c.personName)],["@",": "+V(c.grade)+" / "+V(c.nip)],["Jabatan",": "+V(c.jabatan)]];
 const sub=(rows,y0,no,lab)=>{const strip=lab[0]==="1"?12:0;hl(y0,L,R);const ya=y0+strip;
  rows.forEach((r,i)=>{const ty=ya+i*rh+(rh-LH)/2;if(r[0]==="@"){T(265.4,ty,FS,"Grade",{i:1});T(265.4+spW("Grade",FS)+0,ty,FS," / NIP")}else T(265.4,ty,FS,r[0]);T(339.5,ty,FS,r[1]);if(i||strip)hl(ya+i*rh,c2,R)});
  const e=ya+3*rh,cy=ya+(3*rh-0)/2;vl(c1,y0,e);vl(c2,y0,e);vl(c3,ya,e);T(52.5,cy-LH/2,FS,no+".",{a:"c"});
  lab.slice(1).forEach((t,i,ar)=>T(69.5,mid(ya,3*rh,ar.length)+i*LH,FS,t));return e};
 y=sub(pj,y,1,["1","Pejabat yang Berwenang","Memberi Perintah"]);y=sub(pg,y,2,["2","Pegawai yang Diperintah"]);
 const span=(y0,hmin,no,lab,val)=>{const vl2=spWrap(": "+V(val),tw,FS,spW(": ",FS),0),h=Math.max(hmin,vl2.length*LH+12);hl(y0,L,R);
  T(52.5,y0+(h-LH)/2,FS,no+".",{a:"c"});lab.forEach((t,i)=>T(69.5,mid(y0,h,lab.length)+i*LH,FS,t));vl2.forEach((t,i)=>T(265.4+(i?spW(": ",FS):0),mid(y0,h,vl2.length)+i*LH,FS,t));vl(c1,y0,y0+h);vl(c2,y0,y0+h);return y0+h};
 y=span(y,48.2,3,["Maksud Perjalanan Dinas/","Tujuan Kegiatan Dinas"],c.maksud);
 y=span(y,25.9,4,["Transportasi yang Dipergunakan"],c.transport);
 const grp=(y0,hmin,no,items)=>{let yy=y0;hl(y0,L,R);items.forEach(([lab,val],i)=>{const a=spWrap(lab,c2-69.5-4,FS,11,0),b=spWrap(val,tw,FS,0,0),n=Math.max(a.length,b.length),h=Math.max(hmin,n*LH+8);
  if(i)hl(yy,c1,R);a.forEach((t,j)=>T(69.5+(j?11:0),mid(yy,h,a.length)+j*LH,FS,t));b.forEach((t,j)=>T(265.4,mid(yy,h,b.length)+j*LH,FS,t));yy+=h});
  vl(c1,y0,yy);vl(c2,y0,yy);T(52.5,y0+(yy-y0-LH)/2,FS,no+".",{a:"c"});return yy};
 const tg=iso=>iso?fmtDate(iso):"..........";
 y=grp(y,28.35,5,[["a. Tempat Berangkat (Tempat Kedudukan)","a. "+V(c.berangkat)],["b. Tempat Tujuan","b. "+V(c.tujuan)]]);
 y=grp(y,28.35,6,[["a. Lamanya Perjalanan Dinas","a. "+(spLamaOf(c)?spLama(spLamaOf(c)):"..........")],["b. Tanggal Berangkat","b. "+tg(c.tglBerangkat)],["c. Tanggal Harus Kembali","c. "+tg(c.tglKembali)]]);
 {const val="Melaksanakan "+(c.maksud||"..........");y=span(y,65.2,7,["Urgensi Pelaksanaan Dinas/","Justifikasi Harus Dilaksanakan","Luring"],val)}
 hl(y,L,R);vl(L,T0,y);vl(R,T0,y);lines.forEach(l=>Ln(l[0],l[1],l[2],l[3]));
 /* pengesahan */
 const y1=y+16.2,nm=Math.min(y1+133.3,826-LH),cy=(y1+65.4+nm)/2;
 T(264.8,y1,FS,"Dikeluarkan di");T(389.9,y1,FS,": "+V(c.kotaTerbit));T(264.8,y1+13.9,FS,"Pada tanggal");T(389.9,y1+13.9,FS,": "+tg(c.tglBerangkat));
 T(163.1,y1+40.4,FS,"Menyetujui,",{a:"c"});T(163.1,y1+53.1,FS,S.gmJab||"",{a:"c"});T(163.1,nm,FS,String(S.gmNama||"").toUpperCase(),{a:"c"});
 T(432.4,y1+40.4,FS,"Yang Memberi Perintah,",{a:"c"});T(432.4,y1+53.1,FS,S.pjTtdJab||"",{a:"c"});T(432.4,nm,FS,String(S.pjNama||"").toUpperCase(),{a:"c"});
 it.push({k:"s",key:"GM",nama:S.gmNama,cx:163.1,cy},{k:"s",key:"PJ",nama:S.pjNama,cx:432.4,cy});
 /* paraf (satu gambar untuk semua surat): di ujung kanan nama pejabat yang memberi perintah, sebaris dengan nama */
 if(S.paraf){const pw=56,ph=28,nw=spW(String(S.pjNama||"").toUpperCase(),FS,false)||50,ujung=432.4+nw/2; /* ujung kanan nama */
  const pcx=Math.min(ujung+1+pw/2,R-3-pw/2); /* mulai tepat di ujung nama (sedikit menempel), tidak keluar garis kanan */
  it.push({k:"s",key:"PF",src:S.paraf,l:1,w:pw,h:ph,cx:pcx,cy:nm+10.5-ph/2}) /* dasar gambar sejajar garis dasar huruf nama */}
 return it}
