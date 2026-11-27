/* listrik.js - efek tampilan bertema listrik/PLN. Hanya menambah elemen dekoratif (aria-hidden) dan kelas tampilan;
   tidak mengubah data, state, maupun isi surat. Aktif/nonaktif lewat tombol petir di header (tersimpan di browser). */
(function(){
"use strict";
var root=document.documentElement,h=document.querySelector(".app-header");if(!h)return;
var mq=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):{matches:false},KEY="fx.zap";
function stored(){try{return localStorage.getItem(KEY)}catch(e){return null}}
function enabled(){var s=stored();return s===null?!mq.matches:s==="1"}

/* elemen dekoratif */
var NS="http://www.w3.org/2000/svg";
var wave=document.createElement("div");wave.className="zap-wave";wave.setAttribute("aria-hidden","true");
var D="M0 58H150l10 0 8-20 10 30 8-10H430l10 0 8-18 10 28 8-10H760l10 0 8-22 10 32 8-10H1010l8 0 8-18 10 26 8-8H1200";
wave.innerHTML='<svg xmlns="'+NS+'" viewBox="0 0 1200 64" preserveAspectRatio="xMidYMax slice" width="100%" height="100%"><defs><linearGradient id="zapGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="0"><stop offset="0" stop-color="#ffd60a" stop-opacity=".0"/><stop offset=".25" stop-color="#ffd60a" stop-opacity=".55"/><stop offset=".75" stop-color="#38d4ff" stop-opacity=".6"/><stop offset="1" stop-color="#38d4ff" stop-opacity="0"/></linearGradient></defs><path class="base" d="'+D+'"/><path class="run" pathLength="2000" d="'+D+'"/></svg>';
h.insertBefore(wave,h.firstChild);
var line=document.createElement("div");line.className="zap-line";line.setAttribute("aria-hidden","true");line.innerHTML="<i></i>";h.appendChild(line);
var surge=document.createElement("div");surge.className="zap-surge";surge.setAttribute("aria-hidden","true");document.body.appendChild(surge);
var bar=document.createElement("div");bar.id="zapBar";bar.setAttribute("aria-hidden","true");document.body.appendChild(bar);

/* tombol aktif/nonaktif (ikon gelombang denyut, berbeda dari ikon tema) */
var btn=document.createElement("button");btn.type="button";btn.className="fx-zap";
btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h4l3-8 5 16 3-8h5"/></svg>';
function apply(v){root.classList.toggle("zap-off",!v);btn.setAttribute("aria-pressed",v?"true":"false");
 btn.title="Efek listrik: "+(v?"aktif":"mati")+" (klik untuk "+(v?"mematikan":"menyalakan")+")";btn.setAttribute("aria-label",btn.title)}
btn.onclick=function(){var v=root.classList.contains("zap-off");try{localStorage.setItem(KEY,v?"1":"0")}catch(e){}apply(v)};
h.appendChild(btn);apply(enabled());

/* lonjakan arus saat pindah mode */
function pulse(){if(root.classList.contains("zap-off"))return;surge.classList.remove("on");void surge.offsetWidth;surge.classList.add("on");
 clearTimeout(pulse.t);pulse.t=setTimeout(function(){surge.classList.remove("on")},1000)}
["mdS","mdR","lsH","lsD","lsP"].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener("click",pulse)});

/* bar arus saat PDF diproses (membaca penanda pdfBusy yang sudah ada, tanpa mengubah fungsi PDF) */
var polling=0;
function barOn(){if(root.classList.contains("zap-off")||polling)return;polling=1;var t0=Date.now(),seen=false;
 (function tick(){var busy=false;try{busy=typeof pdfBusy!=="undefined"&&!!pdfBusy}catch(e){}
  if(busy){seen=true;bar.classList.add("on")}
  var el=Date.now()-t0;
  if((seen&&!busy&&el>700)||(!seen&&el>600)||el>30000){bar.classList.remove("on");polling=0;return}
  setTimeout(tick,120)})()}
["bPdf","sp-bPdf","rs-bPdf","dv-bPdf","pg-bPdf"].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener("click",barOn)});

/* percikan di tombol utama */
document.addEventListener("pointerdown",function(e){
 if(root.classList.contains("zap-off")||!e.target||!e.target.closest)return;
 var b=e.target.closest("button.b");if(!b||b.disabled)return;
 var r=b.getBoundingClientRect(),s=document.createElement("span");s.className="zap-rip";s.setAttribute("aria-hidden","true");
 s.style.left=(e.clientX-r.left)+"px";s.style.top=(e.clientY-r.top)+"px";b.appendChild(s);setTimeout(function(){if(s.parentNode)s.parentNode.removeChild(s)},650)},true);
})();
