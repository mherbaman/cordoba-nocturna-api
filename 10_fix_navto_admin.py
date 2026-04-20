ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix 1: id → page en el if de partidos-pub
html = html.replace(
    "if(id==='partidos-pub') setTimeout(cargarPartidosPubAdmin, 100);",
    "if(page==='partidos-pub') setTimeout(cargarPartidosPubAdmin, 100);"
)
print("✅ Fix 1: id → page")

# Fix 2: agregar case partidos-pub dentro de navTo junto a los otros
viejo = "  if (page === 'promo-principal') cargarPromoPrincipal();\n}"
nuevo = "  if (page === 'promo-principal') cargarPromoPrincipal();\n  if (page === 'partidos-pub') cargarPartidosPubAdmin();\n}"
html = html.replace(viejo, nuevo)
print("✅ Fix 2: cargarPartidosPubAdmin en navTo")

# Fix 3: la sección tiene id="sec-partidos-pub" pero navTo busca "page-partidos-pub"
html = html.replace(
    'id="sec-partidos-pub"',
    'id="page-partidos-pub" class="page"'
)
print("✅ Fix 3: sec → page-partidos-pub con clase page")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
