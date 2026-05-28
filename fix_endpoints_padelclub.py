for filepath in [
    '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html',
    '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padelclub.html'
]:
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace(
        '"/padel/disponibilidad/del-club?negocio_id=" + negocioData.id',
        '"/padel/disponibilidad/" + negocioData.id'
    )
    content = content.replace(
        '"/padel/reservas/del-club?negocio_id=" + negocioData.id + "&fecha=" + hoy',
        '"/padel/reservas/del-club/" + negocioData.id + "?fecha=" + hoy'
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Fix aplicado en {filepath}")
