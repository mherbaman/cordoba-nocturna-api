#!/usr/bin/env python3
"""
fix_promo_principal_3.py
Reemplaza 'festival' por 'padel' en los arrays JS de cargarPromoPrincipal
y guardarPromoPersonal. No toca el select de tipos de negocio.
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX L850: array en cargarPromoPrincipal ───────────────────────────────
OLD_850 = "    ['córdoba','fiesta','sunset','festival','gym','todas'].forEach(a => {"
NEW_850 = "    ['córdoba','fiesta','sunset','padel','gym','shopping','todas'].forEach(a => {"

if OLD_850 in content:
    content = content.replace(OLD_850, NEW_850, 1)
    print("FIX L850 OK: array forEach actualizado (festival->padel, agregado shopping)")
else:
    print("FIX L850 SKIP: no encontrado exacto")

# ── FIX L887: array en guardarPromoPersonal ───────────────────────────────
OLD_887 = "  const apps_pp = ['córdoba','fiesta','sunset','festival','gym','todas'].filter(a => document.getElementById(`pp-a-${a}`)?.checked);"
NEW_887 = "  const apps_pp = ['córdoba','fiesta','sunset','padel','gym','shopping','todas'].filter(a => document.getElementById(`pp-a-${a}`)?.checked);"

if OLD_887 in content:
    content = content.replace(OLD_887, NEW_887, 1)
    print("FIX L887 OK: array filter actualizado (festival->padel, agregado shopping)")
else:
    print("FIX L887 SKIP: no encontrado exacto")

if content == original:
    print("\nERROR: sin cambios.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nArchivo guardado: {FILE}")

# ── Verificaciones ────────────────────────────────────────────────────────
print("\n── Verificaciones finales ──")
checks = [
    ("'festival','gym','todas'].forEach",  0, "festival eliminado del forEach"),
    ("'festival','gym','todas'].filter",   0, "festival eliminado del filter"),
    ("'padel','gym','shopping','todas'].forEach", 1, "padel+shopping en forEach"),
    ("'padel','gym','shopping','todas'].filter",  1, "padel+shopping en filter"),
    ('id="pp-a-padel"',   1, "pp-a-padel en HTML presente"),
    ('id="pp-a-shopping"', 1, "pp-a-shopping en HTML presente"),
]

all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    icon = "OK" if ok else "FAIL"
    print(f"  [{icon}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
