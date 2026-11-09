/* Pemilih tanggal berbahasa Indonesia (Tanggal / Bulan / Tahun).
   Kontrol <input type="date"> bawaan browser menampilkan bahasa dan format menurut bahasa tampilan browser/sistem, bukan bahasa halaman,
   sehingga bisa muncul bahasa Inggris (October, mm/dd/yyyy). Modul ini memasang pemilih Indonesia di depan setiap input tanggal.
   Input aslinya tetap ada (disembunyikan) sebagai penyimpan nilai ISO "YYYY-MM-DD", sehingga seluruh kode lain (formulir, filter riwayat,
   isi otomatis, Excel) tetap membaca dan menulis .value serta mendengarkan event input/change seperti biasa.
   Bila terjadi galat pada satu input, input itu dibiarkan memakai kontrol bawaan. */
(function(){
"use strict";
var BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function hariDalamBulan(y,m){return new Date(y,m,0).getDate()}
function pecahIso(v){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");return m?{y:+m[1],m:+m[2],d:+m[3]}:null}
function p2(n){return(n<10?"0":"")+n}
function gabungIso(y,m,d){return y+"-"+p2(m)+"-"+p2(d)}
var api={BLN:BLN,hariDalamBulan:hariDalamBulan,pecahIso:pecahIso,gabungIso:gabungIso};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(typeof document==="undefined"||typeof HTMLInputElement==="undefined")return;

var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
function opsi(sel,teks,nilai){var o=document.createElement("option");o.value=nilai;o.textContent=teks;sel.appendChild(o)}
function buatSel(label){var s=document.createElement("select");s.setAttribute("aria-label",label);return s}

function pasang(inp){
 if(inp.getAttribute("data-tgl-id"))return;
 try{
  var wrap=document.createElement("span");wrap.className="tgl-id";
  var sd=buatSel("Tanggal"),sm=buatSel("Bulan"),sy=buatSel("Tahun");
  opsi(sd,"Tgl","");for(var d=1;d<=31;d++)opsi(sd,String(d),String(d));
  opsi(sm,"Bulan","");BLN.forEach(function(b,i){opsi(sm,b,String(i+1))});
  var ymin=0,ymax=0;
  function bangunTahun(a,b){ymin=a;ymax=b;var cur=sy.value;sy.textContent="";opsi(sy,"Tahun","");for(var y=a;y<=b;y++)opsi(sy,String(y),String(y));sy.value=cur}
  var now=new Date().getFullYear();bangunTahun(now-6,now+4);
  function pastikanTahun(y){if(y<ymin||y>ymax)bangunTahun(Math.min(ymin,y),Math.max(ymax,y))}
  function tampil(){var p=pecahIso(desc.get.call(inp));
   if(p){pastikanTahun(p.y);sd.value=String(p.d);sm.value=String(p.m);sy.value=String(p.y)}else{sd.value="";sm.value="";sy.value=""}}
  function kirim(){var y=+sy.value,m=+sm.value,dd=+sd.value,baru="";
   if(y&&m&&dd){var mx=hariDalamBulan(y,m);if(dd>mx){dd=mx;sd.value=String(dd)}baru=gabungIso(y,m,dd)}
   if(desc.get.call(inp)===baru)return;
   desc.set.call(inp,baru);
   inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}))}
  /* Event dari dropdown tidak diteruskan ke penangan lain; yang diteruskan hanyalah event dari input aslinya. */
  ["input","change"].forEach(function(t){wrap.addEventListener(t,function(e){e.stopPropagation();if(t==="change")kirim()})});
  function sinkron(){["need","warn"].forEach(function(c){var on=inp.classList.contains(c);[sd,sm,sy].forEach(function(s){s.classList.toggle(c,on)})});
   [sd,sm,sy].forEach(function(s){s.disabled=!!inp.disabled})}
  tampil();sinkron();
  wrap.appendChild(sd);wrap.appendChild(sm);wrap.appendChild(sy);
  inp.parentNode.insertBefore(wrap,inp.nextSibling);
  /* Penulisan .value oleh kode lain (isi otomatis, muat riwayat, hapus filter) ikut memperbarui dropdown. Bila nilainya tidak berubah, pilihan setengah jadi pengguna dibiarkan. */
  Object.defineProperty(inp,"value",{configurable:true,get:function(){return desc.get.call(inp)},set:function(v){var lama=desc.get.call(inp);desc.set.call(inp,v);if(desc.get.call(inp)!==lama)tampil()}});
  inp.focus=function(){sd.focus()};
  if(typeof MutationObserver!=="undefined")new MutationObserver(sinkron).observe(inp,{attributes:true,attributeFilter:["class","disabled"]});
  inp.setAttribute("data-tgl-id","1");inp.style.display="none";
 }catch(e){try{console.warn("tanggal-id:",e)}catch(x){}}
}
function pindai(root){if(!root.querySelectorAll)return;root.querySelectorAll('input[type="date"]').forEach(pasang)}
function mulai(){
 pindai(document);
 if(typeof MutationObserver==="undefined")return;
 new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.matches&&n.matches('input[type="date"]'))pasang(n);else pindai(n)})})}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mulai);else mulai();
})();
