content = open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html', encoding='utf-8').read()

# 1 — Agregar tab Comandas en el menú
content = content.replace(
    '<button class="ci-tab" id="cit-caja" onclick="showCanchaTab(\'caja\')">&#128181; Cierre de Caja</button>',
    '<button class="ci-tab" id="cit-caja" onclick="showCanchaTab(\'caja\')">&#128181; Cierre de Caja</button>\n        <button class="ci-tab" id="cit-comandas" onclick="showCanchaTab(\'comandas\')">&#127860; Comandas</button>'
)

# 2 — Agregar sección ci-comandas después de ci-caja
content = content.replace(
    '    </div>\n    <!-- ===== RESERVAS ===== -->',
    '''      <div id="ci-comandas" class="ci-sec" style="display:none">
        <div class="section-hdr">
          <div class="section-title">&#127860; Comandas del dia</div>
          <button class="btn-export" onclick="abrirModalComanda()">+ Nueva comanda</button>
        </div>
        <div id="comandas-resumen" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px"></div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Abiertas</div>
        <div id="comandas-abiertas"></div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">Cerradas hoy</div>
        <div id="comandas-cerradas"></div>
      </div>
    </div>
    <!-- ===== RESERVAS ===== -->'''
)

# 3 — Agregar caso 'comandas' en showCanchaTab
content = content.replace(
    "  if (tab === 'caja') cargarCaja('hoy', document.getElementById('cp-hoy'));",
    "  if (tab === 'caja') cargarCaja('hoy', document.getElementById('cp-hoy'));\n  if (tab === 'comandas') cargarComandas();"
)

