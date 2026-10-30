"use strict";
/* Restitusi SPPD - logika murni: aturan isian otomatis/manual, tabel nominal, pencocokan lokasi, tata letak tiga surat
   (1 Remburse Lumsum / Form 3, 2 Surat Pernyataan, 3 Blangko SPPD / Lampiran VII).
   Berdiri di atas sppd-logic.js (parser WhatsApp, pegawai, tanggal) dan logic.js; tidak mengubah keduanya.
   Satu daftar elemen (pt, A4) dipakai bersama oleh pratinjau HTML dan PDF supaya keduanya selalu sama.
   Jenis elemen: t teks, l garis, rr kotak bersudut bulat, i gambar, s gambar yang bisa digeser (tanda tangan / stempel). */
const RS_DEF={uip:"UIP3B SULAWESI",upt:"UPT MAKASSAR",ultg:"ULTG PAREPARE",formNo:"FORM 3",unit:"ULTG Parepare",kotaAsal:"Parepare",pejabat:"Samsu Alam",
 almR1:"Jl. Bambu Runcing",almR2:"Kel. Bumi Harapan, Kec. Bacukiki, Kota Parepare",almP1:"Jl.Bambu Runcing.Bumi Harapan",almP2:"Bacukiki, Kota Parepare, Sulawesi Selatan, 91121",
 telp:"(0421) 24738",web:"www.pln.co.id",stempelW:85};
/* Nama lokasi contoh (dari nama berkas scan Blangko). Hanya nama dan kata kunci; stempel/tanda tangan didaftarkan pengguna. */
const RS_LOKASI_SEED=[["GI Pangkep","pangkep, pangkajene"],["GI Barru","barru"],["GI Bakaru","bakaru"],["GI Polmas","polmas, polewali, polman"],["GI Palopo","palopo"],["ULTG Maros","maros"],["GI Bantaeng","bantaeng, bantaneg"]];
const RS_LETTERS={R:"Remburse Lumsum (Form 3)",P:"Surat Pernyataan",B:"Blangko SPPD"};
const rsCtx=()=>({S:{...RS_DEF,...(typeof RSDB!=="undefined"&&RSDB.settings||{})},L:(typeof RSDB!=="undefined"&&RSDB.lokasi)||[]});
const rsShort=p=>String(p||"").replace(/^\s*(kota|kab\.?|kabupaten)\s+/i,"").trim();
const rsUp=s=>String(s||"").toUpperCase();
function rsStops(t){return String(t||"").split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean).map(x=>spTempat(x).v||x)}
function rsNum(s){s=String(s==null?"":s).replace(/,\s*-?\s*$/,"").replace(/[^\d]/g,"");return s?parseInt(s,10):0}
function rsRp(n){return n>0?String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".")+",-":""}
const rsLama=n=>n?n+" ("+spTerbilang(n)+") hari":"";
const rsRentang=(a,b)=>a&&b?fmtDate(a)+" s/d "+fmtDate(b):a?fmtDate(a):"";
function rsCariLokasi(L,nama){const n=spNorm(rsShort(nama));if(!n)return"";let best=null,bs=0;
 for(const l of L){const keys=String(l.kunci||"").split(",").concat([l.nama]).map(spNorm).filter(Boolean);
  for(const k of keys){let s=0;if(k===n)s=3;else if(Math.min(k.length,n.length)>=4&&(n.includes(k)||k.includes(n)))s=2;if(s>bs){bs=s;best=l}}}
 return best?best.id:""}
