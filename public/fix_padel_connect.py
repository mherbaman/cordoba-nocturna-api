FILE = '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padel-connect.html'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Agregar estilos para tabs y pantalla perfil-padel
ESTILOS = """
/* TABS SWIPE */
.swipe-tabs{display:flex;width:100%;max-width:420px;background:rgba(34,197,94,.06);border-bottom:1px solid rgba(34,197,94,.15)}
.swipe-tab{flex:1;padding:11px 6px;text-align:center;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.swipe-tab.active{color:var(--green);border-bottom-color:var(--green)}
.tab-content{display:none;width:100%;flex:1;overflow-y:auto}
.tab-content.active{display:flex;flex-direction:column}

/* CANCHAS TAB */
.cancha-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin:8px 18px;cursor:pointer;transition:all .2s}
.cancha-card:hover{border-color:var(--green);background:rgba(34,197,94,.08)}
.cancha-nombre{font-weight:700;font-size:15px;margin-bottom:4px}
.cancha-zona{color:var(--muted);font-size:12px;margin-bottom:10px}
.turno-item{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
.turno-hora{font-weight:600;font-size:14px}
.turno-precio{color:var(--green);font-size:13px}
.btn-reservar{background:linear-gradient(135deg,var(--green-dark),var(--green));border:none;color:#fff;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;cursor:pointer}

/* RANKING TAB */
.ranking-item{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid rgba(34,197,94,.08)}
.ranking-pos{font-family:'Bebas Neue',cursive;font-size:22px;color:var(--green);width:32px;text-align:center;flex-shrink:0}
.ranking-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--green-dark),var(--green));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden}
.ranking-av img{width:100%;height:100%;object-fit:cover}
.ranking-nombre{font-weight:600;font-size:14px}
.ranking-nivel{color:var(--green);font-size:11px;margin-top:2px}
.ranking-pts{font-family:'Bebas Neue',cursive;font-size:20px;color:var(--green);margin-left:auto}

/* MODAL RESERVA */
#modal-reserva{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:300;align-items:center;justify-content:center;backdrop-filter:blur(12px)}
#modal-reserva.show{display:flex}
.reserva-sheet{background:#071a0a;border:1px solid rgba(34,197,94,.25);border-radius:24px;padding:24px;width:90%;max-width:400px;max-height:85vh;overflow-y:auto}

/* PERFIL PADEL SCREEN */
#perfil-padel{justify-content:flex-start;padding:40px 24px 24px;overflow-y:auto}
.nivel-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
.nivel-btn{padding:12px;border-radius:12px;background:rgba(34,197,94,.06);border:1.5px solid rgba(34,197,94,.15);color:rgba(255,255,255,.7);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;text-align:center}
.nivel-btn:hover,.nivel-btn.selected{background:rgba(34,197,94,.2);border-color:var(--green);color:#fff}
"""

content = content.replace('</style>', ESTILOS + '</style>')

# 2. Agregar pantalla perfil-padel después del screen auth
PANTALLA_PERFIL = """
<!-- PERFIL PADEL -->
<div class="screen" id="perfil-padel">
  <div style="width:100%;max-width:400px">
    <div style="font-family:'Bebas Neue',cursive;font-size:36px;letter-spacing:1px;margin-bottom:4px">Tu perfil <span style="color:var(--green)">padelero</span></div>
    <p style="color:var(--muted);font-size:14px;margin-bottom:28px">Completá estos datos para encontrar rivales de tu nivel.</p>
    <div class="error-msg" id="padel-error"></div>
    <label class="field-label">Tu categoría</label>
    <div class="nivel-grid" id="nivel-grid">
      <button class="nivel-btn" onclick="selectNivel(this,'8va')">8va categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'7ma')">7ma categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'6ta')">6ta categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'5ta')">5ta categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'4ta')">4ta categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'3ra')">3ra categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'2da')">2da categoría</button>
      <button class="nivel-btn" onclick="selectNivel(this,'1ra')">1ra categoría</button>
    </div>
    <label class="field-label">Tu zona</label>
    <select class="input-field" id="padel-zona" style="color:#fff;background:#030d06">
      <option value="">Seleccioná tu zona...</option>
    </select>
    <button class="btn-primary" onclick="guardarPerfilPadel()" style="margin-top:8px">GUARDAR Y JUGAR →</button>
  </div>
</div>
"""

