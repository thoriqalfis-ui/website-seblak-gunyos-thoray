'use strict';

/* ===== Animasi muncul saat di-scroll: dipakai index.html dan menu.html ===== */
// Muat file ini PALING AKHIR, setelah semua script lain selesai membuat kartu dan daftar.
function initReveal() {
  // Elemen yang diberi animasi (tidak bersarang, supaya tidak muncul dua kali)
  const selectors = [
    '.hero-inner > *',
    '.section > .container > h2',
    '.section > .container > .lead',
    '.card', '.card-more',
    '.about-inner > div', '.spice-list li',
    '.cta .container > *',
    '.footer-grid > *', '.map', '.copyright',
    '.search', '.filters', '.page-cta'
  ].join(',');

  const targets = [...document.querySelectorAll(selectors)];
  const counts = new Map();

  // Beri jeda bertahap pada elemen yang sejajar agar muncul satu per satu
  targets.forEach((el) => {
    const index = counts.get(el.parentElement) ?? 0;
    counts.set(el.parentElement, index + 1);
    el.classList.add('reveal');
    el.style.setProperty('--delay', `${(index % 4) * 150}ms`);
  });

  const show = (el) => el.classList.add('is-visible');

  // Browser lama tanpa IntersectionObserver: tampilkan semuanya langsung
  if (!('IntersectionObserver' in window)) {
    targets.forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target); // animasi hanya sekali
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  targets.forEach((el) => observer.observe(el));
}

initReveal();