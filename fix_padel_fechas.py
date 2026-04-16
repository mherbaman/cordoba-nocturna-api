path = '/etc/easypanel/projects/cordoba-nocturna/app/code/routes/padel.js'

with open(path, 'r') as f:
    content = f.read()

# Fix 1: en turnos-disponibles, excluir turnos con fecha_especifica distinta a la consultada
old = """        AND (
          (d.fecha_especifica = $3)
          OR
          (d.fecha_especifica IS NULL AND d.dia_semana = $2)
        )"""

new = """        AND (
          (d.fecha_especifica::date = $3::date)
          OR
          (d.fecha_especifica IS NULL AND d.dia_semana = $2)
        )
        AND (d.fecha_especifica IS NULL OR d.fecha_especifica::date = $3::date)"""

if old in content:
    content = content.replace(old, new)
    print("Fix 1 aplicado")
else:
    print("Fix 1 NO encontrado")

# Fix 2: en mis-canchas del negocio, no mostrar turnos de fechas pasadas
old2 = "      WHERE d.negocio_id = $1 AND d.activo = true\n      ORDER BY dia_semana ASC, hora_inicio ASC"
new2 = "      WHERE d.negocio_id = $1 AND d.activo = true\n        AND (d.fecha_especifica IS NULL OR d.fecha_especifica::date >= CURRENT_DATE)\n      ORDER BY dia_semana ASC, hora_inicio ASC"

if old2 in content:
    content = content.replace(old2, new2)
    print("Fix 2 aplicado")
else:
    print("Fix 2 NO encontrado")

with open(path, 'w') as f:
    f.write(content)

print("Listo")