/* ---- isian: sumber (disimpan di surat) dan turunan (otomatis, bisa ditimpa manual di r.m) ---- */
const RS_AUTO={
 rNama:r=>r.personName,rTujuan:r=>[r.berangkat,...rsStops(r.tujuan)].filter(Boolean).join(" - "),rTgl:r=>rsRentang(r.tglBerangkat,r.tglKembali),rLama:r=>rsLama(spLamaOf(r)),rMaksud:r=>r.maksud,
 stB:r=>rsNum(r.amtB)?"Cash":"-",stP:r=>rsNum(r.amtP)?"Cash":"-",stH:r=>rsNum(r.amtH)?"Cash":"-",stBoard:()=>"-",stCap:()=>"Ada",stSurat:()=>"Ada",
 pNama:r=>r.personName,pNip:r=>r.nip,pJab:r=>r.jabatan,pMaksud:(r,x)=>rsGet(r,"rMaksud",x),pTglA:r=>r.tglBerangkat,pTglB:r=>r.tglKembali,
 bNama:r=>r.personName,bNip:r=>r.nip,bUnit:(r,x)=>x.S.unit,bMaksud:(r,x)=>rsGet(r,"rMaksud",x),
 bPeriode:r=>r.tglBerangkat&&r.tglKembali&&r.tglBerangkat!==r.tglKembali?rsRentang(r.tglBerangkat,r.tglKembali):r.tglBerangkat?fmtDate(r.tglBerangkat):"",
 bAsal:(r,x)=>rsShort(r.berangkat)||x.S.kotaAsal,bAsalTgl:r=>r.tglBerangkat,bPejAsal:(r,x)=>x.S.pejabat,
 bKota:(r,x)=>rsShort(r.berangkat)||x.S.kotaAsal,bKembaliTgl:r=>r.tglKembali,bPejFinal:(r,x)=>x.S.pejabat,bKet:()=>""};
[1,2,3].forEach(i=>{const st=r=>rsStops(r.tujuan);
 RS_AUTO["s"+i+"n"]=r=>rsShort(st(r)[i-1]||"");
 RS_AUTO["s"+i+"t"]=r=>st(r)[i-1]?r.tglBerangkat:"";
 RS_AUTO["s"+i+"b"]=r=>st(r)[i-1]?(i===st(r).length?r.tglKembali:r.tglBerangkat):"";
 RS_AUTO["s"+i+"l"]=(r,x)=>rsCariLokasi(x.L,rsGet(r,"s"+i+"n",x))});
function rsGet(r,k,x){const m=r.m||{};if(m[k]!==undefined)return m[k];const f=RS_AUTO[k];return f?f(r,x||rsCtx()):(r[k]==null?"":r[k])}
/* Kosong atau sama dengan nilai otomatis -> kembali otomatis; selain itu dianggap manual. */
function rsSet(r,k,v,x){if(!(k in RS_AUTO)){r[k]=v;return}r.m=r.m||{};const a=RS_AUTO[k](r,x||rsCtx());if(v===""||v===a)delete r.m[k];else r.m[k]=v}
const rsIsMan=(r,k)=>!!(r.m&&r.m[k]!==undefined);
function rsBlank(){return{id:null,personName:"",grade:"",nip:"",jabatan:"",maksud:"",berangkat:"",tujuan:"",tglBerangkat:"",tglKembali:"",lama:1,tripSap:"",amtB:"",amtP:"",amtH:"",bank:"",m:{},sigPos:{},status:"draft",flags:{}}}
/* Satu surat hasil spBuild (pesan WhatsApp yang sama dengan SPPD) -> satu data restitusi. */
function rsFromSp(c){const r=rsBlank();["personName","grade","nip","jabatan","maksud","berangkat","tujuan","tglBerangkat","tglKembali","lama"].forEach(k=>{if(c[k]!=null)r[k]=c[k]});r.flags=JSON.parse(JSON.stringify(c.flags||{}));return r}
function rsTotals(r,x){const b=rsNum(r.amtB),p=rsNum(r.amtP),h=rsNum(r.amtH);return{b,p,h,jumlah:b+p,total:b+p+h}}
function rsMissing(r,x){const m=[];[["personName","nama pegawai"],["nip","NIP"],["jabatan","jabatan"],["maksud","maksud perjalanan"],["berangkat","tempat berangkat"],["tujuan","tempat tujuan"],["tglBerangkat","tanggal berangkat"],["tglKembali","tanggal kembali"],["tripSap","Nomor Trip SAP"]].forEach(([k,l])=>{if(!String(r[k]||"").trim())m.push(l)});if(!spLamaOf(r)&&r.tglBerangkat&&r.tglKembali)m.push("rentang tanggal");return m}
/* ---- alat tata letak ---- */
function rsTools(){const it=[];return{it,
 Tb:(x,b,s,t,o)=>it.push({k:"t",x,y:b-.905*s,s,t:String(t),b:!!(o&&o.b),a:(o&&o.a)||"l",j:(o&&o.j)||0}),
 Tt:(x,y,s,t,o)=>it.push({k:"t",x,y,s,t:String(t),b:!!(o&&o.b),a:(o&&o.a)||"l",j:0}),
 Ln:(x1,y1,x2,y2,w)=>it.push({k:"l",x1,y1,x2,y2,w:w||.7}),
 Im:(src,x,y,w,h,fmt)=>{if(src)it.push({k:"i",src,x,y,w,h,fmt:fmt||"PNG"})}}}
