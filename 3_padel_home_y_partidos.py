#!/usr/bin/env python3
"""
Modifica padel-connect.html para agregar:
1. Pantalla HOME post-login (IR A PERFIL / IR A PRÓXIMOS PARTIDOS)
2. Pantalla PRÓXIMOS PARTIDOS con filtros, inscripción y contador en tiempo real

Ejecutar en el VPS: python3 3_padel_home_y_partidos.py
"""

import re

ARCHIVO = 'public/padel-connect.html'

# ─── CSS NUEVO ────────────────────────────────────────────────────────────────
CSS_NUEVO = """
/* HOME POST-LOGIN */
#home-screen { justify-content:flex-start; padding:0; }
.home-header { width:100%; max-width:420px; padding:36px 24px 0; text-align:center; }
.home-logo { font-family:'Bebas Neue',cursive; font-size:32px; letter-spacing:2px; }
.home-logo span { color:var(--green); }
.home-subtitle { color:var(--muted); font-size:13px; margin-top:6px; }
.home-cards { width:100%; max-width:420px; padding:28px 20px 0; display:flex; flex-direction:column; gap:14px; }
.home-card { border-radius:20px; padding:26px 22px; cursor:pointer; transition:all .2s; border:1.5px solid; position:relative; overflow:hidden; }
.home-card:hover { transform:translateY(-2px); }
.home-card-icon { font-size:42px; margin-bottom:10px; display:block; }
.home-card-title { font-family:'Bebas Neue',cursive; font-size:24px; letter-spacing:1px; margin-bottom:5px; }
.home-card-desc { font-size:13px; line-height:1.5; opacity:.75; }
.home-card-arrow { position:absolute; bottom:20px; right:22px; font-size:22px; opacity:.4; }
.home-card-perfil { background:rgba(34,197,94,.08); border-color:rgba(34,197,94,.3); }
.home-card-perfil:hover { background:rgba(34,197,94,.14); border-color:var(--green); }
.home-card-partidos { background:rgba(255,193,7,.06); border-color:rgba(255,193,7,.25); }
.home-card-partidos:hover { background:rgba(255,193,7,.12); border-color:rgba(255,193,7,.6); }
.home-card-partidos .home-card-title { color:#fbbf24; }

/* PRÓXIMOS PARTIDOS */
#proximos-partidos { justify-content:flex-start; padding:0; }
.pp-header { width:100%; max-width:420px; padding:16px 18px 0; display:flex; align-items:center; gap:12px; }
.pp-title { font-family:'Bebas Neue',cursive; font-size:26px; letter-spacing:.5px; flex:1; }
.pp-title span { color:#fbbf24; }
.pp-filtros { width:100%; max-width:420px; padding:12px 16px; display:flex; gap:8px; flex-wrap:wrap; }
.pp-filtro { flex:1; min-width:120px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#fff; padding:9px 12px; border-radius:50px; font-size:12px; outline:none; font-family:'DM Sans',sans-serif; cursor:pointer; }
.pp-filtro:focus { border-color:var(--green); }
.pp-list { width:100%; max-width:420px; padding:4px 16px 100px; overflow-y:auto; flex:1; }

.partido-pub-card { background:var(--card); border:1.5px solid rgba(255,193,7,.2); border-radius:18px; padding:16px; margin-bottom:12px; animation:fadeUp .3s ease forwards; }
.partido-pub-card.lleno { border-color:rgba(255,255,255,.1); opacity:.65; }
.partido-pub-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
.partido-pub-zona { font-size:12px; color:rgba(255,255,255,.4); }
.partido-pub-cat { background:rgba(34,197,94,.15); border:1px solid rgba(34,197,94,.3); color:var(--green); font-size:10px; font-weight:700; padding:3px 10px; border-radius:50px; }
.partido-pub-fecha { font-size:14px; font-weight:700; margin-bottom:4px; }
.partido-pub-info { color:rgba(255,255,255,.45); font-size:12px; margin-bottom:12px; line-height:1.6; }
.partido-pub-cupos { display:flex; gap:4px; align-items:center; margin-bottom:12px; }
.cupo-slot { width:36px; height:36px; border-radius:50%; border:2px solid rgba(34,197,94,.3); display:flex; align-items:center; justify-content:center; font-size:16px; background:rgba(34,197,94,.06); overflow:hidden; }
.cupo-slot.ocupado { border-color:var(--green); background:rgba(34,197,94,.15); }
.cupo-slot img { width:100%; height:100%; object-fit:cover; }
.cupo-label { font-family:'Bebas Neue',cursive; font-size:18px; color:#fbbf24; margin-left:6px; }
.btn-inscribirse { width:100%; padding:12px; background:linear-gradient(135deg,#b45309,#f59e0b,#fbbf24); border:none; color:#000; border-radius:50px; font-size:14px; font-weight:800; cursor:pointer; transition:all .2s; }
.btn-inscribirse:hover { transform:scale(1.02); box-shadow:0 0 24px rgba(251,191,36,.4); }
.btn-inscribirse.inscripto { background:rgba(34,197,94,.15); border:1.5px solid var(--green); color:var(--green); font-weight:700; cursor:pointer; }
.btn-inscribirse:disabled { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.3); cursor:not-allowed; transform:none; }
.partido-pub-costo { display:inline-block; background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.25); color:#fbbf24; font-size:11px; font-weight:700; padding:3px 10px; border-radius:50px; margin-bottom:10px; }
"""

