#!/usr/bin/env python3
"""
fix_superadmin_impersonate.py
Agrega endpoint POST /superadmin/login-negocio-por-id antes del dashboard.
"""

import sys

FILE = "../routes/superadmin.js"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

OLD = "// ── GET /superadmin/dashboard ────────────────────────────────────────"

NEW = """// ── POST /superadmin/login-negocio-por-id (impersonate) ─────────────
router.post('/login-negocio-por-id', authSuperAdmin, async (req, res) => {
  const { negocio_id } = req.body;
  if (!negocio_id) return res.status(400).json({ error: 'Falta negocio_id' });
  try {
    const result = await pool.query(`
      SELECT a.*, n.id as neg_id, n.nombre as neg_nombre, n.tipo as neg_tipo
      FROM admins a JOIN negocios n ON n.id = a.negocio_id
      WHERE a.negocio_id = $1 AND a.activo = true AND a.es_superadmin = false
      LIMIT 1
    `, [negocio_id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Este negocio no tiene admin creado aún' });
    const admin = result.rows[0];
    const token = jwt.sign(
      { id: admin.id, email: admin.email, negocio_id: admin.negocio_id },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
    res.json({
      token,
      admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
      negocio: { id: admin.neg_id, nombre: admin.neg_nombre, tipo: admin.neg_tipo }
    });
  } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

// ── GET /superadmin/dashboard ────────────────────────────────────────"""

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print("FIX OK: endpoint login-negocio-por-id agregado")
else:
    print("SKIP: ancla no encontrada exacta")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Archivo guardado: {FILE}")

# Verificaciones
print("\n── Verificaciones ──")
checks = [
    ("login-negocio-por-id", 1, "endpoint presente"),
    ("authSuperAdmin",        3, "authSuperAdmin usado (existentes + nuevo)"),
]
all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
