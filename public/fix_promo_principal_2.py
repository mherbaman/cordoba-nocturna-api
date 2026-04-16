#!/usr/bin/env python3
"""
fix_promo_principal_2.py
Elimina residuos: name="sp-connect" y "festival" que quedaron tras el fix anterior.
Primero localiza en qué líneas están para hacer el reemplazo quirúrgico.
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("── Líneas con 'sp-connect' ──")
for i, l in enumerate(lines, 1):
    if 'sp-connect' in l:
        print(f"  L{i}: {l.rstrip()}")

print("\n── Líneas con 'festival' ──")
for i, l in enumerate(lines, 1):
    if 'festival' in l.lower():
        print(f"  L{i}: {l.rstrip()}")
