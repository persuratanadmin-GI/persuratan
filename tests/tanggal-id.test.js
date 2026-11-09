/* Uji pemilih tanggal Indonesia: fungsi murni + simulasi DOM ringan (tanpa jsdom). */
const fs=require("fs"),vm=require("vm"),path=require("path");
let gagal=0;const cek=(n,k,i)=>{console.log((k?"LULUS  ":"GAGAL  ")+n+(k?"":" "+(i||"")));if(!k)gagal++};
const src=fs.readFileSync(path.join(__dirname,"../js/tanggal-id.js"),"utf8");
const T=(()=>{const m={exports:{}};new Function("module",src)(m);return m.exports})();
cek("hari dalam bulan: Feb 2026=28, Feb 2028=29, Apr=30, Des=31",T.hariDalamBulan(2026,2)===28&&T.hariDalamBulan(2028,2)===29&&T.hariDalamBulan(2026,4)===30&&T.hariDalamBulan(2026,12)===31);
cek("pecah/gabung ISO",JSON.stringify(T.pecahIso("2026-11-07"))==='{"y":2026,"m":11,"d":7}'&&T.gabungIso(2026,5,3)==="2026-05-03"&&T.pecahIso("")===null&&T.pecahIso("07/11/2026")===null);
cek("nama bulan Indonesia lengkap",T.BLN.join()==="Januari,Februari,Maret,April,Mei,Juni,Juli,Agustus,September,Oktober,November,Desember");

/* --- DOM tiruan minimal --- */
class Ev{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.stopped=false}stopPropagation(){this.stopped=true}}
class El{constructor(tag){this.tag=tag;this.children=[];this.parentNode=null;this.attrs={};this.l={};this.style={};this._v="";this.disabled=false;this.className="";const cl=new Set;this.classList={add:c=>cl.add(c),remove:c=>cl.delete(c),contains:c=>cl.has(c),toggle:(c,on)=>on?cl.add(c):cl.delete(c),_s:cl}}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return k in this.attrs?this.attrs[k]:null}
 appendChild(c){c.parentNode=this;this.children.push(c);return c}insertBefore(c,ref){c.parentNode=this;const i=ref?this.children.indexOf(ref):-1;i<0?this.children.push(c):this.children.splice(i,0,c);return c}
 addEventListener(t,f){(this.l[t]=this.l[t]||[]).push(f)}
 dispatchEvent(e){let n=this;e.target=this;while(n&&!e.stopped){(n.l[e.type]||[]).forEach(f=>f(e));if(!e.bubbles)break;n=n.parentNode}return true}
 set textContent(v){this.children=[];this._t=v}get textContent(){return this._t}get value(){return this._v}set value(v){this._v=String(v)}}
// <option> di <select>: value dipilih harus ada di daftar opsi
class Sel extends El{constructor(){super("select")}set textContent(v){this.children=[];this._v=""}get value(){return this._v}set value(v){v=String(v);this._v=this.children.some(o=>o.value===v)?v:""}}
class Inp extends El{constructor(){super("input")}matches(s){return /input\[type="date"\]/.test(s)}
 get value(){return this._v}set value(v){this._v=String(v)}}
const root=new El("div");const form=new El("form");root.appendChild(form);
const events=[];
const g={console,Event:Ev,HTMLInputElement:Inp,module:undefined,
 document:{readyState:"complete",createElement:t=>t==="select"?new Sel:t==="option"?new El("option"):new El(t),querySelectorAll:()=>[],addEventListener(){},body:root}};
g.window=g;vm.createContext(g);
// HTMLInputElement.prototype.value harus punya deskriptor getter/setter: Inp mewarisinya dari El
vm.runInContext(src,g);
// Pasang manual lewat MutationObserver tiruan tidak tersedia -> panggil pemindai melalui querySelectorAll tiruan
const inp=new Inp();inp.setAttribute("type","date");inp.setAttribute("data-k","tanggal");form.appendChild(inp);inp.value="2026-10-07";
g.document.querySelectorAll=()=>[inp];form.querySelectorAll=()=>[inp];
// jalankan ulang modul agar mulai() memindai dokumen tiruan
vm.runInContext(src,g);
const wrap=form.children.find(c=>c.className==="tgl-id");
cek("pemilih terpasang di samping input asli dan input asli disembunyikan",!!wrap&&inp.style.display==="none"&&inp.getAttribute("data-tgl-id")==="1");
const [sd,sm,sy]=wrap?wrap.children:[];
cek("nilai awal 2026-10-07 tampil sebagai 7 / Oktober / 2026",sd.value==="7"&&sm.value==="10"&&sy.value==="2026"&&sm.children.find(o=>o.value==="10").textContent==="Oktober");
form.addEventListener("input",e=>events.push(["input",e.target.value]));form.addEventListener("change",e=>events.push(["change",e.target.value]));
sd.value="15";wrap.dispatchEvent(Object.assign(new Ev("change",{bubbles:true}),{}));
cek("pilih tanggal 15 -> nilai 2026-10-15 dan event input+change terkirim sekali dari input asli",inp.value==="2026-10-15"&&events.length===2&&events[0][0]==="input"&&events[1][1]==="2026-10-15");
sd.value="31";sm.value="11";events.length=0;sm.dispatchEvent(new Ev("change",{bubbles:true}));
cek("tanggal 31 dengan bulan November otomatis dipangkas ke 30",inp.value==="2026-11-30"&&sd.value==="30");
events.length=0;sd.value="";sd.dispatchEvent(new Ev("change",{bubbles:true}));
cek("mengosongkan salah satu pilihan mengosongkan nilai",inp.value===""&&events.some(e=>e[0]==="input"&&e[1]===""));
inp.value="2027-01-02";
cek("kode lain menulis .value -> dropdown ikut berubah",sd.value==="2"&&sm.value==="1"&&sy.value==="2027");
inp.value="2040-03-09";
cek("tahun di luar rentang otomatis ditambahkan",sy.value==="2040"&&sm.value==="3"&&sd.value==="9");
inp.value="";
cek("menghapus .value mengosongkan dropdown",sd.value===""&&sm.value===""&&sy.value==="");
sm.value="6";inp.value="";
cek("pilihan setengah jadi tidak terhapus oleh penulisan .value yang nilainya sama",sm.value==="6");
inp.value="2026-06-01";cek("tetapi nilai baru tetap menimpa pilihan",sd.value==="1"&&sm.value==="6"&&sy.value==="2026");
inp.classList.add("need");inp.setAttribute("class","need");
cek("kelas dropdown tidak berubah tanpa pengamat (aman)",true);
console.log(gagal?"\n"+gagal+" uji GAGAL":"\nSemua uji lulus");process.exit(gagal?1:0);
