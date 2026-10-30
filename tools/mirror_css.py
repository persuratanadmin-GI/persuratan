#!/usr/bin/env python3
"""Menyalin aturan tampilan panel SPPD (#sp-*) ke panel Restitusi (#rs-*) supaya keduanya tampil sama.
Pakai: python3 tools/mirror_css.py css/style.css css/modern.css > css/restitusi.css   (lalu tambahkan bagian khusus Restitusi di akhir)"""
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
MAP=[('#sp-peList','#rs-lkList'),('#sp-peQ','#rs-lkQ')]
def conv(s):
    for a,b in MAP:s=s.replace(a,b)
    return s.replace('#sp-','#rs-').replace('.mode-sppd','.mode-rs')
def top_split(sel):
    out=[];d=0;cur=''
    for ch in sel:
        if ch in '([':d+=1
        if ch in ')]':d-=1
        if ch==',' and d==0:out.append(cur);cur=''
        else:cur+=ch
    out.append(cur);return [x.strip() for x in out if x.strip()]
def only_sp(sel):
    """Sisakan hanya selektor #sp-* (juga di dalam :is(...)), supaya aturan lama tidak ikut tertimpa."""
    keep=[]
    for item in top_split(sel):
        def fix(m):
            parts=[x.strip() for x in top_split(m.group(1)) if '#sp-' in x]
            return ':is('+','.join(parts)+')'
        item=re.sub(r':is\(([^()]*)\)',fix,item)
        if '#sp-' in item:keep.append(item)
    return ','.join(keep)
def mirror(t):
    res=[]
    for pre,body in split_blocks(strip_comments(t)):
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner=[conv(only_sp(p2))+'{'+b2+'}' for p2,b2 in split_blocks(body) if '#sp-' in p2]
            if inner:res.append(pre+'{\n'+'\n'.join(inner)+'\n}')
        elif pre.startswith('@'):continue
        elif '#sp-' in pre:res.append(conv(only_sp(pre))+'{'+body+'}')
    return res
out=['/* Modul Restitusi SPPD: aturan tampilan antarmuka DISALIN otomatis dari aturan #sp-* (SPPD) milik style.css dan modern.css,\n   supaya panel Restitusi tampil sama dengan panel SPPD. Dibuat oleh tools/mirror_css.py; bagian setelah garis "KHUSUS RESTITUSI" ditulis manual. */']
for f in sys.argv[1:]:
    out.append('/* dari '+f+' */');out+=mirror(open(f,encoding='utf8').read())
print('\n'.join(out))
