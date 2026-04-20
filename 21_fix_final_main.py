ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extraer lineas 503-550 (la seccion page-partidos-pub, 0-indexed: 502-549)
seccion = lines[502:550]
print("Seccion desde:", lines[502][:50])
print("Seccion hasta:", lines[549][:50])

# Quitar esas lineas del lugar actual
lines = lines[:502] + lines[550:]

# Insertar antes del cierre del main
# Ahora el main cierra en la linea que era 501 (0-indexed 500): "    </div>"
# Buscar "    </div>\n  </div>\n" que cierra main
for i, l in enumerate(lines):
    if i > 490 and i < 510:
        print(f"L{i+1}: {repr(l)}")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.writelines(lines)
