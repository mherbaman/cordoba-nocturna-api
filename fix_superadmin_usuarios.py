with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/superadmin.js', 'r') as f:
    content = f.read()

old = "      SELECT u.id, u.nombre, u.apellido, u.email, u.foto_url, u.vibe, u.edad, u.telefono, u.app_origen, u.creado_en, u.ultimo_login, u.activo,"
new = "      SELECT u.id, u.nombre, u.apellido, u.email, u.foto_url, u.vibe, u.edad, u.telefono, u.app_origen, u.creado_en, u.ultimo_login, u.activo, u.email_bienvenida_enviado,"

if old in content:
    content = content.replace(old, new)
    print("✅ Campo email_bienvenida_enviado agregado al SELECT")
else:
    print("❌ No encontró el texto")

with open('/etc/easypanel/projects/cordoba-nocturna/api/code/routes/superadmin.js', 'w') as f:
    f.write(content)
