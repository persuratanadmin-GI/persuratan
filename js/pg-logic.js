"use strict";
/* Lembur Pegawai - logika murni: nilai bawaan, parser pesan WhatsApp, dan tata letak Form 01-05 serta Form Kendali Anggaran
   (Lampiran III-VIII "Pedoman Pelaksanaan Lembur Baru Pegawai"). Berdiri sendiri: memakai fungsi umum dari logic.js (parseWA, splitBlocks,
   fmtDate, fmtDay, calcDur, uid) dan sppd-logic.js (spW, spWrap). Tidak mengubah mode lain.
   Satu daftar elemen (k:"t" teks, "l" garis, "s" tanda tangan) dipakai bersama oleh pratinjau HTML dan PDF, sehingga keduanya selalu sama.
   Koordinat dalam pt, halaman A4 (595,28 x 841,89). */
const PG_DEF={
 unitInduk:"UIP3B SULAWESI",unitPelaksana:"UPT MAKASSAR",unitLayanan:"ULTG PAREPARE",kota:"Parepare",
 ptInduk:"PT PLN (PERSERO) UNIT INDUK PENYALURAN DAN PUSAT PENGATUR BEBAN SULAWESI",
 kodeUnit:"",zona:"WITA",jenisDef:"Corrective Action",koordDef:"",
 mgrNama:"",mgrNip:"",mgrJab:"MANAGER",mgrUptJab:"Manager UPT/UP2B",
 asmanNama:"",asmanNip:"",asmanJab:"ASMAN/ MUL",asmanAjuJab:"Assistant Manager ... / MULP ...",
 mdNama:"",mdNip:"",mdJab:"MD/MDPU",
 kPagu:"",kTglPagu:"",kRealTgl:"",kRealNilai:"",kRealKet:"",kEstTgl:"",kEstKet:"",kEstNilai:"",kBulan:""};
const PG_FORMS=[["F01","Form 01","Surat Usulan Pekerjaan Lembur Korektif","III"],["F02","Form 02","Surat Permohonan Lembur Korektif","IV"],
 ["F03","Form 03","Surat Perintah Lembur","V"],["F04","Form 04","Surat Pernyataan Menyetujui Perintah Lembur","VI"],
 ["F05","Form 05","Laporan Realisasi Lembur","VII"],["F08","Kendali Anggaran","Form Kendali Anggaran Lembur","VIII"],["EV","Eviden","Eviden Lembur (foto)",""]];
const PG_JENIS=["Corrective Action","Preventive Action","Predictive Action"];
const PG_BLN3=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const pgNorm=s=>String(s==null?"":s).toLowerCase().replace(/\s+/g," ").trim();
const pgDot=n=>".".repeat(n);
/* "2026-11-10" -> "10 Nov 2026" */
function pgTgl3(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||"");return m?(+m[3])+" "+PG_BLN3[+m[2]-1]+" "+m[1]:""}
/* jam: "16:30" -> "16.30" */
const pgJam=t=>String(t||"").replace(":",".");
/* "200000" -> "Rp. 200.000" ; angka diambil dari digit saja */
function pgNum(v){const d=String(v==null?"":v).replace(/[^\d]/g,"");return d?+d:0}
const pgRibu=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const pgRp=v=>{const s=String(v==null?"":v).trim();return s===""?"":"Rp. "+pgRibu(pgNum(s))};
/* durasi rencana: menit -> {jam, menit, desimal "4,5"} */
function pgDur(c,mulai,selesai){const m=String(c.durManual||"").trim();let min=null;
 if(m&&!(mulai!==undefined&&mulai!==c.mulai)){const n=parseFloat(m.replace(",","."));if(!isNaN(n))min=Math.round(n*60)}
 if(min==null){const d=calcDur(mulai!==undefined?mulai:c.mulai,selesai!==undefined?selesai:c.selesai);if(d)min=d.min}
 if(min==null)return null;return{min,jam:Math.floor(min/60),menit:min%60,dec:String(+(min/60).toFixed(2)).replace(".",",")}}
/* nomor surat perintah: "123" -> "123/SDM.06.01/<kode>/<tahun>"; jika sudah memuat "/" dipakai apa adanya */
function pgNomor(c,S){const v=String(c.noSpl||"").trim();if(v.includes("/"))return v;
 const th=(c.tglSurat||c.tanggal||"").slice(0,4)||pgDot(4);return[v||pgDot(4),"SDM.06.01",S.kodeUnit||pgDot(4),th].join("/")}
const pgTglSurat=c=>c.tglSurat||c.tanggal||"";
/* daftar a, b, c dari isian bertingkat (satu baris = satu butir; awalan "a." / "1." / "-" dibuang) */
function pgButir(t,fallback){let l=String(t||"").split(/\r?\n/).map(x=>x.replace(/^\s*(?:[a-z]\s*[.)]|\d+\s*[.)]|[-\u2022*])\s*/i,"").trim()).filter(Boolean);
 if(!l.length&&fallback)l=String(fallback).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);return l}
