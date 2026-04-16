path = '/etc/easypanel/projects/cordoba-nocturna/app/code/routes/mensajes.js'

with open(path, 'r') as f:
    content = f.read()

old = """  const { texto } = req.body;
  const { match_id } = req.params;"""

new = """  const { texto, app } = req.body;
  const { match_id } = req.params;"""

old2 = """    // Guardar el mensaje — expira en 8 días
    const result = await pool.query(`
      INSERT INTO mensajes (match_id, de_usuario, texto, expira_en)
      VALUES ($1, $2, $3, NOW() + INTERVAL '8 days')
      RETURNING *
    `, [match_id, req.usuario.id, texto.trim()]);"""

new2 = """    // Guardar el mensaje — expira en 48h para padel, 8 días para el resto
    const intervalo = app === 'padel' ? '48 hours' : '8 days';
    const result = await pool.query(`
      INSERT INTO mensajes (match_id, de_usuario, texto, expira_en)
      VALUES ($1, $2, $3, NOW() + INTERVAL '${intervalo}')
      RETURNING *
    `, [match_id, req.usuario.id, texto.trim()]);"""

r1 = old in content
r2 = old2 in content
print(f"Fix 1 encontrado: {r1}")
print(f"Fix 2 encontrado: {r2}")

if r1: content = content.replace(old, new)
if r2: content = content.replace(old2, new2)

with open(path, 'w') as f:
    f.write(content)

print("Listo")
