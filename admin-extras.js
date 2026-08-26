// Manejadores extra para el panel admin: importación completa de productos y reset
(function(){
  console.log('admin-extras: cargado');
  function $ (s){return document.querySelector(s)}
  // Esperar a que existan las funciones globales definidas en admin.js
  function whenReady(fn){if(window.parseCsv&&window.initial&&window.save&&window.render)fn();else setTimeout(()=>whenReady(fn),150)}
  whenReady(()=>{
    console.log('admin-extras: dependencias listas');
    // Importar productos desde CSV reemplazando el catálogo
    const productsFile = $('#productsFile');
    if(productsFile){
      console.log('admin-extras: attach productsFile listener');
      productsFile.addEventListener('change', async e=>{
        const f = e.target.files[0]; if(!f) return; const r = new FileReader();
        r.onload = async ()=>{
          try{
            const data = parseCsv(r.result);
            console.log('admin-extras: CSV parseado, filas=',data.length, 'primera=', data[0]);
            const products = data.map((row,i)=>{
              const sku = row['SKU']||row['sku']||row['Código']||row['Codigo']||row['ID']||row['id']||'';
              const name = row['Nombre']||row['name']||row['Producto']||row['Product']||`Producto ${i+1}`;
              const stock = Number(row['Existencia']||row['stock']||row['Inventario']||0);
              const min = Number(row['Cantidad de bajo inventario']||row['Minimo']||row['minimum_stock']||row['MinimumStock']||0);
              const id = sku?String(sku):`p-${Date.now()}-${i}`;
              return {id:String(id),name:String(name),sku:sku||null,stock:Number.isFinite(stock)?stock:0,minimum_stock:Number.isFinite(min)?min:0};
            });

            // Si Supabase está configurado, intentar guardar en la tabla 'products'
            const cfg = window.CYBERTIME_SUPABASE;
            if(window.supabase && cfg && cfg.url && cfg.publishableKey){
              try{
                const supa = window.supabase.createClient(cfg.url, cfg.publishableKey);
                console.log('admin-extras: subiendo', products.length, 'productos a Supabase...');
                // Upsert rows (requiere que la tabla 'products' exista y acepte estos campos)
                const {data:upData, error:upErr} = await supa.from('products').upsert(products);
                if(upErr) throw upErr;
                console.log('admin-extras: upsert OK', upData?.length);
                // Refrescar catálogo local desde Supabase
                const {data:all, error:selErr} = await supa.from('products').select('*');
                if(selErr) throw selErr;
                const s = initial(); s.products = (all||[]).map(p=>({id:String(p.id),name:p.name,sku:p.sku,stock:Number(p.stock)||0,minimum_stock:Number(p.minimum_stock)||0}));
                save(s);
                const note = document.getElementById('importNote'); if(note) note.textContent = `Importación a Supabase terminada: ${s.products.length} productos desde ${f.name}.`;
                const lu = document.getElementById('lastUpdate'); if(lu) lu.textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
                render();
                return;
              }catch(err){console.error('admin-extras: error subiendo a Supabase',err);}
            }

            // Fallback a localStorage si Supabase no está disponible o falla
            const s = initial(); s.products = products; save(s);
            console.log('admin-extras: productos guardados en localStorage, total=', products.length);
            const note = document.getElementById('importNote'); if(note) note.textContent = `Importación de productos terminada: ${products.length} productos creados desde ${f.name}.`;
            const lu = document.getElementById('lastUpdate'); if(lu) lu.textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
            render();
          }catch(err){console.error('Error al importar productos CSV',err)}
        };
        r.readAsText(f,'UTF-8');
      });
    }

    // Resetear inventario (vaciar productos)
    const resetBtn = $('#resetInventory');
    if(resetBtn){
      console.log('admin-extras: attach resetInventory listener');
      resetBtn.addEventListener('click', async ()=>{
        console.log('admin-extras: reset clickeado');
        if(!confirm('¿Confirmas borrar TODO el inventario? Esta acción no se puede deshacer.')) return;
        const cfg = window.CYBERTIME_SUPABASE;
        if(window.supabase && cfg && cfg.url && cfg.publishableKey){
          try{
            const supa = window.supabase.createClient(cfg.url, cfg.publishableKey);
            console.log('admin-extras: borrando todos los productos en Supabase...');
            const {error:delErr} = await supa.from('products').delete().neq('id','');
            if(delErr) throw delErr;
            console.log('admin-extras: borrado remoto OK');
            // Refrescar local
            const {data:all, error:selErr} = await supa.from('products').select('*');
            if(selErr) throw selErr;
            const s = initial(); s.products = (all||[]).map(p=>({id:String(p.id),name:p.name,sku:p.sku,stock:Number(p.stock)||0,minimum_stock:Number(p.minimum_stock)||0}));
            save(s);
            const note = document.getElementById('importNote'); if(note) note.textContent = 'Inventario reseteado en Supabase.';
            const lu = document.getElementById('lastUpdate'); if(lu) lu.textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
            render();
            return;
          }catch(err){console.error('admin-extras: error borrando en Supabase',err)}
        }

        // Fallback local
        const s = initial(); console.log('admin-extras: productos antes=', (s.products||[]).length);
        s.products = []; save(s);
        console.log('admin-extras: productos después=', (s.products||[]).length);
        const note = document.getElementById('importNote'); if(note) note.textContent = 'Inventario reseteado manualmente.';
        const lu = document.getElementById('lastUpdate'); if(lu) lu.textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
        render();
      });
    }
  });
})();
