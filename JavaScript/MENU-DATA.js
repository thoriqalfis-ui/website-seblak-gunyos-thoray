'use strict';

/* ===== Data menu: dipakai oleh index.html dan menu.html ===== */
const PLACEHOLDER = 'assets/images/placeholder.svg';

const CATEGORIES = [
  { id: 'semua', name: 'Semua' },
  { id: 'seblak', name: 'Seblak' },
  { id: 'seafood', name: 'Seafood' },
  { id: 'minuman', name: 'Minuman' }
];

// Data contoh. featured: true = tampil di beranda, sisanya hanya di halaman "Semua menu"
const MENU = [
  { name: 'Seblak Original', desc: 'Kerupuk kenyal, telur, dan sayur dalam kuah kencur-cabai.', price: 15000, image: PLACEHOLDER, category: 'seblak', featured: true },
  { name: 'Seblak Bakso & Sosis', desc: 'Bakso dan sosis dengan kuah gurih pedas.', price: 18000, image: PLACEHOLDER, category: 'seblak', featured: true },
  { name: 'Seblak Ceker', desc: 'Ceker empuk yang meresap bumbu.', price: 20000, image: PLACEHOLDER, category: 'seblak', featured: true },
  { name: 'Seblak Mie', desc: 'Mie kenyal dengan sayur dan bumbu pedas.', price: 17000, image: PLACEHOLDER, category: 'seblak', featured: true },
  { name: 'Seblak Seafood', desc: 'Topping seafood dalam kuah pedas yang segar.', price: 25000, image: PLACEHOLDER, category: 'seafood', featured: true },
  { name: 'Seblak Komplit', desc: 'Semua topping favorit dalam satu mangkuk.', price: 28000, image: PLACEHOLDER, category: 'seblak', featured: true },
  { name: 'Seblak Makaroni', desc: 'Makaroni dengan kuah kencur pedas gurih.', price: 16000, image: PLACEHOLDER, category: 'seblak' },
  { name: 'Seblak Kwetiau', desc: 'Kwetiau lembut dengan sayur dan bumbu pedas.', price: 18000, image: PLACEHOLDER, category: 'seblak' },
  { name: 'Seblak Jeletot', desc: 'Cabai lebih banyak untuk pencinta pedas.', price: 20000, image: PLACEHOLDER, category: 'seblak' },
  { name: 'Seblak Udang', desc: 'Udang dalam kuah pedas yang segar.', price: 27000, image: PLACEHOLDER, category: 'seafood' },
  { name: 'Seblak Cumi', desc: 'Cumi empuk dalam kuah kencur-cabai.', price: 27000, image: PLACEHOLDER, category: 'seafood' },
  { name: 'Es Teh Manis', desc: 'Penawar pedas yang menyegarkan.', price: 5000, image: PLACEHOLDER, category: 'minuman' },
  { name: 'Es Jeruk', desc: 'Jeruk peras dingin.', price: 7000, image: PLACEHOLDER, category: 'minuman' }
];

const rupiah = (amount) => 'Rp ' + amount.toLocaleString('id-ID');

// Satu template kartu untuk beranda dan halaman semua menu
const cardTemplate = (item) => `
  <article class="card">
    <img src="${item.image}" alt="Foto ${item.name}" width="400" height="300" loading="lazy">
    <div class="card-body">
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <p class="price">${rupiah(item.price)}</p>
    </div>
  </article>`;