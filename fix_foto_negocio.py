# ── 1. Backend ──────────────────────────────────────────────────────
api_path = '/etc/easypanel/projects/cordoba-nocturna/api/code/routes/negocios.js'
with open(api_path, 'r') as f:
    content = f.read()

# Destructuring INSERT
content = content.replace(
    'const { nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram } = req.body;',
    'const { nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, foto_url } = req.body;'
)

# Columnas INSERT
content = content.replace(
    'INSERT INTO negocios (nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram)\n      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
    'INSERT INTO negocios (nombre, tipo, slug, descripcion, logo_url, color_primario, color_secundario, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, foto_url)\n      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)'
)

# Valores INSERT
content = content.replace(
    "[nombre, tipo, slug, descripcion, logo_url, color_primario || '#ff2d78', color_secundario || '#7c3aed', dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram]",
    "[nombre, tipo, slug, descripcion, logo_url, color_primario || '#ff2d78', color_secundario || '#7c3aed', dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, foto_url]"
)

# Destructuring UPDATE
content = content.replace(
    'const { nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram } = req.body;',
    'const { nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, foto_url } = req.body;'
)

# SET UPDATE
content = content.replace(
    '        instagram = COALESCE($14, instagram)\n      WHERE id = $15 RETURNING *\n    \', [nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, req.params.id]',
    '        instagram = COALESCE($14, instagram),\n        foto_url = COALESCE($15, foto_url)\n      WHERE id = $16 RETURNING *\n    \', [nombre, descripcion, logo_url, color_primario, color_secundario, activo, plan, dueno_nombre, dueno_email, dueno_tel, whatsapp, zona, direccion, instagram, foto_url, req.params.id]'
)

# Endpoint clubes-padel — agregar foto_url
content = content.replace(
    'SELECT nombre, direccion, dueno_tel as telefono, instagram, zona, whatsapp',
    'SELECT nombre, direccion, dueno_tel as telefono, instagram, zona, whatsapp, foto_url'
)

with open(api_path, 'w') as f:
    f.write(content)
print("OK - backend actualizado")

# ── 2. Admin formulario ─────────────────────────────────────────────
app_path = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/admin.html'
with open(app_path, 'r') as f:
    content = f.read()

# Agregar campo foto_url después de instagram en el formulario
content = content.replace(
    '''      <div class="full">
        <label class="field-label">Instagram</label>
        <input class="input-field" id="neg-instagram" value="${n.instagram||''}" placeholder="@miclub">
      </div>
    </div>
    <div class="modal-actions">''',
    '''      <div class="full">
        <label class="field-label">Instagram</label>
        <input class="input-field" id="neg-instagram" value="${n.instagram||''}" placeholder="@miclub">
      </div>
      <div class="full">
        <label class="field-label">Foto URL (jpg/png liviano)</label>
        <input class="input-field" id="neg-foto" value="${n.foto_url||''}" placeholder="https://...imagen.jpg">
      </div>
    </div>
    <div class="modal-actions">'''
)

# Agregar foto_url en guardarNegocio
content = content.replace(
    "    instagram:   document.getElementById('neg-instagram').value.trim()||null\n  };",
    "    instagram:   document.getElementById('neg-instagram').value.trim()||null,\n    foto_url:    document.getElementById('neg-foto').value.trim()||null\n  };"
)

with open(app_path, 'w') as f:
    f.write(content)
print("OK - admin actualizado")

# ── 3. Pantalla Clubes — mostrar foto ───────────────────────────────
app_path2 = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html'
with open(app_path2, 'r') as f:
    content = f.read()

content = content.replace(
    '        <div style="font-weight:700;font-size:15px;margin-bottom:4px">🏟️ ${c.nombre}</div>',
    '        ${c.foto_url ? `<img src="${c.foto_url}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:8px">` : \'\'}\n        <div style="font-weight:700;font-size:15px;margin-bottom:4px">🏟️ ${c.nombre}</div>'
)

with open(app_path2, 'w') as f:
    f.write(content)
print("OK - pantalla Clubes actualizada")
