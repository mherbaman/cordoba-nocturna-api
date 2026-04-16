#!/usr/bin/env python3
"""
fix_ver_panel.py
Agrega botón "👁 Ver panel" en tabla de negocios y función verPanelNegocio()
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX 1: botón en cada fila de negocios ────────────────────────────
OLD_BTN = """          <button class="btn-sm" style="background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)" onclick="verPasswordNegocio('${n.id}','${n.nombre}')">🔐 Contraseña</button>"""

NEW_BTN = """          <button class="btn-sm" style="background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)" onclick="verPasswordNegocio('${n.id}','${n.nombre}')">🔐 Contraseña</button>
          <button class="btn-sm" style="background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.2)" onclick="verPanelNegocio('${n.id}','${n.nombre}')">👁 Ver panel</button>"""

if OLD_BTN in content:
    content = content.replace(OLD_BTN, NEW_BTN, 1)
    print("FIX 1 OK: botón 'Ver panel' agregado en tabla de negocios")
else:
    print("FIX 1 SKIP: no encontrado exacto")

# ── FIX 2: función verPanelNegocio() ─────────────────────────────────
OLD_MODAL = "// ─── MODAL ────────────────────────────────────────────────────────────\nfunction cerrarModal()"

NEW_MODAL = """// ─── VER PANEL NEGOCIO (impersonate) ─────────────────────────────────
async function verPanelNegocio(negocioId, negocioNombre) {
  try {
    const data = await apiAdmin('/superadmin/login-negocio-por-id', {
      method: 'POST',
      body: JSON.stringify({ negocio_id: negocioId })
    });
    localStorage.setItem('neg_token', data.token);
    localStorage.setItem('neg_admin', JSON.stringify(data.admin));
    localStorage.setItem('neg_negocio', JSON.stringify(data.negocio));
    window.open('negocio.html', '_blank');
  } catch(err) {
    alert('❌ ' + err.message + '\\n\\nAsegurate de que este negocio tenga un admin creado (botón 🔑 Acceso).');
  }
}

// ─── MODAL ────────────────────────────────────────────────────────────
function cerrarModal()"""

if OLD_MODAL in content:
    content = content.replace(OLD_MODAL, NEW_MODAL, 1)
    print("FIX 2 OK: función verPanelNegocio() agregada")
else:
    print("FIX 2 SKIP: ancla no encontrada exacta")

if content == original:
    print("\nERROR: sin cambios.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nArchivo guardado: {FILE}")

print("\n── Verificaciones ──")
checks = [
    ("verPanelNegocio",        2, "verPanelNegocio: definición + llamada"),
    ("login-negocio-por-id",   1, "endpoint llamado en JS"),
    ("neg_negocio",            1, "neg_negocio en localStorage"),
    ("👁 Ver panel",           1, "botón visible en tabla"),
]
all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
