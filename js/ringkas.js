"use strict";
/* Pelengkap tampilan ringkas (css/ringkas.css): memindahkan pilihan jenis surat lembur ke header, memberi tombol "i" untuk legenda warna,
   dan memberi tooltip pada tombol aksi (karena tombol sekunder bisa tampil sebagai ikon saja). Tidak menyentuh data atau logika lain. */
(function(){
 try{
  var sub=document.getElementById("lemSub"),nav=document.getElementById("modes"),st=document.getElementById("st"),h=document.getElementById("lsH"),d=document.getElementById("lsD"),s2=document.getElementById("mdS");
  /* Pilihan Lembur HAR / Lembur Driver digabung ke bar mode di header (tanpa bar sendiri), sehingga empat tombol mode selalu di posisi tetap.
     Tombol lama (mdL) disembunyikan lewat CSS; id dan fungsi semua tombol tidak berubah. */
  if(nav&&h&&d&&s2){nav.insertBefore(h,s2);nav.insertBefore(d,s2);h.title="Surat Lembur HAR";d.title="Surat Lembur Driver";if(sub)sub.setAttribute("aria-hidden","true")}
  if(st&&!st.title)st.title=(st.textContent||"").trim();
  document.querySelectorAll(".fx-meter").forEach(function(m){
   if(m.querySelector(".fx-m-info"))return;
   var lg=m.previousElementSibling,b=document.createElement("button");
   if(!lg||!lg.classList.contains("legend"))return;
   b.type="button";b.className="fx-m-info";b.textContent="i";b.title="Arti warna kolom";b.setAttribute("aria-label","Tampilkan arti warna kolom");b.setAttribute("aria-expanded","false");
   b.onclick=function(){var on=lg.classList.toggle("buka");b.setAttribute("aria-expanded",on?"true":"false")};
   m.appendChild(b)});
  function ttl(b){var t=(b.textContent||"").trim();if(t&&(!b.title||b.getAttribute("data-auto")==="1")){b.title=t;b.setAttribute("data-auto","1")}}
  document.querySelectorAll(".actbar button").forEach(ttl);
  if(typeof MutationObserver!=="undefined")document.querySelectorAll(".actbar").forEach(function(a){new MutationObserver(function(){a.querySelectorAll("button").forEach(ttl)}).observe(a,{childList:true,characterData:true,subtree:true})});
  /* Kotak "Tempel pesan WhatsApp" SPPD/Restitusi (selalu terbuka, ±270 px): diberi tombol Ciutkan/Buka; pilihan diingat per modul. Bawaan tetap terbuka. */
  document.querySelectorAll(".wa-panel:not([id])").forEach(function(pn){
   var lb=pn.querySelector("label"),tab=pn.closest('[id$="-tab-in"]');if(!lb||!tab||pn.querySelector(".wa-fold"))return;
   var key="ui.waCiut."+tab.id,btn=document.createElement("button");btn.type="button";btn.className="wa-fold";
   function atur(c){pn.classList.toggle("wa-ciut",c);btn.textContent=c?"Buka":"Ciutkan";btn.setAttribute("aria-expanded",c?"false":"true");btn.title=c?"Tampilkan kotak pesan WhatsApp":"Sembunyikan kotak pesan WhatsApp (isinya tetap tersimpan)"}
   var c0=false;try{c0=localStorage.getItem(key)==="1"}catch(e){}
   atur(c0);btn.onclick=function(){var c=!pn.classList.contains("wa-ciut");atur(c);try{localStorage.setItem(key,c?"1":"0")}catch(e){}};
   pn.insertBefore(btn,pn.firstChild)});
 }catch(e){try{console.warn("ringkas:",e)}catch(x){}}
})();
