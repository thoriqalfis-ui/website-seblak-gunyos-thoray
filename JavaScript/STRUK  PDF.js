'use strict';

/* ===== Pembuat struk PDF =====
   Tanpa library dan tanpa CDN: PDF ditulis langsung di browser dengan font Helvetica bawaan PDF,
   jadi cocok untuk GitHub Pages dan tetap bisa dipakai tanpa internet.
   Dipanggil oleh cart.js: makeReceiptPdf(order, { name, type, contact }) mengembalikan Blob PDF. */
window.makeReceiptPdf = (order, shop) => {
  const W = 595, H = 842, M = 40, BOTTOM = H - 70;
  const RED = '#C4290F', INK = '#231916', GRAY = '#6B615C', LINE = '#E7E1DE', SOFT = '#F6F3F1', GREEN = '#1F9D55';

  // Lebar huruf Helvetica (kode 32-126, per 1000 unit) untuk rata kanan, tengah, dan pemenggalan baris
  const WIDTHS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
    556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
    778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
    500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

  const clean = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
  const esc = (s) => clean(s).replace(/[\\()]/g, '\\$&');
  const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const idr = (n) => 'Rp' + n.toLocaleString('id-ID');
  const measure = (s, size, bold) => [...clean(s)].reduce((sum, ch) => sum + (WIDTHS[ch.charCodeAt(0) - 32] ?? 556), 0) * size / 1000 * (bold ? 1.06 : 1);

  const fit = (s, size, max, bold) => {
    let out = clean(s);
    while (out.length > 1 && measure(out, size, bold) > max) out = out.slice(0, -1);
    return out === clean(s) ? out : out.slice(0, -2) + '...';
  };

  const wrap = (s, size, max) => {
    const lines = [];
    let line = '';
    clean(s).split(' ').forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, size) > max) { lines.push(line); line = word; } else line = next;
    });
    lines.push(line);
    return lines;
  };

  /* ===== Perintah gambar. Posisi "top" dihitung dari atas halaman ===== */
  const pages = [];
  let ops;
  let y;
  const put = (s) => ops.push(s);
  const fill = (x, top, w, h, hex) => put(`${rgb(hex)} rg ${x} ${H - top - h} ${w} ${h} re f`);
  const rule = (x1, x2, top, hex, dash) => put(`${rgb(hex)} RG 0.8 w ${dash ? '[3 3] 0' : '[] 0'} d ${x1} ${H - top} m ${x2} ${H - top} l S`);

  const text = (s, x, top, size, hex = INK, { bold = false, align = 'left' } = {}) => {
    const w = measure(s, size, bold);
    const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    put(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(hex)} rg ${left.toFixed(2)} ${(H - top - size * 0.8).toFixed(2)} Td (${esc(s)}) Tj ET`);
  };

  const circle = (cx, cy, r, hex) => {
    const k = 0.5523 * r, py = H - cy;
    put(`${rgb(hex)} rg ${cx + r} ${py} m ${cx + r} ${py + k} ${cx + k} ${py + r} ${cx} ${py + r} c ${cx - k} ${py + r} ${cx - r} ${py + k} ${cx - r} ${py} c ` +
      `${cx - r} ${py - k} ${cx - k} ${py - r} ${cx} ${py - r} c ${cx + k} ${py - r} ${cx + r} ${py - k} ${cx + r} ${py} c f`);
  };

  const check = (cx, cy, s) => {
    const pt = (dx, dy) => `${(cx + dx).toFixed(2)} ${(H - cy - dy).toFixed(2)}`;
    put(`1 1 1 RG 2.6 w 1 J 1 j [] 0 d ${pt(-0.55 * s, 0)} m ${pt(-0.15 * s, 0.4 * s)} l ${pt(0.6 * s, -0.45 * s)} l S`);
  };

  const pill = (label, x, top, bg, fg) => {
    const w = measure(label, 8.5, true) + 20;
    fill(x, top, w, 20, bg);
    text(label, x + 10, top + 5.5, 8.5, fg, { bold: true });
    return x + w + 8;
  };

  /* ===== Isi struk ===== */
  const paid = order.payment === 'paid';
  const payLabel = paid ? 'LUNAS' : 'MENUNGGU PEMBAYARAN';
  const when = new Date(order.time);
  const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const fee = order.fee || 0;
  const discount = order.discount || 0;
  const grand = subtotal + fee - discount;

  const COL = { qty: 335, price: 452, sub: W - M - 10, nameMax: 245 };

  const tableHead = () => {
    fill(M, y, W - 2 * M, 24, INK);
    text('PRODUK', M + 10, y + 8, 9, '#FFFFFF', { bold: true });
    text('QTY', COL.qty, y + 8, 9, '#FFFFFF', { bold: true, align: 'center' });
    text('HARGA SATUAN', COL.price, y + 8, 9, '#FFFFFF', { bold: true, align: 'right' });
    text('SUBTOTAL', COL.sub, y + 8, 9, '#FFFFFF', { bold: true, align: 'right' });
    y += 24;
  };

  const newPage = () => { ops = []; pages.push(ops); y = M; };

  // Halaman pertama: kepala usaha, tanda berhasil, status, dan data transaksi
  ops = [];
  pages.push(ops);
  fill(0, 0, W, 92, RED);
  text(shop.name, M, 24, 22, '#FFFFFF', { bold: true });
  text(shop.type, M, 54, 11, '#FFE2DB');
  if (shop.contact) text(`WhatsApp ${shop.contact}`, W - M, 30, 10, '#FFFFFF', { align: 'right' });

  circle(M + 17, 125, 17, GREEN);
  check(M + 17, 125, 9);
  text('Bukti Transaksi', M + 46, 107, 18, INK, { bold: true });
  text('Pesanan berhasil dibuat dan dikirim ke penjual', M + 46, 132, 10, GRAY);

  const afterFirst = pill('PESANAN TERKIRIM', M, 158, '#E3F6EA', '#14753D');
  pill(payLabel, afterFirst, 158, paid ? '#E3F6EA' : '#FFF1D6', paid ? '#14753D' : '#9A5B00');

  const half = (W - 2 * M) / 2;
  const meta = [
    [['No. Transaksi', order.id], ['Nama pelanggan', order.name]],
    [['Tanggal', when.toLocaleDateString('id-ID', { dateStyle: 'long' })], ['WhatsApp pelanggan', `+${order.phone}`]],
    [['Waktu', when.toLocaleTimeString('id-ID', { timeStyle: 'short' })], ['Metode pembayaran', 'Dikonfirmasi bersama penjual']],
    [['Metode pemesanan', 'Pesan lewat WhatsApp'], ['Status pembayaran', paid ? 'Lunas' : 'Menunggu pembayaran']]
  ];
  fill(M, 192, W - 2 * M, 124, SOFT);
  meta.forEach((row, i) => row.forEach(([label, value], col) => {
    const x = M + 14 + col * half;
    text(label, x, 202 + i * 28, 8.5, GRAY);
    text(fit(value, 11, half - 24, true), x, 213 + i * 28, 11, INK, { bold: true });
  }));
  y = 338;

  // Tabel produk (baris panjang dipenggal, halaman baru jika perlu)
  tableHead();
  order.items.forEach((item) => {
    const lines = wrap(item.name, 10.5, COL.nameMax);
    const height = Math.max(28, lines.length * 13 + 14);
    if (y + height > BOTTOM) { newPage(); tableHead(); }
    lines.forEach((line, i) => text(line, M + 10, y + 8 + i * 13, 10.5, INK, { bold: i === 0 }));
    text(String(item.qty), COL.qty, y + 8, 10.5, INK, { align: 'center' });
    text(idr(item.price), COL.price, y + 8, 10.5, INK, { align: 'right' });
    text(idr(item.subtotal), COL.sub, y + 8, 10.5, INK, { bold: true, align: 'right' });
    y += height;
    rule(M, W - M, y, LINE);
  });

  // Ringkasan pembayaran
  const summary = [['Total harga produk', idr(subtotal)]];
  if (fee) summary.push(['Biaya tambahan', idr(fee)]);
  if (discount) summary.push(['Diskon', `-${idr(discount)}`]);
  if (y + summary.length * 20 + 130 > BOTTOM) newPage();
  y += 14;
  summary.forEach(([label, value]) => {
    text(label, W - M - 250, y, 10.5, GRAY);
    text(value, COL.sub, y, 10.5, INK, { align: 'right' });
    y += 20;
  });
  rule(W - M - 250, W - M, y + 2, INK);
  text('TOTAL PEMBAYARAN', W - M - 250, y + 12, 10, INK, { bold: true });
  text(idr(grand), COL.sub, y + 9, 17, RED, { bold: true, align: 'right' });
  y += 52;

  // Penutup
  rule(M, W - M, y, '#B9AEA8', true);
  text('Terima kasih telah memesan di Seblak Gunyos Thoray', W / 2, y + 16, 12, INK, { bold: true, align: 'center' });
  text('Simpan bukti ini sebagai catatan pesananmu. Pembayaran dikonfirmasi oleh penjual lewat WhatsApp.', W / 2, y + 36, 9, GRAY, { align: 'center' });
  text('Dokumen ini bukan bukti pembayaran selama status masih "Menunggu Pembayaran".', W / 2, y + 50, 9, GRAY, { align: 'center' });
  text(`${shop.name}  |  ${shop.type}`, W / 2, y + 72, 9, RED, { bold: true, align: 'center' });

  if (pages.length > 1) {
    pages.forEach((page, i) => { ops = page; text(`Halaman ${i + 1} dari ${pages.length}`, W / 2, H - 36, 8, GRAY, { align: 'center' }); });
  }

  /* ===== Susun file PDF (setiap karakter = 1 byte) ===== */
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  ];
  const pageIds = pages.map((page) => {
    const stream = page.join('\n');
    const contentId = objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = objects.map((body, i) => {
    const start = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return start;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}` +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 255)], { type: 'application/pdf' });
};