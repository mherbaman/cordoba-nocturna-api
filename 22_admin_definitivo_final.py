ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Total lineas:", len(lines))

# Buscar linea exacta del cierre del main (</div> antes de <!-- MODAL -->)
modal_idx = None
for i, l in enumerate(lines):
    if '<!-- MODAL -->' in l:
        modal_idx = i
        break

print("MODAL en linea:", modal_idx + 1)
print("Contexto:")
for i in range(modal_idx-5, modal_idx+2):
    print(f"  L{i+1}: {repr(lines[i])}")

# La seccion va ANTES de la linea del MODAL
SECCION = """
      <div class="page" id="page-partidos-pub">
        <div class="page-title">PARTIDOS ⚡</div>
        <div class="page-sub">Crea partidos para que los jugadores se inscriban desde PadelConnect.</div>
        <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:16px;padding:20px;margin-bottom:24px">
          <div style="font-family:'Bebas Neue',cursive;font-size:20px;margin-bottom:16px;color:var(--green)">Nuevo partido</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Zona *</label>
              <select id="np-zona" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
                <option value="">Zona...</option>
                <option>Centro</option><option>Nueva Cordoba</option><option>Guemes</option>
                <option>Alberdi</option><option>General Paz</option><option>Cerro de las Rosas</option>
                <option>Villa Allende</option><option>Arguello</option><option>Urca</option>
                <option>Jardin</option><option>Maipu</option><option>Villa Belgrano</option>
                <option>La Calera</option><option>Unquillo</option><option>Mendiolaza</option>
                <option>Salsipuedes</option>
              </select></div>
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Categoria *</label>
              <select id="np-cat" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
                <option value="">Categoria...</option>
                <option value="octava">8va</option><option value="septima">7ma</option>
                <option value="sexta">6ta</option><option value="quinta">5ta</option>
                <option value="cuarta">4ta</option><option value="tercera">3ra</option>
                <option value="segunda">2da</option><option value="primera">1ra</option>
              </select></div>
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Fecha *</label>
              <input type="date" id="np-fecha" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;color-scheme:dark"></div>
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Hora *</label>
              <input type="time" id="np-hora" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;color-scheme:dark"></div>
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Lugar</label>
              <input type="text" id="np-lugar" placeholder="Ej: Club Atletico" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px"></div>
            <div><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Costo</label>
              <input type="text" id="np-costo" placeholder="Ej: $3.000 c/u" style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px"></div>
          </div>
          <div style="margin-bottom:14px"><label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:5px">Descripcion</label>
            <input type="text" id="np-desc" placeholder="Info extra..." style="width:100%;padding:10px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px"></div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <label style="color:rgba(255,255,255,.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Cupos:</label>
            <select id="np-cupos" style="padding:9px 14px;background:#1a0030;border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px">
              <option value="4" selected>4 jugadores</option><option value="2">2 jugadores</option>
            </select></div>
          <button onclick="crearPartidoPublico()" style="background:linear-gradient(135deg,#16a34a,#22c55e);border:none;color:#fff;padding:13px 28px;border-radius:50px;font-size:14px;font-weight:700;cursor:pointer">Crear partido</button>
          <div id="np-msg" style="display:none;margin-top:12px;padding:10px 14px;border-radius:10px;font-size:13px"></div>
        </div>
        <div style="font-family:'Bebas Neue',cursive;font-size:18px;margin-bottom:12px">Partidos creados</div>
        <div id="admin-partidos-pub-list"><p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Cargando...</p></div>
      </div>
"""

seccion_lines = [l + '\n' for l in SECCION.split('\n')]

# Insertar antes del MODAL (que esta dentro del main)
# Primero ver si el MODAL esta dentro o fuera del main
# Insertar en modal_idx
lines = lines[:modal_idx] + seccion_lines + lines[modal_idx:]

# Agregar boton en sidebar despues de Reportes
html = ''.join(lines)
html = html.replace(
    "onclick=\"navTo('reportes',this)\"><span class=\"icon\">📊</span> Reportes</button>",
    "onclick=\"navTo('reportes',this)\"><span class=\"icon\">📊</span> Reportes</button>\n      <button class=\"nav-item\" onclick=\"navTo('partidos-pub',this)\"><span class=\"icon\">⚡</span> Partidos</button>"
)

# Hook navTo
html = html.replace(
    "if (page === 'promo-principal') cargarPromoPrincipal();\n}",
    "if (page === 'promo-principal') cargarPromoPrincipal();\n  if (page === 'partidos-pub') cargarPartidosPubAdmin();\n}"
)

