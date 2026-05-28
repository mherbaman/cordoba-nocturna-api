# fix_zonas_backend.py

# ── auth.js ──────────────────────────────────────────────────────────
with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/auth.js', 'r') as f:
    lines = f.readlines()

# Linea 114 — destructuring registro
lines[113] = '  const { nombre, apellido, email, telefono, password, foto_url, vibe, edad, app_origen, zona_principal, zonas_extra } = req.body;\n'

# Linea 132 — INSERT columnas
lines[131] = '      INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, foto_url, vibe, edad, app_origen, zona_principal, zonas_extra)\n'

# Linea 134 — RETURNING
lines[133] = '      RETURNING id, nombre, apellido, email, foto_url, vibe, edad, telefono, app_origen, zona_principal, zonas_extra, creado_en\n'

# Linea 135 — VALUES array (cambia $9 a $11)
lines[134] = "    `, [nombre, apellido||'', email, telefono, password_hash, foto_url, vibe, edad, app_origen||'padel', zona_principal||null, zonas_extra||null]);\n"

# Linea 132 — VALUES placeholder
lines[132] = '      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\n'

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/auth.js', 'w') as f:
    f.writelines(lines)

print("auth.js OK")

# ── padel.js ─────────────────────────────────────────────────────────
with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'r') as f:
    lines = f.readlines()

# Linea 84 — destructuring POST jugadores
lines[83] = '    usuario_id, nombre, nivel, zona, zona_principal, zonas_extra, foto_url, descripcion\n'

# Linea 98 — INSERT columnas
lines[97] = '      INSERT INTO jugadores_padel (usuario_id, nombre, nivel, zona, zona_principal, zonas_extra, foto_url, descripcion)\n'

# Linea 99 — VALUES
lines[98] = '      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n'

# Lineas 100-107 — ON CONFLICT
lines[99]  = '      ON CONFLICT (usuario_id) DO UPDATE SET\n'
lines[100] = '        nombre         = EXCLUDED.nombre,\n'
lines[101] = '        nivel          = EXCLUDED.nivel,\n'
lines[102] = '        zona           = EXCLUDED.zona,\n'
lines[103] = '        zona_principal = COALESCE(EXCLUDED.zona_principal, jugadores_padel.zona_principal),\n'
lines[104] = '        zonas_extra    = COALESCE(EXCLUDED.zonas_extra, jugadores_padel.zonas_extra),\n'
lines[105] = '        foto_url       = COALESCE(EXCLUDED.foto_url, jugadores_padel.foto_url),\n'
lines[106] = '        descripcion    = COALESCE(EXCLUDED.descripcion, jugadores_padel.descripcion),\n'
lines[107] = '        actualizado_en = NOW()\n'

# Linea 108 — params array
lines[108] = "    `, [usuario_id, nombre, nivel, zona||zona_principal, zona_principal||zona, zonas_extra||[], foto_url, descripcion]);\n"

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/padel.js', 'w') as f:
    f.writelines(lines)

print("padel.js OK")
print("Todo listo!")
