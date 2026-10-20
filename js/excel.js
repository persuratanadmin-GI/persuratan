"use strict";
/* Integrasi Excel: mencatat surat lembur ke daftar lembur bulanan (format DAFTAR LEMBUR PEMELIHARAAN).
   Hanya bergantung pada ExcelJS (vendor/exceljs.min.js). Tidak menyentuh antarmuka; antarmukanya ada di excel-ui.js.
   Cara kerja: sheet bulan dibaca menjadi model (orang -> baris lembur), surat baru digabungkan (duplikat dilewati,
   baris diurutkan dan dinomori ulang), lalu sheet bulan ditulis ulang utuh dengan gaya yang sama seperti contoh.
   Sheet bulan lain dan gambar tanda tangan di blok pengesahan dipertahankan. */
const XL={
 BULAN:["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"],
 FMT_TGL:'[$-F800]dddd\\,\\ mmmm\\ dd\\,\\ yyyy',
 LEBAR:[4.6,12.7,17.3,13.1,15,11.7,9,9,8.43,8.43,8],
 SLOT:[[1,2],[3,4],[5,7],[8,11]],          /* kolom blok pengesahan: Manager, TL Protek, TL GI, TL HAR JAR */
 JUDUL:"DAFTAR LEMBUR PEMELIHARAAN (TENAGA ALIH DAYA) UPT MAKASSAR",UNIT:"ULTG PAREPARE"
};
const xlP2=n=>String(n).padStart(2,"0");
const xlSat=["nol","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
function xlTerbilang(n){n=Math.floor(n);if(n<12)return xlSat[n];if(n<20)return xlTerbilang(n-10)+" belas";
 if(n<100)return xlSat[Math.floor(n/10)]+" puluh"+(n%10?" "+xlSat[n%10]:"");
 if(n<200)return "seratus"+(n%100?" "+xlTerbilang(n%100):"");
 if(n<1000)return xlSat[Math.floor(n/100)]+" ratus"+(n%100?" "+xlTerbilang(n%100):"");
 return String(n)}
/* Total lembur mengikuti kebiasaan di Excel contoh: jam.menit (4 jam 45 menit = 4.45) + teks terbilang. */
function xlTotal(menit){const h=Math.floor(menit/60),m=menit%60,cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
 return{nilai:+(h+m/100).toFixed(2),teks:m?cap(xlTerbilang(h)+" koma "+xlTerbilang(m)+" menit"):cap(xlTerbilang(h)+" jam")}}
const xlToMin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||"");return m?+m[1]*60+ +m[2]:null};
function xlMenit(masuk,pulang){const a=xlToMin(masuk),b=xlToMin(pulang);return a==null||b==null?0:(b-a+1440)%1440}
function xlBulanLabel(mk){return XL.BULAN[+mk.slice(5,7)-1]+" "+mk.slice(0,4)}
function xlTglTtdTeks(opt){return opt.tglTtd?xlTglIndo(opt.tglTtd.slice(0,7),+opt.tglTtd.slice(8,10)):xlTglIndo(opt.mk,opt.hari||xlHariTerakhir(opt.mk))}
function xlHariTerakhir(mk){return new Date(+mk.slice(0,4),+mk.slice(5,7),0).getDate()}
function xlTglIndo(mk,d){const n=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];return d+" "+n[+mk.slice(5,7)-1]+" "+mk.slice(0,4)}

/* ---- pencocokan nama (surat vs Excel) ---- */
function xlNorm(s){return String(s||"").toUpperCase().replace(/[^A-Z ]/g," ").replace(/\b(MUH|MUHAMMAD|MHD|M)\b/g," ").replace(/\s+/g," ").trim()}
function xlSkorNama(a,b){const x=xlNorm(a),y=xlNorm(b);if(!x||!y)return 0;if(x===y)return 3;
 const tx=x.split(" "),ty=y.split(" "),sama=tx.filter(t=>ty.includes(t)).length;
 if(sama&&sama===Math.min(tx.length,ty.length))return 2;return sama>=2?1:0}
