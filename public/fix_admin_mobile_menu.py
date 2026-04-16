#!/usr/bin/env python3
"""
fix_admin_mobile_menu.py
Agrega hamburger menu para mobile en admin.html.
- Botón hamburger fijo arriba a la izquierda
- Sidebar se abre como drawer con overlay
- Se cierra al tocar afuera o al navegar
"""

import sys

FILE = "admin.html"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX 1: reemplazar media query para agregar estilos mobile ─────────
OLD_CSS = """@media (max-width:768px) {
  .sidebar { display:none; }
  .main { margin-left:0; }
  .modal-grid { grid-template-columns:1fr; }
}"""

NEW_CSS = """@media (max-width:768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform .3s ease;
    z-index: 200;
  }
  .sidebar.open { transform: translateX(0); }
  .main { margin-left:0; }
  .modal-grid { grid-template-columns:1fr; }
}
.hamburger {
  display:none;
  position:fixed;
  top:14px;
  left:14px;
  z-index:300;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:10px;
  width:40px;
  height:40px;
  align-items:center;
  justify-content:center;
  font-size:18px;
  cursor:pointer;
  color:#fff;
}
.drawer-overlay {
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.6);
  z-index:199;
  backdrop-filter:blur(2px);
}
.drawer-overlay.show { display:block; }
@media (max-width:768px) {
  .hamburger { display:flex; }
  .main { padding:20px 16px; padding-top:70px; }
}"""

if OLD_CSS in content:
    content = content.replace(OLD_CSS, NEW_CSS, 1)
    print("FIX 1 OK: estilos mobile hamburger agregados")
else:
    print("FIX 1 SKIP: media query no encontrada exacta")

# ── FIX 2: agregar botón hamburger y overlay antes del #app ───────────
OLD_APP = '<div id="app">'

NEW_APP = """<button class="hamburger" onclick="toggleSidebar()" id="hamburger-btn">☰</button>
<div class="drawer-overlay" id="drawer-overlay" onclick="cerrarSidebar()"></div>
<div id="app">"""

if OLD_APP in content:
    content = content.replace(OLD_APP, NEW_APP, 1)
    print("FIX 2 OK: botón hamburger y overlay agregados")
else:
    print("FIX 2 SKIP: #app no encontrado")

# ── FIX 3: agregar funciones JS de sidebar mobile ────────────────────
OLD_NAV = "function navTo(page, btn) {"

NEW_NAV = """function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('drawer-overlay');
  const btn     = document.getElementById('hamburger-btn');
  const isOpen  = sidebar.classList.contains('open');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  btn.textContent = isOpen ? '☰' : '✕';
}

function cerrarSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('drawer-overlay');
  const btn     = document.getElementById('hamburger-btn');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  btn.textContent = '☰';
}

function navTo(page, btn) {"""

if "function navTo(page, btn) {" in content:
    content = content.replace(OLD_NAV, NEW_NAV, 1)
    print("FIX 3 OK: funciones toggleSidebar/cerrarSidebar agregadas")
else:
    print("FIX 3 SKIP: navTo no encontrado")

# ── FIX 4: cerrar sidebar al navegar en mobile ────────────────────────
OLD_NAVTO = """  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');"""

NEW_NAVTO = """  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  cerrarSidebar();"""

if OLD_NAVTO in content:
    content = content.replace(OLD_NAVTO, NEW_NAVTO, 1)
    print("FIX 4 OK: cerrarSidebar() al navegar agregado")
else:
    print("FIX 4 SKIP: bloque navTo interno no encontrado")

if content == original:
    print("\nERROR: sin cambios.")
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nArchivo guardado: {FILE}")

print("\n── Verificaciones ──")
checks = [
    ("toggleSidebar",    3, "toggleSidebar: definición + 2 usos"),
    ("cerrarSidebar",    3, "cerrarSidebar: definición + 2 usos"),
    ("drawer-overlay",   3, "drawer-overlay: CSS + HTML + JS"),
    ("hamburger",        4, "hamburger: CSS + HTML + btn + JS"),
]
all_ok = True
for term, expected, label in checks:
    count = content.count(term)
    ok = count == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {label} (encontrado: {count}, esperado: {expected})")
    if not ok:
        all_ok = False

print("\nTodo OK ✅" if all_ok else "\nAlgunos checks fallaron ⚠️")
