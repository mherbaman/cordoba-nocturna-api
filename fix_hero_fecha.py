for filepath in [
    '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html',
    '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padelclub.html'
]:
    with open(filepath, 'r') as f:
        content = f.read()

    # Buscar la línea problemática y reemplazarla
    import re
    content = re.sub(
        r"<div class=\"hero-sub\">Panel de gestión · Hoy es.*?</div>",
        '<div class="hero-sub" id="hero-fecha">Panel de gestión</div>',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Fix aplicado en {filepath}")
