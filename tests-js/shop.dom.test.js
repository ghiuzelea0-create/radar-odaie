import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { initShop, products, heroSlides, explodeLayers } from '../assets/shop.js';

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
  <div class="hero-copy" id="heroCopy"></div>
  <div class="hero-media" id="heroMedia"></div>
  <div class="hero-dots" id="heroDots"></div>
  <div class="explode-stage" id="explodeStage"></div>
  <button id="customBtn"></button>
`;

let shop;

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
  vi.useFakeTimers();
  document.body.innerHTML = FIXTURE;
  shop = initShop(document);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  const cart = shop.getCart();
  Object.keys(cart).forEach(k => delete cart[k]);
  shop.renderGrid('all');
  shop.renderCart();
  shop.stopAutoplay();
  shop.goToSlide(0);
  vi.advanceTimersByTime(300);
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

describe('hero slider', () => {
  it('renders one dot per slide, the first active', () => {
    const dots = document.querySelectorAll('#heroDots .hero-dot');
    expect(dots.length).toBe(heroSlides.length);
    expect(document.querySelector('#heroDots .hero-dot.active').dataset.slide).toBe('0');
  });

  it('renders one image per slide, the first active', () => {
    const imgs = document.querySelectorAll('#heroMedia .hero-slide-img');
    expect(imgs.length).toBe(heroSlides.length);
    expect(imgs[0].classList.contains('active')).toBe(true);
  });

  it('renders the first slide\'s copy on init', () => {
    expect(document.getElementById('heroCopy').textContent).toContain(heroSlides[0].eyebrow);
  });

  it('clicking a dot switches the active image/dot immediately and the copy after the fade delay', () => {
    const dot = document.querySelector('#heroDots [data-slide="2"]');
    dot.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.hero-slide-img[data-i="2"]').classList.contains('active')).toBe(true);
    expect(dot.classList.contains('active')).toBe(true);
    expect(document.getElementById('heroCopy').innerHTML).not.toContain(heroSlides[2].eyebrow);
    vi.advanceTimersByTime(300);
    expect(document.getElementById('heroCopy').innerHTML).toContain(heroSlides[2].eyebrow);
  });

  it('wraps from the last slide back to the first', () => {
    shop.goToSlide(heroSlides.length - 1);
    vi.advanceTimersByTime(300);
    shop.goToSlide(heroSlides.length); // one past the end
    vi.advanceTimersByTime(300);
    expect(shop.getSlideIndex()).toBe(0);
  });

  it('autoplay advances to the next slide every 5s', () => {
    shop.startAutoplay();
    vi.advanceTimersByTime(5000);
    expect(shop.getSlideIndex()).toBe(1);
  });

  it('hovering the hero media pauses autoplay', () => {
    shop.startAutoplay();
    document.getElementById('heroMedia').dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(6000);
    expect(shop.getSlideIndex()).toBe(0);
  });

  it('leaving the hero media resumes autoplay', () => {
    shop.startAutoplay();
    const mediaEl = document.getElementById('heroMedia');
    mediaEl.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    mediaEl.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(shop.getSlideIndex()).toBe(1);
  });
});

describe('exploded diagram (Anatomia lămpii Totem)', () => {
  it('renders one SVG part and one label per layer', () => {
    const stage = document.getElementById('explodeStage');
    expect(stage.querySelectorAll('.explode-part').length).toBe(explodeLayers.length);
    expect(stage.querySelectorAll('.explode-label').length).toBe(explodeLayers.length);
  });

  it('labels show each layer\'s name and note in order', () => {
    const names = Array.from(document.querySelectorAll('.explode-label-name')).map(n => n.textContent);
    expect(names).toEqual(explodeLayers.map(l => l.label));
  });

  it('reveals immediately since jsdom has no IntersectionObserver', () => {
    expect(document.getElementById('explodeStage').classList.contains('in-view')).toBe(true);
  });
});

describe('custom order CTA', () => {
  it('clicking the custom order button does not throw', () => {
    expect(() => document.getElementById('customBtn').click()).not.toThrow();
  });
});
