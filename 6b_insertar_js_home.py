ARCHIVO = 'public/padel-connect.html'

JS = """
<script>
function mostrarHome() {
  if (usuario) {
    const nombre = usuario.nombre ? usuario.nombre.split(' ')[0] : '';
    const el = document.getElementById('home-saludo');
    if (el && nombre) el.textContent = '¡Hola, ' + nombre + '! ¿Qué querés hacer hoy? 🎾';
  }
  showScreen('home-screen');
}

function irAProximosPartidos() {
  showScreen('proximos-partidos');
  cargarPartidosPublicos();
}

function irAMiPerfil() {
  showScreen('swipe');
  setTimeout(() => switchTab('jugar', document.querySelector('.swipe-tab')), 100);
}

let _ppInterval = null;

async function cargarPartidosPublicos() {
  const el = document.getElementById('pp-list');
  if (!el) return;
  el.innerHTML = '<div style="display:flex;justify-content:center;padding:40px"><div class="loader"></div></div>';
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
      el.innerHTML = '<div style="text-align:center;padding:48px 16px"><div style="font-size:48px;margin-bottom:12px">🎾</div><div style="font-family:Bebas Neue,cursive;font-size:22px;margin-bottom:8px">No hay partidos disponibles</div><p style="color:var(--muted);font-size:13px">Probá otra zona o categoría.</p></div>';
      return;
    }
    el.innerHTML = partidos.map(p => renderPartidoPublico(p)).join('');
  } catch(err) {
    el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted)">Error: ' + err.message + '</div>';
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

  const slots = Array.from({length: cupos}, (_, i) => {
    const j = jugadores[i];
    if (j) {
      return '<div class="cupo-slot ocupado" title="' + j.nombre + '">' +
        (j.foto_url ? '<img src="' + j.foto_url + '" alt="' + j.nombre + '">' : '<span style="font-size:14px">😊</span>') +
        '</div>';
    }
    return '<div class="cupo-slot"><span style="color:rgba(255,255,255,.2);font-size:18px">+</span></div>';
  }).join('');

  let btnHTML = '';
  if (lleno && !yoInscripto) {
    btnHTML = '<button class="btn-inscribirse" disabled>Partido completo — ' + cupos + '/' + cupos + '</button>';
  } else if (yoInscripto) {
    btnHTML = '<button class="btn-inscribirse inscripto" onclick="desinscribirsePartido(\'' + p.id + '\')">✓ Inscripto — Cancelar</button>';
  } else {
    btnHTML = '<button class="btn-inscribirse" onclick="inscribirsePartido(\'' + p.id + '\')">⚡ Unirme — ' + inscriptos + '/' + cupos + '</button>';
  }

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fp  = new Date(p.fecha + 'T00:00:00'); fp.setHours(0,0,0,0);
  const dias = Math.round((fp - hoy) / 86400000);
  const urgencia = dias === 0 ? '🔴 ¡Hoy!' : dias === 1 ? '🟡 Mañana' : '🟢 En ' + dias + ' días';

  return '<div class="partido-pub-card' + (lleno && !yoInscripto ? ' lleno' : '') + '" id="ppc-' + p.id + '">' +
    '<div class="partido-pub-top"><div><div class="partido-pub-zona">📍 ' + p.zona + ' · ' + urgencia + '</div></div>' +
    '<span class="partido-pub-cat">' + formatCategoria(p.categoria) + '</span></div>' +
    '<div class="partido-pub-fecha">📅 ' + fecha + ' &nbsp; 🕐 ' + hora + 'hs</div>' +
    '<div class="partido-pub-info">' + (p.lugar ? '🏟️ ' + p.lugar + '<br>' : '') + (p.descripcion || '') + '</div>' +
    (p.costo ? '<span class="partido-pub-costo">💰 ' + p.costo + '</span>' : '') +
    '<div class="partido-pub-cupos">' + slots + '<span class="cupo-label">' + inscriptos + '/' + cupos + '</span></div>' +
    btnHTML + '</div>';
}

function formatCategoria(cat) {
  const map = {octava:'8va cat.',septima:'7ma cat.',sexta:'6ta cat.',quinta:'5ta cat.',cuarta:'4ta cat.',tercera:'3ra cat.',segunda:'2da cat.',primera:'1ra cat.'};
  return map[cat] || cat;
}

async function inscribirsePartido(partidoId) {
  if (!usuario) { alert('Tenés que iniciar sesión'); return; }
  if (!perfilPadel) { alert('Completá tu perfil primero'); showScreen('perfil-padel'); return; }
  showLoader('Inscribiendo...');
  try {
    const data = await api('/padel/partidos-publicos/' + partidoId + '/inscribirse', { method:'POST', body:'{}' });
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
    await api('/padel/partidos-publicos/' + partidoId + '/desinscribirse', { method:'DELETE', body:'{}' });
    await _renderPartidosPublicos();
  } catch(err) { alert(err.message); }
  finally { hideLoader(); }
}
</script>
"""

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

if 'function mostrarHome' in html:
    print("Ya existe, no se modificó")
else:
    html = html.replace('</body>', JS + '\n</body>')
    with open(ARCHIVO, 'w', encoding='utf-8') as f:
        f.write(html)
    print("✅ JS insertado correctamente")
