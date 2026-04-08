FILE = '/etc/easypanel/projects/cordoba-nocturna/api/code/public/admin.html'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Eliminar el optgroup duplicado de Padel Connect
content = content.replace(
    """          </optgroup>
          <optgroup label="── Padel Connect ──" style="color:rgba(255,255,255,.4);background:#1a0030">
          <option value="padel" style="background:#1a0030" ${n.tipo==='padel'?'selected':''}>🎾 Club de Padel</option>
          <option value="cancha" style="background:#1a0030" ${n.tipo==='cancha'?'selected':''}>🏟️ ancha de Padel</option>
          <option value="club" style="background:#1a0030" ${n.tipo==='club'?'selected':''}>🏅 Club deportivo</option>
          <option value="torneo" style="background:#1a0030" ${n.tipo==='torneo'?'selected':''}>🏆 Torneo</option>
          </optgroup>
          <optgroup label="── Shopping Connect ──""",
    """          </optgroup>
          <optgroup label="── Shopping Connect ──"""
)

# 2. Corregir typos en Padel Connect
content = content.replace(
    ">🏟️ ancha de Padel</option>",
    ">🏟️ Cancha de Padel</option>"
)

# 3. Corregir typos en Shopping
content = content.replace(
    """<option value="mall" style="background:#1a0030" ${n.tipo==='mall'?'selected':''}>🛍️ Mall/option>
          <option value="outlet" style="background:#1a0030" ${n.tipo==='outlet'?'selected':''}>🏷️ utlet</option>""",
    """<option value="mall" style="background:#1a0030" ${n.tipo==='mall'?'selected':''}>🛍️ Mall</option>
          <option value="outlet" style="background:#1a0030" ${n.tipo==='outlet'?'selected':''}>🏷️ Outlet</option>"""
)

# 4. Agregar campo zona después del campo slug
ZONAS_CORDOBA = [
    'Centro','Nueva Córdoba','Güemes','Alberdi','General Paz','Cerro de las Rosas',
    'Villa Allende','Arguello','Colinas de Vélez Sársfield','Urca','Quebrada de las Rosas',
    'San Vicente','Alta Córdoba','Talleres','Villa del Parque','Jardín','Cañitas',
    'Maipú','Palermo','Villa Belgrano','Country Club','Buen Pastor','Poeta Lugones',
    'Manantiales','Villa Warcalde','La Calera','Unquillo','Mendiolaza','Salsipuedes'
]

zonas_options = '\n'.join([
    f"          <option value=\"{z}\" style=\"background:#1a0030\" ${{n.zona==='{z}'?'selected':''}}>{z}</option>"
    for z in ZONAS_CORDOBA
])

campo_zona = f"""      <div class="full" id="zona-field" style="display:none">
        <label class="field-label">Zona / Barrio</label>
        <select class="input-field" id="neg-zona" style="color:#fff;background:#1a0030;">
          <option value="" style="background:#1a0030">Seleccioná la zona...</option>
{zonas_options}
        </select>
      </div>
"""

content = content.replace(
    '      <div>\n        <label class="field-label">Nombre del dueño</label>',
    campo_zona + '      <div>\n        <label class="field-label">Nombre del dueño</label>'
)

# 5. Mostrar/ocultar zona según tipo seleccionado
content = content.replace(
    '<select class="input-field" id="neg-tipo" style="color:#fff;background:#1a0030;">',
    '<select class="input-field" id="neg-tipo" style="color:#fff;background:#1a0030;" onchange="toggleZona(this.value)">'
)

with open(FILE, 'w') as f:
    f.write(content)

print('✅ Fix admin padel aplicado')
