/* Pemilih tanggal berbahasa Indonesia: SATU kolom isian + kalender cepat.
   Kontrol <input type="date"> bawaan browser menampilkan bahasa dan format menurut bahasa tampilan browser/sistem, bukan bahasa halaman,
   sehingga bisa muncul bahasa Inggris (October, mm/dd/yyyy). Modul ini memasang satu kolom isian (hh/bb/tttt) di depan setiap input tanggal,
   dengan tombol kalender di dalam kolom:
   - Ketik cepat: angka saja cukup (07082026 otomatis menjadi 07/08/2026); juga bisa "7-8-2026", "7 Agustus 2026", atau "0708" (tahun ini).
   - Kalender cepat: klik ikon kalender (atau tekan tanda panah bawah); pilih hari, geser bulan/tahun dengan panah, klik judul bulan untuk melompat
     ke bulan lain, tombol Hari ini dan Hapus.
   Input aslinya tetap ada (disembunyikan) sebagai penyimpan nilai ISO "YYYY-MM-DD", sehingga seluruh kode lain (formulir, filter riwayat,
   isi otomatis, Excel) tetap membaca dan menulis .value serta mendengarkan event input/change seperti biasa.
   Bila terjadi galat pada satu input, input itu dibiarkan memakai kontrol bawaan. */
