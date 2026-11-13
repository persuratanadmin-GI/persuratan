"use strict";
/* Excel Lembur Driver: mencatat lembur driver ke "Absensi Lembur Driver ULTG Parepare.xlsx" (DAFTAR HADIR LEMBUR TENAGA ALIH DAYA DRIVER).
   Format contoh: SATU SHEET PER DRIVER (NAMA, BULAN, tabel NO / HARI / TANGGAL / JAM MASUK / JAM PULANG / LEMBUR / KETERANGAN,
   JUMLAH JAM LEMBUR, lalu blok pengesahan 4 kolom). Berbeda dengan daftar HAR (satu sheet per bulan), tetapi aturannya sama:
   baris yang sama tidak dimasukkan dua kali, baris diurutkan menurut tanggal, total jam ditulis jam.menit beserta terbilang,
   sheet yang diperbarui ditulis ulang dengan gaya yang sama dan blok pengesahannya dipertahankan.
   Bergantung pada excel.js (xlNorm, xlSkorNama, xlText, xlIso, xlJam, xlTotal, xlMenit, xlTangkapBlok, xlTulisBlok, ...) dan ExcelJS.
   Aturan sheet: sheet driver dicari menurut nama (isi sel NAMA atau nama sheet) dan bulan (sel BULAN; kosong = belum dipakai, boleh diisi).
   Bila driver sudah punya sheet untuk bulan lain, dibuat sheet baru "NAMA BULAN TAHUN". Tabel minimal 10 baris, bertambah bila lebih. */
const DX={
 LEBAR:[4.27,13.73,17.45,14.27,12.18,12.73,43.82],
 SLOT:[[1,2],[3,4],[5,6],[7,7]],            /* kolom blok pengesahan: Manajer, TL Protek, TL GI, TL HAR JAR */
 MIN:10,JUDUL:"DAFTAR HADIR LEMBUR TENAGA ALIH DAYA DRIVER ULTG PAREPARE",
 FMT_TGL:"[$-421]dd\\ mmmm\\ yyyy",HARI:["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"],
 PAGE:{paperSize:9,orientation:"portrait",scale:80,margins:{left:.38,right:.2362,top:.748,bottom:.748,header:.315,footer:.315}}
};
const dxCalibri={name:"Calibri",size:11},dxArial={name:"Arial",size:10};
const dxTipis={style:"thin"},dxKotak={top:dxTipis,left:dxTipis,bottom:dxTipis,right:dxTipis};

/* ---- membaca sheet ---- */
function dxHdr(ws){for(let r=1;r<=12;r++)if(xlText(ws.getCell(r,1)).trim().toUpperCase()==="NO"&&xlText(ws.getCell(r,2)).trim().toUpperCase()==="HARI")return r;return 0}
const dxIsDriver=ws=>!!dxHdr(ws);
function dxNamaCell(ws){return xlText(ws.getCell("C4")).replace(/^[\s:]+/,"").replace(/\s+/g," ").trim()}
function dxBulanCell(ws){const m=/([A-Za-z]+)\s+(\d{4})/.exec(xlText(ws.getCell("C5")));if(!m)return null;const i=XL.BULAN.indexOf(m[1].toUpperCase());return i<0?null:m[2]+"-"+xlP2(i+1)}
function dxTglTeks(s){s=String(s||"").trim();let m=/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
 if(m){const i=XL.BULAN.indexOf(m[2].toUpperCase());if(i>=0)return m[3]+"-"+xlP2(i+1)+"-"+xlP2(+m[1])}
 m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);if(m)return m[3]+"-"+xlP2(+m[2])+"-"+xlP2(+m[1]);return null}
