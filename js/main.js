"use strict";
/* Inisialisasi aplikasi. */
/* ===== Mulai ===== */
{const s=DB.settings;if(!cur.koorName)cur.koorName=s.koorName;if(!cur.koorJab)cur.koorJab=s.kepada;if(!cur.jabatan)cur.jabatan=s.jabPers;if(!cur.pemberiJab)cur.pemberiJab=s.jabPemberi;if(!cur.sigK)autoSig("K");if(!cur.sigG)autoSig("G");if(!cur.sigP)autoSig("P")}buildForm();if(!cur.spk&&!cur.lemburNo&&!cur.name)resetNo();syncForm();update();fit();setTimeout(fit,100);
