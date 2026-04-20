ARCHIVO = 'public/padel-connect.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Agregar botón ⚡ en el header del swipe, junto al botón de matches
viejo = '<button class="matches-btn" id="matches-header-btn" onclick="showScreen(\'matches-screen\')">'
nuevo = '''<button onclick="mostrarHome()" style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#fbbf24;padding:7px 14px;border-radius:50px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">⚡ Partidos</button>
    <button class="matches-btn" id="matches-header-btn" onclick="showScreen('matches-screen')">'''

if viejo in html:
    html = html.replace(viejo, nuevo)
    print("✅ Botón ⚡ Partidos agregado al header")
else:
    print("❌ No encontró el header de matches")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
