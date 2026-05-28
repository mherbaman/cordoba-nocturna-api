with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'r') as f:
    lines = f.readlines()

lines[749] = lines[749].replace('t.numro_cancha', 't.numero_cancha')
print(f"✅ Typo corregido")

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'w') as f:
    f.writelines(lines)
