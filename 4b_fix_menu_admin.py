ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

if "navTo('partidos-pub')" in html:
    print("Ya existe el botón")
else:
    # Buscar cualquier nav-btn existente y agregar después del primero
    ref = 'class="nav-btn"'
    idx = html.find(ref)
    if idx == -1:
        print("ERROR: no se encontró nav-btn")
    else:
        fin = html.find('\n', idx)
        btn = '\n      <button class="nav-btn" onclick="navTo(\'partidos-pub\')">⚡ Partidos</button>'
        html = html[:fin] + btn + html[fin:]
        print("✅ Botón agregado")

    # Hookear navTo
    if "partidos-pub" not in html:
        print("ERROR: sección no encontrada")
    elif "cargarPartidosPubAdmin" not in html[:html.find('function navTo')]:
        target = "function navTo("
        idx2 = html.find(target)
        fin2 = html.find('{', idx2) + 1
        html = html[:fin2] + "\n  if(id==='partidos-pub') setTimeout(cargarPartidosPubAdmin, 100);" + html[fin2:]
        print("✅ navTo hooked")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
