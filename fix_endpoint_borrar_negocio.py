#!/usr/bin/env python3
"""
Agrega el endpoint DELETE /superadmin/negocios/:id en el backend Node.js.
Ejecutar DESPUÉS de fix_borrar_negocio.py:
  python3 fix_endpoint_borrar_negocio.py
"""

import os, re

# ── Buscar el archivo de rutas superadmin ────────────────────────────────────
ROUTES_CANDIDATES = [
    "/etc/easypanel/projects/cordoba-nocturna/api/code/routes/superadmin.js",
    "/etc/easypanel/projects/cordoba-nocturna/api/code/routes/admin.js",
    "/etc/easypanel/projects/cordoba-nocturna/api/code/routes/negocios.js",
]

route_file = None
for path in ROUTES_CANDIDATES:
    if os.path.exists(path):
        route_file = path
        break

if route_file is None:
    # Buscar en todo el directorio routes
    routes_dir = "/etc/easypanel/projects/cordoba-nocturna/api/code/routes"
    if os.path.isdir(routes_dir):
        for f in os.listdir(routes_dir):
            full = os.path.join(routes_dir, f)
            with open(full, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
            if "superadmin" in content.lower() or "negocios" in content.lower():
                if "router.get" in content or "router.post" in content:
                    route_file = full
                    print(f"📁 Archivo de rutas detectado: {full}")
                    break

if route_file is None:
    print("❌ No se encontró el archivo de rutas. Buscando en server.js...")
    SERVER_FILE = "/etc/easypanel/projects/cordoba-nocturna/api/code/server.js"
    if os.path.exists(SERVER_FILE):
        route_file = SERVER_FILE
    else:
        print("❌ No se encontró ningún archivo de rutas. Indicar manualmente.")
        exit(1)

print(f"✅ Archivo de rutas: {route_file}")

with open(route_file, "r", encoding="utf-8") as f:
    content = f.read()
    lines = content.splitlines(keepends=True)

# ── Verificar si el endpoint ya existe ──────────────────────────────────────
if "DELETE" in content and "negocios" in content and ("borrar" in content.lower() or "delete" in content.lower()):
    # Verificar más específicamente
    if "router.delete('/negocios" in content.lower() or "router.delete(\"/negocios" in content.lower():
        print("⚠️  El endpoint DELETE /negocios ya existe. No se modificará.")
        exit(0)

# ── Buscar dónde insertar — después de PUT negocios o al final de rutas ─────
insert_after_idx = None

# Buscar el PUT de negocios
for i, line in enumerate(lines):
    l = line.lower()
    if ("router.put" in l or "router.patch" in l) and "negocios" in l:
        # Buscar el cierre de esa ruta
        brace = 0
        for j in range(i, min(i + 60, len(lines))):
            for ch in lines[j]:
                if ch == '{': brace += 1
                if ch == '}': brace -= 1
            if brace == 0 and j > i:
                insert_after_idx = j
                break
        if insert_after_idx:
            break

# Si no encontramos PUT negocios, buscar el POST negocios
if not insert_after_idx:
    for i, line in enumerate(lines):
        l = line.lower()
        if "router.post" in l and "negocio" in l:
            brace = 0
            for j in range(i, min(i + 60, len(lines))):
                for ch in lines[j]:
                    if ch == '{': brace += 1
                    if ch == '}': brace -= 1
                if brace == 0 and j > i:
                    insert_after_idx = j
                    break
            if insert_after_idx:
                break

# Si todavía no, buscar el último router.X de negocios
if not insert_after_idx:
    for i in range(len(lines) - 1, -1, -1):
        if "negocio" in lines[i].lower() and ("router." in lines[i].lower()):
            insert_after_idx = i
            break

if not insert_after_idx:
    # Insertar antes del module.exports o al final
    for i, line in enumerate(lines):
        if "module.exports" in line:
            insert_after_idx = i - 1
            break

if not insert_after_idx:
    insert_after_idx = len(lines) - 2

print(f"📍 Insertando endpoint DELETE después de línea {insert_after_idx + 1}")
print(f"   Contexto: {lines[insert_after_idx].rstrip()}")

# ── El endpoint DELETE con cascada segura ────────────────────────────────────
endpoint = """
// DELETE /superadmin/negocios/:id — borrar negocio completo
router.delete('/negocios/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  // Solo superadmin puede borrar negocios
  if (!req.admin || !req.admin.es_superadmin) {
    return res.status(403).json({ ok: false, error: 'Solo el superadmin puede borrar negocios' });
  }
  try {
    const { rows } = await pool.query('SELECT nombre FROM negocios WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
    const nombre = rows[0].nombre;

    // Borrar en cascada: reservas → disponibilidad → admins → negocios
    await pool.query('DELETE FROM reservas_padel WHERE negocio_id = $1', [id]);
    await pool.query('DELETE FROM disponibilidad_padel WHERE negocio_id = $1', [id]);
    await pool.query('DELETE FROM cierre_caja_diaria WHERE negocio_id = $1', [id]);
    await pool.query('DELETE FROM admins WHERE negocio_id = $1', [id]);
    await pool.query('DELETE FROM negocios WHERE id = $1', [id]);

    console.log(`[SUPERADMIN] Negocio eliminado: ${nombre} (${id})`);
    res.json({ ok: true, mensaje: `Negocio "${nombre}" eliminado correctamente` });
  } catch (e) {
    console.error('[DELETE negocio] Error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});
"""

# ── Insertar ─────────────────────────────────────────────────────────────────
lines.insert(insert_after_idx + 1, endpoint)

with open(route_file, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n✅ Endpoint DELETE /superadmin/negocios/:id agregado en {route_file}")
print("\n🚀 PRÓXIMOS PASOS:")
print("   1. cd /etc/easypanel/projects/cordoba-nocturna/api/code")
print("   2. git add -A && git commit -m 'feat: borrar negocio con cascada'")
print("   3. git push")
print("   4. Deploy en EasyPanel")
