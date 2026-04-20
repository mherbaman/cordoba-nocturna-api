ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

viejo = "'<button onclick=\"eliminarPartidoPub(''+p.id+'')\" style=\"background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;cursor:pointer\">Eliminar</button></div>'"
nuevo = "'<button onclick=\"eliminarPartidoPub(\\'' + p.id + '\\')\" style=\"background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;cursor:pointer\">Eliminar</button></div>'"

if viejo in html:
    html = html.replace(viejo, nuevo)
    print("OK corregido")
else:
    print("No encontro patron exacto, buscando linea...")
    for i, line in enumerate(html.split('\n')):
        if 'eliminarPartidoPub' in line and 'onclick' in line:
            print(f"L{i+1}: {repr(line)}")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
