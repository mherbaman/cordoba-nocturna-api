with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    lines = f.readlines()

# ── REGISTRO: agregar zona principal antes del boton CREAR PERFIL (linea 901, index 900)
zona_registro = '''    <label class="field-label">📍 Zona principal de juego</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'CBA Centro')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Centro</button>
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'CBA Norte')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Norte</button>
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'CBA Sur')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Sur</button>
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'CBA Este')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Este</button>
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'CBA Oeste')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Oeste</button>
      <button type="button" class="zona-btn" onclick="selectZonaReg(this,'INTERIOR RIOIV')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">Interior RIV</button>
    </div>
    <div id="reg-zonas-extra-wrap" style="display:none;margin-bottom:16px">
      <label class="field-label" style="margin-bottom:8px">¿Jugás en otra zona también? <span style="color:var(--muted);font-weight:400">(opcional)</span></label>
      <div style="display:flex;flex-wrap:wrap;gap:6px" id="reg-zonas-extra-chips"></div>
    </div>
'''
lines.insert(900, zona_registro)

# ── PERFIL PADEL: reemplazar select zona libre por botones fijos (ahora desplazado por insert)
# Buscar las lineas exactas
for i, line in enumerate(lines):
    if 'label class="field-label">Tu zona' in line:
        zona_label_idx = i
        break

zona_perfil = '''    <label class="field-label">📍 Zona principal de juego</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'CBA Centro')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Centro</button>
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'CBA Norte')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Norte</button>
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'CBA Sur')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Sur</button>
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'CBA Este')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Este</button>
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'CBA Oeste')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">CBA Oeste</button>
      <button type="button" class="zona-btn-perfil" onclick="selectZonaPerfil(this,'INTERIOR RIOIV')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:10px;border-radius:10px;font-size:13px;cursor:pointer">Interior RIV</button>
    </div>
    <div id="perfil-zonas-extra-wrap" style="display:none;margin-bottom:16px">
      <label class="field-label" style="margin-bottom:8px">¿Jugás en otra zona también? <span style="color:var(--muted);font-weight:400">(opcional, máx 2)</span></label>
      <div style="display:flex;flex-wrap:wrap;gap:6px" id="perfil-zonas-extra-chips"></div>
    </div>
'''

# Reemplazar las 4 lineas viejas (label + select + option + input custom) con el nuevo bloque
lines[zona_label_idx] = zona_perfil
lines[zona_label_idx + 1] = ''
lines[zona_label_idx + 2] = ''
lines[zona_label_idx + 3] = ''
lines[zona_label_idx + 4] = ''

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.writelines(lines)

print("HTML OK")
