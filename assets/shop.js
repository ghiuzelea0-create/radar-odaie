/* ---------- Ilustrații de produs (SVG inline, fallback) ---------- */
export const tint = {sage:'#9AA083',clay:'#C79A6E',slate:'#8A8074',plum:'#A98A85',brass:'#C79A6E'};
export function obj(type,c){
  const s='stroke="'+c+'" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const fill='fill="'+c+'" opacity=".12"';
  const shapes={
    vaza:`<path ${fill} d="M40 18h20c2 8-4 12-4 22s8 14 4 34c-2 8-22 8-24 0-4-20 4-24 4-34s-6-14-4-22Z"/><path ${s} d="M40 18h20c2 8-4 12-4 22s8 14 4 34c-2 8-22 8-24 0-4-20 4-24 4-34s-6-14-4-22Z"/><path ${s} d="M37 18h26"/>`,
    lampa:`<path ${fill} d="M30 30h40l-6 22H36Z"/><path ${s} d="M30 30h40l-6 22H36Z"/><path ${s} d="M50 52v22M38 82h24M44 82c0-4 12-4 12 0"/>`,
    oglinda:`<ellipse ${fill} cx="50" cy="44" rx="22" ry="30"/><ellipse ${s} cx="50" cy="44" rx="22" ry="30"/><ellipse ${s} cx="50" cy="44" rx="15" ry="22"/>`,
    lumanare:`<rect ${fill} x="38" y="34" width="10" height="44" rx="3"/><rect ${s} x="38" y="34" width="10" height="44" rx="3"/><path ${s} d="M43 34v-7"/><path ${s} d="M43 22c2 2 2 5 0 7-2-2-2-5 0-7Z" stroke="${tint.brass}"/><rect ${fill} x="54" y="46" width="9" height="32" rx="3"/><rect ${s} x="54" y="46" width="9" height="32" rx="3"/><path ${s} d="M58 46v-5"/>`,
    perna:`<path ${fill} d="M26 32c0-4 4-6 8-6h32c4 0 8 2 8 6v36c0 4-4 6-8 6H34c-4 0-8-2-8-6Z"/><path ${s} d="M26 32c0-4 4-6 8-6h32c4 0 8 2 8 6v36c0 4-4 6-8 6H34c-4 0-8-2-8-6Z"/><path ${s} d="M34 34c8-3 24-3 32 0M34 66c8 3 24 3 32 0"/>`,
    tablou:`<rect ${fill} x="28" y="22" width="44" height="56" rx="2"/><rect ${s} x="28" y="22" width="44" height="56" rx="2"/><rect ${s} x="35" y="29" width="30" height="42"/><path ${s} d="M35 60l9-12 7 8 5-6 9 11"/><circle ${s} cx="56" cy="40" r="3"/>`,
    suport:`<path ${fill} d="M40 26c-3 8-3 14 10 14s10-6 7-14Z"/><path ${s} d="M40 26c-3 8-3 14 10 14s10-6 7-14Z"/><path ${s} d="M50 40c-6-6-10-2-14-8M50 40c4-8 10-4 14-10"/><path ${s} d="M42 52h16l-2 26H44Z"/><path ${s} d="M40 52h20"/>`,
    vas:`<path ${fill} d="M28 44c0 16 10 26 22 26s22-10 22-26Z"/><path ${s} d="M28 44c0 16 10 26 22 26s22-10 22-26Z"/><path ${s} d="M25 44h50"/>`,
    rama:`<rect ${fill} x="32" y="24" width="36" height="48" rx="2"/><rect ${s} x="32" y="24" width="36" height="48" rx="2"/><path ${s} d="M40 60l7-10 6 7 4-5 7 9"/><circle ${s} cx="58" cy="38" r="3.5"/><path ${s} d="M42 80h16" stroke="${tint.brass}"/>`,
    difuzor:`<path ${fill} d="M40 50a10 10 0 0 1 20 0v16c0 5-4 8-10 8s-10-3-10-8Z"/><path ${s} d="M40 50a10 10 0 0 1 20 0v16c0 5-4 8-10 8s-10-3-10-8Z"/><path ${s} d="M47 40c-3-4 0-8 3-12 3 4 6 8 3 12" stroke="${tint.brass}"/><path ${s} d="M53 36c-2-2 0-5 2-7"/>`,
    patura:`<path ${fill} d="M28 30h44v40c0 0-10 6-22 6s-22-6-22-6Z"/><path ${s} d="M28 30h44v40c0 0-10 6-22 6s-22-6-22-6Z"/><path ${s} d="M28 42h44M28 54h44M40 30v46M60 30v46"/>`,
    ceas:`<circle ${fill} cx="50" cy="50" r="28"/><circle ${s} cx="50" cy="50" r="28"/><path ${s} d="M50 32v6M50 62v6M32 50h6M62 50h6"/><path ${s} d="M50 50V36M50 50l11 6" stroke="${tint.brass}"/>`
  };
  return `<svg class="obj" viewBox="0 0 100 100" aria-hidden="true">${shapes[type]||shapes.vaza}</svg>`;
}