const dxIsoCell=c=>xlIso(c.value)||dxTglTeks(xlText(c));
function dxParse(ws){
 const out={nama:dxNamaCell(ws),bulan:dxBulanCell(ws),judul:xlText(ws.getCell("A2")).trim(),entries:[],blockStart:null,lewat:0,hdr:dxHdr(ws)};
 if(!out.hdr)return out;let last=out.hdr+1;
 for(let r=out.hdr+1;r<=ws.rowCount;r++){
  const a=ws.getCell(r,1),at=xlText(a).trim();
  if(/^jumlah/i.test(at)){last=r;break}
  if(typeof a.value==="number"||/^\d+$/.test(at)){last=r;
   const iso=dxIsoCell(ws.getCell(r,3));
   if(!iso){if([4,5,7].some(c=>xlText(ws.getCell(r,c)).trim()!==""))out.lewat++;continue}
   out.entries.push({iso,masuk:xlJam(ws.getCell(r,4).value),pulang:xlJam(ws.getCell(r,5).value),ket:xlText(ws.getCell(r,7)).trim()})}}
 out.blockStart=last+1;return out}

/* ---- menggabungkan entri baru ke satu sheet ---- */
function dxMerge(model,baru){let ditambah=0,dilewati=0;
 for(const e of baru){if(model.entries.some(x=>x.iso===e.iso&&x.masuk===e.masuk&&x.pulang===e.pulang)){dilewati++;continue}
  model.entries.push({iso:e.iso,masuk:e.masuk,pulang:e.pulang,ket:e.ket});ditambah++}
 model.entries.sort((a,b)=>(a.iso+(a.masuk||"")).localeCompare(b.iso+(b.masuk||"")));
 return{ditambah,dilewati}}
function dxRingkas(model){const m=model.entries.reduce((s,e)=>s+xlMenit(e.masuk,e.pulang),0);return{n:model.entries.length,menit:m,total:xlTotal(m)}}

/* ---- mencari sheet ---- */
const dxSheets=wb=>wb?wb.worksheets.filter(dxIsDriver):[];
const dxNamaSheet=ws=>[dxNamaCell(ws),ws.name].filter(Boolean);
function dxCariSheet(wb,nama,mk){let best=null,bs=0;
 for(const ws of dxSheets(wb)){const skor=Math.max(0,...dxNamaSheet(ws).map(c=>xlSkorNama(nama,c)));if(skor<2)continue;
  const bln=dxBulanCell(ws),cocok=bln===mk?2:bln==null?1:0;if(!cocok)continue;
  const tot=skor*10+cocok;if(tot>bs){bs=tot;best=ws}}
 return best}
/* Daftar nama driver yang ada di file (untuk saran nama). */
function dxNamaDiFile(wb){const out=[];dxSheets(wb).forEach(ws=>{const n=dxNamaCell(ws)||ws.name;if(n&&!out.some(x=>xlNorm(x)===xlNorm(n)))out.push(n)});return out}
function dxNamaSheetBaru(wb,nama,mk){const dasar=String(nama||"DRIVER").replace(/[\\\/?*\[\]:]/g," ").replace(/\s+/g," ").trim().toUpperCase().slice(0,31)||"DRIVER";
 if(!wb.getWorksheet(dasar))return dasar;return xlNamaUnik(wb,(dasar.slice(0,31-1-xlBulanLabel(mk).length)+" "+xlBulanLabel(mk)).slice(0,31))}