function xlCariNama(nama,daftar){let best=null,sk=0;for(const d of daftar){const s=xlSkorNama(nama,d);if(s>sk){sk=s;best=d}}return sk>=2?best:null}

/* ---- membaca sheet ---- */
function xlText(c){let v=c&&c.value;if(v==null)return"";if(v instanceof Date)return"";
 if(typeof v==="object"){if(v.richText)return v.richText.map(t=>t.text).join("");if(v.result!=null&&!(v.result instanceof Date))return String(v.result);if(v.text)return String(v.text);return""}
 return String(v)}
function xlIso(v){if(v&&typeof v==="object"&&"result" in v)v=v.result;let d=null;
 if(v instanceof Date)d=v;else if(typeof v==="number"&&v>20000)d=new Date(Math.round((v-25569)*86400000));
 else if(typeof v==="string"){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v);if(m)return m[1]+"-"+m[2]+"-"+m[3]}
 return d?d.getUTCFullYear()+"-"+xlP2(d.getUTCMonth()+1)+"-"+xlP2(d.getUTCDate()):null}
function xlJam(v){if(v==null||v==="")return null;if(typeof v==="object"&&"result" in v)v=v.result;let m=null;
 if(v instanceof Date)m=Math.round(v.getUTCHours()*60+v.getUTCMinutes()+v.getUTCSeconds()/60+v.getUTCMilliseconds()/60000);
 else if(typeof v==="number")m=Math.round((v%1)*1440);
 else{const r=/(\d{1,2})\s*[.:]\s*(\d{2})/.exec(String(v));if(r&&+r[1]<24&&+r[2]<60)m=+r[1]*60+ +r[2]}
 if(m==null)return null;m=((m%1440)+1440)%1440;return xlP2(Math.floor(m/60))+":"+xlP2(m%60)}
function xlSheetBulan(ws){for(let r=1;r<=6;r++)for(let c=1;c<=12;c++){const m=/BULAN\s+([A-Za-z]+)\s+(\d{4})/i.exec(xlText(ws.getCell(r,c)));
  if(m){const i=XL.BULAN.indexOf(m[1].toUpperCase());if(i>=0)return m[2]+"-"+xlP2(i+1)}}return null}
/* ExcelJS menggeser waktu sekitar 1 ms saat membaca/menulis sehingga 12:30 bisa tampil 12:29. Bulatkan ke menit dan tambah 0,5 detik
   (tidak terlihat pada format jam:menit) agar sheet yang tidak disentuh tampil sama seperti aslinya. */
const xlEps=500;
function xlRapikanWaktu(wb){wb.worksheets.forEach(ws=>ws.eachRow({includeEmpty:false},row=>row.eachCell({includeEmpty:false},c=>{
 const v=c.value;if(v instanceof Date&&v.getUTCFullYear()<1910){c.value=new Date(Math.round(v.getTime()/60000)*60000+xlEps)}
 else if(v&&typeof v==="object"&&v.result instanceof Date&&v.result.getUTCFullYear()<1910){c.value={...v,result:new Date(Math.round(v.result.getTime()/60000)*60000+xlEps)}}})))}
function xlParse(ws){
 const out={bulan:xlSheetBulan(ws),judul:xlText(ws.getCell("C2")).trim(),unit:xlText(ws.getCell("C3")).trim(),people:[],blockStart:null,lewat:0};
 let hdr=0;for(let r=1;r<=15&&!hdr;r++)if(xlText(ws.getCell(r,1)).trim().toUpperCase()==="NO")hdr=r;
 if(!hdr)return out;
 let cur=null,last=hdr;
 for(let r=hdr+1;r<=ws.rowCount;r++){
  const at=xlText(ws.getCell(r,1)).trim(),a=ws.getCell(r,1).value;
  const rest=[2,4,5,6,7,8,9,10,11].some(c=>{const k=ws.getCell(r,c);if(k.isMerged&&k.master!==k)return false;return k.value instanceof Date||xlText(k).trim()!==""});
  if(/^jumlah/i.test(at)){cur=null;last=r;continue}
  if(typeof a==="number"||/^\d+$/.test(at)){
   const iso=xlIso(ws.getCell(r,2).value);if(!iso){out.lewat++;last=r;continue}
   if(!cur){cur={name:"(tanpa nama)",entries:[]};out.people.push(cur)}
   cur.entries.push({iso,masuk:xlJam(ws.getCell(r,4).value),pulang:xlJam(ws.getCell(r,5).value),ket:xlText(ws.getCell(r,7)).trim()});last=r;continue}
  if(at&&!rest){cur={name:at,entries:[]};out.people.push(cur);last=r;continue}
  if(!at&&!rest)continue;
  break}
 out.blockStart=last+1;return out}

