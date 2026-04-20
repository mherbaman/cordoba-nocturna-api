ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# FIX 1: fecha en cargarPartidosPubAdmin
viejo_fecha = "const fecha = new Date(p.fecha+'T00:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'});"
nuevo_fecha = "const fechaStr = p.fecha ? p.fecha.toString().substring(0,10) : ''; const fecha = fechaStr ? new Date(fechaStr+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}) : 'Sin fecha';"
html = html.replace(viejo_fecha, nuevo_fecha)
print("OK fix fecha admin")

# FIX 2: agregar CSS para .page.active
viejo_css = '.page { display:none; }'
if viejo_css in html:
    html = html.replace(viejo_css, '.page { display:none; }\n.page.active { display:block; }')
    print("OK fix CSS page.active existente")
else:
    # Buscar donde esta el CSS de .page
    import re
    match = re.search(r'\.page\s*\{[^}]+\}', html)
    if match:
        print("CSS .page encontrado:", match.group(0))
        # Agregar active despues
        html = html.replace(match.group(0), match.group(0) + '\n.page.active { display:block; }')
        print("OK fix CSS agregado")
    else:
        print("No encontro .page CSS - agregando al final del style")
        html = html.replace('</style>', '.page { display:none; }\n.page.active { display:block; }\n</style>', 1)
        print("OK CSS agregado en style")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