# 4 — Agregar JS de comandas antes del cierre </script> del bloque principal
JS = '''
// ── COMANDAS ──────────────────────────────────────────────────────────

let _modalComandaAbierto = false;

function fmt(n){ return '$' + Math.round(n).toLocaleString('es-AR'); }

async function cargarComandas() {
  const token = localStorage.getItem('neg_token');
  try {
    const [cmdRes, prodRes] = await Promise.all([
      fetch('https://api.cordobalux.com/club/comandas', { headers:{ Authorization:'Bearer '+token } }).then(r=>r.json()),
      fetch('https://api.cordobalux.com/club/productos', { headers:{ Authorization:'Bearer '+token } }).then(r=>r.json())
    ]);
    window._productos = Array.isArray(prodRes) ? prodRes : [];
    renderComandas(Array.isArray(cmdRes) ? cmdRes : []);
  } catch(e) {
    document.getElementById('comandas-abiertas').innerHTML = '<div style="color:#ef4444">Error al cargar comandas</div>';
  }
}

function renderComandas(comandas) {
  const abiertas = comandas.filter(c => c.estado === 'abierta');
  const cerradas = comandas.filter(c => c.estado === 'cerrada');

  let totCanchas = 0, totConsumos = 0;
  comandas.forEach(c => (c.items||[]).forEach(i => {
    if (i.tipo === 'cancha') totCanchas += parseInt(i.monto||0);
    else totConsumos += parseInt(i.monto||0);
  }));

  document.getElementById('comandas-resumen').innerHTML = `
    <div class="caja-card"><div class="caja-card-lbl">Canchas</div><div class="caja-card-val">${fmt(totCanchas)}</div></div>
    <div class="caja-card"><div class="caja-card-lbl">Consumos</div><div class="caja-card-val">${fmt(totConsumos)}</div></div>
    <div class="caja-card"><div class="caja-card-lbl">Total del dia</div><div class="caja-card-val g">${fmt(totCanchas+totConsumos)}</div></div>
  `;

  document.getElementById('comandas-abiertas').innerHTML = abiertas.length === 0
    ? '<div style="color:var(--muted);font-size:13px;padding:12px 0">No hay comandas abiertas</div>'
    : abiertas.map(c => renderComandaCard(c, true)).join('');

  document.getElementById('comandas-cerradas').innerHTML = cerradas.length === 0
    ? '<div style="color:var(--muted);font-size:13px;padding:12px 0">No hay comandas cerradas aun</div>'
    : cerradas.map(c => renderComandaCard(c, false)).join('');
}

function totalComanda(c) { return (c.items||[]).reduce((s,i) => s + parseInt(i.monto||0), 0); }

function renderComandaCard(c, abierta) {
  const total = totalComanda(c);
  const items = (c.items||[]).map(i => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px">
      <span style="color:rgba(255,255,255,.6);display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${i.tipo==='cancha'?'rgba(251,191,36,.1)':'rgba(96,165,250,.1)'};color:${i.tipo==='cancha'?'#fbbf24':'#60a5fa'};border:1px solid ${i.tipo==='cancha'?'rgba(251,191,36,.2)':'rgba(96,165,250,.2)'}">${i.tipo}</span>
        ${i.descripcion}
      </span>
      <span style="font-weight:600">${fmt(i.monto)}</span>
    </div>`).join('');

  const opts = (window._productos||[]).filter(p=>p.activo).map(p =>
    `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} — ${fmt(p.precio)}</option>`
  ).join('');

  return `
  <div class="caja-card" style="margin-bottom:10px;opacity:${abierta?1:.6}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer" onclick="toggleComanda(${c.id})">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${abierta?'rgba(34,197,94,.1)':'rgba(255,255,255,.06)'};color:${abierta?'var(--green)':'var(--muted)'};border:1px solid ${abierta?'rgba(34,197,94,.2)':'rgba(255,255,255,.1)'}">${abierta?'Abierta':'Cerrada'}</span>
        <span style="font-size:14px;font-weight:600">${c.nombre}</span>
        <span style="font-size:12px;color:var(--muted)">${(c.items||[]).length} items</span>
      </div>
      <span style="font-size:15px;font-weight:700">${fmt(total)}</span>
    </div>
    <div id="cmd-body-${c.id}" style="display:none">
      <div style="margin-bottom:8px">${items || '<div style="font-size:12px;color:var(--muted);padding:8px 0">Sin items aun</div>'}</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:8px 0;border-top:1px solid rgba(34,197,94,.15)">
        <span>Total</span><span style="color:var(--green)">${fmt(total)}</span>
      </div>
      ${abierta ? `
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
        <select id="sel-${c.id}" style="width:100%;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px" onchange="onSelProducto(${c.id})">
          <option value="">— elegir producto —</option>
          ${opts}
          <option value="libre">✏ Escribir libre</option>
        </select>
        <div id="libre-${c.id}" style="display:none;gap:8px;flex-direction:column">
          <input type="text" id="desc-${c.id}" placeholder="Descripcion" style="width:100%;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px">
          <input type="number" id="monto-${c.id}" placeholder="$ monto" style="width:100%;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="number" id="cant-${c.id}" value="1" min="1" placeholder="Cant." style="width:70px;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px">
          <button onclick="agregarItemComanda(${c.id})" style="flex:1;padding:8px;border:1px solid rgba(34,197,94,.3);border-radius:8px;background:rgba(34,197,94,.1);color:var(--green);font-size:13px;cursor:pointer">+ Agregar</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button onclick="cerrarComanda(${c.id})" style="flex:1;padding:8px;border:1px solid rgba(34,197,94,.3);border-radius:8px;background:rgba(34,197,94,.1);color:var(--green);font-size:13px;font-weight:600;cursor:pointer">&#10003; Cobrar y cerrar</button>
          <button onclick="eliminarComanda(${c.id})" style="padding:8px 12px;border:1px solid rgba(239,68,68,.3);border-radius:8px;background:rgba(239,68,68,.1);color:#ef4444;font-size:13px;cursor:pointer">&#128465;</button>
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

function toggleComanda(id) {
  const el = document.getElementById('cmd-body-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function onSelProducto(id) {
  const sel = document.getElementById('sel-' + id);
  const libreWrap = document.getElementById('libre-' + id);
  libreWrap.style.display = sel.value === 'libre' ? 'flex' : 'none';
}

async function agregarItemComanda(id) {
  const token = localStorage.getItem('neg_token');
  const sel = document.getElementById('sel-' + id);
  const cant = parseInt(document.getElementById('cant-' + id).value) || 1;
  let descripcion = '', monto = 0, tipo = 'consumo';

  if (sel.value === 'libre') {
    descripcion = document.getElementById('desc-' + id).value.trim();
    monto = parseInt(document.getElementById('monto-' + id).value) || 0;
    if (!descripcion || monto <= 0) return alert('Completá descripcion y monto');
    if (cant > 1) descripcion = cant + 'x ' + descripcion;
    monto *= cant;
  } else if (sel.value) {
    const opt = sel.options[sel.selectedIndex];
    const precio = parseInt(opt.dataset.precio) || 0;
    descripcion = cant > 1 ? cant + 'x ' + opt.text.split(' —')[0] : opt.text.split(' —')[0];
    monto = precio * cant;
    if (descripcion.toLowerCase().includes('cancha')) tipo = 'cancha';
  } else return;

  try {
    await fetch('https://api.cordobalux.com/club/comandas/' + id + '/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ descripcion, monto, tipo })
    });
    cargarComandas();
  } catch(e) { alert('Error: ' + e.message); }
}

async function cerrarComanda(id) {
  if (!confirm('Cerrar y cobrar esta comanda?')) return;
  const token = localStorage.getItem('neg_token');
  try {
    await fetch('https://api.cordobalux.com/club/comandas/' + id + '/cerrar', {
      method: 'PUT', headers: { Authorization: 'Bearer ' + token }
    });
    cargarComandas();
  } catch(e) { alert('Error: ' + e.message); }
}

async function eliminarComanda(id) {
  if (!confirm('Eliminar esta comanda?')) return;
  const token = localStorage.getItem('neg_token');
  try {
    await fetch('https://api.cordobalux.com/club/comandas/' + id, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
    });
    cargarComandas();
  } catch(e) { alert('Error: ' + e.message); }
}

function abrirModalComanda() {
  const nomb = prompt('Nombre de la comanda (ej: Cancha 2 · 19hs, Mesa visitantes)');
  if (!nomb) return;
  const precioStr = prompt('Precio de la cancha en ARS (Enter si no aplica)');
  const precio_cancha = parseInt(precioStr) || 0;
  const token = localStorage.getItem('neg_token');
  fetch('https://api.cordobalux.com/club/comandas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ nombre: nomb, precio_cancha })
  }).then(() => cargarComandas()).catch(e => alert('Error: ' + e.message));
}

// ── PRODUCTOS DEL CLUB ─────────────────────────────────────────────────

async function cargarProductosClub() {
  const token = localStorage.getItem('neg_token');
  try {
    const res = await fetch('https://api.cordobalux.com/club/productos', { headers:{ Authorization:'Bearer '+token } });
    const prods = await res.json();
    renderProductosClub(Array.isArray(prods) ? prods : []);
  } catch(e) {
    document.getElementById('prod-club-list').innerHTML = '<div style="color:#ef4444">Error</div>';
  }
}

function renderProductosClub(prods) {
  const cont = document.getElementById('prod-club-list');
  if (!cont) return;
  cont.innerHTML = prods.length === 0
    ? '<div style="color:var(--muted);font-size:13px;padding:12px 0">No hay productos cargados</div>'
    : prods.map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;opacity:${p.activo?1:.45}">
        <span style="flex:1;font-size:13px">${p.nombre}${p.activo?'':' <span style=\\'font-size:11px;color:var(--muted)\\'>(inactivo)</span>'}</span>
        <span id="precio-lbl-${p.id}" style="font-size:13px;font-weight:600;color:var(--green);min-width:70px;text-align:right">$${parseInt(p.precio).toLocaleString('es-AR')}</span>
        <button onclick="editarPrecioProducto(${p.id},${p.precio})" style="padding:5px 8px;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.6);font-size:12px;cursor:pointer">✏ Precio</button>
        <button onclick="toggleProductoClub(${p.id},${p.activo})" style="padding:5px 8px;border:1px solid rgba(251,191,36,.3);border-radius:6px;background:rgba(251,191,36,.08);color:#fbbf24;font-size:12px;cursor:pointer">${p.activo?'Pausar':'Activar'}</button>
        <button onclick="borrarProductoClub(${p.id})" style="padding:5px 8px;border:1px solid rgba(239,68,68,.3);border-radius:6px;background:rgba(239,68,68,.08);color:#ef4444;font-size:12px;cursor:pointer">&#128465;</button>
      </div>`).join('');
}

async function editarPrecioProducto(id, precioActual) {
  const nuevo = prompt('Nuevo precio para el producto:', precioActual);
  if (!nuevo || isNaN(nuevo)) return;
  const token = localStorage.getItem('neg_token');
  await fetch('https://api.cordobalux.com/club/productos/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ precio: parseInt(nuevo) })
  });
  cargarProductosClub();
}

async function toggleProductoClub(id, activo) {
  const token = localStorage.getItem('neg_token');
  await fetch('https://api.cordobalux.com/club/productos/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ activo: !activo })
  });
  cargarProductosClub();
}

async function borrarProductoClub(id) {
  if (!confirm('Borrar este producto?')) return;
  const token = localStorage.getItem('neg_token');
  await fetch('https://api.cordobalux.com/club/productos/' + id, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
  });
  cargarProductosClub();
}

async function agregarProductoClub() {
  const nombre = document.getElementById('np-nombre').value.trim();
  const precio = parseInt(document.getElementById('np-precio').value) || 0;
  if (!nombre || precio <= 0) return alert('Completa nombre y precio');
  const token = localStorage.getItem('neg_token');
  await fetch('https://api.cordobalux.com/club/productos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ nombre, precio })
  });
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-precio').value = '';
  cargarProductosClub();
}
'''