/* ---- menggabungkan surat baru ke model ---- */
function xlMerge(model,baru){let ditambah=0,dilewati=0;const orangBaru=[];
 for(const e of baru){let p=model.people.find(x=>xlNorm(x.name)===xlNorm(e.nama)&&x.name.trim().toUpperCase()===e.nama.trim().toUpperCase())||model.people.find(x=>x.name.trim().toUpperCase()===e.nama.trim().toUpperCase());
  if(!p){p={name:e.nama.trim(),entries:[]};model.people.push(p);orangBaru.push(p.name)}
  if(p.entries.some(x=>x.iso===e.iso&&x.masuk===e.masuk&&x.pulang===e.pulang)){dilewati++;continue}
  p.entries.push({iso:e.iso,masuk:e.masuk,pulang:e.pulang,ket:e.ket});ditambah++}
 model.people.forEach(p=>p.entries.sort((a,b)=>(a.iso+(a.masuk||"")).localeCompare(b.iso+(b.masuk||""))));
 return{ditambah,dilewati,orangBaru}}
function xlRingkas(model){return model.people.map(p=>{const m=p.entries.reduce((s,e)=>s+xlMenit(e.masuk,e.pulang),0);return{nama:p.name,n:p.entries.length,menit:m,total:xlTotal(m)}})}

/* ---- menulis sheet ---- */
const xlHuruf={name:"Arial",size:10};
const xlTipis={style:"thin"};const xlKotak={top:xlTipis,left:xlTipis,bottom:xlTipis,right:xlTipis};
function xlTangkapBlok(ws,start){
 const rows=[];for(let r=start;r<=ws.rowCount;r++){const row=ws.getRow(r),cells=[];
  row.eachCell({includeEmpty:false},(c,col)=>{if(c.master&&c.master!==c)return;cells.push({col,v:c.value,font:c.font,alignment:c.alignment,border:c.border,numFmt:c.numFmt,fill:c.fill})});
  rows.push({r:r-start,h:row.height,cells})}
 const merges=(ws.model.merges||[]).map(m=>{const [a,b]=m.split(":"),pa=ws.getCell(a),pb=ws.getCell(b);return{r1:pa.row,c1:pa.col,r2:pb.row,c2:pb.col}}).filter(m=>m.r1>=start).map(m=>({...m,r1:m.r1-start,r2:m.r2-start}));
 /* Gambar bisa berjangkar dua sel (tl+br, dari Excel) atau satu sel + ukuran (tl+ext, dibuat aplikasi ini); keduanya dipertahankan. */
 const gambar=ws.getImages().filter(i=>i.range.tl.row>=start-1&&(i.range.br||i.range.ext)).map(i=>({id:i.imageId,tl:{col:i.range.tl.col,row:i.range.tl.row-(start-1)},br:i.range.br?{col:i.range.br.col,row:i.range.br.row-(start-1)}:null,ext:i.range.br?null:{width:i.range.ext.width,height:i.range.ext.height},editAs:i.range.editAs}));
 return{rows,merges,gambar,ada:rows.some(x=>x.cells.length)||gambar.length>0}}
