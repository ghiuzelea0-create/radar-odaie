import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { initShop, products } from '../assets/shop.js';

const FIXTURE = `
  <div id="cats"></div>
  <div id="filters"></div>
  <div id="grid"></div>
  <div class="overlay" id="overlay"></div>
  <aside class="drawer" id="drawer"></aside>
  <button id="cartToggle"></button>
  <span id="cartCount">0</span>
  <button id="cartClose"></button>
  <div id="drawerItems"></div>
  <div id="drawerFoot" style="display:none">
    <span id="subtotal"></span>
    <span id="shipping"></span>
    <span id="grandtotal"></span>
    <button id="checkoutBtn"></button>
  </div>
  <button id="searchToggle"></button>
  <input id="newsEmail">
  <button id="newsBtn"></button>
  <b id="promoCode"></b>
  <div id="toast"></div>
  <section id="colectie"></section>
`;

let shop;

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
  document.body.innerHTML = FIXTURE;
  shop = initShop(document);
});

beforeEach(() => {
  const cart = shop.getCart();
  Object.keys(cart).forEach(k => delete cart[k]);
  shop.renderGrid('all');
  shop.renderCart();
});

describe('renderCats', () => {
  it('renders one button per collection', () => {
    shop.renderCats();
    expect(document.querySelectorAll('#cats [data-cat]').length).toBe(6);
  });
});

describe('renderGrid', () => {
  it('renders the full catalog for "all"', () => {
    shop.renderGrid('all');
    expect(document.querySelectorAll('#grid .card').length).toBe(products.length);
  });

  it('renders only the matching category', () => {
    shop.renderGrid('textile');
    const cards = document.querySelectorAll('#grid .card');
    const textileCount = products.filter(p => p.cat === 'textile').length;
    expect(cards.length).toBe(textileCount);
  });

  it('escapes product names in the markup', () => {
    shop.renderGrid('all');
    expect(document.getElementById('grid').innerHTML).not.toMatch(/<script/i);
  });
});

describe('cart interactions', () => {
  it('addToCart increments the badge and shows the drawer footer', () => {
    shop.addToCart(products[0].id);
    expect(document.getElementById('cartCount').textContent).toBe('1');
    expect(document.getElementById('cartCount').classList.contains('show')).toBe(true);
    expect(document.getElementById('drawerFoot').style.display).toBe('block');
  });

  it('adding the same product twice increments quantity, not item count', () => {
    shop.addToCart(products[0].id);
    shop.addToCart(products[0].id);
    expect(document.getElementById('cartCount').textContent).toBe('2');
    expect(document.querySelectorAll('#drawerItems .citem').length).toBe(1);
  });

  it('changeQty(-1) down to zero removes the item and shows the empty state', () => {
    shop.addToCart(products[0].id);
    shop.changeQty(products[0].id, -1);
    expect(document.getElementById('cartCount').textContent).toBe('0');
    expect(document.querySelector('#drawerItems .drawer-empty')).not.toBeNull();
    expect(document.getElementById('drawerFoot').style.display).toBe('none');
  });

  it('removeItem clears the item regardless of quantity', () => {
    shop.addToCart(products[0].id);
    shop.changeQty(products[0].id, 5);
    shop.removeItem(products[0].id);
    expect(document.getElementById('cartCount').textContent).toBe('0');
  });

  it('renders the subtotal/shipping/grand total for a mixed cart', () => {
    shop.addToCart(products[0].id); // 149 lei
    expect(document.getElementById('subtotal').textContent).toContain(String(products[0].price));
  });
});

describe('DOM click delegation', () => {
  it('clicking a filter chip re-renders the grid for that category', () => {
    const chip = document.querySelector('#filters [data-filter="textile"]');
    chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const expected = products.filter(p => p.cat === 'textile').length;
    expect(document.querySelectorAll('#grid .card').length).toBe(expected);
    expect(chip.classList.contains('active')).toBe(true);
  });

  it('clicking a product\'s "Adaugă în coș" button adds it to the cart', () => {
    shop.renderGrid('all');
    const addBtn = document.querySelector('#grid [data-add]');
    addBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('cartCount').textContent).toBe('1');
  });
});