const rsImg=k=>typeof RS_IMG!=="undefined"?RS_IMG[k]:"";
const rsSigOf=n=>n&&typeof sigLookup==="function"?sigLookup(n):"";
/* ====== 1. Remburse Lumsum (Form 3). Koordinat asli contoh (pt); isi lebih dari satu baris menggeser bagian bawah. ====== */
function rsLayoutR(r,x){x=x||rsCtx();const S=x.S,g=k=>rsGet(r,k,x),{it,Tb,Ln,Im}=rsTools(),F=10.5,LH=14.65;
 Im(rsImg("banR"),-.9,.5,594.8,78.8);
 it.push({k:"rr",x:482.2,y:2.9,w:65,h:24.6,r:7,lw:.75});Tb(514.85,19,12,S.formNo,{b:1,a:"c"});
 if(typeof RS_LOGO_BOX!=="undefined"){const q=RS_LOGO_BOX.R;Im(rsImg("logoR"),q[0],q[1],q[2],q[3])}
 Tb(549,91.3,12,S.uip,{b:1,a:"r"});Tb(549,109.5,14,S.upt,{b:1,a:"r"});Tb(549,128.2,14,S.ultg,{b:1,a:"r"});
 Tb(305.25,161.2,F,"PERNYATAAN RESTITUSI PERJALANAN DINAS",{b:1,a:"c"});Tb(56.9,190.5,F,"Saya yang bertandatangan dibawah ini :");
 let b=219.7;const V=(lab,val,w)=>{const hang=spW(": ",F),ls=spWrap(": "+(val||".........."),w||348,F,hang,0);Tb(56.9,b,F,lab);ls.forEach((t,i)=>Tb(200.9+(i?hang:0),b+i*LH,F,t));b+=Math.max(1,ls.length)*LH};
 V("Nama",g("rNama"));V("Nomor Trip SAP",r.tripSap);V("Tujuan",g("rTujuan"));V("Tgl Perjalanan",g("rTgl"));V("Lama Perjalanan",g("rLama"));V("Maksud Perjalanan",g("rMaksud"));
 const dy=b-(293.0+LH);/* pergeseran akibat baris tambahan */
 Tb(56.9,322.2+dy,F,"Dengan ini saya menyatakan bahwa data yang saya sampaikan adalah benar, sebagai berikut :");
 const tt=rsTotals(r),rowsY=[[341.8,358.4],[360.6,377.1],[379.4,395.8],[396.3,412.9],[413.4,429.9],[430.4,446.8],[447.3,463.9],[466.1,482.7]].map(a=>[a[0]+dy,a[1]+dy]),cy=i=>(rowsY[i][0]+rowsY[i][1])/2+4.55;
 const dbl=(y1,y2,xa,xb)=>{Ln(xa,y1,xb,y1,.7);Ln(xa,y2,xb,y2,.7)},T0=339.85+dy;
 dbl(T0,T0+1.5,50.4,491);dbl(483.05+dy,484.5+dy,50.4,491);dbl(464.25+dy,465.65+dy,50.4,491);
 Ln(50.75,T0,50.75,484.5+dy,.7);Ln(52.2,T0,52.2,484.5+dy,.7);Ln(489.25,T0,489.25,484.5+dy,.7);Ln(490.65,T0,490.65,484.5+dy,.7);
 Ln(150.05,rowsY[0][0],150.05,rowsY[3][0],.5);Ln(238.65,rowsY[0][0],238.65,rowsY[7][1],.5);Ln(394.65,rowsY[0][0],394.65,rowsY[7][1],.5);
 Ln(150.3,359.5+dy,488.9,359.5+dy,.5);Ln(150.3,378.25+dy,488.9,378.25+dy,.5);
 [396.05,413.15,430.15,447.05].forEach(y=>Ln(52.6,y+dy,488.9,y+dy,.5));
 const rp=(i,n,bold)=>{Tb(245.6,cy(i),F,"Rp.",{b:bold});if(n>0)Tb(300.2,cy(i),F,rsRp(n),{b:bold,a:"c"})},st=(i,k,bold)=>Tb(441.65,cy(i),F,g(k),{b:bold,a:"c"});
 Tb(101.2,cy(1),F,"Transportasi",{a:"c"});
 Tb(155.4,cy(0),F,"Tiket berangkat");rp(0,tt.b);st(0,"stB");Tb(155.4,cy(1),F,"Tiket pulang");rp(1,tt.p);st(1,"stP");
 Tb(194.35,cy(2),F,"Jumlah",{a:"c"});rp(2,tt.jumlah);
 Tb(56.9,cy(3),F,"Penginapan / hotel");rp(3,tt.h);st(3,"stH");
 Tb(56.9,cy(4),F,"Boarding pass");st(4,"stBoard");Tb(56.9,cy(5),F,"Cap / bukti sppd");st(5,"stCap",1);Tb(56.9,cy(6),F,"Surat pernyataan*)");st(6,"stSurat",1);
 Tb(145,cy(7),F,"Total",{b:1,a:"c"});rp(7,tt.total,1);
 Tb(56.9,511.4+dy,F,"Data Bank");Tb(164.9,511.4+dy,F,": "+(r.bank||""));
 Tb(92.9,569.8+dy,F,"Yang Melaksanakan");
 it.push({k:"s",key:"R.TTD",src:rsSigOf(r.personName),nama:r.personName,cx:148.2,cy:616.9+dy});
 Tb(92.9,657.7+dy,F,rsUp(g("rNama")));
 Tb(56.9,683.7+dy,8,"CATATAN :",{b:1});
 ["Menyertakan Surat Pernyataan*) yang ditandatangani oleh atasan langsung / pemberi perintah apabila :","1. Tanggal pelaksanaan SPPD tidak sesuai dengan permohonan SPPD.","2. Jadwal keberangkatan / kepulangan tidak sesuai dengan permohonan SPPD.","3. Kelas fasilitas penginapan yang tidak sesuai dengan Tarif Grade masing-masing pegawai"].forEach((t,i)=>Tb(56.9,[694.3,705,715.7,726.2][i]+dy,8,t));
 const fo=49.9;Tb(61.6,748.3+fo,8,S.almR1);Tb(61.6,759+fo,8,S.almR2);Tb(61.6,769.7+fo,8,"W",{b:1});Tb(71.8,769.7+fo,8,S.web);Tb(133.6,769.7+fo,8,"T",{b:1});Tb(138.3,769.7+fo,8," -");Tb(421.6,769.7+fo,8,"Paraf_________________________");
 return it}
