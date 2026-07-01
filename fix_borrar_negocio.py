#!/usr/bin/env python3
"""
Agrega botón "Borrar" negocio en admin.html y función JS borrarNegocio().
Ejecutar desde el VPS:
  python3 fix_borrar_negocio.py
"""

import re

ADMIN_HTML = "/etc/easypanel/projects/cordoba-nocturna/api/code/public/admin.html"
APP_HTML   = "/etc/easypanel/projects/cordoba-nocturna/app/code/public/admin.html"

# ── 1. Leer archivo ──────────────────────────────────────────────────────────
with open(ADMIN_HTML, "r", encoding="utf-8") as f:
    lines = f.readlines()

# ── 2. Encontrar línea con el botón Editar negocio ──────────────────────────
target_idx = None
for i, line in enumerate(lines):
    if 'onclick="editarNegocio(' in line and 'btn-edit' in line:
        target_idx = i
        break

if target_idx is None:
    print("❌ No se encontró la línea del botón Editar negocio. Verificar manualmente.")
    exit(1)

print(f"✅ Botón Editar negocio encontrado en línea {target_idx + 1}:")
print(lines[target_idx].rstrip())

# ── 3. Ver las líneas siguientes para encontrar dónde insertar ───────────────
print("\n📋 Contexto (líneas siguientes):")
for i in range(target_idx, min(target_idx + 6, len(lines))):
    print(f"  {i+1}: {lines[i].rstrip()}")

# ── 4. Buscar línea de cierre del bloque de botones del negocio ──────────────
# Buscamos la línea con "Ver Panel" o "Acceso" o "btn-acceso" cerca del botón Editar
close_idx = None
for i in range(target_idx, min(target_idx + 10, len(lines))):
    if 'Ver Panel' in lines[i] or 'verPanel' in lines[i] or 'ver-panel' in lines[i] or 'panelNegocio' in lines[i]:
        close_idx = i
        break

if close_idx is None:
    print("\n⚠️  No se encontró 'Ver Panel' cerca. Buscando cierre del bloque de botones...")
    # Buscar el cierre </div> más cercano después del botón editar
    for i in range(target_idx, min(target_idx + 8, len(lines))):
        if '</div>' in lines[i] and 'btn' not in lines[i]:
            close_idx = i - 1
            break

print(f"\n📍 Insertando botón Borrar después de línea {close_idx + 1}:")
print(lines[close_idx].rstrip() if close_idx else "No encontrado")

# ── 5. Construir el botón a insertar ────────────────────────────────────────
# Usamos el mismo patrón que borrarSponsor y borrarUsuario
btn_borrar = "            <button class=\"btn-sm btn-delete\" onclick=\"borrarNegocio('${n.id}','${n.nombre}')\" style=\"background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700\">🗑 Borrar</button>\n"

# ── 6. Insertar después de la línea del botón Editar ────────────────────────
# Insertamos justo después del botón Editar negocio
insert_at = target_idx + 1
lines.insert(insert_at, btn_borrar)

print(f"\n✅ Botón Borrar insertado en línea {insert_at + 1}")

# ── 7. Verificar que la función borrarNegocio NO existe ya ──────────────────
content_str = "".join(lines)
if "borrarNegocio" in content_str and "async function borrarNegocio" in content_str:
    print("⚠️  La función borrarNegocio ya existe. Saltando inserción de función JS.")
else:
    # ── 8. Buscar dónde insertar la función JS (después de borrarSponsor o borrarSesion) ──
    fn_idx = None
    for i, line in enumerate(lines):
        if "async function borrarUsuario" in line:
            fn_idx = i
            break

    if fn_idx is None:
        for i, line in enumerate(lines):
            if "async function borrarSponsor" in line:
                fn_idx = i
                break

    if fn_idx is None:
        print("❌ No se encontró punto de inserción para la función JS.")
    else:
        # Buscar el cierre de esa función (línea con solo "}" después de fn_idx)
        fn_close = None
        brace_count = 0
        for i in range(fn_idx, min(fn_idx + 40, len(lines))):
            for ch in lines[i]:
                if ch == '{': brace_count += 1
                if ch == '}': brace_count -= 1
            if brace_count == 0 and i > fn_idx:
                fn_close = i
                break

        if fn_close is None:
            fn_close = fn_idx + 20

        # La función borrarNegocio con doble confirmación
        fn_borrar = """
async function borrarNegocio(id, nombre) {
  if (!confirm('⚠️ ¿Borrar el negocio "' + nombre + '"?\\n\\nEsto eliminará el negocio y todos sus datos. Esta acción NO se puede deshacer.')) return;
  if (!confirm('🔴 SEGUNDA CONFIRMACIÓN\\n\\n¿Estás completamente seguro de borrar "' + nombre + '"?\\n\\nSe eliminarán: canchas, reservas, admins y todo el historial.')) return;
  try {
    const token = localStorage.getItem('admin_token');
    const res = await fetch('/superadmin/negocios/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.ok) {
      mostrarToast('✅ Negocio "' + nombre + '" eliminado correctamente');
      cargarNegocios();
    } else {
      alert('❌ Error: ' + (data.error || 'No se pudo borrar el negocio'));
    }
  } catch (e) {
    alert('❌ Error de conexión: ' + e.message);
  }
}
"""
        insert_fn_at = fn_close + 1
        lines.insert(insert_fn_at, fn_borrar)
        print(f"✅ Función borrarNegocio() insertada después de línea {fn_close + 1}")

# ── 9. Guardar ───────────────────────────────────────────────────────────────
with open(ADMIN_HTML, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n✅ admin.html actualizado en api/code/public/")

# ── 10. Copiar a app ─────────────────────────────────────────────────────────
import shutil
try:
    shutil.copy2(ADMIN_HTML, APP_HTML)
    print(f"✅ Copiado a app/code/public/")
except Exception as e:
    print(f"⚠️  No se pudo copiar a app: {e}")
    print(f"   Correr manualmente: cp {ADMIN_HTML} {APP_HTML}")

print("\n🎯 PRÓXIMO PASO: agregar el endpoint DELETE en el backend.")
print("   Correr: python3 fix_endpoint_borrar_negocio.py")
