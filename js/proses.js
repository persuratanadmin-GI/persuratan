/* proses.js - kartu status proses yang elegan untuk PDF, Excel, impor cadangan, dan foto lampiran.
   HANYA MEMBACA penanda yang sudah ada (pdfBusy, xlS.sibuk, dxS.sibuk, teks toast) dan menambah satu elemen tampilan.
   Tidak mengubah, membungkus, atau menggantikan fungsi apa pun, dan tidak menyentuh data/state/isi surat.
   Untuk membatalkan: hapus <script proses.js> dan <link proses.css> di index.html. */
(function(){
"use strict";
if(!document.body)return;
var ICON={
 pdf:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
 xl:'<path d="M4 5h16v14H4z"/><path d="M4 10h16M4 15h16M10 5v14"/>',
 imp:'<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>',
 img:'<path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
 ok:'<path d="M5 12.5l4.5 4.5L19 7"/>',
 warn:'<path d="M12 8v5"/><path d="M12 17h.01"/>',
 err:'<path d="M7 7l10 10M17 7L7 17"/>'};
var card=document.createElement("div");card.id="prosesCard";card.setAttribute("role","status");card.setAttribute("aria-live","polite");card.setAttribute("aria-hidden","true");
card.innerHTML='<div class="pc-ic"><i class="pc-ring"></i><svg class="pc-svg" viewBox="0 0 24 24" aria-hidden="true"></svg></div><div class="pc-tx"><b class="pc-t"></b><span class="pc-s"></span><div class="pc-bar"><i></i></div></div>';
document.body.appendChild(card);
var elSvg=card.querySelector(".pc-svg"),elT=card.querySelector(".pc-t"),elS=card.querySelector(".pc-s");

function $(s){return document.querySelector(s)}
function toastText(){var t=document.getElementById("toast");return t&&!t.hidden?t.textContent||"":""}
function bool(f){try{return !!f()}catch(e){return false}}
function pdfOn(){return bool(function(){return typeof pdfBusy!=="undefined"&&pdfBusy})}
function xlOn(){return bool(function(){return typeof xlS!=="undefined"&&xlS&&xlS.sibuk})||bool(function(){return typeof dxS!=="undefined"&&dxS&&dxS.sibuk})}
function xlSaving(){var b=$("#xlSimpan,#dxSimpan");return !!(b&&b.disabled)}

var cur=null,shown=false,showAt=0,hideT=0,lastToast="",tChangedAt=0,pend=null,doneUntil=0;
function setCls(c){card.className=(shown?"on ":"")+c}
function view(kind,title,sub,pct,state){
 elSvg.innerHTML=ICON[state==="ok"?"ok":state==="warn"?"warn":state==="err"?"err":kind];
 elT.textContent=title;elS.textContent=sub||"";
 var ind=pct==null;if(!ind)card.style.setProperty("--pc-p",Math.max(.06,Math.min(1,pct)).toFixed(3));
 card.className=(shown?"on ":"")+(state||("run"+(ind?" ind":"")));
 card.setAttribute("aria-hidden","false")}
function open(){clearTimeout(hideT);if(!shown){shown=true;showAt=Date.now();card.classList.add("on")}}
function close(){shown=false;card.classList.remove("on");card.setAttribute("aria-hidden","true")}

/* penentu tampilan berjalan */
function describe(){
 if(pdfOn()){var tt=toastText(),m=/(\d+)\s*dari\s*(\d+)/.exec(tt),title="Membuat PDF";
  if(m){var i=+m[1],n=+m[2],name=(/:\s*(.+?)\s*$/.exec(tt)||[])[1];if(name)name=name.replace(/\.{3}$/,"");if(name&&/^surat\s+\d+\s+dari\s+\d+$/i.test(name))name="";
   return{kind:"pdf",title:n>1?"Membuat PDF ("+i+"/"+n+")":title,sub:(name?name:"Surat "+i+" dari "+n)+(i===n&&n>1?" · menyelesaikan berkas":""),pct:(i-.35)/n}}
  return{kind:"pdf",title:title,sub:"Menyiapkan dokumen...",pct:null}}
 if(xlOn()){return xlSaving()?{kind:"xl",title:"Menyimpan ke Excel",sub:"Menulis data dan tanda tangan ke berkas...",pct:null}
  :{kind:"xl",title:"Membuka berkas Excel",sub:"Membaca isi rekap...",pct:null}}
 if(pend){var el=Date.now()-pend.t;if(el<1600&&!pend.hasToast)return{kind:pend.kind,title:pend.title,sub:pend.sub,pct:null}}
 var tx=toastText();if(/^Memproses\s.+\.\.\.$/.test(tx)&&Date.now()-tChangedAt<20000)return{kind:"img",title:"Memproses foto lampiran",sub:tx.replace(/^Memproses\s+/,"").replace(/\.\.\.$/,""),pct:null};
 return null}
function classify(msg){
 if(/gagal|tidak dapat dibaca|tidak terbaca|error/i.test(msg))return"err";
 if(/dibatalkan|tidak bisa|ditolak|dilewati|tidak ada kolom/i.test(msg))return"warn";
 return"ok"}
function finish(kind,startedAt){
 var msg=(lastToast&&tChangedAt>=startedAt)?lastToast:"",st=msg?classify(msg):"ok";
 var base={pdf:"PDF",xl:"Excel",imp:"Impor",img:"Foto lampiran"}[kind]||"Proses";
 var title=st==="ok"?base+" selesai":st==="warn"?base+": perlu perhatian":base+" gagal";
 view(kind,title,msg||"Selesai.",1,st);open();
 var wait=st==="ok"?2400:3800;doneUntil=Date.now()+700;
 clearTimeout(hideT);hideT=setTimeout(function(){if(!cur)close()},wait)}

var startAt=0;
var lastSig="";
function toastSig(){var t=document.getElementById("toast");return t?(t.textContent||"")+"|"+(t._h||0):""}
var DONE=/^(PDF (dibuat|disimpan)|Selesai:|Excel diunduh|File Excel diperbarui|File asli tidak bisa|Gagal membuat PDF|Unduhan (dibatalkan|gagal))/;
function kindOf(t){return/Excel/i.test(t)?"xl":"pdf"}
function tick(){
 var tx=toastText(),sg=toastSig(),fresh=sg!==lastSig&&!!tx;if(fresh)lastSig=sg;
 if(fresh){lastToast=tx;tChangedAt=Date.now();if(pend)pend.hasToast=true}
 var d=describe();
 /* proses yang berjalan sangat cepat/tanpa jeda (browser tidak sempat menggambar) tetap diberi kartu hasil */
 if(fresh&&!d&&!cur&&DONE.test(tx)&&Date.now()>doneUntil){finish(kindOf(tx),tChangedAt);return}
 if(d){
  if(!cur){cur=d.kind;startAt=Date.now();clearTimeout(hideT)}
  cur=d.kind;
  /* tampil setelah 220 ms agar proses yang sangat singkat tidak berkedip */
  if(shown||Date.now()-startAt>220){view(d.kind,d.title,d.sub,d.pct);open()}
 }else if(cur){
  var k=cur,s=startAt;cur=null;
  if(shown||Date.now()-s>0){
   /* tahan kartu proses minimal 650 ms setelah muncul agar transisi ke "selesai" terasa halus */
   var wait=shown?Math.max(0,650-(Date.now()-showAt)):0;
   clearTimeout(tick._f);tick._f=setTimeout(function(){if(!cur)finish(k,s)},wait)}
  if(pend&&pend.kind===k)pend=null}
 else if(pend&&Date.now()-pend.t>1700){pend=null}
}
setInterval(tick,100);

/* impor berkas: tampilkan "membaca berkas" sejenak, lalu hasilnya dari toast */
function listen(id,title,sub,kind){var e=document.getElementById(id);if(!e)return;
 e.addEventListener("change",function(){if(e.files&&e.files.length)pend={kind:kind||"imp",title:title,sub:sub,t:Date.now(),hasToast:false}},true)}
["imp","sp-imp","rs-imp","dv-imp"].forEach(function(id){listen(id,"Mengimpor cadangan","Membaca berkas JSON...","imp")});
listen("sp-peImp","Mengimpor dari Excel","Membaca daftar pegawai...","xl");
})();