/* ---- gambar tanda tangan dari sheet acuan (untuk sheet baru) ---- */
const dxH=[19.33,19.33,19.33,29.33,29.33,29.33,29.33];   /* tinggi baris blok (piksel) sampai tepi atas baris nama; baris blok: tanggal, Mengetahui, jabatan, 4 baris ttd */
const dxHTotal=dxH.reduce((a,b)=>a+b,0);
function dxGambarRef(ref,slot){
 if(!ref||!ref.model.blockStart)return[];const ws=ref.ws,start=ref.model.blockStart,awal=DX.SLOT.map(s=>s[0]);
 const teks=(r,c)=>{const v=ws.getCell(r,c);return v.isMerged&&v.master!==v?"":xlText(v).trim()};
 const lbl=slot.map(t=>xlNorm(t&&t.label));let namaRow=0;
 for(let r=start;r<=ws.rowCount;r++){const ada=awal.filter(c=>teks(r,c)).length;if(ada>=3&&awal.filter(c=>lbl.includes(xlNorm(teks(r,c)))).length<2)namaRow=r}
 if(!namaRow)return[];
 const lebarPx=c=>((ws.getColumn(c).width)||8.43)*7+5,tinggiPx=r=>((ws.getRow(r).height)||14.5)*96/72;
 const px=(f,uk)=>{let t=0,n=Math.floor(f);for(let k=0;k<n;k++)t+=uk(k+1);return t+(f-n)*uk(n+1)};
 const out=[];
 ws.getImages().filter(g=>g.range.tl.row>=start-1&&g.range.br).forEach(g=>{
  const mid=(g.range.tl.col+g.range.br.col)/2,i=DX.SLOT.findIndex(s=>mid>=s[0]-1&&mid<s[1]);if(i<0||!slot[i]||!slot[i].nama)return;
  if(teks(namaRow,awal[i]).toUpperCase()!==String(slot[i].nama).trim().toUpperCase())return;
  const t=g.range.tl,b=g.range.br;
  out.push({i,id:g.imageId,col:t.col,lebar:Math.round(px(b.col,lebarPx)-px(t.col,lebarPx)),tinggi:Math.round(px(b.row,tinggiPx)-px(t.row,tinggiPx)),jarak:px(namaRow-1,tinggiPx)-px(b.row,tinggiPx)})});
 return out}
const dxLebarSlotPx=(s,lebar)=>{let t=0;for(let c=s[0];c<=s[1];c++)t+=(lebar[c-1]||8.43)*7+5;return t};
function dxColDari(c0,px,lebar){let c=c0,rem=px;while(rem>0&&c<lebar.length+2){const w=(lebar[c]||8.43)*7+5;if(rem<w)return c+rem/w;rem-=w;c++}return c}
/* Blok pengesahan lengkap seperti contoh: tanggal, Mengetahui, jabatan, ruang tanda tangan (gambar), nama. */
function dxBlokBaru(wb,ws,start,opt){
 const tengah={horizontal:"center",vertical:"middle"},slot=opt.slot||[],mk=opt.mk,lebar=DX.LEBAR.map((w,i)=>ws.getColumn(i+1).width||w);
 const put=(r,c1,c2,txt,font)=>{if(c2>c1)ws.mergeCells(r,c1,r,c2);const x=ws.getCell(r,c1);x.value=txt;x.font=font;x.alignment=tengah};
 put(start,7,7,(opt.kota||"Parepare")+", "+xlTglTtdTeks({...opt,mk}),dxCalibri);
 put(start+1,1,2,"Mengetahui :",dxCalibri);
 DX.SLOT.forEach((s,i)=>{put(start+2,s[0],s[1],(slot[i]&&slot[i].label)||"",i?dxArial:dxCalibri);put(start+7,s[0],s[1],(slot[i]&&slot[i].nama)||"",i?{...dxArial,bold:true}:{...dxCalibri,bold:true})});
 for(let r=start+3;r<=start+6;r++)ws.getRow(r).height=22;
 const posisi=y=>{let k=0;while(k<dxH.length-1&&y>=dxH[k]){y-=dxH[k];k++}return start-1+k+Math.max(0,y)/dxH[k]};
 const ref=opt.refGambar||[];
 DX.SLOT.forEach((s,i)=>{const r=ref.find(x=>x.i===i);
  if(r){const top=Math.max(0,dxHTotal-r.jarak-r.tinggi);ws.addImage(Number(r.id),{tl:{col:r.col,row:posisi(top)},ext:{width:r.lebar,height:r.tinggi},editAs:"oneCell"});return}
  const g=slot[i]&&slot[i].gambar;if(!g)return;
  const id=wb.addImage({base64:g.base64,extension:g.ext||"png"}),slotPx=dxLebarSlotPx(s,lebar);
  let tinggi=Math.min(80,g.h),lb=Math.round(g.w*tinggi/g.h);if(lb>slotPx*.9){lb=Math.round(slotPx*.9);tinggi=Math.round(g.h*lb/g.w)}
  ws.addImage(id,{tl:{col:dxColDari(s[0]-1,(slotPx-lb)/2,lebar),row:start+3-.9},ext:{width:lb,height:tinggi},editAs:"oneCell"})})}

