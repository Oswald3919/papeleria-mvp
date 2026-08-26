# Cybertime — MVP local

Una demostración estática, sin APIs ni servicios externos. Tiene catálogo, importación de CSV, carrito, cuentas locales, puntos, pedidos para recoger y un enlace de WhatsApp con el pedido preparado.

## Administración e inventario

Abre `admin.html` para probar el panel local: ajustes rápidos de existencia, stock bajo e importación desde CSV o Excel. **Importar productos** crea los artículos nuevos y actualiza coincidencias por SKU o código; **Actualizar existencias** sólo cambia el stock de artículos ya cargados. El botón **Resetear inventario** vacía el catálogo después de pedir confirmación.

## Usarlo

Abre `index.html` en un navegador. Para probar el catálogo completo, entra a **Gestión** e importa `../wc-product-export-22-8-2026-1787442224075.csv`.

Los datos se guardan únicamente con el almacenamiento local del navegador. Es útil para la demostración; no es apropiado para producción ni para datos reales de clientes.

## Siguiente fase

Conectar Supabase para cuentas, pedidos, productos y puntos; usar Storage para imágenes; y conectar correo/WhatsApp Business cuando se definan sus credenciales y la lógica de confirmación.
