#!/usr/bin/env python3
"""
fix_negocios_estado2.py
Corrige bugs en tabla negocios usando strings exactos del archivo.
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX 1: L1030 — trial->mes_gratis, clss->class ────────────────────
OLD_1 = """          ${n.estado_pago==='trial'?'<span class="badge badge-yellow">🎁 Trial</span>':n.estado_pago==='vencido'?'<span class="badge badge-red">❌ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':'<span clss="badge badge-green">✅ Pago</span>'}"""

NEW_1 = """          ${n.estado_pago==='mes_gratis'?'<span class="badge badge-yellow">🎁 Mes gratis</span>':n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':'<span class="badge badge-green">✅ Pagó</span>'}"""

if OLD_1 in content:
    content = content.replace(OLD_1, NEW_1, 1)
    print("FIX 1 OK: trial->mes_gratis, clss->class corregidos")
else:
    print("FIX 1 SKIP: no encontrado")

# ── FIX 2: L1031 — Invalid Date en Estado ────────────────────────────
OLD_2 = "          ${n.vencimiento_plan?`<span class=\"badge badge-yellow\" style=\"font-size:10px\">Vence: ${new Date(n.vencimiento_plan+'T00:00:00').toLocaleDateString('es-AR')}</span>`:''}</td>"

NEW_2 = "          ${n.vencimiento_plan?`<span class=\"badge badge-yellow\" style=\"font-size:10px\">Vence: ${new Date(n.vencimiento_plan.slice(0,10)+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}</td>"

if OLD_2 in content:
    content = content.replace(OLD_2, NEW_2, 1)
    print("FIX 2 OK: Invalid Date en Estado corregido")
else:
    print("FIX 2 SKIP: no encontrado")

# ── FIX 3: L1034 — typo estado_ago, activo->pago ─────────────────────
OLD_3 = """            ${n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.estado_ago==='suspendido'?'<span class="badge badge-red">🚫 Suspendido</span>':n.estado_pago==='activo'?'<span class="badge badge-green">✅ Activo</span>':'<span class="badge badge-yellow">🎁 Prueba</span>'}"""

NEW_3 = """            ${n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':n.estado_pago==='pago'?'<span class="badge badge-green">✅ Pagó</span>':'<span class="badge badge-yellow">🎁 Mes gratis</span>'}"""

if OLD_3 in content:
    content = content.replace(OLD_3, NEW_3, 1)
    print("FIX 3 OK: typo estado_ago, activo->pago corregidos")
else:
    print("FIX 3 SKIP: no encontrado")

# ── FIX 4: L1035 — Invalid Date en Acciones ──────────────────────────
OLD_4 = "            ${n.vencimiento_plan?`<span style=\"color:var(--muted);font-size:11px\">Vence: ${new Date(n.vencimiento_plan).toLocaleDateString('es-AR')}</span>`:''}"

NEW_4 = "            ${n.vencimiento_plan?`<span style=\"color:var(--muted);font-size:11px\">Vence: ${new Date(n.vencimiento_plan.slice(0,10)+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}"

if OLD_4 in content:
    content = content.replace(OLD_4, NEW_4, 1)
    print("FIX 4 OK: Invalid Date en Acciones corregido")
else:
    print("FIX 4 SKIP: no encontrado")

if content == original:
    print("\nERROR: sin cambios.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nArchivo guardado: {FILE}")

print("\n── Verificaciones ──")
checks = [
    ("clss=",        0, "typo clss= eliminado"),
    ("estado_ago",   0, "typo estado_ago eliminado"),
    ("trial",        0, "valor trial eliminado"),
    ("mes_gratis",   4, "mes_gratis en 4 lugares"),
    ("slice(0,10)",  2, "fix fecha en 2 lugares"),
]
all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
