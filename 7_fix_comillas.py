ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(
    "onclick=\"desinscribirsePartido('' + p.id + '')\"",
    "onclick=\"desinscribirsePartido('\" + p.id + \"')\""
)
html = html.replace(
    "onclick=\"inscribirsePartido('' + p.id + '')\"",
    "onclick=\"inscribirsePartido('\" + p.id + \"')\""
)

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Comillas corregidas")
