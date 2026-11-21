'use strict';

const $ = (selector) => document.querySelector(selector);

let category = 'semua';
let keyword = '';

function renderMenu() {
  const list = MENU.filter((item) =>
    (category === 'semua' || item.category === category) &&
    item.name.toLowerCase().includes(keyword));

  $('#menu-grid').innerHTML = list.map(cardTemplate).join('');
  $('#empty').hidden = list.length > 0;
}

function initFilters() {
  const filters = $('#filters');

  filters.innerHTML = CATEGORIES.map((c) =>
    `<button class="filter" type="button" data-category="${c.id}" aria-pressed="${c.id === category}">${c.name}</button>`
  ).join('');

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    filters.querySelectorAll('[data-category]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    renderMenu();
  });
}

$('#search').addEventListener('input', (event) => {
  keyword = event.target.value.trim().toLowerCase();
  renderMenu();
});

initFilters();
renderMenu();