/* ---- menulis sheet ---- */
function dxTulisSheet(wb,lama,nama,model,opt){
 let blok=null,lebar=DX.LEBAR,judul=model.judul||opt.judul||DX.JUDUL,page=null,urut=null;
 const sumber=lama||(opt.ref&&opt.ref.ws);
 if(sumber){lebar=DX.LEBAR.map((w,i)=>(sumber.getColumn(i+1).width)||w);page=sumber.pageSetup;
  if(lama){if(model.blockStart)blok=xlTangkapBlok(lama,model.blockStart);urut=lama.orderNo;wb.removeWorksheet(lama.id)}
  else judul=opt.judul||opt.ref.model.judul||judul}
 const ws=wb.addWorksheet(nama,{pageSetup:page&&page.margins?{...page}:JSON.parse(JSON.stringify(DX.PAGE))});
 if(urut!=null)ws.orderNo=urut;
 ws.properties.defaultRowHeight=14.5;
 lebar.forEach((w,i)=>ws.getColumn(i+1).width=w);
 const tengah={horizontal:"center",vertical:"middle",wrapText:true},kiri={horizontal:"left",vertical:"middle",wrapText:true};
 const set=(r,c,v,o={})=>{const x=ws.getCell(r,c);x.value=v;x.font=o.bold?{...dxCalibri,bold:true}:dxCalibri;x.alignment=o.kiri?kiri:tengah;if(o.fmt)x.numFmt=o.fmt;return x};
 const kotak=(r,from,to)=>{for(let c=from;c<=to;c++){const x=ws.getCell(r,c);x.border=dxKotak;x.font=dxCalibri;x.alignment=tengah}};
 /* judul, nama, bulan */
 ws.mergeCells(2,1,2,7);ws.getRow(2).height=18.5;{const x=ws.getCell(2,1);x.value=judul;x.font={...dxCalibri,size:14,bold:true};x.alignment={horizontal:"center"}}
 [[4,"NAMA",": "+nama],[5,"BULAN",": "+xlBulanLabel(model.bulan)]].forEach(([r,a,b])=>{ws.getCell(r,1).value=a;ws.getCell(r,1).font=dxCalibri;ws.getCell(r,3).value=b;ws.getCell(r,3).font=dxCalibri});
 /* kepala tabel (dua baris) */
 kotak(7,1,7);kotak(8,1,7);
 [[1,1],[2,1],[3,1],[6,1],[7,1]].forEach(([c])=>ws.mergeCells(7,c,8,c));ws.mergeCells(7,4,7,5);
 [[7,1,"NO"],[7,2,"HARI"],[7,3,"TANGGAL"],[7,4,"JAM"],[7,6,"LEMBUR"],[7,7,"KETERANGAN"],[8,4,"MASUK"],[8,5,"PULANG"]].forEach(([r,c,t])=>ws.getCell(r,c).value=t);
 /* isi tabel: minimal 10 baris bernomor */
 const n=Math.max(DX.MIN,model.entries.length),awal=9;
 for(let i=0;i<n;i++){const r=awal+i,e=model.entries[i];kotak(r,1,7);set(r,1,i+1);ws.getRow(r).height=30;
  if(!e)continue;
  const[y,mo,d]=e.iso.split("-").map(Number);
  set(r,2,DX.HARI[new Date(Date.UTC(y,mo-1,d)).getUTCDay()]);set(r,3,new Date(Date.UTC(y,mo-1,d)),{fmt:DX.FMT_TGL});
  const a=xlToMin(e.masuk),b=xlToMin(e.pulang);
  set(r,4,a==null?(e.masuk||""):(a*60+xlEps/1000)/86400,{fmt:"h:mm"});set(r,5,b==null?(e.pulang||""):(b*60+xlEps/1000)/86400,{fmt:"h:mm"});
  set(r,6,{formula:`IFERROR((ROUND(MOD(E${r}-D${r},1)*1440,0)+0.01)/1440,0)`,result:(xlMenit(e.masuk,e.pulang)+0.01)/1440},{fmt:"h:mm"});
  set(r,7,e.ket||"",{kiri:1});ws.getRow(r).height=Math.max(30,14*Math.ceil((e.ket||"").length/44)+8)}
 /* jumlah jam lembur */
 const rt=awal+n,tot=xlTotal(model.entries.reduce((s,e)=>s+xlMenit(e.masuk,e.pulang),0));
 kotak(rt,1,7);ws.mergeCells(rt,1,rt,5);set(rt,1,"JUMLAH JAM LEMBUR",{bold:1});ws.getRow(rt).height=30;
 if(model.entries.length){const sum=`SUM(F${awal}:F${rt-1})*1440`;set(rt,6,{formula:`INT(ROUND(${sum},0)/60)+MOD(ROUND(${sum},0),60)/100`,result:tot.nilai},{bold:1,fmt:"0.00"})}else set(rt,6,0,{bold:1,fmt:"0.00"});
 set(rt,7,model.entries.length?tot.teks:"",{bold:1});
 if(blok&&blok.ada)xlTulisBlok(ws,blok,rt+1);else dxBlokBaru(wb,ws,rt+1,opt);
 return ws}
