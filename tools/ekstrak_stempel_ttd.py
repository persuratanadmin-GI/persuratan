#!/usr/bin/env python3
"""Mengambil stempel dan tanda tangan dari PDF scan Blangko SPPD menjadi PNG transparan siap unggah
(tab Lokasi: kolom stempel dan tanda tangan; matikan kotak "foto/scan" karena gambar sudah bersih).

Dua sumber, dicoba berurutan untuk setiap PDF:
 1. LAPISAN  : stempel/TTD yang ditempel sebagai gambar terpisah ber-mask (smask) diambil UTUH, tanpa pemisahan warna.
 2. WARNA    : pada gambar latar scan, lingkaran stempel dicari lewat warna biru/ungu lalu dibuat transparan.
               Bila TTD berwarna sama dan menimpa stempel, TTD ikut menempel di gambar stempel (tidak bisa dipisah lewat warna).
Pemakaian : python3 tools/ekstrak_stempel_ttd.py <folder berisi PDF> <folder hasil>
Syarat    : Python 3, Pillow, numpy, scipy, dan poppler-utils (pdfimages)."""
import sys,os,re,glob,hashlib,subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
MAXSIDE=480

def slug(f):
    s=re.sub(r'\.pdf$','',os.path.basename(f),flags=re.I)
    s=re.sub(r'(?i)\b(scan|blangko|blanko|sppd|stempel|ultg)\b','',s)
    s=re.sub(r'[^A-Za-z0-9]+','_',s).strip('_')
    return s or 'dokumen'

def ring_cover(a):
    """Seberapa penuh keliling gambar tertutup tinta (0..1). Stempel = lingkaran penuh, tanda tangan = coretan."""
    h,w=a.shape;yy,xx=np.mgrid[0:h,0:w];cx,cy=(w-1)/2,(h-1)/2;r=np.hypot((xx-cx)/(w/2),(yy-cy)/(h/2));ang=(np.arctan2(yy-cy,xx-cx)+np.pi)/(2*np.pi)
    m=(a>.3)&(r>.74)&(r<1.06);return len(set((ang[m]*36).astype(int)))/36

def trim(rgba,pad=2):
    bb=rgba.getbbox()
    if not bb:return None
    x0,y0,x1,y1=bb;return rgba.crop((max(0,x0-pad),max(0,y0-pad),x1+pad,y1+pad))

def save(im,path):
    im=trim(im)
    if im is None:return False
    if max(im.size)>MAXSIDE:im.thumbnail((MAXSIDE,MAXSIDE),Image.LANCZOS)
    im.save(path,optimize=True);return True

def layered(pdf,tmp):
    subprocess.run(['pdfimages','-f','1','-l','1','-png',pdf,tmp+'/i'],stderr=subprocess.DEVNULL)
    lst=[l.split() for l in subprocess.run(['pdfimages','-f','1','-l','1','-list',pdf],capture_output=True,text=True).stdout.splitlines()[2:]]
    out=[]
    for i,r in enumerate(lst):
        if r[2]!='image' or i+1>=len(lst) or lst[i+1][2]!='smask':continue
        f=sorted(glob.glob(f'{tmp}/i-{i:03d}.png')) ;m=sorted(glob.glob(f'{tmp}/i-{i+1:03d}.png'))
        if not f or not m:continue
        im=Image.open(f[0]).convert('RGBA');im.putalpha(Image.open(m[0]).convert('L').resize(im.size));out.append(im)
    return out

def backgrounds(pdf,tmp):
    lst=[l.split() for l in subprocess.run(['pdfimages','-f','1','-l','1','-list',pdf],capture_output=True,text=True).stdout.splitlines()[2:]]
    out=[]
    for i,r in enumerate(lst):
        if r[2]!='image' or int(r[3])<700:continue
        if i+1<len(lst) and lst[i+1][2]=='smask':continue
        f=sorted(glob.glob(f'{tmp}/i-{i:03d}.png'))
        if f:
            im=Image.open(f[0]).convert('RGB')
            if im.width>1800:im=im.resize((1800,int(im.height*1800/im.width)),Image.LANCZOS)   # cukup untuk mencari stempel; mempercepat
            out.append(im)
    return out

