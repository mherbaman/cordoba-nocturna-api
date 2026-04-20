ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# La seccion esta afuera: ...reportes</div>\n    </div>\n  </div>\n      <div class="page" id="page-partidos-pub">
# Hay que moverla ANTES del cierre del div.main

SECCION_INI = '      <div class="page" id="page-partidos-pub">'
SECCION_FIN_MARKER = '<!-- MODAL -->'

i1 = html.find(SECCION_INI)
i2 = html.find(SECCION_FIN_MARKER)
seccion = html[i1:i2].strip()

# Quitar seccion de donde esta
html = html[:i1].rstrip() + '\n' + html[i2:]

# Ahora insertar ANTES del cierre del main: buscar    </div>\n  </div>\n<!-- MODAL -->
target = '    </div>\n  </div>\n<!-- MODAL -->'
if target in html:
    html = html.replace(target, '    </div>\n' + seccion + '\n  </div>\n<!-- MODAL -->')
    print("OK insertado dentro del main")
else:
    print("No encontro target, contexto:")
    idx = html.find('<!-- MODAL -->')
    print(repr(html[idx-150:idx]))

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