/* ====== 2. Surat Pernyataan (A4). ====== */
function rsLayoutP(r,x){x=x||rsCtx();const S=x.S,g=k=>rsGet(r,k,x),{it,Tb,Ln,Im}=rsTools(),F=11,LH=14.75,L=72,W=490.2;
 Im(rsImg("banP"),3,6,566.2,68.2,"JPEG");
 if(typeof RS_LOGO_BOX!=="undefined"){const q=RS_LOGO_BOX.P;Im(rsImg("logoP"),q[0],q[1],q[2],q[3])}
 Tb(561.8,91.3,10,S.uip,{a:"r"});Tb(561.8,102.9,10,S.upt,{a:"r"});Tb(561.8,114.4,10,S.ultg,{b:1,a:"r"});
 Tb(316.95,145.2,18,"SURAT PERNYATAAN",{b:1,a:"c"});Ln(238.2,147.9,395.7,147.9,1.2);
 Tb(L,196,F,"Yang bertanda tangan di bawah ini :");
 Tb(L,220.7,F,"Nama");Tb(144,220.7,F,": "+(g("pNama")||".........."));Tb(L,245.3,F,"NIP");Tb(144,245.3,F,": "+(g("pNip")||".........."));Tb(L,272.2,F,"Jabatan");Tb(144,272.2,F,": "+(g("pJab")||".........."));
 const q="\u201C",q2="\u201D",mk=g("pMaksud")||"..........",ta=g("pTglA"),tb=g("pTglB"),tg=(ta?fmtDate(ta):"..........")+" sampai dengan "+(tb?fmtDate(tb):"..........");
 const par="Dengan ini menyatakan bahwa Invoice Restitusi Perjalanan Dinas "+q+mk+q2+", Tanggal "+tg+" yang telah dilaksanakan benar dan akurat sesuai dengan ketentuan yang berlaku dan kami bertanggung jawab atas segala akibat hukum yang timbul dari setiap informasi yang tertulis pada Invoice yang kami ajukan.";
 const ls=spWrap(par,W,F,0,0);let y=297.3;ls.forEach((t,i)=>{Tb(L,y+i*LH,F,t,{j:i<ls.length-1?W:0})});y+=(ls.length-1)*LH;
 Tb(L,y+24.6,F,"Demikian surat pernyataan ini dibuat dengan sebenarnya.");
 Tb(324.1,y+73.9,F,"Yang menyatakan,");it.push({k:"s",key:"P.TTD",src:rsSigOf(r.personName),nama:r.personName,cx:367.9,cy:y+113.1});
 Tb(324.1,y+152.1,F,rsUp(g("pNama")));
 Tb(L,762.7,9,S.almP1);Tb(L,773,9,S.almP2);Tb(L,783.3,9,"W",{b:1});Tb(82,783.3,9,S.web);Tb(148,783.3,9,"T",{b:1});Tb(155,783.3,9,S.telp);
 return it}
