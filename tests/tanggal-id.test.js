/* Uji pemilih tanggal Indonesia (satu kolom + kalender cepat): fungsi murni + simulasi DOM ringan (tanpa jsdom). */
const fs=require("fs"),vm=require("vm"),path=require("path");
let gagal=0;const cek=(n,k,i)=>{console.log((k?"LULUS  ":"GAGAL  ")+n+(k?"":" "+(i||"")));if(!k)gagal++};
const src=fs.readFileSync(path.join(__dirname,"../js/tanggal-id.js"),"utf8");
const T=(()=>{const m={exports:{}};new Function("module",src)(m);return m.exports})();
cek("hari dalam bulan: Feb 2026=28, Feb 2028=29, Apr=30, Des=31",T.hariDalamBulan(2026,2)===28&&T.hariDalamBulan(2028,2)===29&&T.hariDalamBulan(2026,4)===30&&T.hariDalamBulan(2026,12)===31);
cek("pecah/gabung ISO",JSON.stringify(T.pecahIso("2026-11-07"))==='{"y":2026,"m":11,"d":7}'&&T.gabungIso(2026,5,3)==="2026-05-03"&&T.pecahIso("")===null&&T.pecahIso("07/11/2026")===null);
cek("nama bulan Indonesia lengkap",T.BLN.join()==="Januari,Februari,Maret,April,Mei,Juni,Juli,Agustus,September,Oktober,November,Desember");
cek("ISO -> teks hh/bb/tttt",T.keTeks("2026-08-07")==="07/08/2026"&&T.keTeks("")==="");
cek("ketik angka otomatis diberi garis miring",T.maskAngka("0")==="0"&&T.maskAngka("070")==="07/0"&&T.maskAngka("0708")==="07/08"&&T.maskAngka("07082026")==="07/08/2026"&&T.maskAngka("070820269")==="07/08/2026");
cek("teks selain angka tidak diubah pemformat",T.maskAngka("7 Agustus")==="7 Agustus");
cek("baca cepat: 07082026, 7-8-2026, 7.8.26, 070826",["07082026","7-8-2026","7.8.26","070826","07/08/2026"].every(s=>T.parseTeks(s,2026)==="2026-08-07"));
cek("baca nama bulan: 7 Agustus 2026, 7 agu 2026, 7 Aug 2026",["7 Agustus 2026","7 agu 2026","7 Aug 2026"].every(s=>T.parseTeks(s,2026)==="2026-08-07"));
cek("tanpa tahun memakai tahun sekarang: 0708 dan 7/8",T.parseTeks("0708",2027)==="2027-08-07"&&T.parseTeks("7/8",2027)==="2027-08-07");
cek("tanggal tidak ada ditolak: 31/04, 30/02, 29/02/2026, bulan 13, kosong, huruf",["31/04/2026","30/02/2026","29/02/2026","07/13/2026","","abc","0/1/2026"].every(s=>T.parseTeks(s,2026)===null)&&T.parseTeks("29/02/2028")==="2028-02-29");
const g=T.gridBulan(2026,11);
cek("kalender Nov 2026: 42 sel, Senin dulu (1 Nov = Minggu = kolom ke-7), sel luar bulan ditandai",g.length===42&&g[6].d===1&&!g[6].luar&&g[0].luar&&g[0].m===10&&g[0].d===26&&g[36].d===1&&g[36].luar&&g[36].m===12);
cek("kalender Feb 2028 (kabisat) memuat tanggal 29",T.gridBulan(2028,2).some(c=>!c.luar&&c.d===29)&&T.gridBulan(2026,2).filter(c=>!c.luar).length===28);
cek("kalender Jan: sel sebelum 1 Januari masuk Desember tahun lalu",T.gridBulan(2026,1)[0].y===2025||T.gridBulan(2026,1)[0].luar===false);

