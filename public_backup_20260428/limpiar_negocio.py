FILE = '/etc/easypanel/projects/cordoba-nocturna/api/code/public/negocio.html'

with open(FILE, 'r') as f:
    lines = f.readlines()

# Bloque correcto de pages canchas+reservas (una sola vez, dentro del main)
pages_padel = '''
    <!-- CANCHAS -->
    <div class="page" id="page-canchas">
      <div class="section-hdr">
        <div class="section-title">🎾 Disponibilidad de canchas</div>
        <button class="btn-export" onclick="abrirModalDisponibilidad()">+ Agregar turno</button>
      </div>
      <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:14px;padding:16px;margin-bottom:20px;font-size:13px;color:rgba(255,255,255,.75)">
        📌 Configurá los turnos disponibles por día y horario. Los jugadores podrán reservar desde PadelConnect.
      </div>
      <div id="canchas-list"><div class="loader"></div></div>
    </div>

    <!-- RESERVAS -->
    <div class="page" id="page-reservas">
      <div class="section-hdr">
        <div class="section-title">📋 Reservas recibidas</div>
        <div style="display:flex;gap:8px;">
          <button class="btn-sm btn-edit" onclick="filtrarReservas(\'pendiente\')" id="f-pendiente" style="background:rgba(251,191,36,.15);color:#fbbf24;border-color:rgba(251,191,36,.3)">⏳ Pendientes</button>
          <button class="btn-sm btn-edit" onclick="filtrarReservas(\'confirmado\')" id="f-confirmada">✅ Confirmadas</button>
          <button class="btn-sm btn-edit" onclick="filtrarReservas(\'todas\')" id="f-todas">📋 Todas</button>
        </div>
      </div>
      <div id="reservas-list"><div class="loader"></div></div>
    </div>

  </div>
'''

# Conservar 1-307, insertar pages, saltar a 414, conservar 414-877, saltar 878-1055, conservar resto
result = []
result.extend(lines[0:307])          # líneas 1-307 (índice 0-306)
result.append(pages_padel)
result.extend(lines[413:877])        # líneas 414-877 (modal-overlay + JS primera copia)
result.extend(lines[1055:])          # líneas 1056-fin (cargarStats + cierre)

with open(FILE, 'w') as f:
    f.writelines(result)

print(f"✅ Listo. Líneas originales: {len(lines)} → nuevas: {len(result)}")
