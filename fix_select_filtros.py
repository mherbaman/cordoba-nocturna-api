ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

viejo1 = '    <select class="pp-filtro" id="pp-filtro-zona" onchange="cargarPartidosPublicos()">'
nuevo1 = '    <select class="pp-filtro" id="pp-filtro-zona" onchange="cargarPartidosPublicos()" style="color-scheme:dark;background:#030d06">'

viejo2 = '    <select class="pp-filtro" id="pp-filtro-cat" onchange="cargarPartidosPublicos()">'
nuevo2 = '    <select class="pp-filtro" id="pp-filtro-cat" onchange="cargarPartidosPublicos()" style="color-scheme:dark;background:#030d06">'

if viejo1 in html:
    html = html.replace(viejo1, nuevo1)
    print("OK zona")
else:
    print("No encontro zona")

if viejo2 in html:
    html = html.replace(viejo2, nuevo2)
    print("OK cat")
else:
    print("No encontro cat")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
