path = '/etc/easypanel/projects/cordoba-nocturna/api/code/routes/negocios.js'
with open(path, 'r') as f:
    content = f.read()

# Agregar foto_url al endpoint clubes-padel
content = content.replace(
    'SELECT nombre, direccion, dueno_tel as telefono, instagram, zona, whatsapp',
    'SELECT nombre, direccion, dueno_tel as telefono, instagram, zona, whatsapp, foto_url'
)

with open(path, 'w') as f:
    f.write(content)

print("OK" if 'foto_url' in open(path).read() else "ERROR")