# ─── HTML PANTALLA HOME ───────────────────────────────────────────────────────
HTML_HOME = """
<!-- HOME POST-LOGIN -->
<div class="screen" id="home-screen">
  <div class="home-header">
    <div class="home-logo">PADEL<span>CONNECT</span></div>
    <p class="home-subtitle" id="home-saludo">¿Qué querés hacer hoy? 🎾</p>
  </div>
  <div class="home-cards">
    <div class="home-card home-card-partidos" onclick="irAProximosPartidos()">
      <span class="home-card-icon">⚡</span>
      <div class="home-card-title">Próximos Partidos</div>
      <p class="home-card-desc">Encontrá y unite a partidos de pádel cerca tuyo. Filtrá por zona y categoría.</p>
      <span class="home-card-arrow">→</span>
    </div>
    <div class="home-card home-card-perfil" onclick="irAMiPerfil()">
      <span class="home-card-icon">👤</span>
      <div class="home-card-title">Mi Perfil</div>
      <p class="home-card-desc">Jugadores, canchas, ranking, mis reservas, mis partidos y configuración.</p>
      <span class="home-card-arrow">→</span>
    </div>
  </div>
</div>
"""

# ─── HTML PANTALLA PRÓXIMOS PARTIDOS ─────────────────────────────────────────
HTML_PROXIMOS = """
<!-- PRÓXIMOS PARTIDOS PÚBLICOS -->
<div class="screen" id="proximos-partidos">
  <div class="pp-header">
    <button class="back-btn" onclick="showScreen('home-screen')" style="font-size:22px">←</button>
    <div class="pp-title">Próximos <span>Partidos</span></div>
  </div>
  <div class="pp-filtros">
    <select class="pp-filtro" id="pp-filtro-zona" onchange="cargarPartidosPublicos()">
      <option value="">📍 Todas las zonas</option>
      <option value="Centro">Centro</option>
      <option value="Nueva Córdoba">Nueva Córdoba</option>
      <option value="Güemes">Güemes</option>
      <option value="Alberdi">Alberdi</option>
      <option value="General Paz">General Paz</option>
      <option value="Cerro de las Rosas">Cerro de las Rosas</option>
      <option value="Villa Allende">Villa Allende</option>
      <option value="Arguello">Arguello</option>
      <option value="Urca">Urca</option>
      <option value="Jardín">Jardín</option>
      <option value="Maipú">Maipú</option>
      <option value="Villa Belgrano">Villa Belgrano</option>
      <option value="La Calera">La Calera</option>
      <option value="Unquillo">Unquillo</option>
      <option value="Mendiolaza">Mendiolaza</option>
      <option value="Salsipuedes">Salsipuedes</option>
    </select>
    <select class="pp-filtro" id="pp-filtro-cat" onchange="cargarPartidosPublicos()">
      <option value="">🎾 Todas las categorías</option>
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
  <div class="pp-list" id="pp-list">
    <div style="display:flex;justify-content:center;padding:40px"><div class="loader"></div></div>
  </div>
</div>
"""