function xlTulisBlok(ws,blok,start){
 blok.rows.forEach(rw=>{const row=ws.getRow(start+rw.r);if(rw.h)row.height=rw.h;
  rw.cells.forEach(c=>{const x=ws.getCell(start+rw.r,c.col);x.value=c.v;if(c.font)x.font=c.font;if(c.alignment)x.alignment=c.alignment;if(c.border)x.border=c.border;if(c.numFmt)x.numFmt=c.numFmt;if(c.fill)x.fill=c.fill})});
 blok.merges.forEach(m=>ws.mergeCells(start+m.r1,m.c1,start+m.r2,m.c2));
 blok.gambar.forEach(g=>ws.addImage(Number(g.id),g.br?{tl:{col:g.tl.col,row:g.tl.row+start-1},br:{col:g.br.col,row:g.br.row+start-1},editAs:g.editAs||"oneCell"}:{tl:{col:g.tl.col,row:g.tl.row+start-1},ext:g.ext,editAs:g.editAs||"oneCell"}))}
/* Gambar tanda tangan pada sheet acuan yang masih milik orang yang sama (nama di kolom itu = nama pengesah sekarang). */
function xlGambarRef(ref,slot){
 if(!ref||!ref.model.blockStart)return[];const ws=ref.ws,start=ref.model.blockStart,awal=XL.SLOT.map(s=>s[0]);
 const teks=(r,c)=>{const v=ws.getCell(r,c);return v.isMerged&&v.master!==v?"":xlText(v).trim()};
 const lbl=slot.map(t=>xlNorm(t&&t.label));let namaRow=0;
 for(let r=start;r<=ws.rowCount;r++){const ada=awal.filter(c=>teks(r,c)).length;if(ada>=3&&awal.filter(c=>lbl.includes(xlNorm(teks(r,c)))).length<2)namaRow=r}
 if(!namaRow)return[];
 const lebarPx=c=>((ws.getColumn(c).width)||8.43)*7+5,tinggiPx=r=>((ws.getRow(r).height)||15)*96/72;
 const px=(f,uk)=>{let t=0,n=Math.floor(f);for(let k=0;k<n;k++)t+=uk(k+1);return t+(f-n)*uk(n+1)};
 const out=[];
 ws.getImages().filter(g=>g.range.tl.row>=start-1).forEach(g=>{
  const mid=(g.range.tl.col+g.range.br.col)/2,i=XL.SLOT.findIndex(s=>mid>=s[0]-1&&mid<s[1]);if(i<0||!slot[i]||!slot[i].nama)return;
  if(teks(namaRow,awal[i]).toUpperCase()!==String(slot[i].nama).trim().toUpperCase())return;
  const t=g.range.tl,b=g.range.br;
  out.push({i,id:g.imageId,col:t.col,lebar:Math.round(px(b.col,lebarPx)-px(t.col,lebarPx)),tinggi:Math.round(px(b.row,tinggiPx)-px(t.row,tinggiPx)),jarak:px(namaRow-1,tinggiPx)-px(b.row,tinggiPx)})});
 return out}
/* Blok pengesahan lengkap seperti contoh: Mengetahui + tanggal, jabatan, ruang tanda tangan (gambar), nama. */
function xlBlokBaru(wb,ws,start,opt){
 const tengah={horizontal:"center",vertical:"middle"},bar=(r,c1,c2,txt,font)=>{ws.mergeCells(r,c1,r,c2);const x=ws.getCell(r,c1);x.value=txt;x.font=font||xlHuruf;x.alignment=tengah};
 const slot=opt.slot||[],mk=opt.mk;
 ws.getRow(start).height=15;
 bar(start+1,1,2,"Mengetahui");bar(start+1,8,11,(opt.kota||"Parepare")+", "+xlTglTtdTeks({...opt,mk}));
 XL.SLOT.forEach((s,i)=>{bar(start+2,s[0],s[1],(slot[i]&&slot[i].label)||"");bar(start+7,s[0],s[1],(slot[i]&&slot[i].nama)||"")});
 for(let r=start+3;r<=start+6;r++)ws.getRow(r).height=24;
 const H=[20,20,20,32,32,32,32],ref=opt.refGambar||[];   /* tinggi baris blok dalam piksel: sampai tepi atas baris nama */
 const posisi=y=>{let k=0;while(k<H.length-1&&y>=H[k]){y-=H[k];k++}return start-1+k+Math.max(0,y)/H[k]};
 XL.SLOT.forEach((s,i)=>{const r=ref.find(x=>x.i===i);
  if(r){const top=Math.max(0,188-r.jarak-r.tinggi);ws.addImage(Number(r.id),{tl:{col:r.col,row:posisi(top)},ext:{width:r.lebar,height:r.tinggi},editAs:"oneCell"});return}
  const g=slot[i]&&slot[i].gambar;if(!g)return;
  const id=wb.addImage({base64:g.base64,extension:g.ext||"png"}),tinggi=Math.min(92,g.h),lebar=Math.round(g.w*tinggi/g.h);
  ws.addImage(id,{tl:{col:s[0]-1+0.15,row:start+3-0.9},ext:{width:lebar,height:tinggi},editAs:"oneCell"})})}
