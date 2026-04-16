path = '/etc/easypanel/projects/cordoba-nocturna/app/code/routes/padel.js'

with open(path, 'r') as f:
    content = f.read()

old = "const idsReservados = reservadas.rows.map(r => r.disponibilidad_id);\n\n    const libres = disponibles.rows.filter(turno => {\n      const tomados = idsReservados.filter(id => id === turno.id).length;\n      return tomados < turno.cantidad_canchas;\n    });"

new = "const idsReservados = reservadas.rows.map(r => String(r.disponibilidad_id));\n\n    const libres = disponibles.rows.filter(turno => {\n      const tomados = idsReservados.filter(id => id === String(turno.id)).length;\n      return tomados < turno.cantidad_canchas;\n    });"

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("Listo - fix aplicado")
else:
    print("No encontro el texto - verificando...")
    for i, line in enumerate(content.splitlines()):
        if 'idsReservados' in line:
            print(f"Linea {i+1}: {line}")
