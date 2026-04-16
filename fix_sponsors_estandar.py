import re

archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/index.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Fix 1: agregar align-items:start al grid ESTÁNDAR
viejo = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;"
nuevo = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;align-items:start;"

contenido = contenido.replace(viejo, nuevo)

# Fix 2: agregar min-height a la card ESTÁNDAR para uniformidad
viejo2 = "'<div class=\"ad-card-std\" data-sid=\"'+s.id+'\" style=\"cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;text-align:center;\">'"
nuevo2 = "'<div class=\"ad-card-std\" data-sid=\"'+s.id+'\" style=\"cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;text-align:center;min-height:90px;display:flex;flex-direction:column;justify-content:center;\">'"

contenido = contenido.replace(viejo2, nuevo2)

with open(archivo, 'w', encoding='utf-8') as f:
    f.write(contenido)

print("✅ Fix sponsors estándar aplicado")
