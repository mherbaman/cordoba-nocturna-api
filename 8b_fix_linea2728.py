ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

viejo1 = """    btnHTML = '<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido(\'" + p.id + "\')">✓ Inscripto — Cancelar</button>';"""
nuevo1 = """    btnHTML = '<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido(\\'' + p.id + '\\')">✓ Inscripto — Cancelar</button>';"""

viejo2 = """    btnHTML = '<button class="btn-inscribirse" onclick="inscribirsePartido(\'" + p.id + "\')">⚡ Unirme — ' + inscriptos + '/' + cupos + '</button>';"""
nuevo2 = """    btnHTML = '<button class="btn-inscribirse" onclick="inscribirsePartido(\\'' + p.id + '\\')">⚡ Unirme — ' + inscriptos + '/' + cupos + '</button>';"""

if viejo1 in html:
    html = html.replace(viejo1, nuevo1)
    print("✅ línea desinscribirse corregida")
else:
    print("❌ no encontró línea desinscribirse")

if viejo2 in html:
    html = html.replace(viejo2, nuevo2)
    print("✅ línea inscribirse corregida")
else:
    print("❌ no encontró línea inscribirse")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
