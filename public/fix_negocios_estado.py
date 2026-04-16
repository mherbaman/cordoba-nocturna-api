#!/usr/bin/env python3
"""
fix_negocios_estado.py
Corrige bugs en la tabla de negocios:
- Typos en estado_pago (stado_pago, esado_pago)
- Invalid Date en vencimiento_plan
- Mapeo incorrecto trial->mes_gratis, activo->pago
- Tag <spn> roto
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX 1: L616 — typo n.stado_pago en columna Estado ────────────────
OLD_1 = "${{mes_gratis:'🎁 Gratis',pago:'✅ Pagó',vencido:'⚠️ Vencido',suspendido:'🚫 Suspendido'}[n.stado_pago||'mes_gratis']}"
NEW_1 = "${{mes_gratis:'🎁 Gratis',pago:'✅ Pagó',vencido:'⚠️ Vencido',suspendido:'🚫 Suspendido'}[n.estado_pago||'mes_gratis']}"

if OLD_1 in content:
    content = content.replace(OLD_1, NEW_1, 1)
    print("FIX 1 OK: typo n.stado_pago corregido")
else:
    print("FIX 1 SKIP: no encontrado")

# ── FIX 2: L1030-1031 — columna Estado en tabla negocios ─────────────
OLD_2 = """          ${n.estado_pago==='trial'?'<span class="badge badge-yellow">🎁 Trial</span>':n.estado_pago==='vencido'?'<span class="badge badge-red">❌ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':'<spn class="badge badge-green">✅ Pago</span>'}
          ${n.vencimiento_plan?`<span class="badge badge-yellow" style="font-size:10px">Vence: ${new Date(n.vencimiento_plan+'T00:00:00').toLocaleDateString('es-AR')}</span>`:''}"""

NEW_2 = """          ${n.estado_pago==='mes_gratis'?'<span class="badge badge-yellow">🎁 Mes gratis</span>':n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':'<span class="badge badge-green">✅ Pagó</span>'}
          ${n.vencimiento_plan?`<span class="badge badge-yellow" style="font-size:10px">Vence: ${new Date(n.vencimiento_plan.includes('T')?n.vencimiento_plan:n.vencimiento_plan+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}"""

if OLD_2 in content:
    content = content.replace(OLD_2, NEW_2, 1)
    print("FIX 2 OK: columna Estado corregida (trial->mes_gratis, <spn> fix, fecha fix)")
else:
    print("FIX 2 SKIP: no encontrado")

# ── FIX 3: L1034-1035 — columna Acciones, typos y mapeo ──────────────
OLD_3 = """            ${n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.esado_pago==='suspendido'?'<span class="badge badge-red">🚫 Suspendido</span>':n.estado_pago==='activo'?'<span class="badge badge-green">✅ Activo</span>':'<span class="badge badge-yellow">🎁 Prueba</span>'}
            ${n.vencimiento_plan?`<span style="color:var(--muted);font-size:11px">Vence: ${new Date(n.vencimiento_plan).toLocaleDateString('es-AR')}</span>`:''}"""

NEW_3 = """            ${n.estado_pago==='vencido'?'<span class="badge badge-red">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class="badge" style="background:rgba(156,163,175,.15);color:#9ca3af">⏸️ Suspendido</span>':n.estado_pago==='pago'?'<span class="badge badge-green">✅ Pagó</span>':'<span class="badge badge-yellow">🎁 Mes gratis</span>'}
            ${n.vencimiento_plan?`<span style="color:var(--muted);font-size:11px">Vence: ${new Date(n.vencimiento_plan.includes('T')?n.vencimiento_plan:n.vencimiento_plan+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}"""

if OLD_3 in content:
    content = content.replace(OLD_3, NEW_3, 1)
    print("FIX 3 OK: columna Acciones corregida (esado_pago, activo->pago, fecha fix)")
else:
    print("FIX 3 SKIP: no encontrado")

if content == original:
    print("\nERROR: sin cambios.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nArchivo guardado: {FILE}")

print("\n── Verificaciones ──")
checks = [
    ("n.stado_pago",  0, "typo stado_pago eliminado"),
    ("n.esado_pago",  0, "typo esado_pago eliminado"),
    ("<spn ",         0, "tag <spn> roto eliminado"),
    ("trial",         0, "valor 'trial' eliminado"),
    ("mes_gratis",    4, "mes_gratis presente en 4 lugares"),
    ("includes('T')", 2, "fix de fecha en 2 lugares"),
]
all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
