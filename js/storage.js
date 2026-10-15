"use strict";
/* Penyimpanan data (localStorage) dan struktur data bawaan. */
/* ===== Penyimpanan ===== */
const KEY="lembur.v1";
const DEF={people:[],sigs:[],records:[],settings:{...APP_CONFIG.defaults}};
let DB=load();
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.records)return{...DEF,...d,settings:{...DEF.settings,...d.settings}}}catch(e){}return JSON.parse(JSON.stringify(DEF))}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DB));$("st").textContent="Tersimpan "+new Date().toLocaleTimeString("id-ID")}catch(e){$("st").textContent="Gagal menyimpan: penyimpanan penuh/dinonaktifkan"}}
