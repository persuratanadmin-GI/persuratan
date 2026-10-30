"use strict";
/* Tab "Tanda Tangan" di panel SPPD dan Restitusi. Isinya adalah pengelola tanda tangan yang SAMA dengan tab Tanda Tangan
   Surat Lembur (data DB.sigs, kode manage.js): elemen #tab-tt dipindahkan sementara ke panel yang aktif, lalu dikembalikan
   ke panel Surat Lembur saat pindah mode. Tidak ada salinan kode atau data. */
(function(){const tt=$("tab-tt"),left=$("left");
 const PN={S:{p:"sp-left",tabs:"sp-tabs",ids:["sp-tab-in","sp-tab-pe","sp-tab-ri","sp-tab-se"],reset:()=>spTab("in"),upd:()=>spUpdate()},
           R:{p:"rs-left",tabs:"rs-tabs",ids:["rs-tab-in","rs-tab-lk","rs-tab-ri","rs-tab-se"],reset:()=>rsTab("in"),upd:()=>rsUpdate()}};
 const hosted=()=>tt.parentNode!==left;
 const cur=()=>document.body.classList.contains("mode-sppd")?PN.S:document.body.classList.contains("mode-rs")?PN.R:null;
 function refresh(){const m=cur();if(m)try{m.upd()}catch(e){}}
 function open(m){m.ids.forEach(i=>$(i).hidden=true);$(m.p).appendChild(tt);tt.hidden=false;renderSigs();
  document.querySelectorAll("#"+m.tabs+" button").forEach(b=>b.classList.toggle("on",b.dataset.t==="tt"))}
 function giveBack(){if(!hosted())return;for(const k in PN){if($(PN[k].p).contains(tt)){left.appendChild(tt);try{PN[k].reset()}catch(e){}}}
  const a=document.querySelector("#tabs button.on");showTab(a?a.dataset.t:"in")}
 for(const k in PN){const m=PN[k];$(m.tabs).addEventListener("click",e=>{const t=e.target.dataset&&e.target.dataset.t;if(!t)return;
  if(t==="tt"){e.stopImmediatePropagation();open(m)}
  else if($(m.p).contains(tt)&&!tt.hidden){tt.hidden=true;setTimeout(refresh,0)}},true)}
 ["mdL","mdS","mdR"].forEach(i=>$(i).addEventListener("click",giveBack,true));
 /* setelah menyimpan/menghapus tanda tangan, pratinjau surat langsung memakai data terbaru */
 ["ttSave","ttList"].forEach(i=>$(i).addEventListener("click",()=>{if(hosted())setTimeout(refresh,120)}))})();
