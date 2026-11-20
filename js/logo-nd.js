"use strict";
/* Logo PLN Nusa Daya (blok bawah surat Lembur HAR) yang bisa diganti dengan foto unggahan.
   Disimpan di DB.settings (logoNd = data URL PNG/JPEG, logoNdAr = lebar/tinggi, logoNdSkala = persen), sehingga ikut Ekspor/Impor JSON.
   Kosong = pakai logo bawaan (LOGO.nd). Pratinjau, cetak, dan PDF memakai logoNdInfo() yang sama. */
const LOGO_ND_BOX={x:48.2,y:412.4,w:57.5,h:20.8};
const LOGO_ND_MAXW=110;
function logoNdInfo(s){
 s=s||DB.settings;const B=LOGO_ND_BOX;
 const ok=typeof s.logoNd==="string"&&/^data:image\/(png|jpeg);base64,/.test(s.logoNd)&&+s.logoNdAr>0;
 if(!ok)return{src:LOGO.nd,fmt:"PNG",x:B.x,y:B.y,w:B.w,h:B.h,custom:false};
 const ar=+s.logoNdAr,k=Math.min(200,Math.max(50,+s.logoNdSkala||100))/100;
 let w,h;if(ar>=B.w/B.h){w=B.w;h=w/ar}else{h=B.h;w=h*ar}
 w*=k;h*=k;if(w>LOGO_ND_MAXW){h*=LOGO_ND_MAXW/w;w=LOGO_ND_MAXW}
 return{src:s.logoNd,fmt:/^data:image\/jpeg/.test(s.logoNd)?"JPEG":"PNG",x:B.x,y:B.y+B.h/2-h/2,w,h,custom:true};
}
/* Foto -> data URL: dikecilkan (maks 800 px), margin kosong/putih dipotong rapat, PNG bila ada bagian transparan, selain itu JPEG. */
function logoNdProses(f,cb){
 if(!f)return;
 if(!/^image\/(png|jpe?g|webp)$/.test(f.type)){alert("File harus PNG, JPG, atau WEBP.");return}
 if(f.size>3145728){alert("Ukuran maksimum 3 MB.");return}
 const img=new Image,u=URL.createObjectURL(f);
 img.onerror=()=>{URL.revokeObjectURL(u);alert("Gambar tidak dapat dibaca.")};
 img.onload=()=>{try{
  const sc=Math.min(1,800/Math.max(img.naturalWidth,img.naturalHeight)),W=Math.max(1,Math.round(img.naturalWidth*sc)),H=Math.max(1,Math.round(img.naturalHeight*sc));
  const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.drawImage(img,0,0,W,H);URL.revokeObjectURL(u);
  const p=x.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1,alpha=false;
  for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++){const i=(yy*W+xx)*4,a=p[i+3];if(a<250)alpha=true;
   if(a>=8&&!(p[i]>245&&p[i+1]>245&&p[i+2]>245)){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy}}
  if(x1<0){alert("Gambar tampak kosong atau seluruhnya putih.");return}
  x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(W-1,x1+1);y1=Math.min(H-1,y1+1);
  const w=x1-x0+1,h=y1-y0+1,o=document.createElement("canvas");o.width=w;o.height=h;const g=o.getContext("2d");
  if(!alpha){g.fillStyle="#fff";g.fillRect(0,0,w,h)}
  g.drawImage(c,x0,y0,w,h,0,0,w,h);
  cb({src:alpha?o.toDataURL("image/png"):o.toDataURL("image/jpeg",.92),ar:w/h});
 }catch(e){alert("Gambar tidak dapat diproses.")}};
 img.src=u;
}
function logoNdPanel(){
 return`<div class="fld fw" id="logoNdBox"><label>Logo PLN Nusa Daya (blok bawah surat)</label>
 <div class="logo-nd"><div class="logo-nd-pv"><img id="logoNdPv" alt="Pratinjau logo"></div>
 <div class="logo-nd-ac"><label class="g imp">Unggah foto logo<input type="file" id="logoNdFile" accept="image/png,image/jpeg,image/webp" hidden></label>
 <button class="g" id="logoNdReset" type="button">Pakai logo bawaan</button>
 <span class="logo-nd-sz"><label for="logoNdSkala">Ukuran</label><input type="range" id="logoNdSkala" min="50" max="200" step="5"><output id="logoNdOut"></output></span></div></div>
 <p class="hint">Logo baru muncul di pratinjau, cetak, dan PDF surat Lembur HAR. PNG transparan paling baik; margin kosong dipotong otomatis. Tersimpan di browser ini dan ikut dalam Ekspor JSON.</p></div>`;
}
function logoNdSync(){
 const i=logoNdInfo(),pv=document.getElementById("logoNdPv");if(!pv)return;
 pv.src=i.src;const sk=document.getElementById("logoNdSkala"),o=document.getElementById("logoNdOut"),rs=document.getElementById("logoNdReset");
 sk.value=DB.settings.logoNdSkala||100;sk.disabled=!i.custom;o.textContent=i.custom?(sk.value+"%"):"bawaan";rs.disabled=!i.custom;
}
function logoNdBind(){
 const f=document.getElementById("logoNdFile");if(!f)return;
 const commit=()=>{save();update();logoNdSync()};
 f.onchange=e=>{const file=e.target.files[0];e.target.value="";logoNdProses(file,r=>{DB.settings.logoNd=r.src;DB.settings.logoNdAr=r.ar;DB.settings.logoNdSkala=100;commit();if(typeof toast==="function")toast("Logo PLN Nusa Daya diganti.")})};
 document.getElementById("logoNdReset").onclick=()=>{DB.settings.logoNd="";DB.settings.logoNdAr=0;DB.settings.logoNdSkala=100;commit();if(typeof toast==="function")toast("Logo bawaan dipulihkan.")};
 document.getElementById("logoNdSkala").oninput=e=>{DB.settings.logoNdSkala=+e.target.value;commit()};
 logoNdSync();
}
