ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

viejo = "  const hoy = new Date(); hoy.setHours(0,0,0,0);\n  const fp  = new Date(p.fecha + 'T00:00:00'); fp.setHours(0,0,0,0);\n  const dias = Math.round((fp - hoy) / 86400000);"

nuevo = "  const hoy = new Date(); hoy.setHours(0,0,0,0);\n  const fechaP = p.fecha ? p.fecha.toString().substring(0,10) : '';\n  const fp = fechaP ? new Date(fechaP+'T12:00:00') : new Date(); fp.setHours(0,0,0,0);\n  const dias = Math.round((fp - hoy) / 86400000);"

if viejo in html:
    html = html.replace(viejo, nuevo)
    print("OK dias corregido")
else:
    print("No encontro patron, buscando...")
    for i,l in enumerate(html.split('\n')):
        if 'dias' in l and 'hoy' in l and 'fp' in l:
            print(f"L{i+1}: {repr(l)}")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
