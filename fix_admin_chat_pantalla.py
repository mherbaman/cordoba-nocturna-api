archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/admin.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

# Fix 1 — checkbox estático promo principal
viejo1 = """                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-matches" checked style="accent-color:var(--pink)"> 🔥 Matches
                </label>
              </div>"""

nuevo1 = """                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-matches" checked style="accent-color:var(--pink)"> 🔥 Matches
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-chat" style="accent-color:var(--pink)"> 💬 Chat
                </label>
              </div>"""

# Fix 2 — array dinámico modal sponsors
viejo2 = "          ${['splash','qr','swipe','matches'].map(p => {\n            const labels = {splash:'🌙 Inicio',qr:'📱 QR',swipe:'❤️ Swipe',matches:'🔥 Matches'};\n            const pantallas = (s.pantalla||'todas') === 'todas' ? ['splash','qr','swipe','matches'] : (s.pantalla||'').split(',').map(x=>x.trim());"

nuevo2 = "          ${['splash','qr','swipe','matches','chat'].map(p => {\n            const labels = {splash:'🌙 Inicio',qr:'📱 QR',swipe:'❤️ Swipe',matches:'🔥 Matches',chat:'💬 Chat'};\n            const pantallas = (s.pantalla||'todas') === 'todas' ? ['splash','qr','swipe','matches','chat'] : (s.pantalla||'').split(',').map(x=>x.trim());"

# Fix 3 — guardado sponsors
viejo3 = "  const pantallas = ['splash','qr','swipe','matches'].filter(p => document.getElementById(`sp-p-${p}`)?.checked);\n  body.pantalla = pantallas.length === 4 || pantallas.length === 0 ? 'todas' : pantallas.join(',');"

nuevo3 = "  const pantallas = ['splash','qr','swipe','matches','chat'].filter(p => document.getElementById(`sp-p-${p}`)?.checked);\n  body.pantalla = pantallas.length === 5 || pantallas.length === 0 ? 'todas' : pantallas.join(',');"

# Fix 4 — guardado promo principal
viejo4 = "  const pantallas = ['splash','qr','swipe','matches'].filter(p => document.getElementById(`pp-p-${p}`)?.checked);\n  const pantalla  = pantallas.length === 4 || pantallas.length === 0 ? 'todas' : pantallas.join(',');"

nuevo4 = "  const pantallas = ['splash','qr','swipe','matches','chat'].filter(p => document.getElementById(`pp-p-${p}`)?.checked);\n  const pantalla  = pantallas.length === 5 || pantallas.length === 0 ? 'todas' : pantallas.join(',');"

ok1 = viejo1 in contenido
ok2 = viejo2 in contenido
ok3 = viejo3 in contenido
ok4 = viejo4 in contenido

if ok1: contenido = contenido.replace(viejo1, nuevo1)
if ok2: contenido = contenido.replace(viejo2, nuevo2)
if ok3: contenido = contenido.replace(viejo3, nuevo3)
if ok4: contenido = contenido.replace(viejo4, nuevo4)

with open(archivo, 'w', encoding='utf-8') as f:
    f.write(contenido)

print(f"{'✅' if ok1 else '❌'} Fix 1 — checkbox promo principal")
print(f"{'✅' if ok2 else '❌'} Fix 2 — array modal sponsors")
print(f"{'✅' if ok3 else '❌'} Fix 3 — guardado sponsors")
print(f"{'✅' if ok4 else '❌'} Fix 4 — guardado promo principal")