content = content.replace(
    '<!-- QR -->',
    PANTALLA_PERFIL + '<!-- QR -->'
)

# 3. Agregar tabs al swipe screen
TABS_HTML = """  <div class="swipe-tabs" id="swipe-tabs">
    <div class="swipe-tab active" onclick="switchTab('jugar',this)">🎾 Jugar</div>
    <div class="swipe-tab" onclick="switchTab('canchas',this)">🏟️ Canchas</div>
    <div class="swipe-tab" onclick="switchTab('ranking',this)">🏆 Ranking</div>
  </div>
  <!-- TAB JUGAR -->
  <div class="tab-content active" id="tab-jugar">
"""

content = content.replace(
    '  <div style="width:100%;max-width:420px;padding:8px 18px 0"><div id="ads-swipe"></div></div>\n  <div class="card-area" id="card-area"></div>',
    TABS_HTML + '  <div style="width:100%;max-width:420px;padding:8px 18px 0"><div id="ads-swipe"></div></div>\n  <div class="card-area" id="card-area"></div>'
)

content = content.replace(
    '  <div class="action-buttons" id="action-buttons">',
    '  <div class="action-buttons" id="action-buttons">'
)

# Cerrar tab-jugar y agregar tab-canchas y tab-ranking
content = content.replace(
    '</div>\n\n<!-- MATCHES -->',
    """  </div><!-- fin tab-jugar -->

  <!-- TAB CANCHAS -->
  <div class="tab-content" id="tab-canchas">
    <div style="padding:14px 18px 0;font-size:12px;color:var(--muted)">Reservá una cancha cerca tuyo</div>
    <div id="canchas-jugador-list" style="padding:8px 0 40px"></div>
  </div>

  <!-- TAB RANKING -->
  <div class="tab-content" id="tab-ranking">
    <div style="padding:14px 18px;display:flex;gap:8px;flex-wrap:wrap">
      <select id="ranking-nivel-filter" class="input-field" style="flex:1;margin:0;font-size:13px;background:#030d06;color:#fff" onchange="cargarRanking()">
        <option value="">Todos los niveles</option>
        <option value="8va">8va categoría</option>
        <option value="7ma">7ma categoría</option>
        <option value="6ta">6ta categoría</option>
        <option value="5ta">5ta categoría</option>
        <option value="4ta">4ta categoría</option>
        <option value="3ra">3ra categoría</option>
        <option value="2da">2da categoría</option>
        <option value="1ra">1ra categoría</option>
      </select>
    </div>
    <div id="ranking-list"></div>
  </div>

</div>

<!-- MODAL RESERVA -->
<div id="modal-reserva">
  <div class="reserva-sheet">
    <div style="font-family:'Bebas Neue',cursive;font-size:26px;margin-bottom:16px">🏟️ Reservar turno</div>
    <div id="modal-reserva-body"></div>
  </div>
</div>

<!-- MATCHES -->"""
)

