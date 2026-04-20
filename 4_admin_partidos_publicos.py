#!/usr/bin/env python3
"""
Agrega sección "Partidos Públicos" en admin.html para crear/listar/borrar partidos.
Ejecutar en el VPS: python3 4_admin_partidos_publicos.py
"""

ARCHIVO = 'public/admin.html'

# ─── BOTÓN EN EL MENÚ DE NAVEGACIÓN ──────────────────────────────────────────
# Se agrega un ítem de menú nuevo junto a los existentes

BTN_MENU = """      <button class="nav-btn" onclick="navTo('partidos-pub')">⚡ Partidos</button>\n"""

# ─── SECCIÓN HTML COMPLETA ───────────────────────────────────────────────────
SECCION_HTML = """
    <!-- ─── SECCIÓN PARTIDOS PÚBLICOS ─────────────────────────────────── -->
    <div class="section" id="sec-partidos-pub" style="display:none">
      <h2 class="sec-title">⚡ Partidos Públicos</h2>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:20px">
        Creá partidos para que los jugadores se inscriban desde PadelConnect.
      </p>

      <!-- Formulario crear partido -->
      <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:16px;padding:20px;margin-bottom:24px">
        <div style="font-family:'Bebas Neue',cursive;font-size:20px;margin-bottom:16px;color:var(--green)">Nuevo partido</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Zona *</label>
            <select id="np-zona" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
              <option value="">Seleccioná zona...</option>
              <option>Centro</option><option>Nueva Córdoba</option><option>Güemes</option>
              <option>Alberdi</option><option>General Paz</option><option>Cerro de las Rosas</option>
              <option>Villa Allende</option><option>Arguello</option><option>Urca</option>
              <option>Jardín</option><option>Maipú</option><option>Villa Belgrano</option>
              <option>La Calera</option><option>Unquillo</option><option>Mendiolaza</option>
              <option>Salsipuedes</option>
            </select>
          </div>
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Categoría *</label>
            <select id="np-cat" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
              <option value="">Categoría...</option>
              <option value="octava">8va categoría</option>
              <option value="septima">7ma categoría</option>
              <option value="sexta">6ta categoría</option>
              <option value="quinta">5ta categoría</option>
              <option value="cuarta">4ta categoría</option>
              <option value="tercera">3ra categoría</option>
              <option value="segunda">2da categoría</option>
              <option value="primera">1ra categoría</option>
            </select>
          </div>
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Fecha *</label>
            <input type="date" id="np-fecha" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;color-scheme:dark">
          </div>
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Hora *</label>
            <input type="time" id="np-hora" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;color-scheme:dark">
          </div>
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Lugar</label>
            <input type="text" id="np-lugar" placeholder="Ej: Club Atlético Córdoba" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
          </div>
          <div>
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Costo (informativo)</label>
            <input type="text" id="np-costo" placeholder="Ej: $3.000 c/u" style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Descripción (opcional)</label>
          <input type="text" id="np-desc" placeholder="Info extra, nivel sugerido, etc." style="width:100%;padding:10px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Cupos:</label>
          <select id="np-cupos" style="padding:9px 14px;background:#030d06;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
            <option value="4" selected>4 jugadores</option>
            <option value="2">2 jugadores</option>
          </select>
        </div>
        <button onclick="crearPartidoPublico()" style="background:linear-gradient(135deg,#16a34a,#22c55e);border:none;color:#fff;padding:13px 28px;border-radius:50px;font-size:14px;font-weight:700;cursor:pointer">⚡ Crear partido</button>
        <div id="np-msg" style="display:none;margin-top:12px;padding:10px 14px;border-radius:10px;font-size:13px"></div>
      </div>

      <!-- Lista de partidos -->
      <div style="font-family:'Bebas Neue',cursive;font-size:18px;margin-bottom:12px">Partidos creados</div>
      <div id="admin-partidos-pub-list">
        <p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Cargando...</p>
      </div>
    </div>
    <!-- ─── FIN PARTIDOS PÚBLICOS ─────────────────────────────────────── -->
"""