/* ====== 3. Blangko SPPD (Lampiran VII): latar hasil scan yang sudah dibersihkan + isian + stempel/TTD per lokasi. ====== */
const RS_BLK={y0:[74.5,217.6,340.7,463.8],dots:[188.6,311.9,435,558.1,730.4],lx:159,rx:419,lcx:197,rcx:451};
function rsStopInfo(r,i,x){const S=x.S,id=rsGet(r,"s"+i+"l",x),lok=id&&id!=="-"?x.L.find(l=>l.id===id):null;
 return{n:rsGet(r,"s"+i+"n",x),t:rsGet(r,"s"+i+"t",x),b:rsGet(r,"s"+i+"b",x),lok,pej:lok?lok.pejabat||"":"",ttd:lok?(rsSigOf(lok.pejabat)||lok.ttd||""):""}}
function rsLayoutB(r,x){x=x||rsCtx();const S=x.S,g=k=>rsGet(r,k,x),{it,Tt,Im}=rsTools(),F=10,LH=12.3,Y=RS_BLK,d=iso=>iso?fmtDate(iso):"";
 Im(rsImg("blk"),0,0,595.28,841.89);
 const asal=g("bAsal"),stops=[1,2,3].map(i=>rsStopInfo(r,i,x)).filter(s=>s.n);
 /* kiri atas: identitas */
 [["Nama",80],["NIP",104.2],["Unit",128.4],["Maksud",152.6]].forEach(([l,y])=>{Tt(42,y,F,l);Tt(109.5,y,F,":")});
 Tt(134,80,F,g("bNama"));Tt(134,104.2,F,g("bNip"));Tt(134,128.4,F,g("bUnit"));
 const mk=spWrap(g("bMaksud"),150,F,0,0);mk.forEach((t,i)=>Tt(134,152.6+i*LH,F,t));const py=152.6+Math.max(2,mk.length)*LH+1;
 Tt(42,py,F,"Periode");Tt(109.5,py,F,":");spWrap(g("bPeriode"),150,F,0,0).forEach((t,i)=>Tt(134,py+i*LH,F,t));
 /* blok I: berangkat dari tempat kedudukan */
 const a0=Y.y0[0],ke1=stops[0]?stops[0].n:"";
 Tt(Y.rx,a0+14,F,asal);Tt(Y.rx,a0+48.6,F,d(g("bAsalTgl")));Tt(Y.rx,a0+65.8,F,ke1);
 const pa=g("bPejAsal");Tt(Y.rx,Y.dots[0]-9.6,F,rsUp(pa));
 const sa=S.stempelAsal;if(sa)it.push({k:"s",key:"A.cap",src:sa,cx:Y.rcx,cy:a0+62,w:S.stempelW||85,h:(S.stempelW||85)/(S.stempelAr||1),ex:1});
 it.push({k:"s",key:"A.ttd",src:rsSigOf(pa),nama:pa,cx:Y.rcx,cy:Y.dots[0]-30});
 /* blok II-IV: satu per pemberhentian */
 stops.forEach((s,k)=>{const y0=Y.y0[k+1],nxt=stops[k+1]?stops[k+1].n:asal;
  Tt(Y.lx,y0+12.6,F,s.n);Tt(Y.lx,y0+30.3,F,d(s.t));
  Tt(Y.rx,y0+13.3,F,s.n);Tt(Y.rx,y0+30.4,F,nxt);Tt(Y.rx,y0+47.5,F,d(s.b));
  if(s.pej){Tt(Y.lx,Y.dots[k+1]-9.6,F,rsUp(s.pej));Tt(Y.rx,Y.dots[k+1]-9.6,F,rsUp(s.pej))}
  const lok=s.lok,w=lok?(+lok.stW||S.stempelW||85):0;
  [["L",Y.lcx],["R",Y.rcx]].forEach(([sd,cx])=>{
   if(lok&&lok.stempel)it.push({k:"s",key:"S"+k+sd+".cap",src:lok.stempel,cx,cy:y0+51,w,h:w/(+lok.stAr||1),ex:1});
   if(lok)it.push({k:"s",key:"S"+k+sd+".ttd",src:s.ttd,nama:s.pej,cx,cy:y0+62})})});
 /* tiba kembali + keterangan */
 Tt(119.5,596.5,F,g("bKota")+" tgl. "+d(g("bKembaliTgl")));
 const kt=spWrap(g("bKet"),160,F,0,0);if(g("bKet"))kt.forEach((t,i)=>Tt(Y.rx,596.5+i*LH,F,t));
 const pf=g("bPejFinal");Tt(149,Y.dots[4]-10,F,rsUp(pf));{const sa2=S.stempelAsal,w2=S.stempelW||85;if(sa2)it.push({k:"s",key:"F.cap",src:sa2,cx:200,cy:Y.dots[4]-30,w:w2,h:w2/(S.stempelAr||1),ex:1})}
 it.push({k:"s",key:"F.ttd",src:rsSigOf(pf),nama:pf,cx:200,cy:Y.dots[4]-28});
 return it}
const rsLayout=(r,l,x)=>l==="R"?rsLayoutR(r,x):l==="P"?rsLayoutP(r,x):rsLayoutB(r,x);