def color_stamps(im):
    A=np.array(im).astype(float);R,G,B=A[...,0],A[...,1],A[...,2];mx=A.max(2);mn=A.min(2);sat=(mx-mn)/(mx+1)
    col=(sat>.16)&(B>R-10)&(B>G+8)&(mx>60);cl=ndi.binary_closing(col,iterations=max(2,im.width//400));lab,n=ndi.label(cl)
    ch=B-(R+G)/2;res=[]
    for i,s in enumerate(ndi.sum(cl,lab,range(1,n+1))):
        ys,xs=np.where(lab==i+1);w=xs.max()-xs.min()+1;h=ys.max()-ys.min()+1
        if not(.07*im.width<w<.30*im.width and .8<w/h<1.25):continue
        p=int(.02*im.width);x0,y0,x1,y1=max(0,xs.min()-p),max(0,ys.min()-p),xs.max()+p,ys.max()+p
        sub=A[y0:y1,x0:x1];c=ch[y0:y1,x0:x1];al=np.clip((c-4)/26,0,1)**.8
        tight=al[ys.min()-y0:ys.max()-y0+1,xs.min()-x0:xs.max()-x0+1]
        if ring_cover(tight)<.7:continue                                   # bukan lingkaran penuh (teks, coretan, noda)
        op=ndi.binary_opening(al>.3,structure=np.ones((3,3)));al=al*ndi.binary_dilation(op,iterations=2)   # buang garis tipis sisa formulir
        strong=c>np.percentile(c[al>.3],70);ink=np.median(sub[strong],axis=0)*.82
        rgba=np.zeros(sub.shape[:2]+(4,),np.uint8);rgba[...,:3]=np.clip(ink,0,255).astype(np.uint8);rgba[...,3]=(al*255).astype(np.uint8)
        res.append(Image.fromarray(rgba,'RGBA'))
    return res

def main(src,dst):
    os.makedirs(dst,exist_ok=True);seen=set();log=[]
    for pdf in sorted(glob.glob(os.path.join(src,'*.pdf'))):
        name=slug(pdf);tmp=os.path.join(dst,'.tmp');os.makedirs(tmp,exist_ok=True)
        for f in glob.glob(tmp+'/*'):os.remove(f)
        n=0
        def put(im,kind,sumber):
            nonlocal n
            h=hashlib.md5(np.array(im.convert('RGBA').resize((64,64))).tobytes()).hexdigest()[:8]
            if h in seen:return
            n+=1;fn=f'{name}_{kind}_{n}.png'
            if save(im,os.path.join(dst,fn)):seen.add(h);log.append((fn,kind,sumber,os.path.basename(pdf)))
        for im in layered(pdf,tmp):
            t=trim(im,0);a=np.array(t)[...,3]/255.;put(im,'stempel' if ring_cover(a)>=.8 else 'ttd','lapisan')
        for bg in backgrounds(pdf,tmp):
            for im in color_stamps(bg):put(im,'stempel','warna')
    for f in glob.glob(os.path.join(dst,'.tmp','*')):os.remove(f)
    os.rmdir(os.path.join(dst,'.tmp'))
    with open(os.path.join(dst,'DAFTAR.txt'),'w',encoding='utf8') as f:
        f.write('berkas\tjenis\tsumber\tpdf asal\n'+'\n'.join('\t'.join(x) for x in log)+'\n')
    print(len(log),'gambar ->',dst)
if __name__=='__main__':
    if len(sys.argv)<3:print(__doc__);sys.exit(1)
    main(sys.argv[1],sys.argv[2])