(function(){
"use strict";
var BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
var HARI=["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
var SINGKAT={jan:1,feb:2,mar:3,apr:4,mei:5,may:5,jun:6,jul:7,agu:8,agt:8,aug:8,sep:9,sept:9,okt:10,oct:10,nov:11,des:12,dec:12};
function hariDalamBulan(y,m){return new Date(y,m,0).getDate()}
function pecahIso(v){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");return m?{y:+m[1],m:+m[2],d:+m[3]}:null}
function p2(n){return(n<10?"0":"")+n}
function gabungIso(y,m,d){return y+"-"+p2(m)+"-"+p2(d)}
/* ISO -> teks kolom "dd/mm/yyyy" */
function keTeks(iso){var p=pecahIso(iso);return p?p2(p.d)+"/"+p2(p.m)+"/"+p.y:""}
/* Pemformat saat mengetik: bila isinya hanya angka dan garis miring, susun menjadi dd/mm/yyyy (maks 8 angka). Selain itu dibiarkan. */
function maskAngka(t){if(!/^[\d\/]*$/.test(t))return t;var d=t.replace(/\//g,"").slice(0,8);return d.slice(0,2)+(d.length>2?"/"+d.slice(2,4):"")+(d.length>4?"/"+d.slice(4):"")}
/* Teks bebas -> ISO atau null. now = tahun sekarang (untuk isian tanpa tahun). */
function parseTeks(s,now){s=String(s==null?"":s).trim().toLowerCase();if(!s)return null;now=now||new Date().getFullYear();var d,m,y,a;
 if(/^\d+$/.test(s)){if(s.length===8){d=+s.slice(0,2);m=+s.slice(2,4);y=+s.slice(4)}else if(s.length===6){d=+s.slice(0,2);m=+s.slice(2,4);y=2000+ +s.slice(4)}else if(s.length===4){d=+s.slice(0,2);m=+s.slice(2,4);y=now}else return null}
 else{a=s.split(/[\s\/.\-,]+/).filter(Boolean);if(a.length<2||a.length>3)return null;d=+a[0];
  if(/^\d+$/.test(a[1]))m=+a[1];else{var k=a[1].slice(0,3),i=-1;BLN.forEach(function(b,j){if(b.toLowerCase()===a[1])i=j});m=i>=0?i+1:(SINGKAT[a[1]]||SINGKAT[k]||0)}
  y=a.length===3?(a[2].length<=2?2000+ +a[2]:+a[2]):now;if(a.length===3&&!/^\d+$/.test(a[2]))return null}
 if(!(y>=1900&&y<=2199)||!(m>=1&&m<=12)||!(d>=1)||d>hariDalamBulan(y,m))return null;return gabungIso(y,m,d)}
/* Susunan kalender satu bulan: 6 baris x 7 kolom (Senin dulu). Sel: {y,m,d,luar} dengan luar=true untuk hari di bulan sebelum/sesudahnya. */
function gridBulan(y,m){var awal=(new Date(y,m-1,1).getDay()+6)%7,out=[],pm=m===1?12:m-1,py=m===1?y-1:y,nm=m===12?1:m+1,ny=m===12?y+1:y,dp=hariDalamBulan(py,pm),dm=hariDalamBulan(y,m);
 for(var i=0;i<42;i++){var n=i-awal+1;if(n<1)out.push({y:py,m:pm,d:dp+n,luar:true});else if(n>dm)out.push({y:ny,m:nm,d:n-dm,luar:true});else out.push({y:y,m:m,d:n,luar:false})}return out}
var api={BLN:BLN,HARI:HARI,hariDalamBulan:hariDalamBulan,pecahIso:pecahIso,gabungIso:gabungIso,keTeks:keTeks,maskAngka:maskAngka,parseTeks:parseTeks,gridBulan:gridBulan};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(typeof document==="undefined"||typeof HTMLInputElement==="undefined")return;

var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
var pop=null;                                  /* kalender yang sedang terbuka (satu saja) */
function tutupPop(){if(pop){pop.el.remove();document.removeEventListener("mousedown",pop.luar,true);document.removeEventListener("keydown",pop.key,true);window.removeEventListener("scroll",pop.pos,true);window.removeEventListener("resize",pop.pos);pop=null}}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function ikon(){return'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'}

function pasang(inp){
 if(inp.getAttribute("data-tgl-id"))return;
 try{
  var wrap=el("span","tgl-id"),box=document.createElement("input");
  box.type="text";box.className="tgl-in";box.setAttribute("inputmode","numeric");box.setAttribute("autocomplete","off");box.setAttribute("placeholder","hh/bb/tttt");box.setAttribute("maxlength","16");box.setAttribute("aria-label","Tanggal (hh/bb/tttt)");
  var btn=el("button","tgl-btn");btn.type="button";btn.setAttribute("aria-label","Buka kalender");btn.setAttribute("title","Kalender");btn.innerHTML=ikon();
  function nilai(){return desc.get.call(inp)}
  function tampil(){box.value=keTeks(nilai())}
  function kirim(baru){if(nilai()===baru)return;desc.set.call(inp,baru);inp.dispatchEvent(new Event("input",{bubbles:true}));inp.dispatchEvent(new Event("change",{bubbles:true}))}
  /* Selesai mengisi (Enter/pindah kolom): teks kosong -> kosongkan; terbaca -> simpan dan rapikan; tidak terbaca -> kembali ke nilai sebelumnya */
  function selesai(){var t=box.value.trim();if(!t){kirim("");box.value="";box.classList.remove("tgl-salah");return}
   var iso=parseTeks(t);if(iso){kirim(iso);tampil();box.classList.remove("tgl-salah")}else{box.classList.add("tgl-salah");setTimeout(function(){tampil();box.classList.remove("tgl-salah")},900)}}
  box.addEventListener("input",function(){var t=box.value;if(box.selectionStart==null||box.selectionStart>=t.length){var m=maskAngka(t);if(m!==t)box.value=m}
   if(/^\d{2}\/\d{2}\/\d{4}$/.test(box.value)){var iso=parseTeks(box.value);if(iso){kirim(iso);box.classList.remove("tgl-salah")}}});
  box.addEventListener("blur",selesai);
  box.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();selesai();tutupPop()}else if(e.key==="ArrowDown"&&!pop){e.preventDefault();buka()}});
  /* Event dari kolom/kalender tidak diteruskan ke penangan lain; yang diteruskan hanyalah event dari input aslinya. */
  ["input","change"].forEach(function(t){wrap.addEventListener(t,function(e){e.stopPropagation()})});
  function sinkron(){["need","warn"].forEach(function(c){box.classList.toggle(c,inp.classList.contains(c))});box.disabled=!!inp.disabled;btn.disabled=!!inp.disabled}

  /* ---- kalender ---- */
  function buka(){
   if(pop){tutupPop();return}
   var p=pecahIso(nilai())||pecahIso(parseTeks(box.value)||""),now=new Date(),th=now.getFullYear(),tb=now.getMonth()+1,tt=now.getDate();
   var vy=p?p.y:th,vm=p?p.m:tb,mode="hari",el0=el("div","tgl-pop");el0.setAttribute("role","dialog");el0.setAttribute("aria-label","Kalender");
   function pilih(y,m,d){kirim(gabungIso(y,m,d));tampil();box.classList.remove("tgl-salah");tutupPop();try{box.focus()}catch(e){}}
   function gambar(){el0.textContent="";var cur=pecahIso(nilai());
    var head=el("div","tgl-h"),pr=el("button","","\u2039"),nx=el("button","","\u203a"),py=el("button","","\u00ab"),ny=el("button","","\u00bb"),jd=el("button","tgl-jd",mode==="hari"?BLN[vm-1]+" "+vy:String(vy));
    [pr,nx,py,ny,jd].forEach(function(b){b.type="button"});
    py.title="Tahun sebelumnya";ny.title="Tahun berikutnya";pr.title="Bulan sebelumnya";nx.title="Bulan berikutnya";jd.title=mode==="hari"?"Pilih bulan":"Kembali ke hari";
    py.onclick=function(){vy--;gambar()};ny.onclick=function(){vy++;gambar()};
    pr.onclick=function(){vm--;if(vm<1){vm=12;vy--}gambar()};nx.onclick=function(){vm++;if(vm>12){vm=1;vy++}gambar()};
    jd.onclick=function(){mode=mode==="hari"?"bulan":"hari";gambar()};
    head.appendChild(py);if(mode==="hari")head.appendChild(pr);head.appendChild(jd);if(mode==="hari")head.appendChild(nx);head.appendChild(ny);el0.appendChild(head);
    if(mode==="bulan"){var g=el("div","tgl-bln");BLN.forEach(function(b,i){var x=el("button",(i+1===vm?"on ":"")+((vy===th&&i+1===tb)?"hr":""),b.slice(0,3));x.type="button";x.title=b;x.onclick=function(){vm=i+1;mode="hari";gambar()};g.appendChild(x)});el0.appendChild(g)}
    else{var w=el("div","tgl-w");HARI.forEach(function(h){w.appendChild(el("span","",h))});el0.appendChild(w);
     var gr=el("div","tgl-g");gridBulan(vy,vm).forEach(function(c){var kls=(c.luar?"luar ":"")+((cur&&cur.y===c.y&&cur.m===c.m&&cur.d===c.d)?"on ":"")+((c.y===th&&c.m===tb&&c.d===tt)?"hr":""),x=el("button",kls,String(c.d));x.type="button";x.onclick=function(){pilih(c.y,c.m,c.d)};gr.appendChild(x)});el0.appendChild(gr)}
    var ft=el("div","tgl-f"),hi=el("button","","Hari ini"),hp=el("button","","Hapus"),tp=el("button","","Tutup");[hi,hp,tp].forEach(function(b){b.type="button"});
    hi.onclick=function(){pilih(th,tb,tt)};hp.onclick=function(){kirim("");tampil();tutupPop()};tp.onclick=tutupPop;ft.appendChild(hi);ft.appendChild(hp);ft.appendChild(tp);el0.appendChild(ft)}
   gambar();document.body.appendChild(el0);
   function pos(){var r=wrap.getBoundingClientRect(),w=el0.offsetWidth||268,h=el0.offsetHeight||300,vw=window.innerWidth,vh=window.innerHeight;
    var kiri=Math.max(8,Math.min(r.left,vw-w-8)),atas=(r.bottom+h+8>vh&&r.top-h-8>0)?r.top-h-4:r.bottom+4;
    el0.style.left=kiri+"px";el0.style.top=Math.max(8,atas)+"px"}
   pop={el:el0,pos:pos,luar:function(e){if(!el0.contains(e.target)&&!wrap.contains(e.target))tutupPop()},key:function(e){if(e.key==="Escape"){e.stopPropagation();tutupPop();try{box.focus()}catch(x){}}}};
   document.addEventListener("mousedown",pop.luar,true);document.addEventListener("keydown",pop.key,true);window.addEventListener("scroll",pos,true);window.addEventListener("resize",pos);pos()}
  btn.addEventListener("click",function(e){e.preventDefault();buka()});

  tampil();sinkron();
  wrap.appendChild(box);wrap.appendChild(btn);
  inp.parentNode.insertBefore(wrap,inp.nextSibling);
  /* Penulisan .value oleh kode lain (isi otomatis, muat riwayat, hapus filter) ikut memperbarui kolom. Bila nilainya tidak berubah, isian setengah jadi pengguna dibiarkan. */
  Object.defineProperty(inp,"value",{configurable:true,get:function(){return desc.get.call(inp)},set:function(v){var lama=desc.get.call(inp);desc.set.call(inp,v);if(desc.get.call(inp)!==lama)tampil()}});
  inp.focus=function(){box.focus()};
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