# CSS page.active
if '.page.active' not in html:
    html = html.replace('.page { display:none; }', '.page { display:none; }\n.page.active { display:block; }')

# JS
JS = """
<script>
async function cargarPartidosPubAdmin() {
  const el = document.getElementById('admin-partidos-pub-list');
  if (!el) return;
  el.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">Cargando...</p>';
  try {
    const data = await apiAdmin('/padel/partidos-publicos');
    if (!data.length) { el.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:20px">No hay partidos.</p>'; return; }
    const catMap = {octava:'8va',septima:'7ma',sexta:'6ta',quinta:'5ta',cuarta:'4ta',tercera:'3ra',segunda:'2da',primera:'1ra'};
    el.innerHTML = data.map(p => {
      const ins = parseInt(p.inscriptos)||0;
      const cup = parseInt(p.cupos)||4;
      const fs = p.fecha ? p.fecha.toString().substring(0,10) : '';
      const fecha = fs ? new Date(fs+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short',day:'numeric',month:'short'}) : 'Sin fecha';
      const hora = p.hora ? p.hora.toString().substring(0,5) : '';
      const jugs = (p.jugadores||[]).map(j => '<span style="background:rgba(34,197,94,.1);padding:3px 8px;border-radius:50px;font-size:11px;color:rgba(255,255,255,.7)">'+j.nombre+'</span>').join(' ');
      const pid = p.id;
      return '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(34,197,94,.15);border-radius:14px;padding:16px;margin-bottom:10px">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
        '<div><div style="font-weight:700;font-size:15px">'+p.zona+' - '+(catMap[p.categoria]||p.categoria)+' cat.</div>'+
        '<div style="color:rgba(255,255,255,.45);font-size:12px;margin-top:2px">'+fecha+' '+hora+'hs'+(p.lugar?' - '+p.lugar:'')+(p.costo?' - '+p.costo:'')+'</div></div>'+
        '<div style="font-family:Bebas Neue,cursive;font-size:24px;color:'+(ins>=cup?'#22c55e':'#fbbf24')+'">'+ins+'/'+cup+'</div></div>'+
        (jugs?'<div style="margin-bottom:10px">'+jugs+'</div>':'')+
        '<button onclick="eliminarPartidoPub(\''+pid+'\')" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:7px 16px;border-radius:50px;font-size:12px;font-weight:700;cursor:pointer">Eliminar</button></div>';
    }).join('');
  } catch(e) { el.innerHTML = '<p style="color:red;padding:12px">Error: '+e.message+'</p>'; }
}

async function crearPartidoPublico() {
  const zona=document.getElementById('np-zona').value;
  const cat=document.getElementById('np-cat').value;
  const fecha=document.getElementById('np-fecha').value;
  const hora=document.getElementById('np-hora').value;
  const lugar=document.getElementById('np-lugar').value.trim();
  const costo=document.getElementById('np-costo').value.trim();
  const desc=document.getElementById('np-desc').value.trim();
  const cupos=parseInt(document.getElementById('np-cupos').value)||4;
  const msgEl=document.getElementById('np-msg');
  if (!zona||!cat||!fecha||!hora) {
    msgEl.textContent='Zona, categoria, fecha y hora son obligatorios';
    msgEl.style.cssText='display:block;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171';
    return;
  }
  try {
    await apiAdmin('/padel/partidos-publicos',{method:'POST',body:JSON.stringify({zona,categoria:cat,fecha,hora,lugar,costo,descripcion:desc,cupos})});
    msgEl.textContent='Partido creado';
    msgEl.style.cssText='display:block;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:#22c55e';
    ['np-zona','np-cat','np-fecha','np-hora','np-lugar','np-costo','np-desc'].forEach(id=>{document.getElementById(id).value='';});
    setTimeout(()=>msgEl.style.display='none',3000);
    cargarPartidosPubAdmin();
  } catch(e) {
    msgEl.textContent='Error: '+e.message;
    msgEl.style.cssText='display:block;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171';
  }
}

async function eliminarPartidoPub(id) {
  if (!confirm('Eliminar este partido?')) return;
  try { await apiAdmin('/padel/partidos-publicos/'+id,{method:'DELETE'}); cargarPartidosPubAdmin(); }
  catch(e) { alert(e.message); }
}
</script>
"""
html = html.replace('</body>', JS + '</body>')

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)

print("Verificando posicion final:")
for i, l in enumerate(html.split('\n')):
    if 'page-partidos-pub' in l or '<!-- MODAL' in l or 'class="main"' in l:
        print(f"  L{i+1}: {l.strip()[:70]}")
