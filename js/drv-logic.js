"use strict";
/* Lembur Driver - logika murni: nilai bawaan, parser pesan WhatsApp, tata letak surat.
   Berdiri sendiri: memakai fungsi umum dari logic.js (parseWA, bacaBaris, fmtDate, fmtDay, durText, uid) dan sppd-logic.js
   (spW, spWrap untuk mengukur dan memotong teks). Tidak mengubah Surat Lembur HAR.
   Tata letak (koordinat pt) diturunkan dari "Form Surat Lembur Driver.pdf" (Letter, Arial 9,24 pt) lalu diskalakan ke A4
   dengan cara yang sama seperti Surat Lembur HAR (PS, PDX). Satu daftar elemen dipakai bersama oleh pratinjau HTML dan PDF,
   sehingga keduanya selalu sama. */
const DV_DEF={
 kop1:"UIP3 SULAWESI",kop2:"UPT MAKASSAR",kop3:"ULTG PAREPARE",kota:"Parepare",
 perihal:"Permintaan Lembur Driver",kepada1:"Direktur PT. Bumi Jasa Utama",kepada2:"Makassar",
 pembuka:"Dengan ini kami mengajukan permintaan lembur Driver untuk keperluan Operasional ULTG Parepare pada :",
 penutup:"Demikian, atas kerjasamanya diucapkan terima kasih.",
 mgrJab:"Manager ULTG Parepare",mgrNama:"SAMSU ALAM",jabPemberi:"TL HAR JAR",zona:"WITA",durTampil:true,
 alm1:"Jl. Bambu Runcing",alm2:"Kel.Bumi Harapan,Kec. Bacukiki, Parepare, Sulawesi Selatan",web:"www.pln.co.id",telp:"-",
 xlJudul:"DAFTAR HADIR LEMBUR TENAGA ALIH DAYA DRIVER ULTG PAREPARE",xlKota:"Parepare",
 xlLbl1:"Manajer",xlLbl2:"TL Har Protek, MTR & OTM",xlLbl3:"TL Har GI",xlLbl4:"TL HAR JAR",
 xlNama1:"SAMSU ALAM",xlNama2:"MUH. APRIZAL A.",xlNama3:"ANHAR FITRA NUR SATYA",xlNama4:"ICHSAN MAHYUDDIN",excelMap:{}};
/* Skala Letter -> A4 (sama dengan PS dan PDX di pdf.js) */
const DV_PS=841.89/792,DV_PDX=-12.34;
const dvX=x=>x*DV_PS+DV_PDX,dvY=y=>y*DV_PS;
/* Label di pesan: "Driver", "Nama Driver", "Pengemudi", "Sopir" dibaca sebagai nama. Hanya jika diikuti ":" / "=" (atau berdiri sendiri di satu baris),
   supaya kalimat uraian yang kebetulan diawali kata "driver" tidak salah dibaca. */
function dvPrep(text){return String(text==null?"":text).split(/\r?\n/).map(l=>l.replace(/^(\W*?)(?:nama\s+)?(?:driver|pengemudi|sopir|supir)(?=\s*[:=]|\s*$)/i,"$1Nama")).join("\n")}
/* Satu isian nama bisa memuat beberapa driver: "Syahrul, Agus", "Syahrul & Agus", "Syahrul dan Agus". */
function dvNames(v){return String(v==null?"":v).replace(/[\u200b-\u200f\u2060\ufeff]/g,"").split(/\s*(?:,|;|&|\bdan\b|\r?\n)\s*/i).map(x=>x.replace(/^\s*(?:\d+\s*[.)]|[-\u2022])\s*/,"").replace(/\s+/g," ").trim()).filter(Boolean)}
const dvNorm=s=>String(s==null?"":s).toLowerCase().replace(/\s+/g," ").trim();
function dvBlank(S){S={...DV_DEF,...S};return{id:null,driver:"",tanggal:"",mulai:"",selesai:"",durManual:"",tujuan:"",tglSurat:"",pemberiName:"",pemberiJab:S.jabPemberi,sigPos:{},status:"draft",flags:{}}}
function dvMissing(c){const m=[];[["tanggal","tanggal"],["mulai","jam mulai"],["selesai","jam selesai"],["tujuan","tujuan"],["pemberiName","pemberi perintah (TL)"]].forEach(([k,l])=>{if(!c[k])m.push(l)});return m}
/* ---- parser ---- */
const DV_PARSE_KEYS=["nama","tanggal","mulai","selesai","uraian","pemberi"];
/* Pisah blok: baris kosong, atau label yang berulang (= awal surat baru). Blok tanpa label digabung ke blok sebelumnya (sama dengan splitBlocks di multi.js). */
function dvLineKey(line,seen){const b=bacaBaris(line);return b&&!(b.loose&&seen&&seen[b.k])?b.k:null}
function dvBlocks(text){const out=[];let b=[],seen={};const flush=()=>{if(b.length)out.push(b);b=[];seen={}};
 for(const line of dvPrep(text).split(/\r?\n/)){if(!line.trim()){flush();continue}const k=dvLineKey(line,seen);if(k){if(seen[k])flush();seen[k]=1}b.push(line)}
 flush();const merged=[];for(const bl of out){if(!bl.some(l=>dvLineKey(l))&&merged.length)merged[merged.length-1].push(...bl);else merged.push(bl)}
 return merged.map(b=>b.join("\n"))}
