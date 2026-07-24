import { describe, it, expect } from 'vitest';
import {
  escAttr,
  fmt,
  hasRealImg,
  filterProducts,
  computeCartTotals,
  applyQtyChange,
  buildRadarProduct,
  mergeRadarData,
  radarStyle,
} from '../assets/shop.js';

describe('escAttr', () => {
  it('escapes ampersands and double quotes', () => {
    expect(escAttr('Vază "Nou" & Lemn')).toBe('Vază &quot;Nou&quot; &amp; Lemn');
  });

  it('coerces non-string input', () => {
    expect(escAttr(149)).toBe('149');
  });
});

describe('fmt', () => {
  it('formats a number as Romanian currency', () => {
    expect(fmt(1500)).toBe('1.500 lei');
  });

  it('formats zero', () => {
    expect(fmt(0)).toBe('0 lei');
  });
});

describe('hasRealImg', () => {
  it('rejects the LINK_POZA placeholder', () => {
    expect(hasRealImg({ img: 'LINK_POZA' })).toBe(false);
  });

  it('rejects missing img', () => {
    expect(hasRealImg({})).toBeFalsy();
  });

  it('rejects non-http(s) values', () => {
    expect(hasRealImg({ img: 'javascript:alert(1)' })).toBe(false);
  });

  it('accepts a real https url', () => {
    expect(hasRealImg({ img: 'https://example.com/a.jpg' })).toBe(true);
  });
});

describe('filterProducts', () => {
  const list = [
    { id: 1, cat: 'ceramica' },
    { id: 2, cat: 'textile' },
    { id: 3, cat: 'ceramica' },
  ];

  it('returns everything for "all"', () => {
    expect(filterProducts(list, 'all')).toEqual(list);
  });

  it('filters by category', () => {
    expect(filterProducts(list, 'ceramica').map(p => p.id)).toEqual([1, 3]);
  });

  it('returns an empty list for an unknown category', () => {
    expect(filterProducts(list, 'nu-exista')).toEqual([]);
  });
});

describe('computeCartTotals', () => {
  const products = [
    { id: 1, price: 100 },
    { id: 2, price: 300 },
  ];

  it('is all zero for an empty cart', () => {
    expect(computeCartTotals({}, products)).toEqual({
      ids: [], count: 0, subtotal: 0, shipping: 0, grandtotal: 0,
    });
  });

  it('charges shipping under the 350 lei threshold', () => {
    const totals = computeCartTotals({ 1: 2 }, products); // 200 lei
    expect(totals.subtotal).toBe(200);
    expect(totals.shipping).toBe(25);
    expect(totals.grandtotal).toBe(225);
  });

  it('gives free shipping at or above 350 lei', () => {
    const totals = computeCartTotals({ 2: 1, 1: 1 }, products); // 400 lei
    expect(totals.subtotal).toBe(400);
    expect(totals.shipping).toBe(0);
    expect(totals.grandtotal).toBe(400);
  });

  it('gives free shipping exactly at the 350 lei threshold', () => {
    const totals = computeCartTotals({ 2: 1, 1: 1 }, [{ id: 1, price: 50 }, { id: 2, price: 300 }]);
    expect(totals.subtotal).toBe(350);
    expect(totals.shipping).toBe(0);
  });

  it('counts total quantity across distinct items', () => {
    const totals = computeCartTotals({ 1: 2, 2: 3 }, products);
    expect(totals.count).toBe(5);
  });
});

describe('applyQtyChange', () => {
  it('adds a new item to the cart', () => {
    const cart = {};
    applyQtyChange(cart, 5, 1);
    expect(cart).toEqual({ 5: 1 });
  });

  it('increments an existing item', () => {
    const cart = { 5: 1 };
    applyQtyChange(cart, 5, 1);
    expect(cart[5]).toBe(2);
  });

  it('removes the item once quantity drops to zero', () => {
    const cart = { 5: 1 };
    applyQtyChange(cart, 5, -1);
    expect(cart).toEqual({});
  });

  it('removes the item if quantity goes negative', () => {
    const cart = { 5: 1 };
    applyQtyChange(cart, 5, -5);
    expect(cart).toEqual({});
  });
});

describe('buildRadarProduct', () => {
  it('maps a known category to its illustration style', () => {
    const p = buildRadarProduct({ id: 99, name: 'Lampă X', cat: 'iluminat', price: '199' }, radarStyle);
    expect(p).toMatchObject({ id: 99, name: 'Lampă X', cat: 'iluminat', obj: 'lampa', tint: 'brass', price: 199 });
  });

  it('falls back to accente styling for an unknown category', () => {
    const p = buildRadarProduct({ id: 99, cat: 'nu-exista' }, radarStyle);
    expect(p.obj).toBe(radarStyle.accente.obj);
    expect(p.tint).toBe(radarStyle.accente.tint);
  });

  it('defaults missing fields', () => {
    const p = buildRadarProduct({ id: 99 }, radarStyle);
    expect(p.name).toBe('Produs');
    expect(p.cat).toBe('accente');
    expect(p.price).toBe(0);
    expect(p.tag).toBe('Nou');
  });

  it('coerces a non-numeric price to 0', () => {
    const p = buildRadarProduct({ id: 99, price: 'gratis' }, radarStyle);
    expect(p.price).toBe(0);
  });
});

describe('mergeRadarData', () => {
  it('appends new items and reports how many were added', () => {
    const list = [{ id: 1, cat: 'ceramica' }];
    const added = mergeRadarData(list, [{ id: 2, cat: 'textile' }], radarStyle);
    expect(added).toBe(1);
    expect(list).toHaveLength(2);
    expect(list[1].id).toBe(2);
  });

  it('skips items whose id already exists', () => {
    const list = [{ id: 1, cat: 'ceramica' }];
    const added = mergeRadarData(list, [{ id: 1, cat: 'textile' }], radarStyle);
    expect(added).toBe(0);
    expect(list).toHaveLength(1);
  });

  it('skips malformed entries with a null id', () => {
    const list = [];
    const added = mergeRadarData(list, [{ id: null, name: 'ceva' }], radarStyle);
    expect(added).toBe(0);
    expect(list).toHaveLength(0);
  });

  it('skips falsy entries in the array', () => {
    const list = [];
    const added = mergeRadarData(list, [null, undefined], radarStyle);
    expect(added).toBe(0);
  });

  it('returns 0 and does not throw when data is not an array', () => {
    const list = [{ id: 1 }];
    expect(mergeRadarData(list, { not: 'an array' }, radarStyle)).toBe(0);
    expect(list).toHaveLength(1);
  });
});
