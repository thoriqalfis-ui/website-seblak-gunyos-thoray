const CART_WHATSAPP = '6285711121806'; // awali 62, tanpa 0 di depan

'use strict';

/* ===== Keranjang belanja + checkout WhatsApp =====
   Dipakai index.html dan menu.html. Data menu diambil dari MENU (menu-data.js),
   jadi tidak ada data produk ganda. Dibungkus fungsi agar tidak bentrok dengan script lain. */
(() => {
  const CART_WHATSAPP = '6285711121806'; // nomor pemilik usaha: awali 62, tanpa 0 di depan
  const CART_KEY = 'seblak-cart';
  const PENDING_KEY = 'seblak-cart-pending';

  const ICON_CART = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cart-fill" viewBox="0 0 16 16" aria-hidden="true"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>`;
  const ICON_TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

  const q = (selector, root = document) => root.querySelector(selector);
  const idr = (amount) => 'Rp' + amount.toLocaleString('id-ID'); // format pesan: Rp15.000
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* penyimpanan penuh atau diblokir */ } };
  const product = (name) => MENU.find((item) => item.name === name);

  /* ===== Data keranjang: [{ name, qty }] disimpan di localStorage ===== */
  let cart = (() => {
    try {
      return (JSON.parse(localStorage.getItem(CART_KEY)) || []).filter((line) => product(line.name) && line.qty > 0);
    } catch {
      return [];
    }
  })();

  const lineTotal = (line) => product(line.name).price * line.qty;
  const cartTotal = () => cart.reduce((sum, line) => sum + lineTotal(line), 0);
  const cartCount = () => cart.reduce((sum, line) => sum + line.qty, 0);
  const isPending = () => Boolean(localStorage.getItem(PENDING_KEY));

  /* ===== Tampilan: tombol navbar, panel samping, notifikasi ===== */
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
        <div class="cart-confirm" hidden>
          <p>Sudah mengirim pesanan lewat WhatsApp?</p>
          <div>
            <button class="btn btn-primary" type="button" data-cart="sent">Ya, kosongkan keranjang</button>
            <button class="btn btn-outline" type="button" data-cart="notyet">Belum</button>
          </div>
        </div>
        <p class="cart-total"><span>Total</span><strong></strong></p>
        <div class="cart-actions">
          <button class="btn btn-outline" type="button" data-cart="close">Lanjut Belanja</button>
          <button class="btn btn-primary" type="button" data-cart="checkout">Pesan Sekarang</button>
        </div>
      </footer>
    </aside>
    <div class="cart-toast" role="status"></div>`);

  const root = document.documentElement;
  const drawer = q('#cart-drawer');
  const toast = q('.cart-toast');
  let lastFocus = null;
  let toastTimer = null;

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
    }).join('')}</ul>` : `<p class="cart-empty">Keranjang Belanja Masih Kosong</p>`;

    q('.cart-total strong', drawer).textContent = rupiah(cartTotal());
    q('[data-cart="checkout"]', drawer).disabled = cart.length === 0;
    q('.cart-confirm', drawer).hidden = !(isPending() && cart.length);
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
  function buildMessage() {
    const lines = cart.map((line, i) => {
      const item = product(line.name);
      return [`${i + 1}. ${item.name}`, `   Jumlah: ${line.qty}`, `   Harga: ${idr(item.price)}`, `   Subtotal: ${idr(lineTotal(line))}`].join('\n');
    });
    return [
      'Halo, saya ingin memesan Seblak.', '', 'DAFTAR PESANAN:', '', lines.join('\n\n'), '',
      '-------------------------', `TOTAL PESANAN: ${idr(cartTotal())}`, '',
      'Mohon konfirmasi pesanan saya. Terima kasih!'
    ].join('\n');
  }

  function checkout() {
    if (!cart.length) return;
    store(PENDING_KEY, '1'); // keranjang baru dikosongkan setelah pelanggan mengonfirmasi
    window.open(`https://wa.me/${CART_WHATSAPP}?text=${encodeURIComponent(buildMessage())}`);
    render();
  }

  /* ===== Klik: satu pendengar untuk semua tombol keranjang ===== */
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.cart-btn, .cart-overlay, [data-add], [data-cart]');
    if (!target) return;

    if (target.matches('.cart-btn')) return setOpen(true);
    if (target.matches('.cart-overlay')) return setOpen(false);
    if (target.dataset.add !== undefined) return addItem(target);

    const line = cart[Number(target.dataset.i)];
    switch (target.dataset.cart) {
      case 'close': return setOpen(false);
      case 'checkout': return checkout();
      case 'inc': line.qty += 1; break;
      case 'dec': line.qty -= 1; break;
      case 'remove': line.qty = 0; break;
      case 'sent': cart = []; localStorage.removeItem(PENDING_KEY); break;
      case 'notyet': localStorage.removeItem(PENDING_KEY); break;
    }
    cart = cart.filter((entry) => entry.qty > 0);
    save();
  });

  // Escape menutup panel, Tab tetap berputar di dalam panel
  document.addEventListener('keydown', (event) => {
    if (!root.classList.contains('cart-open')) return;
    if (event.key === 'Escape') return setOpen(false);
    if (event.key !== 'Tab') return;

    const focusable = [...drawer.querySelectorAll('button:not([disabled])')].filter((el) => el.offsetParent);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Pelanggan kembali dari WhatsApp: tanyakan apakah pesanan sudah terkirim
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isPending() && cart.length) { render(); setOpen(true); }
  });

  decorateCards();
  const grid = q('#menu-grid');
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });
  render();
})();