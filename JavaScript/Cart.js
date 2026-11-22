'use strict';

/* ===== Keranjang belanja + checkout WhatsApp + struk pesanan =====
   Dipakai index.html dan menu.html. Data menu diambil dari MENU (menu-data.js),
   jadi tidak ada data produk ganda. Dibungkus fungsi agar tidak bentrok dengan script lain. */
(() => {
  const CART_WHATSAPP = '6285711121806'; // nomor pemilik usaha: awali 62, tanpa 0 di depan
  const SHOP_NAME = 'SEBLAK GUNYOS THORAY';
  const CART_KEY = 'seblak-cart';
  const NAME_KEY = 'seblak-customer-name';
  const ORDER_KEY = 'seblak-last-order'; // pesanan yang sudah dikirim ke WhatsApp tapi belum dikonfirmasi

  const ICON_CART = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cart-fill" viewBox="0 0 16 16" aria-hidden="true"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>`;
  const ICON_TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

  const q = (selector, root = document) => root.querySelector(selector);
  const idr = (amount) => 'Rp' + amount.toLocaleString('id-ID'); // format pesan dan struk: Rp15.000
  const esc = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* penyimpanan penuh atau diblokir */ } };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const product = (name) => MENU.find((item) => item.name === name);

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
  let lastFocus = null;
  let toastTimer = null;

  try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch { /* abaikan */ }

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
    if (open) q('[data-cart="sent"]', receipt).focus();
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
  function buildMessage(name) {
    const lines = cart.map((line, i) => {
      const item = product(line.name);
      return [`${i + 1}. ${item.name}`, `   Jumlah: ${line.qty}`, `   Harga: ${idr(item.price)}`, `   Subtotal: ${idr(lineTotal(line))}`].join('\n');
    });
    return [
      'Halo, saya ingin memesan Seblak.', '', `Nama: ${name}`, '', 'DAFTAR PESANAN:', '', lines.join('\n\n'), '',
      '-------------------------', `TOTAL PESANAN: ${idr(cartTotal())}`, '',
      'Mohon konfirmasi pesanan saya. Terima kasih!'
    ].join('\n');
  }

  function checkout() {
    if (!cart.length) return;

    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    const valid = name.length >= 3;
    nameError.hidden = valid;
    if (valid) nameInput.removeAttribute('aria-invalid');
    else nameInput.setAttribute('aria-invalid', 'true');
    if (!valid) { nameInput.focus(); return; }

    store(NAME_KEY, name);
    const url = `https://wa.me/${CART_WHATSAPP}?text=${encodeURIComponent(buildMessage(name))}`;
    // Rekam isi pesanan untuk struk. Keranjang tidak dikosongkan sampai pelanggan mengonfirmasi.
    order = {
      name, url, time: new Date().toISOString(), total: cartTotal(),
      items: cart.map((line) => ({ name: line.name, qty: line.qty, price: product(line.name).price, subtotal: lineTotal(line) }))
    };
    store(ORDER_KEY, JSON.stringify(order));
    dismissed = false;

    window.open(url, '_blank', 'noopener');
    setOpen(false);
    showReceipt();
  }

  /* ===== Struk pesanan beranimasi ===== */
  function showReceipt() {
    const when = new Date(order.time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const count = order.items.reduce((sum, item) => sum + item.qty, 0);

    q('.receipt-paper', receipt).innerHTML = `
      <button class="cart-close" type="button" data-cart="receipt-close" aria-label="Tutup struk">${ICON_CLOSE}</button>
      <header class="receipt-head">
        <strong>${SHOP_NAME}</strong>
        <span id="receipt-title">STRUK PESANAN</span>
      </header>
      <dl class="receipt-meta">
        <div><dt>Atas nama</dt><dd>${esc(order.name)}</dd></div>
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
      <p class="receipt-note">Lanjutkan di WhatsApp dan tekan tombol kirim. Pesanan baru terkirim setelah kamu menekan kirim di WhatsApp.</p>
      <div class="receipt-actions">
        <button class="btn btn-primary" type="button" data-cart="sent">Pesanan Sudah Terkirim</button>
        <button class="btn btn-outline" type="button" data-cart="resend">Buka WhatsApp Lagi</button>
        <button class="btn btn-outline" type="button" data-cart="edit">Ubah Pesanan</button>
      </div>`;
    setReceipt(true);
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
        order = null;
        localStorage.removeItem(ORDER_KEY);
        setReceipt(false);
        notify('Terima kasih! Keranjang dikosongkan');
        break;
    }
    cart = cart.filter((entry) => entry.qty > 0);
    save();
  });

  nameInput.addEventListener('input', () => {
    store(NAME_KEY, nameInput.value);
    nameError.hidden = true;
    nameInput.removeAttribute('aria-invalid');
  });
  nameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') checkout(); });

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
    if (document.visibilityState === 'visible' && order && !dismissed && !root.classList.contains('receipt-open')) showReceipt();
  });

  decorateCards();
  const grid = q('#menu-grid');
  if (grid) new MutationObserver(decorateCards).observe(grid, { childList: true });
  render();
})();