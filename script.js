'use strict';

/* ===== Konfigurasi: ubah data di bagian ini saja ===== */
const CONFIG = {
  name: 'SEBLAK GUNYOS THORAY',
  whatsapp: '6285711121806', // format internasional, tanpa tanda +
  address: 'Jl. Raden Sanim No.11, RT.5/RW.1, Tanah Baru, Kecamatan Beji, Kota Depok, Jawa Barat 16426',
  hours: 'Setiap hari, 10.00–23.00',
  instagram: '' // isi URL profil Instagram agar tautannya muncul di footer
};

const SPICE_LEVELS = [
  { name: 'Tidak pedas', desc: 'Gurih kencur, tanpa cabai.' },
  { name: 'Sedang', desc: 'Hangat di lidah, cocok untuk pemula.' },
  { name: 'Pedas', desc: 'Cabai terasa jelas di tiap suapan.' },
  { name: 'Sangat pedas', desc: 'Untuk yang sudah terbiasa.' }
];

// Penjelasan risiko per tingkat pedas (urutan sama dengan SPICE_LEVELS)
const SPICE_RISKS = [
  'Nyaris tanpa risiko pedas. Cocok untuk anak-anak dan perut yang sensitif.',
  'Bisa terasa panas di lidah, hidung berair, dan berkeringat ringan. Umumnya aman, siapkan minum.',
  'Panasnya bertahan beberapa menit dan bisa membuat perut perih atau mulas jika jarang makan pedas. Kurang disarankan saat perut kosong atau bagi pengidap maag.',
  'Sangat panas: bisa memicu keringat deras, tersedak, perut perih, mulas, atau diare. Tidak disarankan untuk anak-anak, ibu hamil, atau pengidap maag dan asam lambung. Makan pelan dan siapkan air putih atau susu.'
];

// Ekspresi per tingkat pedas (urutan sama dengan SPICE_LEVELS)
const SPICE_MOODS = [
  { emoji: '😊', text: 'Santai dan gurih, aman untuk semua.' },
  { emoji: '😋', text: 'Pas! Hangat di lidah dan bikin nagih.' },
  { emoji: '🥵', text: 'Mulai berkeringat, tapi tetap enak!' },
  { emoji: '🤯', text: 'Siap-siap, ini level para pemberani!' }
];

// Foto slider hero (latar transparan, simpan di assets/images/)
const HERO_SLIDES = [
  { src: 'seblak-hero.webp', alt: 'Semangkuk seblak pedas dengan kerupuk dan bakso' },
  { src: 'Seblak Menu 2.webp', alt: 'Semangkuk seblak dengan keju leleh, wijen, dan bakso' },
  { src: 'Seblak Menu 3.webp', alt: 'Semangkuk seblak seafood dengan udang, cumi, dan crab stick' }
];

/* ===== Helper ===== */
// Data menu (MENU) dan template kartu (cardTemplate) ada di menu-data.js
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let selectedSpice = '';

/* ===== Isi informasi warung ===== */
function renderInfo() {
  const info = { ...CONFIG, phone: '+' + CONFIG.whatsapp, year: new Date().getFullYear() };
  $$('[data-info]').forEach((el) => { el.textContent = info[el.dataset.info]; });
  $$('[data-link]').forEach((el) => {
    const url = CONFIG[el.dataset.link];
    if (url) { el.href = url; el.hidden = false; }
  });
}

/* ===== Tautan WhatsApp ===== */
function whatsappUrl() {
  const spice = selectedSpice ? ` Tingkat pedas: ${selectedSpice}.` : '';
  const text = `Halo ${CONFIG.name}, saya mau pesan seblak.${spice}`;
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
}

function updateWhatsappLinks() {
  $$('[data-wa]').forEach((link) => { link.href = whatsappUrl(); });
}

/* ===== Menu unggulan + kotak "Lihat semua" ===== */
function renderMenu() {
  $('#menu-grid').innerHTML = MENU.filter((item) => item.featured).map(cardTemplate).join('') + `
    <a class="card-more" href="menu.html">
      <span class="dots" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      Lihat semua
    </a>`;
}

/* ===== Tingkat pedas ===== */
function renderSpice() {
  const last = SPICE_LEVELS.length - 1;
  $('#spice-list').innerHTML = SPICE_LEVELS.map((level, i) => `
    <li style="--heat:${i / last}">
      <strong>${level.name}</strong>
      <p>${level.desc}</p>
      <span class="heat" aria-hidden="true"></span>
    </li>`).join('');

  $('#spice-options').innerHTML = SPICE_LEVELS.map((level) => `
    <label class="chip">
      <input type="radio" name="spice" value="${level.name}">
      <span>${level.name}</span>
    </label>`).join('');

  $('#spice-options').addEventListener('change', (event) => {
    selectedSpice = event.target.value;
    updateWhatsappLinks();
  });
}

/* ===== Detail risiko tingkat pedas: klik kotak untuk membuka ===== */
function initSpiceDetails() {
  const list = $('#spice-list');
  const items = $$('#spice-list li');

  items.forEach((item, i) => {
    item.insertAdjacentHTML('beforeend', `
      <div class="spice-risk" id="spice-risk-${i}">
        <div><p><span class="risk-label">Risiko</span>${SPICE_RISKS[i]}</p></div>
      </div>
      <button class="spice-toggle" type="button" aria-expanded="false"
        aria-controls="spice-risk-${i}" aria-label="Lihat risiko tingkat ${SPICE_LEVELS[i].name}"></button>`);
  });

  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.spice-toggle').setAttribute('aria-expanded', String(open));
  };

  list.addEventListener('click', (event) => {
    const item = event.target.closest('.spice-toggle')?.closest('li');
    if (!item) return;
    const open = !item.classList.contains('is-open');
    items.forEach((li) => setOpen(li, false)); // hanya satu kotak terbuka
    setOpen(item, open);
  });
}

