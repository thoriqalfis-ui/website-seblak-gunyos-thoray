'use strict';

/* ===== Keranjang belanja + checkout WhatsApp + struk pesanan =====
   Dipakai index.html dan menu.html. Struk PDF juga dibuat di file ini. Data menu diambil dari MENU (menu-data.js),
   jadi tidak ada data produk ganda. Dibungkus fungsi agar tidak bentrok dengan script lain. */
(() => {
  const CART_WHATSAPP = '6285711121806'; // nomor pemilik usaha: awali 62, tanpa 0 di depan
  const SHOP_NAME = 'SEBLAK GUNYOS THORAY';
  const CART_KEY = 'seblak-cart';
  const NAME_KEY = 'seblak-customer-name';
  const PHONE_KEY = 'seblak-customer-phone';
  const ORDER_KEY = 'seblak-last-order'; // pesanan terakhir: draf, atau sudah dikonfirmasi terkirim

  const ICON_CART = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cart-fill" viewBox="0 0 16 16" aria-hidden="true"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>`;
  const ICON_TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const ICON_PDF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"/></svg>`;

  const q = (selector, root = document) => root.querySelector(selector);
  const idr = (amount) => 'Rp' + amount.toLocaleString('id-ID'); // format pesan dan struk: Rp15.000
  const esc = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* penyimpanan penuh atau diblokir */ } };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const product = (name) => MENU.find((item) => item.name === name);

  // Status pembayaran tidak pernah otomatis LUNAS: butuh konfirmasi penjual (lihat catatan di struk)
  const PAYMENT = { pending: ['Menunggu Pembayaran', 'is-pending'], paid: ['LUNAS', 'is-paid'] };

  const normalizePhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8')) digits = '62' + digits;
    return /^628\d{8,12}$/.test(digits) ? digits : '';
  };

  const newTransactionId = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => (b % 36).toString(36)).join('').toUpperCase();
    return `SGT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${rand}`;
  };

  /* ===== Data: keranjang [{ name, qty }] dan pesanan terakhir, disimpan di localStorage ===== */
  const savedCart = read(CART_KEY, []);
  let cart = (Array.isArray(savedCart) ? savedCart : []).filter((line) => product(line.name) && line.qty > 0);
  let order = read(ORDER_KEY, null);
  let dismissed = false; // struk sudah ditutup pelanggan, jangan munculkan lagi saat kembali dari WhatsApp

  const lineTotal = (line) => product(line.name).price * line.qty;
  const cartTotal = () => cart.reduce((sum, line) => sum + lineTotal(line), 0);
  const cartCount = () => cart.reduce((sum, line) => sum + line.qty, 0);

  /* ===== Tampilan: tombol navbar, panel keranjang, struk, notifikasi ===== */
  const bar = q('.header-inner, .page-bar');
  const nav = q('.nav', bar);
  const button = `<button class="cart-btn" type="button" aria-label="Buka keranjang belanja" aria-controls="cart-drawer">${ICON_CART}<span class="cart-badge" hidden>0</span></button>`;
  if (nav) nav.insertAdjacentHTML('beforebegin', button); // di samping menu navigasi
  else bar.insertAdjacentHTML('beforeend', button);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-overlay"></div>
    <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true" inert>
      <header class="cart-head">
        <h2 id="cart-title">Keranjang Belanja</h2>
        <button class="cart-close" type="button" data-cart="close" aria-label="Tutup keranjang">${ICON_CLOSE}</button>
      </header>
      <div class="cart-body"></div>
      <footer class="cart-foot">
        <div class="cart-name" hidden>
          <label for="cart-name">Nama lengkap</label>
          <input id="cart-name" type="text" autocomplete="name" maxlength="60" placeholder="Contoh: Budi Santoso" aria-describedby="cart-error">
          <p class="cart-error" id="cart-error" role="alert" hidden>Mohon isi nama lengkap agar pesananmu mudah dikenali.</p>
          <label for="cart-phone">Nomor WhatsApp</label>
          <input id="cart-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Contoh: 081234567890" aria-describedby="cart-phone-error">
          <p class="cart-error" id="cart-phone-error" role="alert" hidden>Masukkan nomor WhatsApp yang benar, misalnya 081234567890.</p>
        </div>
        <p class="cart-total"><span>Total</span><strong></strong></p>
        <div class="cart-actions">
          <button class="btn btn-outline" type="button" data-cart="close">Lanjut Belanja</button>
          <button class="btn btn-primary" type="button" data-cart="checkout">Pesan Sekarang</button>
        </div>
      </footer>
    </aside>
    <div class="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title" aria-hidden="true" inert>
      <div class="receipt-paper"></div>
    </div>
    <div class="cart-toast" role="status"></div>`);

  const root = document.documentElement;
  const drawer = q('#cart-drawer');
  const receipt = q('.receipt-modal');
  const toast = q('.cart-toast');
  const nameInput = q('#cart-name');
  const nameError = q('#cart-error');
  const phoneInput = q('#cart-phone');
  const phoneError = q('#cart-phone-error');
  let lastFocus = null;
  let toastTimer = null;

  try {
    nameInput.value = localStorage.getItem(NAME_KEY) || '';
    phoneInput.value = localStorage.getItem(PHONE_KEY) || '';
  } catch { /* abaikan */ }

  const bump = (el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  function render() {
    const count = cartCount();
    const badge = q('.cart-badge');
    badge.textContent = count;
    badge.hidden = count === 0;

    q('.cart-body', drawer).innerHTML = cart.length ? `<ul class="cart-list">${cart.map((line, i) => {
      const item = product(line.name);
      return `
        <li class="cart-line">
          <div class="cart-thumb"><img src="${item.image}" alt="" loading="lazy" onerror="this.remove()"></div>
          <div class="cart-info">
            <strong>${item.name}</strong>
            <span class="cart-unit">${rupiah(item.price)}</span>
            <div class="cart-qty">
              <button type="button" data-cart="dec" data-i="${i}" aria-label="Kurangi jumlah ${item.name}">&minus;</button>
              <span>${line.qty}</span>
              <button type="button" data-cart="inc" data-i="${i}" aria-label="Tambah jumlah ${item.name}">+</button>
            </div>
          </div>
          <div class="cart-side">
            <strong>${rupiah(lineTotal(line))}</strong>
            <button class="cart-remove" type="button" data-cart="remove" data-i="${i}" aria-label="Hapus ${item.name}">${ICON_TRASH}</button>
          </div>
        </li>`;
    }).join('')}</ul>` : `<p class="cart-empty">Keranjang Belanja Masih Kosong</p>${order?.sent ? '<button class="btn btn-outline cart-last" type="button" data-cart="last">Lihat Struk Terakhir</button>' : ''}`;

    q('.cart-total strong', drawer).textContent = rupiah(cartTotal());
    q('[data-cart="checkout"]', drawer).disabled = cart.length === 0;
    q('.cart-name', drawer).hidden = cart.length === 0;
  }

  function save() {
    store(CART_KEY, JSON.stringify(cart));
    render();
  }

  function setOpen(open) {
    drawer.inert = !open;
    drawer.setAttribute('aria-hidden', String(!open));
    root.classList.toggle('cart-open', open);
    if (open) {
      lastFocus = document.activeElement;
      q('.cart-close', drawer).focus();
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }

  function setReceipt(open) {
    receipt.inert = !open;
    receipt.setAttribute('aria-hidden', String(!open));
    root.classList.toggle('receipt-open', open);
    if (open) q('.receipt-actions .btn', receipt).focus();
    else q('.cart-btn').focus();
  }

  function closeReceipt() {
    dismissed = true;
    setReceipt(false);
  }

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  /* ===== Tambah ke keranjang dari kartu menu ===== */
  function addItem(trigger) {
    const item = MENU[Number(trigger.dataset.add)];
    const line = cart.find((entry) => entry.name === item.name);
    if (line) line.qty += 1;
    else cart.push({ name: item.name, qty: 1 });
    save();

    bump(q('.cart-badge'));
    bump(q('.cart-btn'));
    notify(`${item.name} ditambahkan`);
    trigger.textContent = 'Ditambahkan ✓';
    trigger.classList.add('is-added');
    setTimeout(() => { trigger.textContent = 'Tambah ke Keranjang'; trigger.classList.remove('is-added'); }, 1200);
  }

  // Pasang tombol "Tambah ke Keranjang" pada setiap kartu menu (juga kartu hasil cari/filter)
  function decorateCards() {
    document.querySelectorAll('.card:not([data-cart-ready])').forEach((card) => {
      const item = product(q('h3', card)?.textContent);
      if (!item) return;
      card.dataset.cartReady = '1';
      card.insertAdjacentHTML('beforeend',
        `<button class="btn btn-primary btn-add" type="button" data-add="${MENU.indexOf(item)}">Tambah ke Keranjang</button>`);
    });
  }

  /* ===== Checkout WhatsApp ===== */
  function buildMessage(name, phone, id) {
    const lines = cart.map((line, i) => {
      const item = product(line.name);
      return [`${i + 1}. ${item.name}`, `   Jumlah: ${line.qty}`, `   Harga: ${idr(item.price)}`, `   Subtotal: ${idr(lineTotal(line))}`].join('\n');
    });
    return [
      'Halo, saya ingin memesan Seblak.', '', `No. Transaksi: ${id}`, `Nama: ${name}`, `No. WhatsApp: +${phone}`, '', 'DAFTAR PESANAN:', '', lines.join('\n\n'), '',
      '-------------------------', `TOTAL PESANAN: ${idr(cartTotal())}`, '',
      'Mohon konfirmasi pesanan saya. Terima kasih!'
    ].join('\n');
  }

  function checkout() {
    if (!cart.length) return;

    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    const phone = normalizePhone(phoneInput.value);
    const fields = [[nameInput, nameError, name.length >= 3], [phoneInput, phoneError, Boolean(phone)]];
    fields.forEach(([input, error, valid]) => {
      error.hidden = valid;
      if (valid) input.removeAttribute('aria-invalid');
      else input.setAttribute('aria-invalid', 'true');
    });
    const firstInvalid = fields.find(([, , valid]) => !valid);
    if (firstInvalid) { firstInvalid[0].focus(); return; }

    store(NAME_KEY, name);
    const id = newTransactionId();
    const url = `https://wa.me/${CART_WHATSAPP}?text=${encodeURIComponent(buildMessage(name, phone, id))}`;
    // Rekam isi pesanan. Keranjang baru dikosongkan setelah pelanggan mengonfirmasi pesanan terkirim.
    order = {
      id, name, phone, url, time: new Date().toISOString(), total: cartTotal(),
      sent: false, payment: 'pending', // pembayaran tidak pernah otomatis lunas
      items: cart.map((line) => ({ name: line.name, qty: line.qty, price: product(line.name).price, subtotal: lineTotal(line) }))
    };
    store(ORDER_KEY, JSON.stringify(order));
    dismissed = false;

    window.open(url, '_blank', 'noopener');
    setOpen(false);
    showReceipt();
  }

  /* ===== Struk: ringkasan pesanan (draf), lalu bukti transaksi setelah dikonfirmasi terkirim ===== */
  function showReceipt() {
    const sent = order.sent;
    const count = order.items.reduce((sum, item) => sum + item.qty, 0);
    const [payLabel, payClass] = PAYMENT[order.payment] || PAYMENT.pending;
    const when = new Date(order.time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    q('.receipt-paper', receipt).innerHTML = `
      <button class="cart-close" type="button" data-cart="receipt-close" aria-label="Tutup struk">${ICON_CLOSE}</button>
      <header class="receipt-head">
        ${sent ? '<span class="receipt-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-17"/></svg></span>' : ''}
        <strong>${SHOP_NAME}</strong>
        <span id="receipt-title">${sent ? 'BUKTI TRANSAKSI' : 'RINGKASAN PESANAN'}</span>
      </header>
      <div class="receipt-status">
        <span class="r-chip ${sent ? 'is-ok' : 'is-pending'}">${sent ? 'Pesanan terkirim' : 'Belum dikirim'}</span>
        <span class="r-chip ${payClass}">${payLabel}</span>
      </div>
      <dl class="receipt-meta">
        <div><dt>No. transaksi</dt><dd>${order.id}</dd></div>
        <div><dt>Atas nama</dt><dd>${esc(order.name)}</dd></div>
        <div><dt>WhatsApp</dt><dd>+${order.phone}</dd></div>
        <div><dt>Waktu</dt><dd>${when}</dd></div>
      </dl>
      <ul class="receipt-items">${order.items.map((item, i) => `
        <li style="--n:${i}">
          <span class="r-name">${item.name}</span>
          <span class="r-calc">${item.qty} × ${idr(item.price)}</span>
          <span class="r-sub">${idr(item.subtotal)}</span>
        </li>`).join('')}
      </ul>
      <p class="receipt-total" style="--n:${order.items.length}"><span>TOTAL (${count} item)</span><strong>${idr(order.total)}</strong></p>
      <p class="receipt-note">${sent
        ? 'Pembayaran dikonfirmasi penjual lewat WhatsApp. Status LUNAS baru tampil setelah penjual mengonfirmasi.'
        : 'Lanjutkan di WhatsApp dan tekan kirim. Struk bukti transaksi tersedia setelah kamu mengonfirmasi pesanan sudah terkirim.'}</p>
      <div class="receipt-actions">${sent ? `
        <button class="btn btn-primary" type="button" data-cart="pdf">${ICON_PDF}Download Struk PDF</button>
        <button class="btn btn-outline" type="button" data-cart="receipt-close">Tutup</button>` : `
        <button class="btn btn-primary" type="button" data-cart="sent">Pesanan Sudah Terkirim</button>
        <button class="btn btn-outline" type="button" data-cart="resend">Buka WhatsApp Lagi</button>
        <button class="btn btn-outline" type="button" data-cart="edit">Ubah Pesanan</button>`}
      </div>`;
    setReceipt(true);
  }

  /* ===== Unduh struk PDF =====
     PDF ditulis langsung di browser (font Helvetica bawaan PDF), tanpa library dan tanpa file tambahan. */
  const makeReceiptPdf = (order, shop) => {
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

  async function downloadPdf() {
    try {
      const blob = makeReceiptPdf(order, {
        name: SHOP_NAME,
        type: 'Warung Seblak',
        contact: String(CART_WHATSAPP).includes('X') ? '' : `+${CART_WHATSAPP}`
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Struk-Seblak-${order.id}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      notify('Struk PDF diunduh');
    } catch (error) {
      console.error('Gagal membuat struk PDF:', error); // penyebab lengkap ada di Console (F12)
      notify('Struk gagal dibuat. Coba lagi');
    }
  }

  /* ===== Klik: satu pendengar untuk semua tombol keranjang ===== */
  document.addEventListener('click', (event) => {
    if (event.target === receipt) return closeReceipt();

    const target = event.target.closest('.cart-btn, .cart-overlay, [data-add], [data-cart]');
    if (!target) return;

    if (target.matches('.cart-btn')) return setOpen(true);
    if (target.matches('.cart-overlay')) return setOpen(false);
    if (target.dataset.add !== undefined) return addItem(target);

    const line = cart[Number(target.dataset.i)];
    switch (target.dataset.cart) {
      case 'close': return setOpen(false);
      case 'checkout': return checkout();
      case 'receipt-close': return closeReceipt();
      case 'resend': return void window.open(order.url, '_blank', 'noopener');
      case 'edit': closeReceipt(); return setOpen(true);
      case 'inc': line.qty += 1; break;
      case 'dec': line.qty -= 1; break;
      case 'remove': line.qty = 0; break;
      case 'sent':
        cart = [];
        order = { ...order, sent: true, sentAt: new Date().toISOString() };
        store(ORDER_KEY, JSON.stringify(order));
        showReceipt();
        notify('Pesanan tercatat. Struk siap diunduh');
        break;
      case 'pdf': return void downloadPdf();
      case 'last': setOpen(false); return showReceipt();
    }
    cart = cart.filter((entry) => entry.qty > 0);
    save();
  });

  [[nameInput, nameError, NAME_KEY], [phoneInput, phoneError, PHONE_KEY]].forEach(([input, error, key]) => {
    input.addEventListener('input', () => {
      store(key, input.value);
      error.hidden = true;
      input.removeAttribute('aria-invalid');
    });
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') checkout(); });
  });

  // Escape menutup lapisan paling atas, Tab tetap berputar di dalam lapisan itu
  document.addEventListener('keydown', (event) => {
    const layer = root.classList.contains('receipt-open') ? receipt : root.classList.contains('cart-open') ? drawer : null;
    if (!layer) return;
    if (event.key === 'Escape') return layer === receipt ? closeReceipt() : setOpen(false);
    if (event.key !== 'Tab') return;

    const focusable = [...layer.querySelectorAll('button:not([disabled]), input')].filter((el) => el.offsetParent);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Pelanggan kembali dari WhatsApp: tampilkan struk agar bisa dikonfirmasi
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && order && !order.sent && !dismissed && !root.classList.contains('receipt-open')) showReceipt();
  });

  decorateCards();
  const grid = q('#menu-grid');
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });
  render();
})();