/* --- DOM tiruan minimal --- */
class Ev{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.stopped=false}stopPropagation(){this.stopped=true}}
class El{constructor(tag){this.tag=tag;this.children=[];this.parentNode=null;this.attrs={};this.l={};this.style={};this._v="";this.disabled=false;this.className="";const cl=new Set;this.classList={add:c=>cl.add(c),remove:c=>cl.delete(c),contains:c=>cl.has(c),toggle:(c,on)=>on?cl.add(c):cl.delete(c),_s:cl}}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return k in this.attrs?this.attrs[k]:null}
 appendChild(c){c.parentNode=this;this.children.push(c);return c}insertBefore(c,ref){c.parentNode=this;const i=ref?this.children.indexOf(ref):-1;i<0?this.children.push(c):this.children.splice(i,0,c);return c}
 addEventListener(t,f){(this.l[t]=this.l[t]||[]).push(f)}
 dispatchEvent(e){let n=this;e.target=this;while(n&&!e.stopped){(n.l[e.type]||[]).forEach(f=>f(e));if(!e.bubbles)break;n=n.parentNode}return true}
 focus(){this.focused=true}
 set textContent(v){this.children=[];this._t=v}get textContent(){return this._t}get value(){return this._v}set value(v){this._v=String(v)}}
class Inp extends El{constructor(){super("input")}matches(s){return /input\[type="date"\]/.test(s)}
 get value(){return this._v}set value(v){this._v=String(v)}}
const root=new El("div");const form=new El("form");root.appendChild(form);
const events=[];
const g2={console,Event:Ev,HTMLInputElement:Inp,module:undefined,setTimeout:()=>0,
 document:{readyState:"complete",createElement:t=>t==="input"?new Inp:new El(t),querySelectorAll:()=>[],addEventListener(){},body:root}};
g2.window=g2;vm.createContext(g2);
vm.runInContext(src,g2);
const inp=new Inp();inp.setAttribute("type","date");inp.setAttribute("data-k","tanggal");form.appendChild(inp);inp.value="2026-10-07";
g2.document.querySelectorAll=()=>[inp];form.querySelectorAll=()=>[inp];
vm.runInContext(src,g2);
const wrap=form.children.find(c=>c.className==="tgl-id");
cek("pemilih terpasang di samping input asli dan input asli disembunyikan",!!wrap&&inp.style.display==="none"&&inp.getAttribute("data-tgl-id")==="1");
const [box,btn]=wrap?wrap.children:[];
cek("hanya SATU kolom isian + satu tombol kalender (tanpa dropdown)",wrap&&wrap.children.length===2&&box.tag==="input"&&btn.tag==="button"&&!wrap.children.some(c=>c.tag==="select"));
cek("nilai awal 2026-10-07 tampil sebagai 07/10/2026",box.value==="07/10/2026");
form.addEventListener("input",e=>events.push(["input",e.target.value]));form.addEventListener("change",e=>events.push(["change",e.target.value]));
const ketik=v=>{box.value=v;box.dispatchEvent(new Ev("input",{bubbles:true}))};
ketik("1511");cek("mengetik 1511 -> otomatis 15/11, belum dikirim (belum lengkap)",box.value==="15/11"&&inp.value==="2026-10-07"&&events.length===0);
ketik("15112026");
cek("mengetik 15112026 -> 15/11/2026, nilai 2026-11-15, event input+change terkirim sekali dari input asli",box.value==="15/11/2026"&&inp.value==="2026-11-15"&&events.length===2&&events[0][0]==="input"&&events[1][1]==="2026-11-15");
events.length=0;ketik("7 Agustus 2026");box.dispatchEvent(new Ev("blur"));
cek("teks '7 Agustus 2026' dibaca saat pindah kolom -> 2026-08-07 dan dirapikan ke 07/08/2026",inp.value==="2026-08-07"&&box.value==="07/08/2026");
events.length=0;ketik("31/04/2026");box.dispatchEvent(new Ev("blur"));
cek("tanggal tidak ada (31 April) ditolak: nilai tetap, kolom ditandai salah",inp.value==="2026-08-07"&&box.classList.contains("tgl-salah")&&events.length===0);
events.length=0;ketik("");box.dispatchEvent(new Ev("blur"));
cek("mengosongkan kolom mengosongkan nilai dan mengirim event",inp.value===""&&events.some(e=>e[0]==="input"&&e[1]===""));
inp.value="2027-01-02";
cek("kode lain menulis .value -> kolom ikut berubah",box.value==="02/01/2027");
inp.value="";
cek("menghapus .value mengosongkan kolom",box.value==="");
ketik("0");inp.value="";
cek("isian setengah jadi tidak terhapus oleh penulisan .value yang nilainya sama",box.value==="0");
inp.value="2026-06-01";cek("tetapi nilai baru tetap menimpa isian",box.value==="01/06/2026");
inp.focus();cek("inp.focus() memfokuskan kolom isian",box.focused===true);
console.log(gagal?"\n"+gagal+" uji GAGAL":"\nSemua uji lulus");process.exit(gagal?1:0);