/* ---------- Date ---------- */
export const IMG='https://ghiuzelea0-create.github.io/radar-odaie/assets/products/ilustratii/';
export const categories=[
  {id:'ceramica',name:'Ceramică'},
  {id:'arome',name:'Lumânări & arome'},
  {id:'textile',name:'Textile'},
  {id:'iluminat',name:'Iluminat'},
  {id:'perete',name:'Perete'},
  {id:'accente',name:'Decorative'},
];
export const collections=[
  {id:'ceramica',name:'Ceramică',note:'Vaze, boluri, obiecte sculpturale',img:IMG+'vaza-argila.jpg'},
  {id:'arome',name:'Lumânări & arome',note:'Ceară de soia, difuzoare naturale',img:IMG+'lumanari-fum.jpg'},
  {id:'textile',name:'Textile',note:'In, lână, catifea — texturi calde',img:IMG+'perna-catifea.jpg'},
  {id:'iluminat',name:'Iluminat',note:'Lămpi de podea și de masă',img:IMG+'lampa-luna.jpg'},
  {id:'perete',name:'Obiecte de perete',note:'Oglinzi, rame, printuri',img:IMG+'oglinda-arcada.jpg'},
  {id:'all',name:'Seturi cadou',note:'Compuse de noi, împachetate cald',img:IMG+'bol-decorativ.jpg'},
];
export const products=[
  {id:1,name:'Vază Argilă',cat:'ceramica',catName:'Ceramică',obj:'vaza',tint:'clay',price:149,old:189,desc:'Lut nesmălțuit, formă organică',tag:'Nou',img:IMG+'vaza-argila.jpg'},
  {id:2,name:'Lampă Lună',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'brass',price:289,desc:'Abajur de in, lumină caldă',img:IMG+'lampa-luna.jpg'},
  {id:3,name:'Oglindă Arcadă',cat:'perete',catName:'Decor perete',obj:'oglinda',tint:'brass',price:359,old:420,desc:'Ramă subțire, finisaj alamă',tag:'-15%',img:IMG+'oglinda-arcada.jpg'},
  {id:4,name:'Set Lumânări Fum',cat:'arome',catName:'Arome',obj:'lumanare',tint:'sage',price:89,desc:'Ceară de soia, ardere 40h',img:IMG+'lumanari-fum.jpg'},
  {id:5,name:'Pernă Catifea',cat:'textile',catName:'Textile',obj:'perna',tint:'plum',price:119,desc:'45×45 cm, umplutură premium',img:IMG+'perna-catifea.jpg'},
  {id:6,name:'Tablou Linie',cat:'perete',catName:'Decor perete',obj:'tablou',tint:'slate',price:199,desc:'Print pe hârtie cotton, A2',img:IMG+'tablou-linie.jpg'},
  {id:7,name:'Suport Plante',cat:'accente',catName:'Accente',obj:'suport',tint:'sage',price:169,desc:'Ceramică & lemn de fag',tag:'Popular',img:IMG+'suport-plante.jpg'},
  {id:8,name:'Bol Decorativ',cat:'ceramica',catName:'Ceramică',obj:'vas',tint:'clay',price:99,desc:'Glazură reactivă, unicat',img:IMG+'bol-decorativ.jpg'},
  {id:9,name:'Ramă Foto Travertin',cat:'perete',catName:'Decor perete',obj:'rama',tint:'brass',price:79,desc:'Piatră naturală, 13×18',img:IMG+'rama-travertin.jpg'},
  {id:10,name:'Difuzor Arome',cat:'arome',catName:'Arome',obj:'difuzor',tint:'sage',price:139,desc:'Ulei esențial, smochin & cedru',img:IMG+'difuzor-arome.jpg'},
  {id:11,name:'Pătură Lână',cat:'textile',catName:'Textile',obj:'patura',tint:'clay',price:249,old:299,desc:'Lână merinos, tricotaj gros',tag:'-17%',img:IMG+'patura-lana.jpg'},
  {id:12,name:'Ceas Minimal',cat:'accente',catName:'Accente',obj:'ceas',tint:'slate',price:179,desc:'Mecanism silențios, Ø30 cm',img:IMG+'ceas-minimal.jpg'},
  {id:18,name:'Lampă LED Cylinder',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'clay',price:490,desc:'Bază cilindrică din lemn masiv, LED cald integrat',tag:'Nou',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/cylinder.jpg'},
  {id:19,name:'Lampă LED Cube',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:560,desc:'Ramă cubică din lemn și metal, lumină liniară',tag:'Nou',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/cube.jpg'},
  {id:20,name:'Lampă LED Octagon',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:510,desc:'Bază octogonală din lemn masiv, finisaj negru mat',tag:'Nou',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/octagon.jpg'},
  {id:21,name:'Lampă LED Oval',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'clay',price:540,desc:'Bază cilindrică din lemn de nuc, LED cald',tag:'Nou',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/oval.jpg'},
  {id:22,name:'Lampă LED Cone',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:530,desc:'Bază conică sculpturală, prezență discretă',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/cone.jpg'},
  {id:23,name:'Lampă LED Monolith',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:620,desc:'Coloană monolit din lemn masiv, LED liniar',tag:'Popular',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/monolith.jpg'},
  {id:24,name:'Lampă LED Totem',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:640,desc:'Bază sculpturală, forme geometrice suprapuse',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/totem.jpg'},
  {id:25,name:'Lampă LED Obelisk',cat:'iluminat',catName:'Iluminat',obj:'lampa',tint:'slate',price:590,desc:'Bază obelisc din lemn masiv, LED cald integrat',tag:'Nou',img:'https://ghiuzelea0-create.github.io/radar-odaie/assets/products/arca/obelisk.jpg'},
];

/* ---------- Render helpers (pure) ---------- */
export function escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
export function fmt(n){return n.toLocaleString('ro-RO')+' lei';}
export function hasRealImg(p){return p.img && p.img!=='LINK_POZA' && /^https?:\/\//.test(p.img);}
export function media(p){
  const svg=obj(p.obj,tint[p.tint]);
  if(!hasRealImg(p)) return svg;
  return svg+`<img src="${escAttr(p.img)}" alt="${escAttr(p.name)}" loading="lazy" onerror="this.remove()">`;
}
export function filterProducts(list,filter){
  return filter==='all'?list:list.filter(p=>p.cat===filter);
}

/* ---------- Radar: produse din products.json (automat, zilnic) ---------- */
export const RADAR_URL='https://raw.githubusercontent.com/ghiuzelea0-create/radar-odaie/main/products.json';
export const radarStyle={iluminat:{obj:'lampa',tint:'brass'},ceramica:{obj:'vaza',tint:'clay'},textile:{obj:'perna',tint:'plum'},perete:{obj:'tablou',tint:'slate'},arome:{obj:'lumanare',tint:'sage'},accente:{obj:'vas',tint:'sage'}};

export function buildRadarProduct(it,style){
  const st=style[it.cat]||style.accente;
  return {id:it.id,name:it.name||'Produs',cat:it.cat||'accente',catName:it.catName||'Accente',obj:st.obj,tint:st.tint,price:Number(it.price)||0,desc:it.desc||'',tag:it.tag||'Nou',img:it.img||''};
}

export function mergeRadarData(list,data,style){
  if(!Array.isArray(data)) return 0;
  let added=0;
  data.forEach(it=>{
    if(!it||it.id==null||list.some(p=>p.id==it.id)) return;
    list.push(buildRadarProduct(it,style));
    added++;
  });
  return added;
}

/* ---------- Cart math (pure) ---------- */
export function computeCartTotals(cart,list){
  const ids=Object.keys(cart);
  const count=ids.reduce((s,id)=>s+cart[id],0);
  const subtotal=ids.reduce((s,id)=>s+list.find(x=>x.id==id).price*cart[id],0);
  const shipping=subtotal>0&&subtotal>=350?0:(subtotal>0?25:0);
  return {ids,count,subtotal,shipping,grandtotal:subtotal+shipping};
}

export function applyQtyChange(cart,id,d){
  cart[id]=(cart[id]||0)+d;
  if(cart[id]<=0) delete cart[id];
  return cart;
}

/* ---------- DOM wiring (only runs when a page DOM is present) ---------- */
export function initShop(doc=document){
  async function loadRadar(){
    try{
      const res=await fetch(RADAR_URL,{cache:'no-store'});
      if(!res.ok) return;
      const data=await res.json();
      const added=mergeRadarData(products,data,radarStyle);
      if(added){const f=doc.querySelector('.chip.active')?.dataset.filter||'all';renderGrid(f);}
    }catch(e){}
  }

  function renderCats(){
    doc.getElementById('cats').innerHTML=collections.map((c,i)=>`
      <button class="col" data-cat="${c.id}">
        <div class="col-media"><img src="${escAttr(c.img)}" alt="${escAttr(c.name)}" loading="lazy" onerror="this.style.opacity=0"></div>
        <div class="col-row"><span class="col-name">${c.name}</span><span class="col-idx">${String(i+1).padStart(2,'0')}</span></div>
        <div class="col-note">${c.note}</div>
      </button>`).join('');
  }

  function renderGrid(filter='all'){
    const list=filterProducts(products,filter);
    doc.getElementById('grid').innerHTML=list.map((p,i)=>`
      <article class="card">
        <div class="card-media">
          <span class="card-idx">${String(i+1).padStart(2,'0')}</span>
          ${p.tag?`<span class="tag">${p.tag}</span>`:''}
          ${media(p)}
          <button class="quick" data-add="${p.id}">Adaugă în coș</button>
        </div>
        <div class="card-body">
          <div class="card-cat">${p.catName}</div>
          <div class="card-name">${p.name}</div>
          <div class="card-desc">${p.desc}</div>
          <div class="price"><span class="now">${fmt(p.price)}</span>${p.old?`<span class="old">${fmt(p.old)}</span>`:''}</div>
        </div>
      </article>`).join('');
  }

  const filters=[{id:'all',name:'Toate'},...categories];

  let cart={};
  const overlay=doc.getElementById('overlay'),drawer=doc.getElementById('drawer');
  function openCart(){overlay.classList.add('open');drawer.classList.add('open')}
  function closeCart(){overlay.classList.remove('open');drawer.classList.remove('open')}

  function addToCart(id){applyQtyChange(cart,id,1);renderCart();toast('Adăugat în coș');}
  function changeQty(id,d){applyQtyChange(cart,id,d);renderCart();}
  function removeItem(id){delete cart[id];renderCart();}

  function renderCart(){
    const {ids,count,subtotal,shipping,grandtotal}=computeCartTotals(cart,products);
    const badge=doc.getElementById('cartCount');
    badge.textContent=count;badge.classList.toggle('show',count>0);
    const wrap=doc.getElementById('drawerItems'),foot=doc.getElementById('drawerFoot');
    if(!ids.length){
      wrap.innerHTML=`<div class="drawer-empty"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg><p>Coșul tău e gol.<br>Hai să-l umplem frumos.</p></div>`;
      foot.style.display='none';return;
    }
    foot.style.display='block';
    wrap.innerHTML=ids.map(id=>{
      const p=products.find(x=>x.id==id),q=cart[id];
      return `<div class="citem">
        <div class="citem-media">${media(p)}</div>
        <div class="citem-info">
          <div class="nm">${p.name}</div>
          <div class="pr">${fmt(p.price)}</div>
          <div class="qty"><button data-q="${id}|-1">−</button><span>${q}</span><button data-q="${id}|1">+</button></div>
          <button class="citem-remove" data-rm="${id}">Elimină</button>
        </div>
      </div>`;
    }).join('');
    doc.getElementById('subtotal').textContent=fmt(subtotal);
    doc.getElementById('shipping').textContent=shipping===0?'Gratuit':fmt(shipping);
    doc.getElementById('grandtotal').textContent=fmt(grandtotal);
  }

  let toastT;
  function toast(msg){const t=doc.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}

  renderCats();
  doc.getElementById('filters').innerHTML=filters.map((f,i)=>
    `<button class="chip ${i===0?'active':''}" data-filter="${f.id}">${f.name}</button>`).join('');
  renderGrid();
  loadRadar();

  doc.getElementById('filters').addEventListener('click',e=>{
    const b=e.target.closest('[data-filter]');if(!b)return;
    doc.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    b.classList.add('active');renderGrid(b.dataset.filter);
  });
  doc.getElementById('cats').addEventListener('click',e=>{
    const b=e.target.closest('[data-cat]');if(!b)return;
    doc.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.filter===b.dataset.cat));
    renderGrid(b.dataset.cat);
    doc.getElementById('colectie').scrollIntoView({behavior:'smooth'});
  });

  doc.getElementById('cartToggle').onclick=openCart;
  doc.getElementById('cartClose').onclick=closeCart;
  overlay.onclick=closeCart;

  doc.body.addEventListener('click',e=>{
    const add=e.target.closest('[data-add]');if(add){addToCart(+add.dataset.add);return;}
    const q=e.target.closest('[data-q]');if(q){const[id,d]=q.dataset.q.split('|');changeQty(id,+d);return;}
    const rm=e.target.closest('[data-rm]');if(rm){removeItem(rm.dataset.rm);return;}
  });

  doc.getElementById('checkoutBtn').onclick=()=>toast('Demo — aici s-ar deschide plata 🤍');
  doc.getElementById('searchToggle').onclick=()=>{doc.getElementById('colectie').scrollIntoView({behavior:'smooth'});toast('Caută în prăvălia de mai jos');};
  doc.getElementById('newsBtn').onclick=()=>{const v=doc.getElementById('newsEmail').value;toast(v&&v.includes('@')?'Mulțumim — ești pe listă!':'Scrie o adresă validă');};
  doc.getElementById('promoCode').onclick=()=>{const code='BUNVENIT10';if(navigator.clipboard)navigator.clipboard.writeText(code).catch(()=>{});toast('Cod copiat: '+code);};

  renderCart();

  return {renderGrid,renderCats,renderCart,addToCart,changeQty,removeItem,openCart,closeCart,getCart:()=>cart};
}

if(typeof document!=='undefined' && document.getElementById('cats')){
  initShop(document);
}
