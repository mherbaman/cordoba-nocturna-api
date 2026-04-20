ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Reemplazar las líneas problemáticas completas
viejo1 = """    btnHTML = '<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido(\\'\" + p.id + \"\\')">✓ Inscripto — Cancelar</button>';"""
nuevo1 = """    btnHTML = '<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido(\\'' + p.id + '\\')">✓ Inscripto — Cancelar</button>';"""

viejo2 = """    btnHTML = '<button class="btn-inscribirse" onclick="inscribirsePartido(\\'\" + p.id + \"\\')">⚡ Unirme — ' + inscriptos + '/' + cupos + '</button>';"""
nuevo2 = """    btnHTML = '<button class="btn-inscribirse" onclick="inscribirsePartido(\\'' + p.id + '\\')">⚡ Unirme — ' + inscriptos + '/' + cupos + '</button>';"""

# Buscar y mostrar qué hay exactamente en esas líneas
lines = html.split('\n')
for i, line in enumerate(lines):
    if 'desinscribirsePartido' in line or 'inscribirsePartido' in line:
        print(f"Línea {i+1}: {repr(line)}")
