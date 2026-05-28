with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

OPCIONES = '''
      <option value="">📍 Todas las zonas</option>
      <option value="CBA Centro">CBA Centro</option>
      <option value="CBA Norte">CBA Norte</option>
      <option value="CBA Sur">CBA Sur</option>
      <option value="CBA Este">CBA Este</option>
      <option value="CBA Oeste">CBA Oeste</option>
      <option value="INTERIOR RIOIV">Interior RIV</option>'''

# 1. filtro-zona jugadores
content = content.replace(
    '      <select id="filtro-zona" onchange="cargarJugadoresPadel()" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(34,197,94,.2);color:#fff;padding:10px 14px;border-radius:50px;font-size:13px;outline:none;font-family:DM Sans,sans-serif">\n        <option value="">Todas las zonas</option>\n      </select>',
    '      <select id="filtro-zona" onchange="cargarJugadoresPadel()" style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(34,197,94,.2);color:#fff;padding:10px 14px;border-radius:50px;font-size:13px;outline:none;font-family:DM Sans,sans-serif">' + OPCIONES + '\n      </select>'
)

# 2. pp-filtro-zona partidos publicos
content = content.replace(
    '    <select class="pp-filtro" id="pp-filtro-zona" onchange="cargarPartidosPublicos()" style="color-scheme:dark;background:#030d06">\n      <option value="">📍 Todas las zonas</option>\n    </select>',
    '    <select class="pp-filtro" id="pp-filtro-zona" onchange="cargarPartidosPublicos()" style="color-scheme:dark;background:#030d06">' + OPCIONES + '\n    </select>'
)

# 3. pp-filtro-zona-2 proximos
content = content.replace(
    '      <select class="pp-filtro" id="pp-filtro-zona-2" onchange="cargarProximosSwipe()" style="color-scheme:dark;background:#030d06;flex:1">\n      <option value="">📍 Todas las zonas</option>',
    '      <select class="pp-filtro" id="pp-filtro-zona-2" onchange="cargarProximosSwipe()" style="color-scheme:dark;background:#030d06;flex:1">' + OPCIONES
)

# 4. clubes-filtro-zona
content = content.replace(
    '    <select id="clubes-filtro-zona" onchange="cargarClubes()" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;font-size:13px;margin-bottom:12px">\n      <option value="">📍 Todas las zonas</option>\n    </select>',
    '    <select id="clubes-filtro-zona" onchange="cargarClubes()" style="width:100%;padding:10px;background:#0a0a0a;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;font-size:13px;margin-bottom:12px">' + OPCIONES + '\n    </select>'
)

# 5. Eliminar el JS que llenaba el select con zonas dinamicas viejas
content = content.replace(
    "    const zonas = new Set();\n    jugadores.forEach(j => { if(j.zona) j.zona.split(',').forEach(z => zonas.add(z.trim())); });\n    const sel = document.getElementById('filtro-zona');\n    zonas.forEach(z => { const o = document.createElement('option'); o.value = z; o.textContent = z; sel.appendChild(o); });",
    "    // zonas ya fijas en el HTML"
)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