# ─── JS PARA ADMIN ────────────────────────────────────────────────────────────
JS_ADMIN = """
// ─── PARTIDOS PÚBLICOS — ADMIN ────────────────────────────────────────────────
async function cargarPartidosPubAdmin() {
  const el = document.getElementById('admin-partidos-pub-list');
  if (!el) return;
  el.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Cargando...</p>';
  try {
    const data = await adminApi('/padel/partidos-publicos');
    if (!data.length) {
      el.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">No hay partidos creados aún.</p>';
      return;
    }
    const catMap = {octava:'8va',septima:'7ma',sexta:'6ta',quinta:'5ta',cuarta:'4ta',tercera:'3ra',segunda:'2da',primera:'1ra'};
    el.innerHTML = data.map(p => {
      const inscriptos = parseInt(p.inscriptos) || 0;
      const cupos = parseInt(p.cupos) || 4;
      const fecha = new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR', {weekday:'short', day:'numeric', month:'short'});
      const hora  = p.hora ? p.hora.substring(0,5) : '';
      const jugadores = (p.jugadores || []).map(j => `<span style="background:rgba(34,197,94,.1);padding:3px 8px;border-radius:50px;font-size:11px;color:rgba(255,255,255,.7)">${j.nombre}</span>`).join(' ');
      return `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:15px">📍 ${p.zona} &nbsp;·&nbsp; ${catMap[p.categoria] || p.categoria} cat.</div>
            <div style="color:rgba(255,255,255,.45);font-size:12px;margin-top:2px">${fecha} ${hora}hs${p.lugar ? ' · ' + p.lugar : ''}</div>
            ${p.costo ? `<div style="color:#fbbf24;font-size:12px;margin-top:2px">💰 ${p.costo}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-family:'Bebas Neue',cursive;font-size:24px;color:${inscriptos>=cupos?'#22c55e':'#fbbf24'}">${inscriptos}/${cupos}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.3)">${inscriptos>=cupos?'COMPLETO':'libres: '+(cupos-inscriptos)}</div>
          </div>
        </div>
        ${jugadores ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${jugadores}</div>` : ''}
        <button onclick="eliminarPartidoPub('${p.id}')" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;cursor:pointer">🗑 Eliminar</button>
      </div>`;
    }).join('');
  } catch(err) {
    el.innerHTML = `<p style="color:rgba(255,0,0,.5);font-size:13px;padding:12px">Error: ${err.message}</p>`;
  }
}

async function crearPartidoPublico() {
  const zona     = document.getElementById('np-zona')?.value;
  const cat      = document.getElementById('np-cat')?.value;
  const fecha    = document.getElementById('np-fecha')?.value;
  const hora     = document.getElementById('np-hora')?.value;
  const lugar    = document.getElementById('np-lugar')?.value.trim();
  const costo    = document.getElementById('np-costo')?.value.trim();
  const desc     = document.getElementById('np-desc')?.value.trim();
  const cupos    = parseInt(document.getElementById('np-cupos')?.value) || 4;
  const msgEl    = document.getElementById('np-msg');

  if (!zona || !cat || !fecha || !hora) {
    msgEl.textContent = 'Zona, categoría, fecha y hora son obligatorios';
    msgEl.style.cssText = 'display:block;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171';
    return;
  }
  try {
    await adminApi('/padel/partidos-publicos', {
      method:'POST',
      body: JSON.stringify({ zona, categoria: cat, fecha, hora, lugar, costo, descripcion: desc, cupos })
    });
    msgEl.textContent = '✅ Partido creado correctamente';
    msgEl.style.cssText = 'display:block;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:#22c55e';
    // Limpiar form
    ['np-zona','np-cat','np-hora','np-lugar','np-costo','np-desc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('np-fecha').value = '';
    setTimeout(() => { msgEl.style.display='none'; }, 3000);
    cargarPartidosPubAdmin();
  } catch(err) {
    msgEl.textContent = 'Error: ' + err.message;
    msgEl.style.cssText = 'display:block;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171';
  }
}

async function eliminarPartidoPub(id) {
  if (!confirm('¿Eliminar este partido? Se perderán todas las inscripciones.')) return;
  try {
    await adminApi('/padel/partidos-publicos/' + id, { method: 'DELETE' });
    cargarPartidosPubAdmin();
  } catch(err) { alert(err.message); }
}
// ─── FIN PARTIDOS PÚBLICOS ADMIN ─────────────────────────────────────────────
"""

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Agregar botón al menú nav si no existe
if "navTo('partidos-pub')" in html:
    print("⚠️  Botón de menú ya existe, saltando.")
else:
    # Buscar un botón de nav existente como referencia
    ref = "navTo('padel')"
    if ref not in html:
        ref = "navTo('sponsors')"
    if ref not in html:
        print("ERROR: No se encontró botón de referencia en el menú nav")
    else:
        # Insertar después de la línea del botón de referencia
        idx = html.find(ref)
        fin_linea = html.find('\n', idx)
        html = html[:fin_linea+1] + BTN_MENU + html[fin_linea+1:]
        print("✅ Botón ⚡ Partidos agregado al menú")

# 2. Agregar sección HTML antes del cierre de las secciones (antes de script o body)
if 'sec-partidos-pub' in html:
    print("⚠️  Sección partidos-pub ya existe, saltando HTML.")
else:
    # Insertar antes del primer <script> grande o antes de </body>
    target = '</body>'
    html = html.replace(target, SECCION_HTML + '\n' + target, 1)
    print("✅ Sección Partidos Públicos agregada")

# 3. Agregar JS
if 'crearPartidoPublico' in html:
    print("⚠️  JS ya existe, saltando.")
else:
    html = html.replace('</body>', JS_ADMIN + '\n</body>')
    print("✅ JS admin agregado")

# 4. Hookear navTo para que cargue los partidos cuando se navega
old_navto_hook = "if(id==='padel')"
if old_navto_hook in html and 'partidos-pub' not in html[:html.find('</script>')]:
    html = html.replace(
        "if(id==='padel')",
        "if(id==='partidos-pub'){cargarPartidosPubAdmin();}\n    if(id==='padel')"
    )
    print("✅ navTo hooked para partidos-pub")
else:
    # Buscar navTo genérico
    if "navTo" in html and "partidos-pub" not in html:
        print("⚠️  No se pudo hookear navTo automáticamente — hacelo manual en admin.html")
        print("    Buscá la función navTo() y agregá: if(id==='partidos-pub') cargarPartidosPubAdmin();")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ admin.html modificado correctamente.")
print("Próximo paso: git add public/admin.html && git commit && git push")
