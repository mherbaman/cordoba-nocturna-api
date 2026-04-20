ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Verificar si mostrarHome existe
if 'function mostrarHome' not in html:
    print("ERROR: función no encontrada")
else:
    print("función existe, revisando posición...")
    # Ver si está dentro de un tag script
    idx = html.find('function mostrarHome')
    antes = html[idx-200:idx]
    print("Contexto antes:", antes[-100:])