/* ===== Ekspresi emoji saat tingkat pedas dipilih ===== */
function initSpiceMood() {
  const options = $('#spice-options');
  options.insertAdjacentHTML('beforebegin', `
    <div class="mood" data-level="idle" aria-live="polite">
      <span class="mood-emoji" aria-hidden="true">🌶️</span>
      <p class="mood-text">Pilih tingkat pedasmu</p>
    </div>`);

  const mood = $('.mood');
  const emoji = $('.mood-emoji');
  const text = $('.mood-text');

  // Mengulang animasi dari awal setiap kali pilihan berganti
  const restart = (el) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; };

  options.addEventListener('change', (event) => {
    const level = SPICE_LEVELS.findIndex((item) => item.name === event.target.value);
    if (level < 0) return;
    mood.dataset.level = level;
    emoji.textContent = SPICE_MOODS[level].emoji;
    text.textContent = SPICE_MOODS[level].text;
    restart(emoji);
    restart(text);
  });
}

/* ===== Navigasi mobile (burger berubah jadi silang lewat CSS) ===== */
function initNav() {
  const nav = $('#nav');
  const toggle = $('.nav-toggle');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
}

/* ===== Slider foto hero: klik panah untuk ganti foto ===== */
function initHeroSlider() {
  if (HERO_SLIDES.length < 2) return;

  const box = $('.hero-inner');
  const img = $('.hero-img');
  let index = 0;
  let busy = false;

  HERO_SLIDES.forEach((slide) => { new Image().src = slide.src; }); // muat lebih dulu

  const chevron = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  box.insertAdjacentHTML('beforeend', `
    <button class="hero-arrow hero-prev" type="button" aria-label="Foto sebelumnya">${chevron('m15 18-6-6 6-6')}</button>
    <button class="hero-arrow hero-next" type="button" aria-label="Foto berikutnya">${chevron('m9 18 6-6-6-6')}</button>`);

  const slideTo = async (step) => {
    if (busy) return;
    busy = true;

    try {
      const next = (index + step + HERO_SLIDES.length) % HERO_SLIDES.length;
      const shift = step > 0 ? 80 : -80;
      const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Foto lama bergeser keluar
      const out = motion && img.animate(
        [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-shift}px)` }],
        { duration: 350, easing: 'ease-in', fill: 'forwards' });
      if (out) await out.finished;

      img.src = HERO_SLIDES[next].src;
      img.alt = HERO_SLIDES[next].alt;
      await img.decode().catch(() => {});
      index = next;

      // Foto baru bergeser masuk
      if (motion) {
        const enter = img.animate(
          [{ opacity: 0, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'translateX(0)' }],
          { duration: 500, easing: 'ease-out' });
        out.cancel();
        await enter.finished;
      }
    } finally {
      busy = false;
    }
  };

  $('.hero-prev').addEventListener('click', () => slideTo(-1));
  $('.hero-next').addEventListener('click', () => slideTo(1));
}

/* ===== Pilihan tema: terang / gelap / otomatis ===== */
// Tema awal sudah dipasang oleh script kecil di <head> index.html
function initTheme() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const toggle = $('.theme-toggle');
  const list = $('#theme-list');
  const options = list.querySelectorAll('[data-theme-choice]');
  const labels = { light: 'Terang', dark: 'Gelap', auto: 'Otomatis' };

  const getChoice = () => localStorage.getItem('theme') || 'auto';

  const apply = (choice) => {
    root.dataset.theme = choice === 'auto' ? (media.matches ? 'dark' : 'light') : choice;
    toggle.querySelector('use').setAttribute('href', `#i-${choice}`);
    toggle.setAttribute('aria-label', `Pilih tema (sekarang: ${labels[choice]})`);
    options.forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.themeChoice === choice)));
  };

  const setOpen = (open) => {
    list.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(list.hidden));

  list.addEventListener('click', (event) => {
    const option = event.target.closest('[data-theme-choice]');
    if (!option) return;
    localStorage.setItem('theme', option.dataset.themeChoice);
    apply(option.dataset.themeChoice);
    setOpen(false);
  });

  // Tutup menu saat klik di luar atau menekan Escape
  document.addEventListener('click', (event) => { if (!event.target.closest('.theme-menu')) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !list.hidden) { setOpen(false); toggle.focus(); }
  });

  // Pada mode Otomatis, ikuti perubahan pengaturan perangkat
  media.addEventListener('change', () => apply(getChoice()));

  apply(getChoice());
}

/* ===== Mulai ===== */
// Setiap fitur dijalankan terpisah: kalau satu gagal, fitur lain tetap jalan
// dan nama fitur yang gagal muncul di Console (F12)
[

  renderInfo,
  renderMenu,
  renderSpice,
  initSpiceDetails,
  initSpiceMood,
  updateWhatsappLinks,
  initNav,
  initHeroSlider,
  initTheme

].forEach((start) => {
  try {
    start();
  } catch (error) {
    console.error(`${start.name} gagal dijalankan:`, error);
  }
});