function xlTulisSheet(wb,lama,nama,model,opt){
 let blok=null,lebar=XL.LEBAR,judul=model.judul||opt.judul||XL.JUDUL,unit=model.unit||opt.unit||XL.UNIT,urut=null,page=null;
 /* sheet yang sudah ada: blok pengesahannya dipertahankan. Sheet baru: judul, lebar kolom, dan pengaturan cetak meniru sheet bulan terdekat */
 const sumber=lama||(opt.ref&&opt.ref.ws);
 if(sumber){if(lama&&model.blockStart)blok=xlTangkapBlok(lama,model.blockStart);lebar=XL.LEBAR.map((w,i)=>(sumber.getColumn(i+1).width)||w);page=sumber.pageSetup;
  if(!lama){judul=opt.ref.model.judul||judul;unit=opt.ref.model.unit||unit}
  else{urut=lama.orderNo;wb.removeWorksheet(lama.id)}}
 const ws=wb.addWorksheet(nama,{pageSetup:page&&page.margins?{...page}:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.7,right:.7,top:.75,bottom:.75,header:.3,footer:.3}}});
 if(urut!=null)ws.orderNo=urut;
 lebar.forEach((w,i)=>ws.getColumn(i+1).width=w);
 const tengah={horizontal:"center",vertical:"middle",wrapText:true},tebal={...xlHuruf,bold:true};
 [[2,judul],[3,unit],[4,"BULAN "+xlBulanLabel(model.bulan)]].forEach(([r,t])=>{ws.mergeCells(r,3,r,10);const x=ws.getCell(r,3);x.value=t;x.font=tebal;x.alignment=tengah});
 const kotak=(r,from=1,to=11)=>{for(let c=from;c<=to;c++){const x=ws.getCell(r,c);x.border=xlKotak;if(!x.font||x.font.name!=="Arial")x.font=xlHuruf}};
 const set=(r,c,v,o={})=>{const x=ws.getCell(r,c);x.value=v;x.font=o.bold?tebal:xlHuruf;x.alignment={horizontal:"center",vertical:"middle",wrapText:!!o.wrap};if(o.fmt)x.numFmt=o.fmt;return x};
 kotak(6);ws.mergeCells(6,2,6,3);ws.mergeCells(6,7,6,11);
 [["NO",1],["HARI & TANGGAL",2],["JAM MASUK",4],["JAM PULANG",5],["LEMBUR",6],["KETERANGAN",7]].forEach(([t,c])=>set(6,c,t,{bold:1}));
 let r=7;
 for(const p of model.people){
  kotak(r);ws.mergeCells(r,1,r,3);ws.mergeCells(r,7,r,11);set(r,1,p.name,{bold:1});ws.getRow(r).height=21;r++;
  const awal=r;
  p.entries.forEach((e,i)=>{kotak(r);ws.mergeCells(r,2,r,3);ws.mergeCells(r,7,r,11);
   set(r,1,i+1);const [y,mo,d]=e.iso.split("-").map(Number);set(r,2,new Date(Date.UTC(y,mo-1,d)),{fmt:XL.FMT_TGL,wrap:1});
   const a=xlToMin(e.masuk),b=xlToMin(e.pulang);
   set(r,4,a==null?(e.masuk||""):(a*60+xlEps/1000)/86400,{fmt:"h:mm"});set(r,5,b==null?(e.pulang||""):(b*60+xlEps/1000)/86400,{fmt:"h:mm"});
   set(r,6,{formula:`IFERROR((ROUND(MOD(E${r}-D${r},1)*1440,0)+0.01)/1440,0)`,result:(xlMenit(e.masuk,e.pulang)+0.01)/1440},{fmt:"h:mm"});
   set(r,7,e.ket||"",{wrap:1});const baris=Math.max(1,Math.ceil((e.ket||"").length/44));ws.getRow(r).height=Math.max(24,14*baris+8);r++});
  const akhir=r-1,tot=xlTotal(p.entries.reduce((s,e)=>s+xlMenit(e.masuk,e.pulang),0));
  kotak(r);ws.mergeCells(r,1,r,5);ws.mergeCells(r,7,r,11);set(r,1,"Jumlah Jam Lembur",{bold:1});
  if(p.entries.length){const sum=`SUM(F${awal}:F${akhir})*1440`;set(r,6,{formula:`INT(ROUND(${sum},0)/60)+MOD(ROUND(${sum},0),60)/100`,result:tot.nilai},{bold:1,fmt:"0.00"})}
  else set(r,6,0,{bold:1,fmt:"0.00"});
  set(r,7,tot.teks,{bold:1});ws.getRow(r).height=26;r++}
 if(blok&&blok.ada)xlTulisBlok(ws,blok,r);else xlBlokBaru(wb,ws,r,opt);
 return ws}