function dvParse(text){return dvBlocks(text).map(b=>parseWA(b))}
/* Hasil parseWA satu blok -> surat. sigs = daftar tanda tangan terdaftar ([{name,jabatan}]) untuk melengkapi jabatan TL. */
function dvBuild(pr,S,sigs){const c=dvBlank(S),f=pr.f,st=pr.st;c.st={};
 const set=(k,v,s)=>{if(v!==undefined&&s&&s.s!=="error")c[k]=v;c.st[k]=s;if(s.s!=="ok"&&!(s.s==="missing"&&k==="driver"))c.flags[k]=s.m||"Perlu diisi"};
 set("driver",f.nama,st.nama);set("tanggal",f.tanggal,st.tanggal);set("mulai",f.mulai,st.mulai);set("selesai",f.selesai,st.selesai);set("tujuan",f.uraian,st.uraian);set("pemberiName",f.pemberi,st.pemberi);
 if(c.tanggal)c.tglSurat=c.tanggal;
 if(f.pemberi){const g=(sigs||[]).find(x=>dvNorm(x.name)===dvNorm(f.pemberi));
  if(g){c.pemberiName=g.name;if(g.jabatan)c.pemberiJab=g.jabatan;delete c.flags.pemberiName;c.st.pemberiName={s:"ok",m:""}}
  else{c.flags.pemberiName=c.flags.pemberiName||"Nama belum terdaftar di tab Tanda Tangan - tanda tangan tidak terpasang otomatis";if(c.st.pemberiName.s==="ok")c.st.pemberiName={s:"warn",m:c.flags.pemberiName}}}
 return c}
/* Pesan -> daftar surat. Nama driver yang kosong diwarisi dari surat sebelumnya (ditandai periksa). */
function dvBuildAll(text,S,sigs){const prs=dvParse(text),res=prs.map(p=>dvBuild(p,S,sigs));
 res.forEach((c,i)=>{if(!c.driver&&i&&res[i-1].driver){c.driver=res[i-1].driver;c.st.driver={s:"warn",m:"Nama driver diambil dari surat sebelumnya - periksa"};c.flags.driver=c.st.driver.m}});
 return{surat:res,unk:prs.flatMap(p=>p.unk)}}
