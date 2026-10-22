/* fx.js - lapisan interaktif visual. Hanya menambah kelas/elemen tampilan.
   Tidak mengubah data, state, maupun isi surat: meter kelengkapan hanya MEMBACA
   isi kolom formulir, dan Ctrl+S hanya menekan tombol "Simpan draft" yang sudah ada. */
(function(){
"use strict";
var root=document.documentElement;
/* Tombol tema terang/gelap (tersimpan di browser) */
function setTheme(t){root.setAttribute("data-theme",t);try{localStorage.setItem("fx.theme",t)}catch(e){}
  var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content=t==="dark"?"dark light":"light"}
var h=document.querySelector(".app-header");
if(h){
  var b=document.createElement("button");b.type="button";b.className="fx-theme";b.setAttribute("aria-label","Ganti tema terang/gelap");b.title="Ganti tema";
  b.innerHTML='<svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  b.onclick=function(){setTheme(root.getAttribute("data-theme")==="dark"?"light":"dark")};
  h.appendChild(b);
  var on=function(){h.classList.toggle("fx-scrolled",window.scrollY>4)};
  window.addEventListener("scroll",on,{passive:true});on();
}
/* Tinggi header (untuk meter yang menempel di bawahnya) */
if(h){var hh=function(){root.style.setProperty("--fx-hh",h.offsetHeight+"px")};hh();window.addEventListener("resize",hh);if(window.ResizeObserver)new ResizeObserver(hh).observe(h)}

/* Indikator tab yang bergeser mengikuti tab aktif */
function slider(bar){
  if(!bar)return;
  function pos(){var b=bar.querySelector("button.on");if(!b||!b.offsetWidth)return;
    bar.style.setProperty("--ix",b.offsetLeft+"px");bar.style.setProperty("--iy",(b.offsetTop+b.offsetHeight-2)+"px");bar.style.setProperty("--iw",b.offsetWidth+"px");
    if(!bar._r){bar._r=1;requestAnimationFrame(function(){bar.classList.add("fx-ind")})}}
  pos();
  new MutationObserver(pos).observe(bar,{attributes:true,attributeFilter:["class"],subtree:true});
  if(window.ResizeObserver)new ResizeObserver(pos).observe(bar);
  window.addEventListener("resize",pos);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(pos)}
slider(document.getElementById("tabs"));slider(document.getElementById("sp-tabs"));

/* Meter kelengkapan: membaca kolom wajib (.req) dan menunjuk kolom kosong berikutnya */
function meter(formId){
  var form=document.getElementById(formId);if(!form||!form.parentNode)return;
  var m=document.createElement("div");m.className="fx-meter";m.hidden=true;
  m.innerHTML='<div class="fx-m-top"><span class="fx-m-txt"></span><button type="button" class="fx-m-go" hidden></button></div><div class="fx-m-bar" role="progressbar" aria-label="Kelengkapan kolom wajib" aria-valuemin="0" aria-valuemax="100"><i></i></div>';
  form.parentNode.insertBefore(m,form);
  var txt=m.querySelector(".fx-m-txt"),go=m.querySelector(".fx-m-go"),bar=m.querySelector(".fx-m-bar"),raf=0,target=null;
  function lab(el){var f=el.closest(".fld"),l=f&&f.querySelector("label");if(!l)return"";var n=l.firstChild;return((n&&n.nodeType===3?n.textContent:l.textContent)||"").replace(/\*/g,"").trim()}
  function run(){
    var rq=[].slice.call(form.querySelectorAll(".req")),miss=rq.filter(function(e){return!String(e.value).trim()}),warn=form.querySelectorAll(".warn").length,tot=rq.length;
    if(!tot){m.hidden=true;return}
    m.hidden=false;var done=tot-miss.length,p=Math.round(done/tot*100),hue=Math.round(p*1.25);
    m.style.setProperty("--p",p+"%");m.style.setProperty("--h",hue);m.style.setProperty("--h2",hue+18);bar.setAttribute("aria-valuenow",p);
    m.classList.toggle("done",!miss.length);m.classList.toggle("warn",!miss.length&&warn>0);
    txt.innerHTML="<b>"+done+"/"+tot+"</b> kolom wajib terisi"+(warn?"<small>"+warn+" perlu diperiksa</small>":"");
    if(miss.length){target=miss[0];go.hidden=false;go.textContent="Isi: "+lab(miss[0])}
    else if(warn){target=form.querySelector(".warn");go.hidden=false;go.textContent="Periksa kolom"}
    else{target=null;go.hidden=true;txt.innerHTML="<b>Semua kolom wajib terisi</b>"}}
  function sched(){cancelAnimationFrame(raf);raf=requestAnimationFrame(run)}
  form.addEventListener("input",sched);form.addEventListener("change",sched);
  new MutationObserver(sched).observe(form,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  go.onclick=function(){var el=target;if(!el)return;el.scrollIntoView({block:"center",behavior:"smooth"});
    setTimeout(function(){try{el.focus({preventScroll:true})}catch(x){}},260);
    el.classList.remove("fx-ping");void el.offsetWidth;el.classList.add("fx-ping");setTimeout(function(){el.classList.remove("fx-ping")},1200)};
  run()}
meter("form");meter("sp-form");

/* Pintasan: Ctrl/Cmd+S = Simpan draft (hanya saat tab Input terlihat) */
[["bDraft"],["sp-bDraft"]].forEach(function(a){var b=document.getElementById(a[0]);if(b)b.title="Simpan draft (Ctrl+S)"});
document.addEventListener("keydown",function(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey||String(e.key).toLowerCase()!=="s")return;
  var sp=document.body.classList.contains("mode-sppd"),tab=document.getElementById(sp?"sp-tab-in":"tab-in"),btn=document.getElementById(sp?"sp-bDraft":"bDraft");
  if(!tab||tab.hidden||!btn)return;e.preventDefault();btn.click()});
/* Titik sentuh untuk efek ripple tombol (hanya variabel CSS) */
document.addEventListener("pointerdown",function(e){
  var t=e.target.closest&&e.target.closest("button.b,button.g,button.d");if(!t)return;
  var r=t.getBoundingClientRect();t.style.setProperty("--rx",(e.clientX-r.left)+"px");t.style.setProperty("--ry",(e.clientY-r.top)+"px")},{passive:true});
/* Inisial avatar pada daftar (dekoratif, dipasang ulang saat daftar dirender) */
var lists="#peList,#rList,#ttList,#sp-peList,#sp-rList",busy=false,tm=0;
function avatars(){
  if(busy)return;busy=true;
  document.querySelectorAll(lists.split(",").map(function(s){return s+" table.t td:first-child>b:first-child"}).join(",")).forEach(function(el){
    if(el.previousElementSibling&&el.previousElementSibling.classList.contains("fx-av"))return;
    var n=(el.textContent||"").replace(/[^A-Za-z\s]/g,"").trim().split(/\s+/).slice(0,2).map(function(w){return w[0]}).join("").toUpperCase()||"?";
    var s=document.createElement("span");s.className="fx-av";s.setAttribute("aria-hidden","true");s.textContent=n;el.parentNode.insertBefore(s,el)});
  busy=false}
var mo=new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(avatars,60)});
document.querySelectorAll(lists).forEach(function(el){mo.observe(el,{childList:true})});
avatars();
})();