content = content.replace(
    '// ── AGENDA SEMANAL ──────────────────────────────────────────',
    JS + '\n// ── AGENDA SEMANAL ──────────────────────────────────────────'
)

# 5 — Agregar tab Productos dentro de ci-comandas (sección productos)
SECCION_PRODUCTOS = '''      <div id="ci-productos" class="ci-sec" style="display:none">
        <div class="section-hdr">
          <div class="section-title">&#127873; Mis Productos</div>
        </div>
        <div id="prod-club-list"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" id="np-nombre" placeholder="Nombre del producto" style="flex:1;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px">
          <input type="number" id="np-precio" placeholder="$ precio" style="width:110px;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#1a2a1c;color:#fff;font-size:13px">
          <button onclick="agregarProductoClub()" style="padding:8px 14px;border:1px solid rgba(34,197,94,.3);border-radius:8px;background:rgba(34,197,94,.1);color:var(--green);font-size:13px;cursor:pointer">+ Agregar</button>
        </div>
      </div>
'''

content = content.replace(
    '    </div>\n    <!-- ===== RESERVAS ===== -->',
    SECCION_PRODUCTOS + '    </div>\n    <!-- ===== RESERVAS ===== -->'
)

# 6 — Agregar tab Productos en el menú ci-tabs
content = content.replace(
    '<button class="ci-tab" id="cit-comandas" onclick="showCanchaTab(\'comandas\')">&#127860; Comandas</button>',
    '<button class="ci-tab" id="cit-comandas" onclick="showCanchaTab(\'comandas\')">&#127860; Comandas</button>\n        <button class="ci-tab" id="cit-productos" onclick="showCanchaTab(\'productos\')">&#127873; Mis Productos</button>'
)

# 7 — Agregar caso 'productos' en showCanchaTab
content = content.replace(
    "  if (tab === 'comandas') cargarComandas();",
    "  if (tab === 'comandas') cargarComandas();\n  if (tab === 'productos') cargarProductosClub();"
)

open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html', 'w', encoding='utf-8').write(content)
print('OK')
