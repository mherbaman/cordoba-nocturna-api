#!/usr/bin/env python3
"""
fix_promo_principal.py
Limpia la sección page-promo-principal de admin.html:
  1. Reemplaza el bloque "Apps Connect donde aparece" (template literal roto) por HTML estático correcto
  2. Elimina la sección "¿En qué Connect aparece?" duplicada (con festival en vez de padel)
  3. Reemplaza el bloque "Pantallas donde aparece" (template literal roto) por HTML estático correcto
  4. Elimina los inputs duplicados pp-imagen-url y pp-url-promo (los segundos, con labels 🖼️ y 🔗)
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1: Dentro del bloque pp-descripcion, quitar los inputs de imagen_url/url_promo
# que están pegados sin pertenecer ahí
# ─────────────────────────────────────────────────────────────────────────────

OLD_1 = '''            <div class="full">
              <input class="input-field" id="pp-descripcion" placeholder="Mandá tu código y retirá en la barra">
              <label class="field-label">URL imagen de la promo (opcional)</label>
              <input class="input-field" id="pp-imagen-url" type="url" placeholder="https://tuhosting.com/promo.jpg">
              <label class="field-label">URL de la promoción (opcional)</label>
              <input class="input-field" id="pp-url-promo" type="url" placeholder="https://tusite.com/promo">
            </div>'''

NEW_1 = '''            <div class="full">
              <input class="input-field" id="pp-descripcion" placeholder="Mandá tu código y retirá en la barra">
            </div>'''

if OLD_1 in content:
    content = content.replace(OLD_1, NEW_1, 1)
    print("FIX 1 OK: inputs duplicados de imagen-url/url-promo dentro de descripcion eliminados")
else:
    print("FIX 1 SKIP: bloque no encontrado exacto")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2: Reemplazar template literal "Apps Connect" (con festival) por HTML estático (con padel)
# ─────────────────────────────────────────────────────────────────────────────

OLD_2 = "              <div style=\"display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;\">\n                ${['córdoba','fiesta','sunset','festival','gym','shopping','todas'].map(a => {\n                  const labels = {córdoba:'🎧 CórdobaConnect',fiesta:'💍 FiestaConnect',sunset:'🌅 SunsetConnect',festival:'🎪 FestivalConnect',gym:'💪 GymConnect',todas:'✅ Todas'};\n                  return `<label style=\"display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;\">\n                    <input type=\"checkbox\" id=\"pp-a-${a}\" ${a==='todas'?'checked':''} style=\"accent-color:var(--pink)\"> ${labels[a]}\n                  </label>`;\n                }).join('')}\n              </div>"

NEW_2 = """              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-córdoba" style="accent-color:var(--pink)"> 🎧 CórdobaConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-fiesta" style="accent-color:var(--pink)"> 💍 FiestaConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-sunset" style="accent-color:var(--pink)"> 🌅 SunsetConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-padel" style="accent-color:var(--pink)"> 🎾 PadelConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-gym" style="accent-color:var(--pink)"> 💪 GymConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-shopping" style="accent-color:var(--pink)"> 🛍️ ShoppingConnect
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:12px;">
                  <input type="checkbox" id="pp-a-todas" checked style="accent-color:var(--pink)"> ✅ Todas
                </label>
              </div>"""

if OLD_2 in content:
    content = content.replace(OLD_2, NEW_2, 1)
    print("FIX 2 OK: template literal Apps Connect reemplazado (festival -> padel, HTML estático)")
else:
    print("FIX 2 SKIP: template literal Apps Connect no encontrado exacto")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3: Eliminar la sección "¿En qué Connect aparece?" duplicada completa
# (incluye sp-connects-wrap y el template literal de pantallas)
# ─────────────────────────────────────────────────────────────────────────────

OLD_3 = '''            <div class="full">
              <label class="field-label">¿En qué Connect aparece?</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px" id="sp-connects-wrap">
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.2);border-radius:50px;cursor:pointer;font-size:12px"><input type="checkbox" name="sp-connect" value="córdoba" style="accent-color:var(--pink)"> 🎧 CórdobaConnect</label>
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.2);border-radius:50px;cursor:pointer;font-size:12px"><input type="checkbox" name="sp-connect" value="fiesta" style="accent-color:var(--pink)"> 💍 FiestaConnect</label>
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.2);border-radius:50px;cursor:pointer;font-size:12px"><input type="checkbox" name="sp-connect" value="sunset" style="accent-color:var(--pink)"> 🌅 SunsetConnect</label>
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.2);border-radius:50px;cursor:pointer;font-size:12px"><input type="checkbox" name="sp-connect" value="festival" style="accent-color:var(--pink)"> 🎪 FestivalConnect</label>
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.2);border-radius:50px;cursor:pointer;font-size:12px"><input type="checkbox" name="sp-connect" value="gym" style="accent-color:var(--pink)"> 💪 GymConnect</label>
                <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid rgba(255,45,120,.15);border-radius:50px;cursor:pointer;font-size:12px;background:rgba(255,45,120,.05)"><input type="checkbox" name="sp-connect" value="todos" style="accent-color:var(--pink)" onchange="toggleTodosConnect(this)"> ✅ Todas</label>
              </div>
              <label class="field-label">Pantallas donde aparece</label>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${['splash','qr','swipe','matches'].map(p => {
                  const labels = {splash:'🌙 Inicio',qr:'📱 QR',swipe:'❤️ Swipe',matches:'🔥 Matches'};
                  return `<label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                    <input type="checkbox" id="pp-p-${p}" checked style="accent-color:var(--pink)"> ${labels[p]}
                  </label>`;
                }).join('')}
              </div>
            </div>'''

NEW_3 = '''            <div class="full">
              <label class="field-label">Pantallas donde aparece</label>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-splash" checked style="accent-color:var(--pink)"> 🌙 Inicio
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-qr" checked style="accent-color:var(--pink)"> 📱 QR
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-swipe" checked style="accent-color:var(--pink)"> ❤️ Swipe
                </label>
                <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,45,120,.2);padding:8px 14px;border-radius:50px;cursor:pointer;font-size:13px;">
                  <input type="checkbox" id="pp-p-matches" checked style="accent-color:var(--pink)"> 🔥 Matches
                </label>
              </div>
            </div>'''

if OLD_3 in content:
    content = content.replace(OLD_3, NEW_3, 1)
    print("FIX 3 OK: sección duplicada '¿En qué Connect aparece?' + template literal pantallas reemplazado")
else:
    print("FIX 3 SKIP: sección duplicada no encontrada exacta")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 4: Eliminar los inputs duplicados con labels 🖼️ y 🔗 al final del modal-grid
# ─────────────────────────────────────────────────────────────────────────────

OLD_4 = '''            <div class="full">
              <label class="field-label">🖼️ URL de imagen de la promo</label>
              <input class="input-field" id="pp-imagen-url" placeholder="https://tuhosting.com/promo.jpg">
            </div>
            <div class="full">
              <label class="field-label">🔗 URL específica de la promo (opcional)</label>
              <input class="input-field" id="pp-url-promo" placeholder="https://tulink.com/promo">
              <div style="color:var(--muted);font-size:11px;margin-top:4px;">Si lo completás, el botón de la promo abre esta URL además del WhatsApp.</div>
            </div>'''

if OLD_4 in content:
    content = content.replace(OLD_4, '', 1)
    print("FIX 4 OK: inputs duplicados 🖼️ pp-imagen-url y 🔗 pp-url-promo eliminados")
else:
    print("FIX 4 SKIP: inputs duplicados 🖼️/🔗 no encontrados exactos")

# ─────────────────────────────────────────────────────────────────────────────
# Guardar
# ─────────────────────────────────────────────────────────────────────────────

if content == original:
    print("\nERROR: No se realizó ningún cambio. Verificá los bloques manualmente.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\narchivo guardado: {FILE}")

# ── Verificaciones finales ────────────────────────────────────────────────────
print("\n── Verificaciones finales ──")

checks = [
    ('id="pp-imagen-url"',  1, "pp-imagen-url aparece 1 vez"),
    ('id="pp-url-promo"',   1, "pp-url-promo aparece 1 vez"),
    ('sp-connects-wrap',    0, "sp-connects-wrap eliminado"),
    ('name="sp-connect"',   0, "name=sp-connect eliminado"),
    ('"festival"',          0, "festival eliminado de pp checkboxes"),
    ('id="pp-a-padel"',     1, "pp-a-padel presente"),
    ('id="pp-p-splash"',    1, "pp-p-splash presente"),
    ('id="pp-p-matches"',   1, "pp-p-matches presente"),
    ('id="pp-p-qr"',        1, "pp-p-qr presente"),
    ('id="pp-p-swipe"',     1, "pp-p-swipe presente"),
]

all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    icon = "OK" if ok else "FAIL"
    print(f"  [{icon}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

if all_ok:
    print("\nTodos los checks pasaron correctamente.")
else:
    print("\nAlgunos checks fallaron. Revisá manualmente.")
