with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    lines = f.readlines()

# Linea 4521 — renombrar la vieja a ZONAS_MODAL
lines[4520] = lines[4520].replace('const ZONAS_DISPONIBLES =', 'const ZONAS_MODAL =')

# Linea 4534 — usar ZONAS_MODAL
lines[4533] = lines[4533].replace('ZONAS_DISPONIBLES.map', 'ZONAS_MODAL.map')

# Linea 4545 — usar ZONAS_MODAL
lines[4544] = lines[4544].replace('ZONAS_DISPONIBLES.includes', 'ZONAS_MODAL.includes')

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.writelines(lines)

print("OK")
