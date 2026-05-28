for filepath in [
    '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html',
    '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padelclub.html'
]:
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace(
        'document.getElementById("dash-nombre").textContent = negocioData.nombre;',
        'document.getElementById("dash-nombre").textContent = negocioData.nombre;\n  const fechaHoy = new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});\n  document.getElementById("hero-fecha").textContent = "Panel de gestión · Hoy es " + fechaHoy;'
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Fix aplicado en {filepath}")
