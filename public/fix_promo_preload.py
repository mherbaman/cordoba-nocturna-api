#!/usr/bin/env python3
"""
fix_promo_preload.py
Agrega cargarPromoPrincipal() en navTo() para que precargue la promo vigente.
"""

import sys

FILE = "public/admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

OLD = "  if (page === 'usuarios')  cargarUsuarios();"
NEW = "  if (page === 'usuarios')  cargarUsuarios();\n  if (page === 'promo-principal') cargarPromoPrincipal();"

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print("FIX OK: cargarPromoPrincipal() agregado a navTo()")
else:
    print("SKIP: línea no encontrada exacta")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Archivo guardado.")

# Verificación
count = content.count("if (page === 'promo-principal') cargarPromoPrincipal()")
print(f"  [{'OK' if count == 1 else 'FAIL'}] cargarPromoPrincipal en navTo (encontrado: {count}, esperado: 1)")