function xlNamaUnik(wb,nama){let n=nama.slice(0,31),i=2;while(wb.getWorksheet(n))n=(nama.slice(0,28)+" ("+i++ +")");return n}

/* ---- rencana & penerapan ---- */
function xlRencana(wb,entries){const per={};entries.forEach(e=>(per[e.iso.slice(0,7)]=per[e.iso.slice(0,7)]||[]).push(e));
 return Object.keys(per).sort().map(mk=>{const lama=wb&&wb.worksheets.find(w=>xlSheetBulan(w)===mk);
  const model=lama?xlParse(lama):{bulan:mk,people:[],blockStart:null};const sebelum=model.people.map(p=>p.name);
  const st=xlMerge(model,per[mk]);return{mk,sheet:lama?lama.name:null,baru:!lama,sebelum,...st,ringkas:xlRingkas(model)}})}
function xlRujukan(wb,mk){const ada=wb.worksheets.filter(w=>xlSheetBulan(w)).map(w=>({w,k:xlSheetBulan(w)}));
 const pilih=ada.filter(a=>a.k<=mk).sort((a,b)=>b.k.localeCompare(a.k))[0]||ada.sort((a,b)=>a.k.localeCompare(b.k))[0];
 return pilih?{ws:pilih.w,model:xlParse(pilih.w)}:null}
function xlTerapkan(wb,entries,opt){const per={};entries.forEach(e=>(per[e.iso.slice(0,7)]=per[e.iso.slice(0,7)]||[]).push(e));
 xlRapikanWaktu(wb);const laporan=[];
 for(const mk of Object.keys(per).sort()){const lama=wb.worksheets.find(w=>xlSheetBulan(w)===mk);
  const model=lama?xlParse(lama):{bulan:mk,people:[],blockStart:null};model.bulan=mk;
  const st=xlMerge(model,per[mk]);const nama=lama?lama.name:xlNamaUnik(wb,xlBulanLabel(mk));
  const ref=lama?null:xlRujukan(wb,mk);xlTulisSheet(wb,lama,nama,model,{...opt,mk,ref,refGambar:ref?xlGambarRef(ref,opt.slot||[]):[]});laporan.push({mk,sheet:nama,baru:!lama,...st,ringkas:xlRingkas(model)})}
 return laporan}