function pgBlank(S){S={...PG_DEF,...S};return{id:null,nama:"",nip:"",personGrade:"",positionGrade:"",jabatan:"",unit:"",tanggal:"",mulai:"",selesai:"",durManual:"",
 lokasi:"",uraian:"",jenis:S.jenisDef,koordinator:S.koordDef,noSpl:"",tglSurat:"",rencana:"",realMulai:"",realSelesai:"",realDur:"",rincianReal:"",kejadian:"",
 tglLaporan:"",biaya:"",foto:[],fotoPerHal:"auto",sigPos:{},status:"draft",flags:{}}}
function pgMissing(c){const m=[];[["nama","nama pegawai"],["nip","NIP"],["tanggal","tanggal"],["mulai","jam mulai"],["selesai","jam selesai"],["uraian","rincian pekerjaan"],["lokasi","lokasi pekerjaan"]].forEach(([k,l])=>{if(!String(c[k]||"").trim())m.push(l)});return m}
/* ---- pegawai terdaftar ---- */
function pgCariPeg(list,v){const n=pgNorm(v);if(!n)return null;let h=list.find(p=>pgNorm(p.nama)===n||pgNorm(p.nip)===n);if(h)return h;
 const c=list.filter(p=>pgNorm(p.nama).startsWith(n)||n.startsWith(pgNorm(p.nama))||pgNorm(p.nama).includes(n));return c.length===1?c[0]:null}
function pgIsiPeg(c,list){const p=pgCariPeg(list||[],c.nip||c.nama);if(!p)return false;c.nama=p.nama;c.nip=p.nip||c.nip;c.personGrade=p.personGrade||c.personGrade;c.positionGrade=p.positionGrade||c.positionGrade;c.jabatan=p.jabatan||c.jabatan;return true}
/* ---- parser pesan WhatsApp ---- */
function pgBuild(pr,S,peg){const c=pgBlank(S),f=pr.f,st=pr.st;c.st={};
 const set=(k,v,s)=>{if(v!==undefined&&s&&s.s!=="error")c[k]=v;c.st[k]=s;if(s.s!=="ok"&&!(s.s==="missing"&&(k==="nip"||k==="lokasi")))c.flags[k]=s.m||"Perlu diisi"};
 set("nama",f.nama,st.nama);set("nip",f.nip,st.nip);set("tanggal",f.tanggal,st.tanggal);set("mulai",f.mulai,st.mulai);set("selesai",f.selesai,st.selesai);set("uraian",f.uraian,st.uraian);set("lokasi",f.lokasi,st.lokasi);
 if(f.jabatan)c.jabatan=f.jabatan;if(f.unit)c.unit=f.unit;
 const had=pgIsiPeg(c,peg);if(c.nama&&!had)c.flags.nama=c.flags.nama||"Nama belum terdaftar di tab Pegawai - NIP dan grade diisi manual";
 else if(had){delete c.flags.nama;delete c.flags.nip;if(c.nip&&(!c.st.nip||c.st.nip.s!=="ok"))c.st.nip={s:"ok",m:"Diambil dari daftar pegawai"}}
 if(c.tanggal)c.tglSurat=c.tanggal;return c}
function pgBuildAll(text,S,peg){const bl=splitBlocks(text),prs=bl.map(b=>parseWA(b)),res=prs.map(p=>pgBuild(p,S,peg));
 res.forEach((c,i)=>{if(!c.nama&&i&&res[i-1].nama){c.nama=res[i-1].nama;pgIsiPeg(c,peg);c.flags.nama="Nama diambil dari surat sebelumnya - periksa"}});
 return{surat:res,unk:prs.flatMap(p=>p.unk)}}
