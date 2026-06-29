content = open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html', encoding='utf-8').read()

# 1 — Agregar botones de filtro
content = content.replace(
    '        <div id="comandas-resumen" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px"></div>',
    '''        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn-sm cp-btn active" id="cmd-hoy" onclick="filtrarComandas('hoy',this)">Hoy</button>
          <button class="btn-sm cp-btn" id="cmd-ayer" onclick="filtrarComandas('ayer',this)">Ayer</button>
          <button class="btn-sm cp-btn" id="cmd-semana" onclick="filtrarComandas('semana',this)">Esta semana</button>
          <button class="btn-sm cp-btn" id="cmd-mes" onclick="filtrarComandas('mes',this)">Este mes</button>
          <input type="date" id="cmd-fecha" onchange="filtrarComandas('fecha',null)" style="padding:5px 8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:12px">
        </div>
        <div id="comandas-resumen" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px"></div>'''
)

# 2 — Modificar cargarComandas
OLD_FN = '''async function cargarComandas() {
  try {
    const [cmdRes, prodRes] = await Promise.all([
      apiAdmin('/club/comandas'),
      apiAdmin('/club/productos')
    ]);
    window._productos = Array.isArray(prodRes) ? prodRes : [];
    renderComandas(Array.isArray(cmdRes) ? cmdRes : []);
  } catch(e) {
    document.getElementById('comandas-abiertas').innerHTML = '<div style="color:#ef4444">Error al cargar comandas</div>';
  }
}'''

NEW_FN = '''async function cargarComandas(periodo, fecha) {
  periodo = periodo || 'hoy';
  try {
    let url = '/club/comandas?periodo=' + periodo;
    if (fecha) url = '/club/comandas?fecha=' + fecha;
    const [cmdRes, prodRes] = await Promise.all([
      apiAdmin(url),
      apiAdmin('/club/productos')
    ]);
    window._productos = Array.isArray(prodRes) ? prodRes : [];
    renderComandas(Array.isArray(cmdRes) ? cmdRes : [], periodo);
  } catch(e) {
    document.getElementById('comandas-abiertas').innerHTML = '<div style="color:#ef4444">Error al cargar comandas</div>';
  }
}

function filtrarComandas(periodo, btn) {
  document.querySelectorAll('.cp-btn[id^="cmd-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (periodo === 'fecha') {
    const fecha = document.getElementById('cmd-fecha').value;
    if (fecha) cargarComandas('fecha', fecha);
  } else {
    document.getElementById('cmd-fecha').value = '';
    cargarComandas(periodo);
  }
}'''

content = content.replace(OLD_FN, NEW_FN)

# 3 — Modificar renderComandas firma
content = content.replace(
    'function renderComandas(comandas) {\n  const abiertas = comandas.filter(c => c.estado === \'abierta\');\n  const cerradas = comandas.filter(c => c.estado === \'cerrada\');',
    'function renderComandas(comandas, periodo) {\n  const abiertas = comandas.filter(c => c.estado === \'abierta\');\n  const cerradas = comandas.filter(c => c.estado === \'cerrada\');\n  const soloHoy = periodo === \'hoy\' || periodo == null;'
)

# 4 — Ocultar abiertas cuando no es hoy
OLD_ABIERTAS = """  document.getElementById('comandas-abiertas').innerHTML = abiertas.length === 0
    ? '<div style=\"color:var(--muted);font-size:13px;padding:12px 0\">No hay comandas abiertas</div>'
    : abiertas.map(c => renderComandaCard(c, true)).join('');"""

NEW_ABIERTAS = """  const secAbiertas = document.getElementById('comandas-abiertas');
  const btnNueva = document.querySelector('#ci-comandas .btn-export');
  if (btnNueva) btnNueva.style.display = soloHoy ? '' : 'none';
  secAbiertas.style.display = soloHoy ? '' : 'none';
  secAbiertas.innerHTML = abiertas.length === 0
    ? '<div style="color:var(--muted);font-size:13px;padding:12px 0">No hay comandas abiertas</div>'
    : abiertas.map(c => renderComandaCard(c, true)).join('');"""

content = content.replace(OLD_ABIERTAS, NEW_ABIERTAS)

open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html', 'w', encoding='utf-8').write(content)
print('OK')