# 4. Agregar JS para perfil padel, tabs, canchas y ranking
JS_PADEL = """
// ── NIVELES PADEL ─────────────────────────────────────────────────────
const NIVELES_PADEL = ['8va','7ma','6ta','5ta','4ta','3ra','2da','1ra'];
let nivelSeleccionado = '';
let perfilPadel = null;

function selectNivel(btn, nivel) {
  document.querySelectorAll('.nivel-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  nivelSeleccionado = nivel;
}

async function verificarPerfilPadel() {
  if (!usuario) return false;
  try {
    const data = await api(`/padel/jugadores/mi-perfil?usuario_id=${usuario.id}`);
    if (data.tiene_perfil) { perfilPadel = data.perfil; return true; }
    return false;
  } catch(e) { return false; }
}

async function cargarZonasPadel() {
  try {
    const canchas = await api('/padel/canchas');
    const zonas = [...new Set(canchas.map(c => c.zona_cancha).filter(Boolean))];
    const sel = document.getElementById('padel-zona');
    if (!sel) return;
    zonas.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z; opt.textContent = z;
      sel.appendChild(opt);
    });
  } catch(e) {}
}

async function guardarPerfilPadel() {
  const zona = document.getElementById('padel-zona')?.value;
  const errEl = document.getElementById('padel-error');
  if (!nivelSeleccionado) { errEl.textContent='Seleccioná tu categoría'; errEl.style.display='block'; return; }
  if (!zona) { errEl.textContent='Seleccioná tu zona'; errEl.style.display='block'; return; }
  errEl.style.display='none';
  showLoader('Guardando perfil...');
  try {
    await api('/padel/jugadores', { method:'POST', body:JSON.stringify({
      usuario_id: usuario.id,
      nombre: usuario.nombre,
      nivel: nivelSeleccionado,
      zona,
      foto_url: usuario.foto_url || null
    })});
    perfilPadel = { nivel: nivelSeleccionado, zona };
    if(sesionId) showScreen('swipe');
    else showScreen('qr-screen');
  } catch(err) {
    errEl.textContent = err.message; errEl.style.display='block';
  } finally { hideLoader(); }
}

// ── TABS ──────────────────────────────────────────────────────────────
function switchTab(tab, btn) {
  document.querySelectorAll('.swipe-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('action-buttons').style.display = tab==='jugar' ? 'flex' : 'none';
  if(tab==='canchas') cargarCanchasJugador();
  if(tab==='ranking') cargarRanking();
}

// ── CANCHAS JUGADOR ───────────────────────────────────────────────────
async function cargarCanchasJugador() {
  const el = document.getElementById('canchas-jugador-list');
  el.innerHTML = '<div style="display:flex;justify-content:center;padding:32px"><div class="loader"></div></div>';
  try {
    const canchas = await api('/padel/canchas');
    if (!canchas.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No hay canchas disponibles</div>';
      return;
    }
    el.innerHTML = canchas.map(c => `
      <div class="cancha-card" onclick="verTurnosCancha('${c.id}','${c.nombre}')">
        <div class="cancha-nombre">🏟️ ${c.nombre}</div>
        <div class="cancha-zona">📍 ${c.zona_cancha||''} · ${c.turnos_disponibles} turnos disponibles</div>
        <div style="color:var(--green);font-size:13px">💰 Desde $${c.precio_por_hora} · Ver turnos →</div>
      </div>`).join('');
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted)">Error: ${err.message}</div>`;
  }
}

async function verTurnosCancha(negocioId, nombre) {
  const hoy = new Date().toISOString().split('T')[0];
  const modal = document.getElementById('modal-reserva');
  const body = document.getElementById('modal-reserva-body');
  body.innerHTML = '<div style="display:flex;justify-content:center;padding:20px"><div class="loader"></div></div>';
  modal.classList.add('show');
  try {
    const turnos = await api(`/padel/turnos-disponibles?negocio_id=${negocioId}&fecha=${hoy}`);
    if (!turnos.length) {
      body.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">No hay turnos disponibles hoy.<br><br><button onclick="document.getElementById('modal-reserva').classList.remove('show')" style="background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:var(--green);padding:10px 20px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer">Cerrar</button></div>`;
      return;
    }
    body.innerHTML = `
      <div style="margin-bottom:14px;font-weight:600">${nombre} — Hoy</div>
      ${turnos.map(t => `
        <div class="turno-item">
          <div>
            <div class="turno-hora">🕐 ${t.hora_inicio.substring(0,5)} - ${t.hora_fin.substring(0,5)}</div>
            <div class="turno-precio">$${t.precio_por_hora}</div>
          </div>
          <button class="btn-reservar" onclick="confirmarReserva('${negocioId}','${t.id}','${hoy}','${t.hora_inicio.substring(0,5)}','${t.precio_por_hora}')">Reservar</button>
        </div>`).join('')}
      <button onclick="document.getElementById('modal-reserva').classList.remove('show')" style="width:100%;margin-top:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;padding:11px;border-radius:50px;font-size:13px;font-weight:600;cursor:pointer">Cancelar</button>`;
  } catch(err) {
    body.innerHTML = `<div style="color:var(--muted);text-align:center;padding:20px">${err.message}</div>`;
  }
}

async function confirmarReserva(negocioId, disponibilidadId, fecha, hora, precio) {
  if (!usuario) { alert('Tenés que iniciar sesión'); return; }
  if (!perfilPadel) { alert('Completá tu perfil de jugador primero'); showScreen('perfil-padel'); return; }
  if (!confirm(`Reservar turno ${hora} por $${precio}?`)) return;
  showLoader('Reservando...');
  try {
    await api('/padel/reservas', { method:'POST', body:JSON.stringify({
      jugador_id: perfilPadel.id,
      negocio_id: negocioId,
      disponibilidad_id: disponibilidadId,
      fecha,
      telefono_contacto: usuario.telefono || null
    })});
    document.getElementById('modal-reserva').classList.remove('show');
    alert('✅ Reserva enviada. El club te va a confirmar pronto.');
  } catch(err) { alert(err.message); }
  finally { hideLoader(); }
}

// ── RANKING ───────────────────────────────────────────────────────────
async function cargarRanking() {
  const el = document.getElementById('ranking-list');
  const nivel = document.getElementById('ranking-nivel-filter')?.value || '';
  el.innerHTML = '<div style="display:flex;justify-content:center;padding:32px"><div class="loader"></div></div>';
  try {
    const params = nivel ? `?nivel=${nivel}` : '';
    const jugadores = await api('/padel/ranking'+params);
    if (!jugadores.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No hay jugadores en el ranking aún</div>';
      return;
    }
    el.innerHTML = jugadores.map(j => `
      <div class="ranking-item">
        <div class="ranking-pos">${j.posicion}</div>
        <div class="ranking-av">${j.foto_url?`<img src="${j.foto_url}">`:'🎾'}</div>
        <div>
          <div class="ranking-nombre">${j.nombre}</div>
          <div class="ranking-nivel">${j.nivel} · ${j.zona}</div>
        </div>
        <div class="ranking-pts">${j.ranking_puntos}</div>
      </div>`).join('');
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted)">Error: ${err.message}</div>`;
  }
}
"""

content = content.replace('</script>\n</body>', JS_PADEL + '</script>\n</body>')

# 5. Modificar el flujo post-login para verificar perfil padel
content = content.replace(
    "    syncProfileBtn();connectSocket();\n    if(sesionId)showScreen('swipe');else showScreen('qr-screen');",
    """    syncProfileBtn();connectSocket();
    const tienePerfil = await verificarPerfilPadel();
    if (!tienePerfil) { await cargarZonasPadel(); showScreen('perfil-padel'); return; }
    if(sesionId)showScreen('swipe');else showScreen('qr-screen');"""
)

# 6. Modificar el flujo post-registro para verificar perfil padel
content = content.replace(
    "    syncProfileBtn();connectSocket();showScreen('qr-screen');",
    """    syncProfileBtn();connectSocket();
    await cargarZonasPadel();
    showScreen('perfil-padel');"""
)

with open(FILE, 'w') as f:
    f.write(content)
print('✅ padel-connect.html actualizado')
EOF
