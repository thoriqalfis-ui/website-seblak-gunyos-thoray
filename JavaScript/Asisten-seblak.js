/* =========================================================
   ASISTEN SEBLAK GUNYOS THORAY - LOGIC & CHAT FLOW
   ========================================================= */

(() => {
  /* ===== 1. KONFIGURASI MENU & HARGA (Edit di sini) ===== */
  const RAW_WA = (typeof CONFIG !== 'undefined' && CONFIG.whatsapp) || '6285711121806';
  const WA_NUMBER = String(RAW_WA).replace(/\D/g, '').replace(/^0/, '62');

  const BASE = {
    name: 'Seblak Original',
    price: 15000
  };

  const TOPPINGS = [
    { id: 'telur', name: 'Telur', price: 3000, emoji: '🥚' },
    { id: 'sosis', name: 'Sosis', price: 3000, emoji: '🌭' },
    { id: 'bakso', name: 'Bakso', price: 3000, emoji: '🍢' },
    { id: 'mie',   name: 'Mie',   price: 2000, emoji: '🍜' },
    { id: 'ceker', name: 'Ceker', price: 5000, emoji: '🍗' },
    { id: 'udang', name: 'Udang', price: 6000, emoji: '🦐' },
    { id: 'cumi',  name: 'Cumi',  price: 6000, emoji: '🦑' }
  ];

  const SPICES = [
    {
      name: 'Tidak pedas',
      emoji: '😊',
      reply: 'Aman! Gurih kencur tanpa cabai, cocok untuk semua.',
      tip: 'Gurih kencur tanpa cabai.'
    },
    {
      name: 'Sedang',
      emoji: '😋',
      reply: 'Pas! Hangat di lidah dan bikin nagih.',
      tip: 'Hangat di lidah, cocok untuk pemula.'
    },
    {
      name: 'Pedas',
      emoji: '🥵',
      reply: 'Berani juga! Siapkan minum dingin ya.',
      tip: 'Cabai terasa jelas, siapkan minum dingin.'
    },
    {
      name: 'Sangat pedas',
      emoji: '🤯',
      reply: 'Level pemberani! Seblakmu bakal membara.',
      tip: 'Level pemberani. Kurang cocok saat perut kosong atau bagi pengidap maag.'
    }
  ];

  const BUDGETS = [15000, 20000, 30000, 50000];

  /* ===== 2. ELEMEN DOM & HELPER ===== */
  const $ = (selector) => document.querySelector(selector);
  const idr = (n) => 'Rp' + n.toLocaleString('id-ID');
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const root = $('#asb');
  const fab  = $('#asb .asb-fab');
  const win  = $('#asb-win');
  const log  = $('#asb .asb-log');
  const tip  = $('#asb .asb-tip');

  if (!root || !fab || !win || !log) return;

  let run = 0;
  let started = false;

  const scrollToBottom = () => {
    log.scrollTop = log.scrollHeight;
  };

  function say(html, who = 'bot') {
    const el = document.createElement('div');
    el.className = `asb-msg asb-${who === 'bot' ? 'bot' : 'me'}`;
    const avatar = who === 'bot' ? '<span class="asb-av" aria-hidden="true">🍜</span>' : '';
    el.innerHTML = `${avatar}<div class="asb-bubble">${html}</div>`;
    log.append(el);
    scrollToBottom();
    return el;
  }

  async function bot(html, id) {
    const typing = say('<span class="asb-dots"><i></i><i></i><i></i></span>');
    await pause(500);
    typing.remove();
    if (id !== run) return false;
    say(html);
    return true;
  }

  function showOptions(html) {
    const box = document.createElement('div');
    box.className = 'asb-opts';
    box.innerHTML = html;
    log.append(box);
    scrollToBottom();
    box.querySelector('button')?.focus({ preventScroll: true });
    return box;
  }

  const pickOne = (html) => new Promise((resolve) => {
    const box = showOptions(html);
    box.addEventListener('click', (event) => {
      const button = event.target.closest('[data-v]');
      if (!button) return;
      box.remove();
      resolve(Number(button.dataset.v));
    });
  });

  const pickMany = (html) => new Promise((resolve) => {
    const box = showOptions(`${html}<button type="button" class="asb-chip asb-go" data-go></button>`);
    const go = box.querySelector('[data-go]');
    const chosen = () => [...box.querySelectorAll('[aria-pressed="true"]')];
    const updateLabel = () => {
      go.textContent = chosen().length
        ? `Lanjut (${chosen().length} dipilih) ➜`
        : 'Lanjut tanpa topping ➜';
    };

    updateLabel();

    box.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.hasAttribute('data-go')) {
        const picked = chosen().map((b) => Number(b.dataset.v));
        box.remove();
        return resolve(picked);
      }

      const isPressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!isPressed));
      updateLabel();
    });
  });

  /* ===== 3. LOGIKA REKOMENDASI & LINK WHATSAPP ===== */
  function recommend(spiceIndex, toppingIds, budget) {
    let left = budget - BASE.price;
    const picked = [];
    const skipped = [];

    toppingIds.forEach((i) => {
      const topping = TOPPINGS[i];
      if (topping.price <= left) {
        picked.push(topping);
        left -= topping.price;
      } else {
        skipped.push(topping);
      }
    });

    const total = BASE.price + picked.reduce((sum, t) => sum + t.price, 0);
    const spice = SPICES[spiceIndex];

    return {
      spice,
      picked,
      skipped,
      total,
      left,
      name: `Combo Gunyos ${spice.name}`
    };
  }

  function whatsappLink(rec) {
    const lines = [BASE, ...rec.picked].map(
      (item, i) => `${i + 1}. ${i ? 'Topping ' : ''}${item.name} - ${idr(item.price)}`
    );

    const text = [
      'Halo *Seblak Gunyos Thoray*, saya ingin memesan:',
      '',
      `*Paket Rekomendasi:* ${rec.name}`,
      ...lines,
      '',
      `Tingkat pedas: *${rec.spice.name}*`,
      '-------------------------',
      `*TOTAL PESANAN: ${idr(rec.total)}*`,
      '',
      'Nama pemesan: ',
      'Catatan tambahan: ',
      '',
      'Mohon konfirmasi pesanan saya. Terima kasih!'
    ].join('\n');

    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function cardHtml(rec) {
    const rows = [BASE, ...rec.picked]
      .map((item) => `<div class="asb-line"><span>${item.name}</span><b>${idr(item.price)}</b></div>`)
      .join('');

    const notes = [`${rec.spice.emoji} ${rec.spice.tip}`];
    if (rec.skipped.length) {
      notes.push(`${rec.skipped.map((t) => t.name).join(', ')} belum muat di budget ini. Naikkan budget kalau mau ditambah.`);
    } else if (rec.left >= 2000) {
      notes.push(`Masih ada sisa budget ${idr(rec.left)}, boleh tambah topping lagi.`);
    }

    return `
      <div class="asb-card">
        <span class="asb-tag">Rekomendasi untukmu</span>
        <strong class="asb-title">${rec.name}</strong>
        ${rows}
        <div class="asb-total"><span>Total</span><b>${idr(rec.total)}</b></div>
        <div class="asb-note">${notes.join('<br>')}</div>
        <a class="asb-wa" href="${whatsappLink(rec)}" target="_blank" rel="noopener">Pesan via WhatsApp</a>
      </div>
    `;
  }

  /* ===== 4. ALUR PERCAKAPAN ===== */
  async function start() {
    const id = ++run;
    log.innerHTML = '';

    if (!await bot('Halo! Aku <b>Asisten Seblak</b> 🌶️ Aku bantu pilihkan racikan <b>Seblak Gunyos Thoray</b> yang pas buatmu.', id)) return;
    if (!await bot('<b>1/3</b> Seberapa kuat kamu makan pedas?', id)) return;

    const spice = await pickOne(
      SPICES.map((s, i) => `<button type="button" class="asb-chip" data-v="${i}">${s.emoji} ${s.name}</button>`).join('')
    );
    if (id !== run) return;

    say(`${SPICES[spice].emoji} ${SPICES[spice].name}`, 'me');
    if (!await bot(SPICES[spice].reply, id)) return;

    if (!await bot('<b>2/3</b> Topping favoritmu apa? Boleh pilih lebih dari satu.', id)) return;

    const toppings = await pickMany(
      TOPPINGS.map((t, i) => `<button type="button" class="asb-chip" data-v="${i}" aria-pressed="false">${t.emoji} ${t.name} <small>+${idr(t.price)}</small></button>`).join('')
    );
    if (id !== run) return;

    say(toppings.length ? toppings.map((i) => TOPPINGS[i].name).join(', ') : 'Tanpa topping tambahan', 'me');

    if (!await bot(`<b>3/3</b> Budget maksimal per porsi? Seblak dasar mulai ${idr(BASE.price)}.`, id)) return;

    const budgetIndex = await pickOne(
      BUDGETS.map((b, i) => `<button type="button" class="asb-chip" data-v="${i}">${idr(b)}</button>`).join('')
    );
    const budget = BUDGETS[budgetIndex];
    if (id !== run) return;

    say(`Maks. ${idr(budget)}`, 'me');

    if (!await bot('Siap! Ini racikan paling pas untukmu 👇', id)) return;
    say(cardHtml(recommend(spice, toppings, budget)));

    await pause(400);
    if (id !== run) return;

    await pickOne('<button type="button" class="asb-chip" data-v="0">🔄 Cari rekomendasi lain</button>');
    if (id === run) start();
  }

  /* ===== 5. KONTROL BUKA/TUTUP WIDGET ===== */
  function setOpen(open) {
    root.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Tutup Asisten Seblak' : 'Buka Asisten Seblak');
    win.inert = !open;
    win.setAttribute('aria-hidden', String(!open));
    if (tip) tip.hidden = true;

    if (open && !started) {
      started = true;
      start();
    }
    if (!open) fab.focus();
  }

  fab.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));

  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-act]')?.dataset.act;
    if (action === 'close') setOpen(false);
    if (action === 'restart') start();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-open')) {
      setOpen(false);
    }
  });

  // Balon ajakan muncul otomatis sekali per sesi kunjungan
  try {
    if (tip && !sessionStorage.getItem('asb-tip')) {
      sessionStorage.setItem('asb-tip', '1');
      setTimeout(() => {
        if (!root.classList.contains('is-open')) tip.hidden = false;
      }, 3500);
      setTimeout(() => {
        tip.hidden = true;
      }, 12000);
    }
  } catch {
    // Abaikan jika browser memblokir sessionStorage
  }
})();