# ─── JS NUEVO ─────────────────────────────────────────────────────────────────
JS_NUEVO = """
// ─── HOME POST-LOGIN ─────────────────────────────────────────────────────────
function irAProximosPartidos() {
  showScreen('proximos-partidos');
  cargarPartidosPublicos();
}

function irAMiPerfil() {
  showScreen('swipe');
  // Activar tab jugar por defecto
  setTimeout(() => switchTab('jugar', document.querySelector('.swipe-tab')), 100);
}

// ─── PRÓXIMOS PARTIDOS PÚBLICOS ───────────────────────────────────────────────
let _ppInterval = null;

async function cargarPartidosPublicos() {
  const el = document.getElementById('pp-list');
  if (!el) return;
  el.innerHTML = '<div style="display:flex;justify-content:center;padding:40px"><div class="loader"></div></div>';

  // Auto-refrescar cada 20 segundos mientras está en pantalla
  if (_ppInterval) clearInterval(_ppInterval);
  _ppInterval = setInterval(() => {
    const activa = document.getElementById('proximos-partidos');
    if (activa && activa.classList.contains('active')) _renderPartidosPublicos();
    else clearInterval(_ppInterval);
  }, 20000);

  await _renderPartidosPublicos();
}

async function _renderPartidosPublicos() {
  const el = document.getElementById('pp-list');
  if (!el) return;
  try {
    const zona = document.getElementById('pp-filtro-zona')?.value || '';
    const cat  = document.getElementById('pp-filtro-cat')?.value  || '';
    const params = new URLSearchParams();
    if (zona) params.set('zona', zona);
    if (cat)  params.set('categoria', cat);

    const partidos = await api('/padel/partidos-publicos?' + params.toString());

    if (!partidos.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:48px 16px">
          <div style="font-size:48px;margin-bottom:12px">🎾</div>
          <div style="font-family:'Bebas Neue',cursive;font-size:22px;margin-bottom:8px">No hay partidos disponibles</div>
          <p style="color:var(--muted);font-size:13px;line-height:1.6">
            No hay partidos para los filtros seleccionados.<br>Probá otra zona o categoría.
          </p>
        </div>`;
      return;
    }

    el.innerHTML = partidos.map(p => renderPartidoPublico(p)).join('');
  } catch(err) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted)">Error cargando partidos: ${err.message}</div>`;
  }
}

function renderPartidoPublico(p) {
  const inscriptos = parseInt(p.inscriptos) || 0;
  const cupos = parseInt(p.cupos) || 4;
  const libre = cupos - inscriptos;
  const lleno = libre <= 0;
  const jugadores = p.jugadores || [];

  const fecha = new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR', {weekday:'long', day:'numeric', month:'long'});
  const hora  = p.hora ? p.hora.substring(0,5) : '';

  const yoInscripto = jugadores.some(j => j.usuario_id === usuario?.id);

  // Slots visuales
  const slots = Array.from({length: cupos}, (_, i) => {
    const j = jugadores[i];
    if (j) {
      return `<div class="cupo-slot ocupado" title="${j.nombre}">
        ${j.foto_url
          ? `<img src="${j.foto_url}" alt="${j.nombre}">`
          : `<span style="font-size:14px">😊</span>`}
      </div>`;
    }
    return `<div class="cupo-slot" title="Lugar libre"><span style="color:rgba(255,255,255,.2);font-size:18px">+</span></div>`;
  }).join('');

  let btnHTML = '';
  if (lleno && !yoInscripto) {
    btnHTML = `<button class="btn-inscribirse" disabled>Partido completo — ${cupos}/${cupos}</button>`;
  } else if (yoInscripto) {
    btnHTML = `<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido('${p.id}')">✓ Inscripto — Cancelar</button>`;
  } else {
    btnHTML = `<button class="btn-inscribirse" onclick="inscribirsePartido('${p.id}')">⚡ Unirme — ${inscriptos}/${cupos}</button>`;
  }

  // Días hasta el partido
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fp  = new Date(p.fecha + 'T00:00:00'); fp.setHours(0,0,0,0);
  const dias = Math.round((fp - hoy) / 86400000);
  const urgencia = dias === 0 ? '🔴 ¡Hoy!' : dias === 1 ? '🟡 Mañana' : `🟢 En ${dias} días`;

  return `
  <div class="partido-pub-card ${lleno && !yoInscripto ? 'lleno' : ''}" id="ppc-${p.id}">
    <div class="partido-pub-top">
      <div>
        <div class="partido-pub-zona">📍 ${p.zona} &nbsp;·&nbsp; ${urgencia}</div>
      </div>
      <span class="partido-pub-cat">${formatCategoria(p.categoria)}</span>
    </div>
    <div class="partido-pub-fecha">📅 ${fecha} &nbsp; 🕐 ${hora}hs</div>
    <div class="partido-pub-info">
      ${p.lugar ? `🏟️ ${p.lugar}<br>` : ''}
      ${p.descripcion ? `${p.descripcion}` : ''}
    </div>
    ${p.costo ? `<span class="partido-pub-costo">💰 ${p.costo}</span>` : ''}
    <div class="partido-pub-cupos">
      ${slots}
      <span class="cupo-label">${inscriptos}/${cupos}</span>
    </div>
    ${btnHTML}
  </div>`;
}

function formatCategoria(cat) {
  const map = {
    octava:'8va cat.',septima:'7ma cat.',sexta:'6ta cat.',quinta:'5ta cat.',
    cuarta:'4ta cat.',tercera:'3ra cat.',segunda:'2da cat.',primera:'1ra cat.'
  };
  return map[cat] || cat;
}

async function inscribirsePartido(partidoId) {
  if (!usuario) { alert('Tenés que iniciar sesión'); return; }
  if (!perfilPadel) { alert('Completá tu perfil de jugador primero'); showScreen('perfil-padel'); return; }
  showLoader('Inscribiendo...');
  try {
    const data = await api(`/padel/partidos-publicos/${partidoId}/inscribirse`, { method:'POST', body:'{}' });
    // Actualizar card sin recargar todo
    const card = document.getElementById('ppc-' + partidoId);
    if (card && data.partido) card.outerHTML = renderPartidoPublico(data.partido);
    else await _renderPartidosPublicos();
  } catch(err) { alert(err.message); }
  finally { hideLoader(); }
}

async function desinscribirsePartido(partidoId) {
  if (!confirm('¿Cancelar tu inscripción a este partido?')) return;
  showLoader('Cancelando...');
  try {
    await api(`/padel/partidos-publicos/${partidoId}/desinscribirse`, { method:'DELETE', body:'{}' });
    await _renderPartidosPublicos();
  } catch(err) { alert(err.message); }
  finally { hideLoader(); }
}
// ─── FIN PRÓXIMOS PARTIDOS ────────────────────────────────────────────────────
"""

