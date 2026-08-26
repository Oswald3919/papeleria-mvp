const STORE = 'papeleria-demo-v1';
const $ = selector => document.querySelector(selector);
let chosen = null;

function initial() { return JSON.parse(localStorage.getItem(STORE) || 'null') || { products: [], cart: [], orders: [] }; }
function save(state) { localStorage.setItem(STORE, JSON.stringify(state)); }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
function normal(value = '') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function valueOf(row, names) {
  const key = Object.keys(row).find(candidate => names.includes(normal(candidate)));
  return key == null ? '' : String(row[key] ?? '').trim();
}
function numberOf(value, fallback = 0) {
  const clean = String(value ?? '').trim().replace(/\s|[$]/g, '');
  if (!clean) return fallback;
  const normalized = clean.includes(',') && clean.includes('.') ? clean.replace(/,/g, '') : clean.replace(',', '.');
  const result = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(result) ? result : fallback;
}
function productKey(product) { return normal(product.sku || product.barcode || product.id); }
function notice(message, isError = false) {
  $('#importNote').textContent = message;
  $('#importNote').classList.toggle('error', isError);
  $('#lastUpdate').textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
}

function render() {
  const state = initial(), products = state.products || [];
  const reserved = (state.orders || []).filter(order => !['cancelled', 'collected'].includes(order.status)).flatMap(order => order.items || []);
  const held = id => reserved.filter(item => item.id === id).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  $('#statProducts').textContent = products.length;
  $('#statAvailable').textContent = products.filter(product => product.stock - held(product.id) > 0).length;
  $('#statLow').textContent = products.filter(product => product.stock - held(product.id) <= Math.max(2, product.minimum_stock || 0)).length;
  $('#statReserved').textContent = reserved.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const query = $('#productSearch').value.toLowerCase();
  const rows = products.filter(product => `${product.name} ${product.id} ${product.sku || ''} ${product.barcode || ''}`.toLowerCase().includes(query)).slice(0, 60);
  $('#productList').innerHTML = rows.length ? rows.map(product => {
    const reservedQty = held(product.id), available = Math.max(0, product.stock - reservedQty);
    const low = available <= Math.max(2, product.minimum_stock || 0);
    return `<div class="item"><div><strong>${esc(product.name)}</strong><small>SKU/código: ${esc(product.sku || product.barcode || product.id)} · ${reservedQty} reservado(s)</small></div><strong>${available} disp.</strong><span class="badge ${low ? 'low' : ''}">${low ? 'Stock bajo' : 'En existencia'}</span><button data-id="${esc(product.id)}">Ajustar</button></div>`;
  }).join('') : '<p>No hay coincidencias.</p>';
  document.querySelectorAll('[data-id]').forEach(button => { button.onclick = () => openAdjust(button.dataset.id); });
}
function openAdjust(id) {
  chosen = initial().products.find(product => String(product.id) === String(id));
  if (!chosen) return;
  $('#adjustName').textContent = chosen.name;
  $('#adjustCurrent').textContent = `Existencia actual: ${chosen.stock}`;
  $('#adjustForm').reset();
  $('#adjustDialog').showModal();
}

function parseCsv(text) {
  const source = String(text).replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = [';', '\t', ','].reduce((best, char) => (firstLine.split(char).length > firstLine.split(best).length ? char : best), ',');
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (char === '"' && quoted && next === '"') { cell += char; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i++; row.push(cell.trim()); if (row.some(value => value !== '')) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(value => value !== '')) rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}
async function readRows(file) {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    if (!window.XLSX) throw new Error('No se pudo cargar el lector de Excel. Intenta guardar el archivo como CSV.');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '', raw: false });
  }
  return parseCsv(await file.text());
}
function rowToProduct(row, index) {
  const sku = valueOf(row, ['sku', 'codigo', 'codigodebarras', 'barcode', 'id']);
  const name = valueOf(row, ['nombre', 'producto', 'name', 'product', 'descripcion']);
  if (!name) return null;
  return {
    id: sku || `import-${Date.now()}-${index}`, sku: sku || null, name,
    price: numberOf(valueOf(row, ['precio', 'precionormal', 'price', 'regularprice']), 0),
    stock: Math.max(0, Math.trunc(numberOf(valueOf(row, ['existencia', 'inventario', 'stock', 'cantidad', 'quantity']), 0))),
    minimum_stock: Math.max(0, Math.trunc(numberOf(valueOf(row, ['cantidaddebajoinventario', 'minimo', 'minimumstock', 'stockminimo']), 0))),
    category: valueOf(row, ['categoria', 'categorias', 'category']) || 'Sin categoría',
    image: valueOf(row, ['imagen', 'imagenes', 'image', 'imageurl']) || ''
  };
}