/* ---- nama berkas PDF ---- */
const pgAman=t=>String(t||"").replace(/[\\/:*?"<>|\u0000-\u001f]+/g," ").replace(/\s+/g," ").trim().toUpperCase();
function pgBulanTeks(list){const mk=[...new Set(list.map(c=>String(c.tanggal||"").slice(0,7)).filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort();
 return typeof rentangBulanTeks==="function"?rentangBulanTeks(mk):mk.join(" ")}
function pgNamaBerkas(list,kode){const bt=pgBulanTeks(list),base=kode==="ALL"?"PAKET LEMBUR PEGAWAI FORM 01-05":kode==="SOLO"?"PAKET LEMBUR PEGAWAI FORM 03-05":
 {F01:"FORM 01 SURAT USULAN LEMBUR",F02:"FORM 02 SURAT PERMOHONAN LEMBUR",F03:"FORM 03 SURAT PERINTAH LEMBUR",F04:"FORM 04 SURAT PERNYATAAN LEMBUR",F05:"FORM 05 LAPORAN REALISASI LEMBUR",EV:"EVIDEN LEMBUR",F08:"FORM KENDALI ANGGARAN LEMBUR"}[kode]||"LEMBUR PEGAWAI";
 let nm="";if(list.length===1&&(kode==="SOLO"||"F03F04F05EV".includes(kode))&&list[0].nama)nm=" "+pgAman(list[0].nama);
 return(base+nm+(bt?" "+bt:"")).replace(/\s+/g," ").trim()+".pdf"}
/* ================= tata letak ================= */
const PG_L=64,PG_R=531.28,PG_W=PG_R-PG_L,PG_FS=10.5,PG_LH=14.2;
function pgTools(){const it=[];return{it,
 T:(x,b,s,t,o)=>{o=o||{};it.push({k:"t",x,y:b-.905*s,s,t:String(t),b:!!o.b,i:!!o.i,u:!!o.u,a:o.a||"l"})},
 Ln:(x1,y1,x2,y2,w)=>it.push({k:"l",x1,y1,x2,y2,w:w||.7}),
 Sg:(key,nama,cx,cy,w,h)=>it.push({k:"s",key,nama,cx,cy,w:w||105,h:h||56})}}
const pgCap=t=>String(t||"");
/* blok identitas "label : nilai" (Nama, NIP, Person Grade, Position Grade, Jabatan) */
function pgIdent(T,y,c,lx,cx,vx){const r=[["Nama",c.nama],["NIP",c.nip],["Person Grade",c.personGrade],["Position Grade",c.positionGrade],["Jabatan",c.jabatan]];
 r.forEach(([l,v],i)=>{const b=y+i*PG_LH;T(lx,b,PG_FS,l);T(cx,b,PG_FS,":");T(vx,b,PG_FS,v||pgDot(20))});return y+r.length*PG_LH}
/* tabel sederhana bergaris. cols = lebar kolom; rows = [{h, c:[{l:[baris], a:"l|c|r", b:bool}]}] */
function pgGrid(tl,x0,y0,cols,rows,S){const{T,Ln}=tl;const W=cols.reduce((a,b)=>a+b,0);let y=y0;const xs=[x0];cols.forEach(w=>xs.push(xs[xs.length-1]+w));
 Ln(x0,y0,x0+W,y0,.8);
 rows.forEach(r=>{const fs=r.fs||9,lh=fs*1.2;let j=0;
  r.c.forEach((cl,j0)=>{if(j0<j)return;const sp=Math.max(1,(cl&&cl.span)||1),w=xs[j0+sp]-xs[j0];j=j0+sp;if(!cl||cl.skip)return;const n=cl.l.length,top=y+(r.h-n*lh)/2;
   cl.l.forEach((t,k)=>{const b=top+k*lh+.84*fs,a=cl.a||"l",px=a==="c"?xs[j0]+w/2:a==="r"?xs[j0]+w-4:xs[j0]+4;if(t!=="")T(px,b,fs,t,{b:cl.b||r.b,a})})});
  /* garis tegak per baris; batas di dalam sel gabungan tidak digambar */
  const skip=new Set();let q=0;r.c.forEach((cl,j0)=>{if(j0<q)return;const sp=Math.max(1,(cl&&cl.span)||1);for(let k=1;k<sp;k++)skip.add(j0+k);q=j0+sp});
  xs.forEach((x,k)=>{if(!skip.has(k))Ln(x,y,x,y+r.h,.8)});
  y+=r.h;Ln(x0,y,x0+W,y,.8)});
 return y}
/* ---- bagian tanda tangan 2 kolom (kiri/kanan) dipakai Form 03-05 ---- */
function pgSign(tl,S,y,opt){const{T,Sg}=tl,nm=v=>String(v||"").trim()?String(v).toUpperCase():"("+pgDot(22)+")";
 T(opt.cx2,y,PG_FS,opt.dateTxt,{a:"c"});
 T(opt.cx1,y+PG_LH,PG_FS,opt.l1,{a:"c"});T(opt.cx2,y+PG_LH,PG_FS,opt.r1,{a:"c"});
 const ny=y+PG_LH+58;
 T(opt.cx1,ny,PG_FS,nm(opt.ln),{a:"c",b:!!String(opt.ln||"").trim()});T(opt.cx2,ny,PG_FS,nm(opt.rn),{a:"c",b:!!String(opt.rn||"").trim()});
 T(opt.cx1,ny+PG_LH,PG_FS,opt.l2,{a:"c"});if(opt.r2)T(opt.cx2,ny+PG_LH,PG_FS,opt.r2,{a:"c"});
 Sg(opt.k1,opt.ln,opt.cx1,y+PG_LH+30,105,56);Sg(opt.k2,opt.rn,opt.cx2,y+PG_LH+30,105,56);return ny+PG_LH}
/* ---------- Form 03 ---------- */
function pgLayoutF03(c,S){S={...PG_DEF,...S};const tl=pgTools(),{T,Sg}=tl,L=PG_L;let y=72;
 T(L,y,11,"FORM 03",{b:1});T(L,y+14,11,"SURAT PERINTAH LEMBUR",{b:1});
 T(L,y+28,PG_FS,"UNIT INDUK "+S.unitInduk,{b:1});T(L,y+42,PG_FS,"UNIT PELAKSANA "+S.unitPelaksana,{b:1});T(L,y+56,PG_FS,"UNIT LAYANAN "+S.unitLayanan,{b:1});
 T(L,y+74,PG_FS,"No :",{b:1});T(L+26,y+74,PG_FS,pgNomor(c,S),{b:1});
 y+=104;const tg=c.tanggal?fmtDay(c.tanggal):"(Hari), (Tanggal) (Bulan) (Tahun)";
 spWrap("Pada hari ini, "+tg+" dengan ini menugaskan kepada:",PG_W,PG_FS,0,false).forEach((l,i)=>T(L,y+i*PG_LH,PG_FS,l));y+=PG_LH+6;
 y=pgIdent(T,y,c,L,L+96,L+108)+6;
 T(L,y,PG_FS,"Untuk melaksanakan pekerjaan lembur dengan rincian sebagai berikut:");y+=PG_LH+4;
 const cx=L+150,vx=L+162,dur=pgDur(c),zona=S.zona?" "+S.zona:"";
 const row=(l,v)=>{const ls=spWrap(v||pgDot(20),PG_R-vx,PG_FS,0,false);T(L,y,PG_FS,l);T(cx,y,PG_FS,":");ls.forEach((t,i)=>T(vx,y+i*PG_LH,PG_FS,t));y+=ls.length*PG_LH};
 row("Hari/Tanggal Pelaksanaan",c.tanggal?fmtDay(c.tanggal):"");
 row("Waktu Rencana Pelaksanaan",c.mulai&&c.selesai?"jam "+pgJam(c.mulai)+" s.d "+pgJam(c.selesai)+zona:"jam "+pgDot(8)+" s.d "+pgDot(8));
 row("Durasi Pelaksanaan",dur?dur.jam+" (jam) "+dur.menit+" (menit)":pgDot(4)+" (jam) "+pgDot(4)+" (menit)");
 row("Jenis Pekerjaan",c.jenis||S.jenisDef);row("Lokasi Pekerjaan",c.lokasi);row("Rincian Pekerjaan",c.uraian);row("Koordinator Pekerjaan",c.koordinator);
 y+=PG_LH;T(L,y,PG_FS,"Demikian surat perintah ini dibuat untuk dapat dilaksanakan sebagaimana mestinya");y+=PG_LH*2;
 pgSign(tl,S,y,{cx1:170,cx2:410,dateTxt:S.kota+", "+(pgTglSurat(c)?fmtDate(pgTglSurat(c)):pgDot(18)),l1:"Menyetujui,",r1:"Yang memberi Perintah,",ln:S.mdNama,rn:S.asmanNama,l2:S.mdJab,r2:S.asmanJab,k1:"MD",k2:"AS"});
 return tl.it}
/* ---------- Form 04 dan Form 05 ---------- */
function pgLayoutLaporan(c,S,jenis){S={...PG_DEF,...S};const tl=pgTools(),{T}=tl,L=PG_L,F5=jenis===5;let y=72;
 T(L,y,11,F5?"FORM 05":"FORM 04",{b:1});T(L,y+14,11,F5?"LAPORAN REALISASI LEMBUR":"SURAT PERNYATAAN MENYETUJUI PERINTAH LEMBUR",{b:1});y+=46;
 T(L,y,PG_FS,"Yang bertandatangan dibawah ini :");y+=PG_LH+4;y=pgIdent(T,y,c,L,L+96,L+108)+8;
 T(L,y,PG_FS,F5?"Dengan ini melaporkan dengan sebenarnya bahwa:":"Dengan ini menyatakan dengan sebenarnya bahwa:");y+=PG_LH+2;
 const nx=L+4,tx=L+22,tw=PG_R-tx,tgl=pgTglSurat(c)?fmtDate(pgTglSurat(c)):pgDot(8),no=pgNomor(c,S);
 const item=(n,t)=>{const ls=spWrap(t,tw,PG_FS,0,false);T(nx,y,PG_FS,n+".");ls.forEach((l,i)=>T(tx,y+i*PG_LH,PG_FS,l));y+=ls.length*PG_LH+2};
 const dur=F5?pgDur(c,c.realMulai||c.mulai,c.realSelesai||c.selesai):pgDur(c),jm=dur?dur.dec+" Jam .":pgDot(5)+" Jam .";
 const m1=F5?(c.realMulai||c.mulai):c.mulai,s1=F5?(c.realSelesai||c.selesai):c.selesai,wk=m1&&s1?pgJam(m1)+" s.d "+pgJam(s1):pgDot(7)+" s.d "+pgDot(7);
 if(F5){item(1,"Sebagai tindaklanjut pelaksanaan lembur sebagaimana dimaksud dalam Surat Perintah Lembur Nomor: "+no+", tanggal "+tgl+" telah melaksanakan dan menyelesaikan perintah lembur yang diberikan");
  item(2,"Realisasi waktu pelaksanaan lembur adalah pukul "+wk);item(3,"Realisasi pelaksanaan lembur sebagaimana dimaksud adalah "+jm)}
 else{item(1,"Saya bersedia untuk melaksanakan lembur sebagaimana dimaksud dalam Surat Perintah Lembur Nomor: "+no+", tanggal "+tgl+".");
  item(2,"Waktu Pekerjaan lembur adalah Pukul "+wk);item(3,"Durasi rencana pelaksanaan lembur sebagaimana dimaksud adalah "+jm)}
 item(4,"Lokasi Pekerjaan "+(c.lokasi||pgDot(7)));
 item(5,F5?"Rincian detail pekerjaan yang telah saya laksanakan adalah sebagai berikut:":"Rencana pekerjaan yang akan dilaksanakan adalah sebagai berikut:");
 let bt=F5?pgButir(c.rincianReal,c.rencana||c.uraian):pgButir(c.rencana,c.uraian);if(!bt.length)bt=[pgDot(10)];
 bt.forEach((t,i)=>{const ls=spWrap(t,tw-22,PG_FS,0,false);T(tx+2,y,PG_FS,String.fromCharCode(97+i%26)+".");ls.forEach((l,j)=>T(tx+18,y+j*PG_LH,PG_FS,l));y+=ls.length*PG_LH});
 y+=2;if(F5){item(6,"Kejadian/peristiwa penting selama melaksanakan pekerjaan "+(String(c.kejadian||"").trim()||pgDot(5)));y+=PG_LH;T(L,y,PG_FS,"Demikian Laporan ini saya buat dengan penuh tanggung jawab,")}
 else{y+=PG_LH-4;spWrap("Demikian Surat Pernyataan ini saya buat secara sadar, dengan penuh kesungguhan dan tanpa tekanan/paksaan dari pihak manapun.",PG_W,PG_FS,0,false).forEach((l,i)=>T(L,y+i*PG_LH,PG_FS,l));y+=PG_LH}
 y+=PG_LH*2;const K=F5?"F05":"F04",tg2=F5?(c.tglLaporan||c.tanggal):pgTglSurat(c);
 const ny=pgSign(tl,S,y,{cx1:170,cx2:410,dateTxt:S.kota+", "+(tg2?fmtDate(tg2):pgDot(18)),l1:F5?"Atasan Pegawai,":"Atasan Pegawai",r1:F5?"Pegawai,":"Pegawai",ln:S.asmanNama,rn:c.nama,l2:S.asmanJab,r2:"",k1:K+".AS",k2:K+".PG"});
 const y2=ny+PG_LH*1.5;tl.T(290,y2,PG_FS,"Atasan-Atasan Langsung Pegawai,",{a:"c"});
 const mdn=String(S.mdNama||"").trim();tl.T(290,y2+PG_LH+58,PG_FS,mdn?mdn.toUpperCase():"("+pgDot(22)+")",{a:"c",b:!!mdn});tl.T(290,y2+PG_LH*2+58,PG_FS,S.mdJab,{a:"c"});tl.Sg(K+".MD",S.mdNama,290,y2+PG_LH+30,105,56);
 return tl.it}
const pgLayoutF04=(c,S)=>pgLayoutLaporan(c,S,4),pgLayoutF05=(c,S)=>pgLayoutLaporan(c,S,5);
/* ---------- Form 01 (rekap per bidang/unit dan rincian pekerjaan) ---------- */
function pgRekap01(list,S){const g=[],idx={};list.forEach(c=>{const u=(c.unit||S.unitLayanan||"").trim(),r=(c.uraian||"").trim(),k=pgNorm(u)+"|"+pgNorm(r);
 if(!(k in idx)){idx[k]=g.length;g.push({u,r,d:new Set()})}if(c.tanggal)g[idx[k]].d.add(c.tanggal);else g[idx[k]].d.add("?"+g[idx[k]].d.size)});
 return g.map(x=>({u:x.u,r:x.r,hari:x.d.size}))}
function pgLayoutF01(list,S,pk){S={...PG_DEF,...S};pk=pk||{};const tl=pgTools(),{T,Sg}=tl,L=PG_L;let y=72;
 T(L,y,11,"FORM 01",{b:1});T(L,y+14,11,"SURAT USULAN PEKERJAAN LEMBUR KOREKTIF",{b:1});T(L,y+28,PG_FS,S.ptInduk,{b:1});
 T(L,y+46,PG_FS,"NOMOR:",{b:1});T(L+46,y+46,PG_FS,pk.no1||pgDot(40),{b:1});y+=76;
 T(L,y,PG_FS,"Yang bertanda tangan dibawah ini:");y+=PG_LH+2;
 [["NIP",S.mgrNip],["NAMA",S.mgrNama],["JABATAN",S.mgrJab]].forEach(([l,v],i)=>{T(L,y+i*PG_LH,PG_FS,l);T(L+70,y+i*PG_LH,PG_FS,":");T(L+80,y+i*PG_LH,PG_FS,v||"")});y+=PG_LH*3+4;
 spWrap("Dengan ini menetapkan Surat Pekerjaan Lembur sebagai dasar pengajuan lembur korektif dengan detail sebagai berikut:",PG_W,PG_FS,0,false).forEach((l,i)=>T(L,y+i*PG_LH,PG_FS,l));y+=PG_LH*2+6;
 const cols=[34,128,225,PG_W-34-128-225],rk=pgRekap01(list,S),rows=[{h:38,b:1,fs:9.5,c:[{l:["No"],a:"c"},{l:["Bidang/","Unit Pelaksana","/Unit Layanan"],a:"c"},{l:["Rincian Pekerjaan"],a:"c"},{l:["Rencana","Durasi Lembur","(Hari)"],a:"c"}]}];
 const data=rk.slice();while(data.length<3)data.push(null);
 data.forEach((r,i)=>{if(!r){rows.push({h:20,c:[{l:[i+1+""],a:"c"},{l:[""]},{l:[""]},{l:[""]}]});return}
  const a=spWrap(r.u,cols[1]-8,9.5,0,false),b=spWrap(r.r||"",cols[2]-8,9.5,0,false),n=Math.max(a.length,b.length,1);
  rows.push({h:Math.max(20,n*11.4+8),fs:9.5,c:[{l:[i+1+""],a:"c"},{l:a},{l:b},{l:[String(r.hari)],a:"c"}]})});
 const tot=rk.reduce((a,r)=>a+r.hari,0);rows.push({h:20,b:1,fs:9.5,c:[{l:["TOTAL"],a:"c",span:3},{skip:1},{skip:1},{l:[rk.length?String(tot):""],a:"c"}]});
 const yEnd=pgGrid(tl,L,y,cols,rows,S);
 y=yEnd+PG_LH+4;spWrap("Demikian surat penetapan pekerjaan lembur ini dibuat untuk dapat dilaksanakan sebagaimana mestinya",PG_W,PG_FS,0,false).forEach((l,i)=>T(L,y+i*PG_LH,PG_FS,l));y+=PG_LH*2+10;
 const tg=pk.tglAjuan||(list.find(c=>c.tanggal)||{}).tanggal||"",cx=PG_R-95;
 T(cx,y,PG_FS,S.kota+", "+(tg?fmtDate(tg):pgDot(18)),{a:"c"});T(cx,y+PG_LH,PG_FS,"Menyetujui,",{a:"c"});T(cx,y+PG_LH*2,PG_FS,S.mgrJab,{a:"c"});
 const nm=String(S.mgrNama||"").trim();T(cx,y+PG_LH*2+62,PG_FS,nm?nm.toUpperCase():"("+pgDot(22)+")",{a:"c",b:!!nm});Sg("F01.MG",S.mgrNama,cx,y+PG_LH*2+32,105,56);
 return tl.it}
/* ---------- Form 02 (tabel banyak baris, dapat lebih dari satu halaman) ---------- */
function pgLayoutF02(list,S,pk){S={...PG_DEF,...S};pk=pk||{};const pages=[],L=PG_L;
 const cols=[24,64,118,62,44,44,PG_W-24-64-118-62-44-44];const hdr=()=>({h:34,b:1,fs:8.6,c:[{l:["No"],a:"c"},{l:["NIP"],a:"c"},{l:["Nama"],a:"c"},{l:["Tanggal","Pelaksanaan"],a:"c"},{l:["Waktu","Mulai"],a:"c"},{l:["Waktu","selesai"],a:"c"},{l:["Estimasi biaya Rp"],a:"c"}]});
 const zona=S.zona||"";const rowOf=(c,i)=>({h:26,fs:8.6,c:[{l:[String(i+1)],a:"c"},{l:[c.nip||""],a:"c"},{l:spWrap(c.nama||"",cols[2]-8,8.6,0,false).slice(0,2)},{l:[pgTgl3(c.tanggal)],a:"c"},{l:[pgJam(c.mulai),zona],a:"c"},{l:[pgJam(c.selesai),zona],a:"c"},{l:[pgRp(c.biaya)],a:"c"}]});
 const uniq=a=>[...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))];
 const first=pgTools(),{T}=first;let y=72;
 const head=tl=>{const{T}=tl;T(L,72,11,"FORM 02",{b:1});T(L,86,11,"SURAT PERMOHONAN LEMBUR KOREKTIF",{b:1});T(L,100,PG_FS,S.ptInduk,{b:1});T(L,118,PG_FS,"NOMOR:",{b:1});T(L+46,118,PG_FS,pk.no2||pgDot(40),{b:1})};
 head(first);y=146;const tg=pk.tglAjuan||(list.find(c=>c.tanggal)||{}).tanggal||"";
 const f2=(l,v,yy)=>{T(L,yy,PG_FS,l);T(L+130,yy,PG_FS,":");T(L+138,yy,PG_FS,v||pgDot(60))};
 f2("Tanggal pengajuan",tg?fmtDate(tg):"",y);f2("Bidang/Unit",uniq(list.map(c=>c.unit||S.unitLayanan)).join(", "),y+PG_LH+2);
 const lk=spWrap(uniq(list.map(c=>c.lokasi)).join(", ")||pgDot(60),PG_R-L-138,PG_FS,0,false);T(L,y+(PG_LH+2)*2,PG_FS,"Lokasi pekerjaan");T(L+130,y+(PG_LH+2)*2,PG_FS,":");lk.forEach((t,i)=>T(L+138,y+(PG_LH+2)*2+i*PG_LH,PG_FS,t));
 y+=(PG_LH+2)*2+lk.length*PG_LH+4;T(L,y,PG_FS,"Jenis dan uraian pekerjaan lembur");y+=PG_LH;
 const ur=spWrap(uniq(list.map(c=>c.uraian)).join("; ")||pgDot(100),PG_W,PG_FS,0,false);ur.forEach((t,i)=>T(L,y+i*PG_LH,PG_FS,t));y+=ur.length*PG_LH+8;
 const TAIL=118,LIM=806;let cur=first,i=0,top=y;const data=list.length?list:[pgBlank(S)];
 while(true){const rows=[hdr()];let h=34;while(i<data.length&&top+h+26<=LIM-(i===data.length-1?0:0)){rows.push(rowOf(data[i],i));h+=26;i++}
  if(!rows.length||rows.length===1&&i<data.length){rows.push(rowOf(data[i],i));h+=26;i++}
  const yEnd=pgGrid(cur,L,top,cols,rows,S);
  if(i>=data.length){if(yEnd+TAIL<=LIM+30){pgTail02(cur,S,pk,yEnd+PG_LH*1.6);pages.push(cur.it);break}pages.push(cur.it);const t2=pgTools();pgTail02(t2,S,pk,80);pages.push(t2.it);break}
  pages.push(cur.it);cur=pgTools();cur.T(L,72,PG_FS,"FORM 02 (lanjutan)",{b:1});top=88}
 return pages}
function pgTail02(tl,S,pk,y){const{T,Sg}=tl,cx1=170,cx2=410,nm=v=>String(v||"").trim()?"("+String(v).toUpperCase()+")":"(........................................)";
 T(cx1,y,PG_FS,"Diajukan oleh",{a:"c"});T(cx1,y+PG_LH,PG_FS,S.asmanAjuJab,{a:"c"});T(cx2,y+PG_LH,PG_FS,"Dievaluasi oleh",{a:"c"});T(cx2,y+PG_LH*2,PG_FS,S.mgrUptJab,{a:"c"});
 const ny=y+PG_LH*2+62;T(cx1,ny,PG_FS,nm(S.asmanNama),{a:"c",b:!!S.asmanNama});T(cx2,ny,PG_FS,nm(S.mgrNama),{a:"c",b:!!S.mgrNama});
 T(cx1,ny+PG_LH,PG_FS,"NIP "+(S.asmanNip||pgDot(30)),{a:"c"});T(cx2,ny+PG_LH,PG_FS,"NIP "+(S.mgrNip||pgDot(30)),{a:"c"});
 Sg("F02.AS",S.asmanNama,cx1,y+PG_LH*2+30,105,56);Sg("F02.MG",S.mgrNama,cx2,y+PG_LH*2+30,105,56)}
/* ---------- Form Kendali Anggaran (Lampiran VIII) ---------- */
const PG_BLN_ID=["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
function pgBulanKendali(list,S){const v=S.kBulan||((list.find(c=>c.tanggal)||{}).tanggal||"").slice(0,7);const m=/^(\d{4})-(\d{2})$/.exec(v||"");return m?{n:+m[2],y:+m[1],nama:PG_BLN_ID[+m[2]-1]}:null}
function pgBarisKendali(list,S){const bk=pgBulanKendali(list,S),pagu=pgNum(S.kPagu),rows=[];let saldo=pagu;
 const bl=bk?PG_BLN_ID[(bk.n+10)%12]:"",bn=bk?PG_BLN_ID[bk.n-1]:"",tc=s=>s.charAt(0)+s.slice(1).toLowerCase();
 rows.push({tgl:pgTgl3(S.kTglPagu),ket:"Pagu anggaran lembur",nilai:"0",saldo:saldo,st:""});
 const rn=pgNum(S.kRealNilai);if(rn||S.kRealTgl||S.kRealKet){saldo-=rn;rows.push({tgl:pgTgl3(S.kRealTgl),ket:S.kRealKet||"Pembayaran Lembur Bulan "+tc(bl),nilai:pgRibu(rn),saldo,st:"Realisasi"})}
 const est=S.kEstNilai!==""&&S.kEstNilai!=null?pgNum(S.kEstNilai):list.reduce((a,c)=>a+pgNum(c.biaya),0);
 if(est||S.kEstTgl||S.kEstKet){saldo-=est;rows.push({tgl:pgTgl3(S.kEstTgl),ket:S.kEstKet||"Estimasi Pembayaran Lembur Bulan "+tc(bn),nilai:pgRibu(est),saldo,st:"Estimasi"})}
 return rows}
function pgLayoutF08(list,S,pk){S={...PG_DEF,...S};pk=pk||{};const tl=pgTools(),{T,Sg}=tl,L=PG_L;let y=84;
 T(297.64,y,12,"FORM KENDALI ANGGARAN LEMBUR",{b:1,a:"c"});y+=36;const bk=pgBulanKendali(list,S);
 T(L,y,PG_FS,"BULAN : "+(bk?bk.nama:pgDot(10)));y+=22;
 const cols=[28,74,PG_W-28-74-82-96-62,82,96,62],rows=[{h:26,b:1,fs:9.5,c:[{l:["NO"],a:"c"},{l:["TANGGAL"],a:"c"},{l:["KETERANGAN"],a:"c"},{l:["NILAI"],a:"c"},{l:["SALDO"],a:"c"},{l:[""]}]}];
 pgBarisKendali(list,S).forEach((r,i)=>rows.push({h:30,fs:9.5,c:[{l:[String(i+1)],a:"c"},{l:[r.tgl],a:"c"},{l:spWrap(r.ket,cols[2]-8,9.5,0,false)},{l:[r.nilai],a:"r"},{l:["Rp. "+pgRibu(r.saldo)],a:"r"},{l:[r.st],a:"c"}]}));
 const yEnd=pgGrid(tl,L,y,cols,rows,S);const cx=PG_R-100;let y2=yEnd+30;
 const tg=pk.tglAjuan||"";T(cx,y2,PG_FS,"Tanggal "+(tg?fmtDate(tg):pgDot(26)),{a:"c"});T(cx,y2+PG_LH,PG_FS,S.mgrUptJab.toUpperCase(),{a:"c"});
 const nm=String(S.mgrNama||"").trim();T(cx,y2+PG_LH+62,PG_FS,nm?nm.toUpperCase():pgDot(40),{a:"c",b:!!nm});Sg("F08.MG",S.mgrNama,cx,y2+PG_LH+32,105,56);
 return tl.it}
/* ---------- Eviden Lembur: halaman A4 berisi foto yang diunggah (judul di tengah) ----------
   "Foto per halaman": otomatis (susunan menyesuaikan jumlah foto, maks. 6) atau tetap 1, 2, 4, 6.
   Setiap foto punya skala 20-250 persen dari ukuran maksimal selnya (default 100) dan pergeseran dx, dy (pt); bawaannya rata tengah secara mendatar dan rata atas di selnya. Foto dapat digeser/diubah ukurannya langsung di pratinjau. */
const PG_EV_MAX=6,PG_EV_PER=["auto","1","2","4","6"];
const pgEvPer=c=>{const v=String(c.fotoPerHal||"auto");return PG_EV_PER.includes(v)?v:"auto"};
function pgLayoutEV(c,S){const all=(c.foto||[]).map((f,i)=>({f,i})).filter(o=>o.f&&o.f.src);if(!all.length)return[];const pages=[],per=pgEvPer(c),isi=per==="auto"?PG_EV_MAX:+per;
 for(let a=0;a<all.length;a+=isi){const grp=all.slice(a,a+isi),n=grp.length,tl=pgTools(),{T}=tl;
  T(297.64,86,15,"EVIDEN LEMBUR",{b:1,a:"c"});
  const cap=[c.nama,c.tanggal?fmtDate(c.tanggal):"",c.lokasi].filter(Boolean).join("  -  ");if(cap)T(297.64,104,9.5,cap,{a:"c"});
  const m=per==="auto"?n:+per,cols=m<=2?1:2,rows=m===1?1:m===2?2:m<=4?2:3,gx=16,gy=14,x0=PG_L,y0=122,W=PG_W,H=800-y0,cw=(W-gx*(cols-1))/cols,ch=(H-gy*(rows-1))/rows;
  grp.forEach((o,i)=>{const f=o.f,col=i%cols,row=Math.floor(i/cols),cx=x0+col*(cw+gx),cy=y0+row*(ch+gy),ar=(f.w>0&&f.h>0)?f.w/f.h:4/3,k=Math.min(250,Math.max(20,+f.skala||100))/100;
   let bw=cw,bh=bw/ar;if(bh>ch){bh=ch;bw=bh*ar}const w=bw*k,h=bh*k,cx0=cx+cw/2,dx=+f.dx||0,dy=+f.dy||0;
   /* x,y,w,h = posisi akhir; cx0,y0,bw,bh = ukuran dasar sel (dipakai pratinjau saat foto digeser/diubah ukurannya langsung di surat) */
   tl.it.push({k:"i",fi:o.i,src:f.src,x:cx0-w/2+dx,y:cy+dy,w,h,cx0,y0:cy,bw,bh})});
  pages.push(tl.it)}
 return pages}
/* ---------- daftar halaman menurut urutan pedoman ----------
   sel = kode form yang dipilih; urut = "form" (semua Form 03, lalu semua Form 04 ...) atau "pegawai" (Form 03,04,05 pegawai 1, dst) */
function pgPages(list,S,pk,sel,urut){S={...PG_DEF,...S};const P=[],has=k=>sel.includes(k),per=(k,fn)=>list.forEach((c,i)=>P.push({f:k,i,store:"e",items:fn(c,S)}));
 if(has("F01"))P.push({f:"F01",i:null,store:"k",items:pgLayoutF01(list,S,pk)});
 if(has("F02"))pgLayoutF02(list,S,pk).forEach((it,n)=>P.push({f:"F02",i:null,store:"k",n,items:it}));
 const fm={F03:pgLayoutF03,F04:pgLayoutF04,F05:pgLayoutF05},ks=["F03","F04","F05"].filter(has);
 const evp=(c,i)=>pgLayoutEV(c,S).forEach((it,n)=>P.push({f:"EV",i,store:"e",n,items:it}));
 if(urut==="pegawai")list.forEach((c,i)=>ks.forEach(k=>P.push({f:k,i,store:"e",items:fm[k](c,S)})));else ks.forEach(k=>per(k,fm[k]));
 if(has("F08"))P.push({f:"F08",i:null,store:"k",items:pgLayoutF08(list,S,pk)});
 if(has("EV"))list.forEach(evp);return P}
