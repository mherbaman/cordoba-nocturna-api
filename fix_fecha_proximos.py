ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

viejo = "const fecha = new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});"
nuevo = "const fechaStr = p.fecha ? p.fecha.toString().substring(0,10) : ''; const fecha = fechaStr ? new Date(fechaStr+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}) : 'Sin fecha';"

if viejo in html:
    html = html.replace(viejo, nuevo)
    print('OK')
else:
    print('No encontro patron')

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
