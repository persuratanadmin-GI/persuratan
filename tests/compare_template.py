"""Uji visual terhadap dokumen referensi.

Pemakaian:
  1. Buat PDF dari aplikasi (tombol "Unduh PDF", atau Cetak > Simpan sebagai PDF: A4, margin None, skala 100%).
  2. pip install pymupdf
  3. python tests/compare_template.py Bahan_Proyek.pdf hasil.pdf

Yang dibandingkan: garis dasar teks, titik tengah teks, gaya huruf (tebal/miring) dan ketebalan garis.
Dokumen referensi berukuran Letter; aplikasi menskalakannya seragam setinggi A4 lalu menengahkannya
secara horizontal, jadi koordinat referensi dikonversi dengan nilai yang sama (PS dan DX di bawah).
Data contoh bawaan fiktif, jadi nama dan NIP tidak akan terpasangkan dengan referensi (itu normal).
Untuk perbandingan penuh, ubah sementara `sample` di js/config.js sesuai isi Bahan_Proyek.pdf (jangan diunggah).
"""
import statistics
import sys

import pymupdf as fitz

PS = 841.89 / 792   # skala Letter -> A4 (mengikuti tinggi halaman)
DX = -12.34         # pergeseran horizontal (pt) agar isi di tengah


def spans(path):
    out = []
    for b in fitz.open(path)[0].get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            for s in line["spans"]:
                t = s["text"].strip()
                if t:
                    out.append((t, s["origin"], s["bbox"], bool(s["flags"] & 16)))
    return out


def lines(path):
    r = []
    for d in fitz.open(path)[0].get_drawings():
        x = d["rect"]
        if (x.width > x.height and x.height < 2.5 and x.width > 40) or (x.height > x.width and x.width < 2.5 and x.height > 10):
            r.append(min(x.width, x.height))
    return sorted(r)


def main(ref, out):
    mine = {}
    for t, og, bb, bold in spans(out):
        mine.setdefault(t[:10], []).append((og, bb, bold))
    dy, dx, salah, hilang = [], [], 0, 0
    for t, og, bb, bold in spans(ref):
        cand = mine.get(t[:10])
        if not cand:
            hilang += 1
            continue
        ex = (og[0] * PS + DX, og[1] * PS)
        cx = (bb[0] + bb[2]) / 2 * PS + DX
        m = min(cand, key=lambda q: abs(q[0][1] - ex[1]) + abs(q[0][0] - ex[0]))
        dy.append(m[0][1] - ex[1])
        dx.append((m[1][0] + m[1][2]) / 2 - cx)
        salah += bold != m[2]
    print(f"teks dipasangkan: {len(dy)} (tidak ditemukan: {hilang})")
    print(f"selisih garis dasar : median {statistics.median(dy):+.2f} pt, terbesar {max(map(abs, dy)):.2f} pt")
    print(f"selisih titik tengah: median {statistics.median(dx):+.2f} pt, terbesar {max(map(abs, dx)):.2f} pt")
    print(f"gaya huruf tebal tidak cocok: {salah}")
    a = [w * PS for w in lines(ref)]
    b = lines(out)
    print(f"tebal garis referensi (skala): median {statistics.median(a):.2f} pt | hasil: median {statistics.median(b):.2f} pt")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
