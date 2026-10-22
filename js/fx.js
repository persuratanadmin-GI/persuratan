/* fx.js - lapisan interaktif visual. Hanya menambah kelas/elemen tampilan;
   tidak membaca atau mengubah data, state, maupun isi surat. */
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
