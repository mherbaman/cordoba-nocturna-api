with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    # Agregar lectura del campo precio_app
    if "const precio      = parseFloat(document.getElementById('disp-precio').value)||0;" in line:
        lines[i] = line + "  const precioApp  = parseFloat(document.getElementById('disp-precio-app').value)||0;\n"
        print(f"✅ Línea {i+1}: lectura precio_app agregada")
    # PUT (editar turno) - agregar precio_app
    if "hora_inicio, hora_fin, precio_por_hora: precio, cantidad_canchas: max" in line:
        lines[i] = line.replace(
            "hora_inicio, hora_fin, precio_por_hora: precio, cantidad_canchas: max",
            "hora_inicio, hora_fin, precio_por_hora: precio, precio_app: precioApp, cantidad_canchas: max"
        )
        print(f"✅ Línea {i+1}: PUT precio_app agregado")
    # POST masiva - agregar precio_app
    if "precio_por_hora: precio," in line and "masiva" not in line:
        lines[i] = line.replace("precio_por_hora: precio,", "precio_por_hora: precio,\n        precio_app: precioApp,")
        print(f"✅ Línea {i+1}: POST precio_app agregado")

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'w') as f:
    f.writelines(lines)
print("✅ Fix completo")