$('#loginForm').onsubmit = event => { event.preventDefault(); sessionStorage.setItem('cybertime-admin', '1'); show(); };
function show() { const loggedIn = sessionStorage.getItem('cybertime-admin'); $('#login').hidden = !!loggedIn; $('#dashboard').hidden = !loggedIn; if (loggedIn) render(); }
$('#signOut').onclick = () => { sessionStorage.removeItem('cybertime-admin'); show(); };
$('#productSearch').oninput = render;
$('#closeAdjust').onclick = () => $('#adjustDialog').close();
$('#adjustForm').onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.target), quantity = Math.max(0, Math.trunc(Number(form.get('quantity'))));
  if (!chosen || !Number.isFinite(quantity)) return;
  const state = initial(), product = state.products.find(item => String(item.id) === String(chosen.id));
  if (!product) return;
  product.stock = form.get('type') === 'set' ? quantity : Math.max(0, product.stock + (form.get('type') === 'add' ? quantity : -quantity));
  save(state); $('#adjustDialog').close(); notice(`Existencia ajustada para “${product.name}”.`); render();
};

$('#productsFile').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const imported = (await readRows(file)).map(rowToProduct).filter(Boolean);
    if (!imported.length) throw new Error('No se encontró ninguna fila con la columna Nombre o Producto.');
    const state = initial(), byKey = new Map();
    state.products.forEach(product => { const key = productKey(product); if (key) byKey.set(key, product); });
    let created = 0, updated = 0;
    imported.forEach(product => {
      const key = productKey(product), existing = key && byKey.get(key);
      if (existing) { Object.assign(existing, { ...product, id: existing.id, sku: product.sku || existing.sku }); updated++; }
      else { state.products.push(product); if (key) byKey.set(key, product); created++; }
    });
    save(state); notice(`${created} producto(s) creado(s) y ${updated} actualizado(s) desde ${file.name}.`); render();
  } catch (error) { notice(error.message || 'No pudimos leer ese archivo.', true); }
  event.target.value = '';
};
$('#inventoryFile').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const rows = await readRows(file), state = initial(), byKey = new Map();
    state.products.forEach(product => { [product.id, product.sku, product.barcode].filter(Boolean).forEach(key => byKey.set(normal(key), product)); });
    let updated = 0, unmatched = 0;
    rows.forEach(row => {
      const code = valueOf(row, ['sku', 'codigo', 'codigodebarras', 'barcode', 'id']);
      const stockValue = valueOf(row, ['existencia', 'inventario', 'stock', 'cantidad', 'quantity']);
      const product = byKey.get(normal(code));
      if (!product || stockValue === '') { unmatched++; return; }
      product.stock = Math.max(0, Math.trunc(numberOf(stockValue))); updated++;
    });
    save(state); notice(`${updated} existencia(s) actualizada(s) desde ${file.name}${unmatched ? `; ${unmatched} fila(s) no coincidieron.` : '.'}`); render();
  } catch (error) { notice(error.message || 'No pudimos leer ese archivo.', true); }
  event.target.value = '';
};
$('#resetInventory').onclick = () => {
  const state = initial();
  if (!state.products.length) { notice('El inventario ya está vacío.'); return; }
  if (!confirm(`¿Eliminar los ${state.products.length} productos del inventario? Esta acción no se puede deshacer.`)) return;
  state.products = []; state.cart = []; save(state); notice('Inventario reseteado: no quedan productos cargados.'); render();
};
show();