# ─── MODIFICACIONES AL ARCHIVO ────────────────────────────────────────────────

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Agregar CSS dentro de <style>
if 'home-screen' in html:
    print("⚠️  El CSS de home-screen ya existe, saltando CSS.")
else:
    # Insertar antes del cierre de </style>
    target_css = '</style>'
    idx = html.rfind(target_css)
    if idx == -1:
        print("ERROR: No se encontró </style>")
        exit(1)
    html = html[:idx] + CSS_NUEVO + '\n' + html[idx:]
    print("✅ CSS agregado")

# 2. Agregar pantalla HOME y PRÓXIMOS PARTIDOS antes del splash
if 'id="home-screen"' in html:
    print("⚠️  La pantalla home-screen ya existe, saltando HTML.")
else:
    target_splash = '<!-- SPLASH -->'
    if target_splash not in html:
        print("ERROR: No se encontró comentario SPLASH")
        exit(1)
    html = html.replace(target_splash, HTML_HOME + '\n' + HTML_PROXIMOS + '\n' + target_splash)
    print("✅ Pantallas HOME y PRÓXIMOS PARTIDOS agregadas")

# 3. Agregar JS antes del cierre </script> final o antes de </body>
if 'irAProximosPartidos' in html:
    print("⚠️  El JS de partidos públicos ya existe, saltando JS.")
else:
    # Insertar antes de </body>
    html = html.replace('</body>', JS_NUEVO + '\n</body>')
    print("✅ JS agregado")

# 4. MODIFICAR EL FLUJO POST-LOGIN: reemplazar showScreen('swipe') por showScreen('home-screen') en doLogin y window.onload
#    Solo cuando viene de un login exitoso (no cuando viene de perfil-padel)

# En doLogin: después de verificar perfil, ir a home
# Patrón actual en doLogin:
old_doLogin_swipe = "    await cargarJugadoresPadel();\n    showScreen('swipe');\n  }catch(err){"
new_doLogin_home  = "    await cargarJugadoresPadel();\n    mostrarHome();\n  }catch(err){"
if old_doLogin_swipe in html:
    html = html.replace(old_doLogin_swipe, new_doLogin_home)
    print("✅ doLogin → home-screen")
else:
    print("⚠️  No se encontró el patrón exacto de doLogin, revisando...")

# En window.onload: después de verificarPerfilPadel → si tiene perfil, ir a home
old_onload_swipe = "      } else {\n        await cargarJugadoresPadel();\n        showScreen('swipe');\n      }"
new_onload_home  = "      } else {\n        await cargarJugadoresPadel();\n        mostrarHome();\n      }"
if old_onload_swipe in html:
    html = html.replace(old_onload_swipe, new_onload_home)
    print("✅ onload → home-screen")
else:
    print("⚠️  No se encontró el patrón exacto de onload, revisando...")
    # Buscar con regex más flexible
    patron = r"(await cargarJugadoresPadel\(\);\s*showScreen\('swipe'\);)"
    matches = re.findall(patron, html)
    print(f"   Matches encontrados: {matches}")

# 5. Agregar función mostrarHome() en el JS
if 'function mostrarHome' not in html:
    fn_mostrar_home = """
function mostrarHome() {
  if (usuario) {
    const nombre = usuario.nombre ? usuario.nombre.split(' ')[0] : '';
    const el = document.getElementById('home-saludo');
    if (el && nombre) el.textContent = `¡Hola, ${nombre}! ¿Qué querés hacer hoy? 🎾`;
  }
  showScreen('home-screen');
}
"""
    html = html.replace('function irAProximosPartidos()', fn_mostrar_home + '\nfunction irAProximosPartidos()')
    print("✅ función mostrarHome() agregada")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n🎾 padel-connect.html modificado correctamente.")
print("Próximo paso: git add public/padel-connect.html && git commit -m 'feat: home post-login + próximos partidos públicos' && git push")
