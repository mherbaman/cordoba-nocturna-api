ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

INICIO = '<!-- \u2500\u2500\u2500 SECCI\u00d3N PARTIDOS P\u00daBLICOS'
FIN = '<!-- \u2500\u2500\u2500 FIN PARTIDOS P\u00daBLICOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->'

i1 = html.find(INICIO)
i2 = html.find(FIN) + len(FIN)
seccion = html[i1:i2]
print("Seccion chars:", len(seccion))

# Quitar del final
html = html[:i1] + html[i2:]

# Insertar antes de <!-- MODAL -->
html = html.replace('<!-- MODAL -->', seccion + '\n\n<!-- MODAL -->')
print("OK: seccion movida")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
