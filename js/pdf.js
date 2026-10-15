"use strict";
/* Ekspor PDF vektor (jsPDF) dan hapus semua riwayat. */
/* ===== PDF semua surat (jsPDF vektor, A4) & hapus semua riwayat ===== */
let riwayatShown=[],pdfBusy=false;
const PS=841.89/792,PDX=-12.34,PX=2.83465;
const pdfTxt=v=>String(v==null?"":v).replace(/[\u2013\u2014]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[^\x20-\x7E\xA0-\xFF]/g,"?");
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
/* Satu surat digambar sebagai vektor dengan koordinat PDF asli (Letter, pt) lalu diskalakan ke A4. */
async function pdfLetter(pdf,c){
 const s=DB.settings,S=PS,X=x=>x*S+PDX,Y=y=>y*S;
 const F=(f,sz)=>{pdf.setFont("times",f);pdf.setFontSize(sz*S)};
 const T=(t,x,y0,sz,f,al)=>{F(f||"normal",sz);pdf.text(pdfTxt(t),X(x),Y(y0+.891*sz),{align:al||"left"})};
 const R=(x0,y0,x1,y1)=>pdf.rect(X(x0),Y(y0),(x1-x0)*S,(y1-y0)*S,"F");
 const tgl=c.tanggal?fmtDate(c.tanggal):"",dur=durText(c),waktu=c.mulai&&c.selesai?`${c.mulai} s/d ${c.selesai} ${s.zona}${dur?" ("+dur+")":""}`:"";
 const place=s.kota+", "+(c.tanggal?fmtDateEn(c.tanggal):"");
 pdf.setFillColor(0,0,0);pdf.setTextColor(0,0,0);
 F("normal",8);const ur=pdf.splitTextToSize(pdfTxt(c.uraian),343*S),n=Math.max(1,ur.length),d=(n-1)*8.856;
 const sigs=[];
 const sigBlock=(dy,jabY,nameY,dateY,roleY,cl,cr,L,Rr,bt,bh,k1,k2)=>{
  T(place,cl,dateY+dy,7.4,"normal","center");T(place,cr,dateY+dy,7.4,"normal","center");
  T(L[0],cl,roleY+dy,8,"normal","center");T(Rr[0],cr,roleY+dy,8,"normal","center");
  T(L[1],cl,jabY+dy,8,"bold","center");T(Rr[1],cr,jabY+dy,8,"bold","center");
  T(String(L[2]||"").toUpperCase(),cl,nameY+dy,8,"bold","center");T(String(Rr[2]||"").toUpperCase(),cr,nameY+dy,8,"bold","center");
  sigs.push({src:L[3],p:k1,cx:cl,cy:bt+dy+bh/2},{src:Rr[3],p:k2,cx:cr,cy:bt+dy+bh/2})};
 /* ---- bagian atas: SPK PLN ---- */
 pdf.addImage(LOGO.pln,"PNG",X(48.2),Y(31),63*S,21.9*S);
 T(s.ptPln,291.7,34.5,10.2,"bold","center");T(s.unitPln,291.7,52.1,9.6,"bold","center");T(s.almPln,291.7,68.4,7.4,"normal","center");
 R(48.6,82,534.8,82.8);R(48.6,83.4,534.8,84.2);
 T("SURAT PERINTAH KERJA (SPK)",291.7,86.1,10.2,"bold","center");T("Nomor : "+(c.spk||""),291.7,102.3,8,"normal","center");
 T("Kepada Yth :",50.2,128.3,8);T(s.kepada,50.2,141.5,8,"bold");T("Dengan ini diperintahkan untuk melaksanakan pekerjaan Operasi dan pemeliharaan lembur sebagai berikut:",50.2,154.3,8);
 [[165,165.8],[182.5,183.2],[199.9,200.7],[224.9+d,225.7+d],[242.3+d,243.1+d],[259.7+d,260.5+d]].forEach(h=>R(49,h[0],535,h[1]));
 R(48.2,165,49,260.5+d);R(187.1,165.8,187.9,260.5+d);R(534.2,165.8,535,260.5+d);
 T("Hari / Tanggal",50.2,169.5,8);T(c.tanggal?fmtDay(c.tanggal):"",189.1,169.5,8);
 T("Lokasi",50.2,186.9,8);T(c.lokasi,189.1,186.9,8);
 T("Uraian Tugas",50.2,208.1+d/2,8);ur.forEach((l,i)=>T(l,189.1,208.1+i*8.856,8));
 T("Waktu",50.2,229.3+d,8);T(waktu,189.1,229.3+d,8);T("Durasi Terbilang",50.2,246.7+d,8);T(waktu,189.1,246.7+d,8);
 T("Demikian Surat Perintah Kerja ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.",50.2,262+d,8);
 sigBlock(d,321.5,361.4,289.9,305.4,152.85,430.6,["Pemberi Perintah,",c.pemberiJab,c.pemberiName,c.sigG],["Penerima Perintah,",c.koorJab,c.koorName,c.sigK],330.36,31.04,"G","K1");
 /* ---- garis gunting ---- */
 pdf.setFillColor(136,136,136);for(let k=0;k<23;k++)R(48.6+k*3,386.5,k?48.6+k*3+2.2:49.6,387.3);pdf.setFillColor(0,0,0);
 F("italic",6.6);pdf.setTextColor(102,102,102);pdf.text("Gunting disini  |  Lembar Atas (Arsip PLN) - Lembar Bawah (Arsip PLND)",X(291.05),Y(388.2+.891*6.6),{align:"center"});
 pdf.setDrawColor(102,102,102);pdf.setLineWidth(.45*S);
 for(const cx of [186.1,398.2]){const y=392.4;pdf.line(X(cx-3.4),Y(y-2.6),X(cx+3.6),Y(y+2.2));pdf.line(X(cx-3.4),Y(y+2.6),X(cx+3.6),Y(y-2.2));pdf.circle(X(cx-3.4),Y(y-2.6),1.1*S,"S");pdf.circle(X(cx-3.4),Y(y+2.6),1.1*S,"S")}
 pdf.setTextColor(0,0,0);
 /* ---- bagian bawah: SPK Lembur ---- */
 pdf.addImage(LOGO.nd,"PNG",X(48.2),Y(412.4),57.5*S,20.8*S);
 T(s.ptNd,291.8,416,10.2,"bold","center");T(s.unitNd,291.7,433.5,9.6,"bold","center");T(s.almNd,285.65,449.9,7.4,"normal","center");
 R(48.6,462.3,534.8,463.1);R(48.6,463.7,534.8,464.5);
 T("SURAT PERINTAH KERJA LEMBUR",291.7,466.4,10.2,"bold","center");T("Nomor : "+(c.lemburNo||""),291.7,482.6,8,"normal","center");
 T("Menindaklanjuti SPK PLN Nomor: "+(c.spk||"")+", maka diperintahkan kepada:",50.2,508.6,8);
 [[536.7,537.5],[554.2,555],[571.5,572.3]].forEach(h=>R(48.6,h[0],534.8,h[1]));
 T("Nama Personil",50.2,523.8,8);T(String(c.name||"").toUpperCase(),189.1,524,8,"bold");T("ID / NIP",50.2,541.2,8);T(c.nip,189.1,541.2,8);T("Jabatan",50.2,558.6,8);T(c.jabatan,189.1,558.6,8);
 const d2=d;/* tinggi baris Uraian pada tabel bawah mengikuti jumlah baris teks yang sama */
 [[584.5,585.3],[602,602.8],[626.3+d2,627.2+d2],[643.8+d2,644.5+d2]].forEach(h=>R(49,h[0],535,h[1]));
 R(48.2,584.5,49,644.5+d2);R(187.1,602.8,187.9,644.5+d2);R(534.2,585.3,535,644.5+d2);
 T("RINCIAN PEKERJAAN:",50.2,589.2,8,"bold");T("Uraian",50.2,609.8+d2/2,8);ur.forEach((l,i)=>T(l,189.1,609.8+i*8.856,8));T("Jam Kerja",50.2,630.8+d2,8);T(waktu,189.1,630.8+d2,8);
 T("Demikian perintah ini diberikan. Segera laporkan hasil pekerjaan kepada Koordinator setelah selesai.",50.2,646+d2,8);
 sigBlock(d2,707.4,754.7,674,689.4,152.85,430.6,["Pemberi Tugas,",c.koorJab,c.koorName,c.sigK],["Pelaksana,","PERSONIL",String(c.name||""),c.sigP],716.26,38.44,"K2","P");
 /* nama tanda tangan huruf besar */
 /* ---- kaki halaman ---- */
 pdf.setFont("helvetica","normal");pdf.setFontSize(5.8*S);pdf.text("Form SPK Surat Perintah Kerja Lembur",X(314.55),Y(775.9+4.35),{align:"center"});
 /* ---- gambar tanda tangan (di atas teks), sesuai posisi/ukuran yang diatur di pratinjau ---- */
 for(const g of sigs){if(!g.src)continue;const im=await loadImg(g.src);if(!im)continue;const o=((c.sigPos||{})[g.p])||{x:0,y:0,s:1};
  const k=Math.min(1,105/(im.naturalWidth*.75),56/(im.naturalHeight*.75)),w=im.naturalWidth*.75*k*(o.s||1),h=im.naturalHeight*.75*k*(o.s||1);
  pdf.addImage(g.src,"PNG",X(g.cx+(o.x||0)*PX-w/2),Y(g.cy+(o.y||0)*PX-h/2),w*S,h*S)}
}
async function exportPdf(list){
 if(pdfBusy)return;if(!list.length){toast("Tidak ada surat.");return}
 const bad=list.map((c,i)=>missing(c).length?"surat "+(i+1)+": "+missing(c).join(", "):"").filter(Boolean);
 if(bad.length&&!await ask("Data belum lengkap -> "+bad.join(" | ")+". Tetap buat PDF?"))return;
 if(!window.jspdf){toast("Pustaka PDF gagal dimuat (cek koneksi). Gunakan tombol Cetak sebagai gantinya.");return}
 pdfBusy=true;
 try{const pdf=new window.jspdf.jsPDF({unit:"pt",format:"a4",orientation:"portrait",compress:true});
  for(let i=0;i<list.length;i++){toast("Membuat PDF: surat "+(i+1)+" dari "+list.length+"...");if(i)pdf.addPage("a4","portrait");await pdfLetter(pdf,list[i])}
  const name="surat-lembur-"+list.length+"-surat-"+new Date().toISOString().slice(0,10)+".pdf",blob=pdf.output("blob");
  let dl=null;try{dl=window.claude&&await window.claude.use("downloads")}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast("PDF disimpan: "+list.length+" surat.")}catch(e){toast(e&&e.code==="declined"?"Unduhan dibatalkan.":"Unduhan gagal ("+(e&&e.code||"error")+").")}}
  else{pdf.save(name);toast("PDF dibuat: "+list.length+" surat.")}
 }catch(e){toast("Gagal membuat PDF: "+(e&&e.message||e))}
 finally{pdfBusy=false}}
$("bPdf").onclick=()=>exportPdf(batch);
$("rPdf").onclick=()=>exportPdf(riwayatShown);
$("rExp").onclick=()=>$("exp").click();
$("rDelAll").onclick=async()=>{const n=DB.records.length;if(!n){toast("Riwayat sudah kosong.");return}
 if(!await ask("Hapus SEMUA "+n+" catatan riwayat secara permanen?\nTindakan ini tidak bisa dibatalkan. Ekspor cadangan dulu jika perlu. (Nomor urut surat tidak direset; atur di tab Pengaturan.)"))return;
 DB.records=[];save();renderRiwayat();toast(n+" catatan riwayat dihapus.")};
