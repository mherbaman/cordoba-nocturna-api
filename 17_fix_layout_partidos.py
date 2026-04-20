ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

SECCION_INICIO = '      <div class="page" id="page-partidos-pub">'
SECCION_FIN = '      </div>\n<!-- MODAL -->'

# Extraer la seccion
i1 = html.find(SECCION_INICIO)
i2 = html.find('<!-- MODAL -->') 
seccion = html[i1:i2].rstrip()
print("Seccion chars:", len(seccion))

# Quitar del lugar actual
html = html[:i1] + '<!-- MODAL -->' + html[i2 + len('<!-- MODAL -->'):]

# El div.main cierra con </div>\n  </div>\n</div>\n\n<!-- MODAL -->
# Insertar la seccion ANTES del cierre del div.main
target = '    </div>\n  </div>\n</div>\n\n<!-- MODAL -->'
if target not in html:
    target = '    </div>\n  </div>\n</div>\n<!-- MODAL -->'
if target not in html:
    print("ERROR: no encontro el cierre del main")
    print("Buscando alternativas...")
    idx = html.find('<!-- MODAL -->')
    print("Contexto antes del MODAL:")
    print(repr(html[idx-100:idx]))
else:
    nuevo = '    </div>\n  </div>\n' + seccion + '\n</div>\n\n<!-- MODAL -->'
    html = html.replace(target, nuevo)
    print("OK: seccion movida dentro del main")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
