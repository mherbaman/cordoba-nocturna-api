ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

if "navTo('partidos-pub'" in html:
    print("Ya existe el botón")
else:
    ref = "navTo('padel'"
    if ref not in html:
        ref = "navTo('reportes'"
    idx = html.find(ref)
    fin = html.find('\n', idx)
    btn = '\n      <button class="nav-item" onclick="navTo(\'partidos-pub\',this)"><span class="icon">⚡</span> Partidos</button>'
    html = html[:fin] + btn + html[fin:]
    print("✅ Botón ⚡ Partidos agregado al sidebar")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