/* ---- nama berkas PDF ---- */
function dvLabelDriver(list){const n=[...new Set(list.flatMap(c=>dvNames(c.driver)).map(x=>x.toUpperCase().replace(/[\\/:*?"<>|\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim()).filter(Boolean))];
 return n.length<=1?(n[0]||""):n.length<=3?n.join(" & "):n[0]+" DKK"}
function dvNamaBerkas(list){
 if(list.length===1){const c=list[0],d=dvLabelDriver(list),t=c.tanggal?fmtDate(c.tanggal).toUpperCase():"TANPA TANGGAL";return("LEMBUR DRIVER "+(d?d+" ":"")+t+".pdf").replace(/\s+/g," ")}
 const d=dvLabelDriver(list),bt=rentangBulanTeks(list.map(c=>String(c.tanggal||"").slice(0,7)));
 return("DAFTAR FILE LEMBUR DRIVER"+(d?" "+d:"")+(bt?" "+bt:"")).replace(/\s+/g," ").trim()+".pdf"}
/* ---- tata letak: daftar elemen (pt, A4) ---- */
function dvLayout(c,S){S={...DV_DEF,...S};const it=[],FS=9.24,LH=13.33,SZ=FS*DV_PS,AS=.905;
 /* x, garis dasar (koordinat Letter asli), ukuran dalam pt Letter */
 const T=(x,base,t,o)=>{o=o||{};const sz=(o.s||FS)*DV_PS;it.push({k:"t",x:dvX(x),y:dvY(base)-AS*sz,s:sz,t:String(t),b:!!o.b,a:o.a||"l",col:o.col||""})};
 const D=n=>".".repeat(n);
 it.push({k:"i",src:typeof DRV_IMG!=="undefined"?DRV_IMG.banner:"",x:dvX(59.76),y:dvY(20.16),w:258.72*DV_PS,h:25.92*DV_PS});
 it.push({k:"i",src:typeof DRV_IMG!=="undefined"?DRV_IMG.pln:"",x:dvX(414.72),y:dvY(59.28),w:67.44*DV_PS,h:32.64*DV_PS});
 [[S.kop1,102.79],[S.kop2,115.03],[S.kop3,127.3]].forEach(([t,b])=>T(491.02,b,t,{s:8.7,b:1,a:"r",col:"#002060"}));
 const tgl=c.tglSurat||c.tanggal;
 T(369.55,150.38,S.kota+", "+(tgl?fmtDate(tgl):D(39)));
 T(62.06,177.02,"Perihal");T(103.34,177.02,":");T(114.86,177.02,S.perihal);
 T(369.55,177.02,"Kepada Yth,");T(369.55,190.34,S.kepada1);T(369.55,203.66,"Di");T(369.55,216.98,S.kepada2);
 const pem=spWrap(S.pembuka,500-114.86,FS,0,false);pem.forEach((l,i)=>T(114.86,243.62+i*LH,l));
 const sh=(pem.length-2)*LH,b0=283.61+sh,gap=26.64;
 const dur=S.durTampil===false?"":durText(c),waktu=c.mulai&&c.selesai?c.mulai+" s/d "+c.selesai+" "+S.zona+(dur?" ("+dur+")":""):"";
 const tuj=spWrap(c.tujuan?String(c.tujuan).replace(/\s*\n\s*/g," "):D(39),530-233.81,FS,0,false);
 [["1.","Hari / Tanggal",c.tanggal?fmtDay(c.tanggal):D(39)],["2.","Pukul",waktu||D(39)],["3.","Tujuan",null]].forEach(([no,lab,val],i)=>{const b=b0+i*gap;
  T(114.86,b,no);T(131.9,b,lab);T(222.41,b,":");if(val!==null)T(233.81,b,val);else tuj.forEach((l,j)=>T(233.81,b+j*LH,l))});
 const ex=sh+(tuj.length-1)*LH;
 T(114.86,363.53+ex,S.penutup);
 const cl=195.6,cr=390.78,TT=2*LH; /* ruang tanda tangan: 2 baris tambahan antara jabatan dan nama */
 T(195.58,390.17+ex,"Pemberi Perintah",{a:"c"});T(390.78,390.17+ex,"Mengetahui",{a:"c"});
 T(cl,403.49+ex,c.pemberiJab||("TL "+D(30)),{a:"c"});T(cr,403.49+ex,S.mgrJab,{a:"c"});
 T(cl,443.47+ex+TT,c.pemberiName?String(c.pemberiName).toUpperCase():D(30),{a:"c",b:1});T(cr,443.47+ex+TT,String(S.mgrNama||"").toUpperCase(),{a:"c",b:1});
 it.push({k:"s",key:"G",nama:c.pemberiName,cx:dvX(cl),cy:dvY(423.5+ex+TT/2),w:105,h:56+TT*DV_PS},{k:"s",key:"M",nama:S.mgrNama,cx:dvX(cr),cy:dvY(423.5+ex+TT/2),w:105,h:56+TT*DV_PS});
 /* kaki halaman */
 T(71.47,735.86,S.alm1,{s:7.39});T(71.47,745.68,S.alm2,{s:7.42});
 T(71.47,755.4,"W",{s:7.39,b:1,col:"#244061"});T(80.86,755.4,S.web,{s:7.39});T(127.78,755.4,"T",{s:7.39,b:1,col:"#244061"});T(134.2,755.4,S.telp,{s:7.39});
 T(369.31,749.88,"Paraf"+D(32),{s:7.32});
 /* paraf (satu gambar untuk semua surat, diunggah di Pengaturan): gaya paraf SPPD (tinggi 13 pt, lebar maks 26 pt, rasio gambar terjaga),
   menempel di garis titik-titik setelah tulisan "Paraf". S.parafAr = lebar/tinggi gambar yang sudah dipotong rapat. */
 if(S.paraf){const ar=+S.parafAr>0?+S.parafAr:0,MW=26,MH=13;let pw=MW,ph=MH;if(ar){pw=ph*ar;if(pw>MW){pw=MW;ph=MW/ar}}
  it.push({k:"s",key:"PF",src:S.paraf,ex:ar?1:0,w:pw,h:ph,cx:dvX(389)+pw/2,cy:dvY(749.88)-ph/2+3})}
 return it}
