#!/usr/bin/env python3
"""Menyalin aturan tampilan panel SPPD (#sp-*) dan beberapa id khusus Surat Lembur HAR ke panel Lembur Driver (#dv-*)
supaya panel Driver tampil sama dengan panel lain. Pakai:
  python3 tools/mirror_css_driver.py css/style.css css/modern.css > css/driver.css   (lalu tambahkan bagian khusus Driver di akhir)"""
import re,sys
def strip_comments(t): return re.sub(r'/\*.*?\*/','',t,flags=re.S)
def split_blocks(t):
    out=[];i=0;n=len(t)
    while i<n:
        j=t.find('{',i)
        if j<0:break
        pre=t[i:j].strip();d=1;k=j+1
        while k<n and d:
            if t[k]=='{':d+=1
            elif t[k]=='}':d-=1
            k+=1
        out.append((pre,t[j+1:k-1]));i=k
    return out
# id HAR yang juga dipakai panel Driver (selektor yang HANYA memuat id ini ikut disalin)
HAR=[('#tab-in>','#dv-tab-in>'),('#m-man','#dv-m-man'),('#m-wa','#dv-m-wa'),('#bXl','#dv-bXl'),('#rXl','#dv-rXl')]
def conv(s):
    s=s.replace('#sp-','#dv-').replace('.mode-sppd','.mode-drv')
    for a,b in HAR:s=s.replace(a,b)
    return s
def top_split(sel):
    out=[];d=0;cur=''
    for ch in sel:
        if ch in '([':d+=1
        if ch in ')]':d-=1
        if ch==',' and d==0:out.append(cur);cur=''
        else:cur+=ch
    out.append(cur);return [x.strip() for x in out if x.strip()]
def relevant(x): return '#sp-' in x or any(a in x for a,_ in HAR)
def only_rel(sel):
    keep=[]
    for item in top_split(sel):
        def fix(m):
            parts=[x.strip() for x in top_split(m.group(1)) if relevant(x)]
            return ':is('+','.join(parts)+')'
        item=re.sub(r':is\(([^()]*)\)',fix,item)
        if relevant(item):keep.append(item)
    return ','.join(keep)
def mirror(t):
    res=[]
    for pre,body in split_blocks(strip_comments(t)):
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner=[conv(only_rel(p2))+'{'+b2+'}' for p2,b2 in split_blocks(body) if relevant(p2)]
            if inner:res.append(pre+'{\n'+'\n'.join(inner)+'\n}')
        elif pre.startswith('@'):continue
        elif relevant(pre):res.append(conv(only_rel(pre))+'{'+body+'}')
    return res
out=['/* Modul Lembur Driver: aturan tampilan antarmuka DISALIN otomatis dari aturan #sp-* (SPPD) dan id Surat Lembur HAR milik style.css dan modern.css,\n   supaya panel Driver tampil sama. Dibuat oleh tools/mirror_css_driver.py; bagian setelah garis "KHUSUS DRIVER" ditulis manual. */']
for f in sys.argv[1:]:
    out.append('/* dari '+f+' */');out+=mirror(open(f,encoding='utf8').read())
print('\n'.join(out))
