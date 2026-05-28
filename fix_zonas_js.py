with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    lines = f.readlines()

# ── 1. Agregar funciones JS nuevas antes de doRegister (linea 1573, index 1572)
js_nuevas = '''// ── ZONAS ─────────────────────────────────────────────────────────────
const ZONAS_DISPONIBLES = ['CBA Centro','CBA Norte','CBA Sur','CBA Este','CBA Oeste','INTERIOR RIOIV'];
let zonaRegSeleccionada = null;
let zonasExtraReg = [];
let zonaPerfilSeleccionada = null;
let zonasExtraPerfil = [];

function selectZonaReg(btn, zona) {
  zonaRegSeleccionada = zona;
  document.querySelectorAll('.zona-btn').forEach(b => {
    b.style.background = 'rgba(255,255,255,.05)';
    b.style.border = '1px solid rgba(255,255,255,.15)';
    b.style.color = 'rgba(255,255,255,.7)';
  });
  btn.style.background = 'rgba(34,197,94,.2)';
  btn.style.border = '1px solid #22c55e';
  btn.style.color = '#22c55e';
  // Mostrar zonas extra
  const wrap = document.getElementById('reg-zonas-extra-wrap');
  wrap.style.display = 'block';
  renderZonasExtraChips('reg-zonas-extra-chips', zona, zonasExtraReg, (z) => {
    const idx = zonasExtraReg.indexOf(z);
    if (idx > -1) { zonasExtraReg.splice(idx, 1); }
    else if (zonasExtraReg.length < 2) { zonasExtraReg.push(z); }
    renderZonasExtraChips('reg-zonas-extra-chips', zona, zonasExtraReg, arguments.callee);
  });
}

function selectZonaPerfil(btn, zona) {
  zonaPerfilSeleccionada = zona;
  document.querySelectorAll('.zona-btn-perfil').forEach(b => {
    b.style.background = 'rgba(255,255,255,.05)';
    b.style.border = '1px solid rgba(255,255,255,.15)';
    b.style.color = 'rgba(255,255,255,.7)';
  });
  btn.style.background = 'rgba(34,197,94,.2)';
  btn.style.border = '1px solid #22c55e';
  btn.style.color = '#22c55e';
  const wrap = document.getElementById('perfil-zonas-extra-wrap');
  wrap.style.display = 'block';
  renderZonasExtraChips('perfil-zonas-extra-chips', zona, zonasExtraPerfil, (z) => {
    const idx = zonasExtraPerfil.indexOf(z);
    if (idx > -1) { zonasExtraPerfil.splice(idx, 1); }
    else if (zonasExtraPerfil.length < 2) { zonasExtraPerfil.push(z); }
    renderZonasExtraChips('perfil-zonas-extra-chips', zona, zonasExtraPerfil, arguments.callee);
  });
}

function renderZonasExtraChips(containerId, zonaPrincipal, seleccionadas, onToggle) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  ZONAS_DISPONIBLES.filter(z => z !== zonaPrincipal).forEach(z => {
    const sel = seleccionadas.includes(z);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = z;
    chip.style.cssText = sel
      ? 'background:rgba(34,197,94,.2);border:1px solid #22c55e;color:#22c55e;padding:6px 14px;border-radius:50px;font-size:12px;cursor:pointer'
      : 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.6);padding:6px 14px;border-radius:50px;font-size:12px;cursor:pointer';
    chip.onclick = () => onToggle(z);
    container.appendChild(chip);
  });
}

'''

for i, line in enumerate(lines):
    if 'async function doRegister(){' in line:
        lines.insert(i, js_nuevas)
        break

# ── 2. Modificar guardarPerfilPadel para usar zonaPerfilSeleccionada
with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.writelines(lines)

# Releer para modificar guardarPerfilPadel
with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

# Reemplazar logica de zona en guardarPerfilPadel
content = content.replace(
    "  const zonaSelect = document.getElementById('padel-zona')?.value;\n  const zona = zonaSelect === 'Otra zona'\n    ? document.getElementById('padel-zona-custom')?.value.trim()\n    : zonaSelect;",
    "  const zona = zonaPerfilSeleccionada;"
)

# Reemplazar el POST a /padel/jugadores para incluir zona_principal y zonas_extra
content = content.replace(
    "      usuario_id: usuario.id,\n      nombre: usuario.nombre,\n      nivel: nivelSeleccionado,\n      zona,\n      foto_url: usuario.foto_url || null",
    "      usuario_id: usuario.id,\n      nombre: usuario.nombre,\n      nivel: nivelSeleccionado,\n      zona,\n      zona_principal: zona,\n      zonas_extra: zonasExtraPerfil,\n      foto_url: usuario.foto_url || null"
)

# Reemplazar el POST a /auth/registro para incluir zona_principal
content = content.replace(
    "body:JSON.stringify({nombre:n,email:em,password:pw,edad:ed,vibe,foto_url:regPhoto||null,app_origen:'padel'})",
    "body:JSON.stringify({nombre:n,email:em,password:pw,edad:ed,vibe,foto_url:regPhoto||null,app_origen:'padel',zona_principal:zonaRegSeleccionada,zonas_extra:zonasExtraReg})"
)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("JS OK")
