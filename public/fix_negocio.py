FILE = '/etc/easypanel/projects/cordoba-nocturna/api/code/public/negocio.html'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Eliminar la línea duplicada de cargarCanchas en navTo
content = content.replace(
    "  if (page === 'canchas')   cargarCanchas();\n  if (page === 'reservas')  cargarReservas();\n  if (page === 'canchas')   cargarCanchas();\n  if (page === 'reservas')  cargarReservas();",
    "  if (page === 'canchas')   cargarCanchas();\n  if (page === 'reservas')  cargarReservas();"
)

# 2. Insertar modal-disponibilidad antes del modal-overlay
modal_disp = '''<!-- MODAL DISPONIBILIDAD -->
<div id="modal-disponibilidad" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:500;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
  <div style="background:#0f0019;border:1px solid rgba(34,197,94,.25);border-radius:20px;padding:28px;width:90%;max-width:440px;max-height:90vh;overflow-y:auto">
    <div style="font-family:\'Bebas Neue\',cursive;font-size:28px;letter-spacing:1px;margin-bottom:20px" id="modal-disp-title">Nuevo turno</div>
    <div id="modal-disp-body"></div>
  </div>
</div>

'''

content = content.replace('<!-- MODAL ABRIR NOCHE -->', modal_disp + '<!-- MODAL ABRIR NOCHE -->')

with open(FILE, 'w') as f:
    f.write(content)

print('✅ Fix aplicado')