/* Sheet acuan untuk sheet baru: sheet driver terakhir yang punya blok pengesahan. */
function dxRujukan(wb){const l=dxSheets(wb);for(let i=l.length-1;i>=0;i--){const m=dxParse(l[i]);if(m.blockStart&&l[i].rowCount>=m.blockStart)return{ws:l[i],model:m}}return l.length?{ws:l[l.length-1],model:dxParse(l[l.length-1])}:null}

/* ---- rencana & penerapan ---- */
function dxKelompok(entries){const per=new Map();
 entries.forEach(e=>{const nm=String(e.nama||"").trim().toUpperCase(),mk=e.iso.slice(0,7),k=mk+"|"+nm;if(!per.has(k))per.set(k,{mk,nama:nm,list:[]});per.get(k).list.push(e)});
 return[...per.values()].sort((a,b)=>a.nama.localeCompare(b.nama)||a.mk.localeCompare(b.mk))}
function dxRencana(wb,entries){
 return dxKelompok(entries).map(g=>{const lama=wb&&dxCariSheet(wb,g.nama,g.mk);
  const model=lama?dxParse(lama):{nama:g.nama,bulan:g.mk,entries:[],blockStart:null};model.bulan=g.mk;
  const st=dxMerge(model,g.list);return{mk:g.mk,nama:lama&&model.nama?model.nama:g.nama,sheet:lama?lama.name:null,baru:!lama,...st,ringkas:dxRingkas(model)}})}
function dxTerapkan(wb,entries,opt){xlRapikanWaktu(wb);const laporan=[];
 for(const g of dxKelompok(entries)){const lama=dxCariSheet(wb,g.nama,g.mk);
  const model=lama?dxParse(lama):{nama:g.nama,bulan:g.mk,entries:[],blockStart:null,judul:""};model.bulan=g.mk;
  const st=dxMerge(model,g.list),nm=lama&&model.nama?model.nama:g.nama,nama=lama?lama.name:dxNamaSheetBaru(wb,g.nama,g.mk);
  const ref=lama?null:dxRujukan(wb);
  dxTulisSheet(wb,lama,nama,model,{...opt,mk:g.mk,nama:nm,ref,refGambar:ref?dxGambarRef(ref,opt.slot||[]):[]});
  laporan.push({mk:g.mk,nama:nm,sheet:nama,baru:!lama,...st,ringkas:dxRingkas(model)})}
 return laporan}
