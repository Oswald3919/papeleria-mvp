(() => {
  const db = window.supabase && window.CYBERTIME_SUPABASE ? window.supabase.createClient(window.CYBERTIME_SUPABASE.url, window.CYBERTIME_SUPABASE.publishableKey) : null;
  const byId = id => document.getElementById(id);
  const key = 'papeleria-demo-v1';
  const state = () => JSON.parse(localStorage.getItem(key) || 'null') || { products: [], cart: [], orders: [] };
  const saveState = value => localStorage.setItem(key, JSON.stringify(value));
  const say = (text, error) => {
    byId('importNote').textContent = text;
    byId('importNote').classList.toggle('error', !!error);
    byId('lastUpdate').textContent = 'Última actualización: ' + new Date().toLocaleString('es-MX');
  };
  const databaseProduct = p => ({ sku: p.sku || null, name: p.name, category: p.category || null, price: Number(p.price) || 0, stock: Math.max(0, Number(p.stock) || 0), minimum_stock: Math.max(0, Number(p.minimum_stock) || 0), image_url: p.image || null, is_active: true });
  async function batchUpload(table, items, onConflict) {
    const chunkSize = 500;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const res = onConflict
        ? await db.from(table).upsert(chunk, { onConflict })
        : await db.from(table).insert(chunk);
      if (res.error) throw res.error;
    }
  }
  async function pull() {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const result = await db.from('products').select('id,sku,barcode,name,category,price,stock,minimum_stock,image_url').order('name').range(page * pageSize, (page + 1) * pageSize - 1);
      if (result.error) throw result.error;
      if (!result.data || !result.data.length) break;
      allData.push(...result.data);
      if (result.data.length < pageSize) break;
      page++;
    }
    const current = state();
    current.products = allData.map(p => ({ ...p, id: String(p.id), price: Number(p.price) || 0, stock: Number(p.stock) || 0, minimum_stock: Number(p.minimum_stock) || 0, image: p.image_url || '' }));
    current.cart = (current.cart || []).filter(item => current.products.some(p => p.id === item.id));
    saveState(current); render(); return current;
  }
  async function canManage() {
    const auth = await db.auth.getUser(); if (!auth.data.user) return false;
    const profile = await db.from('profiles').select('role').eq('id', auth.data.user.id).single();
    return !profile.error && ['admin', 'staff'].includes(profile.data && profile.data.role);
  }
  async function show() {
    if (!(await canManage())) { byId('login').hidden = false; byId('dashboard').hidden = true; return; }
    byId('login').hidden = true; byId('dashboard').hidden = false;
    try { await pull(); say('Inventario sincronizado con la base de datos.'); } catch (error) { say('No se pudo leer la base de datos: ' + error.message, true); }
  }
  if (!db) return;
  byId('loginForm').onsubmit = async event => {
    event.preventDefault(); const form = new FormData(event.target);
    byId('loginNote').textContent = 'Verificando acceso…';
    const login = await db.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
    if (login.error) { byId('loginNote').textContent = 'No fue posible iniciar sesión: ' + login.error.message; return; }
    if (!(await canManage())) { await db.auth.signOut(); byId('loginNote').textContent = 'Tu cuenta no tiene rol de administrador.'; return; }
    show();
  };
  byId('signOut').onclick = async () => { await db.auth.signOut(); byId('dashboard').hidden = true; byId('login').hidden = false; };
  byId('productsFile').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      say('Procesando e importando productos en lotes…');
      const products = (await readRows(file)).map(rowToProduct).filter(Boolean);
      if (!products.length) throw Error('No se encontró ninguna fila con Nombre o Producto.');
      const withSku = products.filter(p => p.sku).map(databaseProduct);
      const withoutSku = products.filter(p => !p.sku).map(databaseProduct);
      if (withSku.length) await batchUpload('products', withSku, 'sku');
      if (withoutSku.length) await batchUpload('products', withoutSku);
      await pull(); say(products.length + ' producto(s) guardado(s) en la base de datos desde ' + file.name + '.');
    } catch (error) { say('No se pudo importar: ' + error.message, true); }
    event.target.value = '';
  };
  byId('inventoryFile').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const rows = await readRows(file), current = await pull(), lookup = new Map(); let updated = 0, missing = 0;
      current.products.forEach(p => [p.id, p.sku, p.barcode].filter(Boolean).forEach(value => lookup.set(normal(value), p)));
      for (const row of rows) {
        const product = lookup.get(normal(valueOf(row, ['sku', 'codigo', 'codigodebarras', 'barcode', 'id'])));
        const stock = valueOf(row, ['existencia', 'inventario', 'stock', 'cantidad', 'quantity']);
        if (!product || stock === '') { missing++; continue; }
        const result = await db.from('products').update({ stock: Math.max(0, Math.trunc(numberOf(stock))) }).eq('id', product.id);
        if (result.error) throw result.error; updated++;
      }
      await pull(); say(updated + ' existencia(s) actualizada(s) en la base de datos' + (missing ? '; ' + missing + ' sin coincidencia.' : '.'));
    } catch (error) { say('No se pudo actualizar: ' + error.message, true); }
    event.target.value = '';
  };
  byId('adjustForm').onsubmit = async event => {
    event.preventDefault(); if (!chosen) return;
    const form = new FormData(event.target), amount = Math.max(0, Math.trunc(Number(form.get('quantity'))));
    const product = state().products.find(p => String(p.id) === String(chosen.id)); if (!product || !Number.isFinite(amount)) return;
    const stock = form.get('type') === 'set' ? amount : Math.max(0, Number(product.stock) + (form.get('type') === 'add' ? amount : -amount));
    const result = await db.from('products').update({ stock }).eq('id', product.id);
    if (result.error) { say('No se pudo guardar el ajuste: ' + result.error.message, true); return; }
    byId('adjustDialog').close(); await pull(); say('Existencia actualizada en la base de datos.');
  };
  byId('resetInventory').onclick = async () => {
    const current = state(); if (!current.products.length) { say('El inventario ya está vacío.'); return; }
    if (!confirm('¿Eliminar los ' + current.products.length + ' productos de la base de datos? Esta acción no se puede deshacer.')) return;
    const result = await db.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (result.error) { say('No se pudo resetear: ' + result.error.message, true); return; }
    await pull(); say('Inventario eliminado de la base de datos.');
  };
  db.auth.onAuthStateChange(() => { show(); });
  show();
})();
