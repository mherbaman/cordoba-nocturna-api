with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

viejo = '''async function cargarZonasPadel() {
  // Pre-cargar apellido y telefono si ya existen
  const apEl = document.getElementById('padel-apellido');
  const telEl = document.getElementById('padel-telefono');
  if(apEl && usuario?.apellido) apEl.value = usuario.apellido;
  if(telEl && usuario?.telefono) telEl.value = usuario.telefono;
  try {
    const negocios = await fetch(API+'/negocios/sesiones-activas').then(r=>r.json()).catch(()=>[]);
    // Zonas fijas de Córdoba como fallback
    const ZONAS_FIJAS = [
      'Centro', 'Nueva Córdoba', 'Güemes', 'Alberdi', 'General Paz', 'Cerro de las Rosas', 'Quebrada de las Rosas', 'Urca', 'Buen Pastor', 'Alta Córdoba', 'San Vicente', 'Talleres', 'Poeta Lugones', 'Villa del Parque', 'Jardín', 'Cañitas', 'Maipú', 'Palermo', 'Villa Belgrano', 'Arguello', 'Colinas de Vélez Sársfield', 'Villa Warcalde', 'Country Club', 'Manantiales', 'Villa Allende', 'La Calera', 'Unquillo', 'Mendiolaza', 'Salsipuedes', 'Río Ceballos', 'Otra zona'
    ];
    const sel = document.getElementById('padel-zona');
    if (!sel) return;
    // Limpiar opciones existentes excepto la primera
    while(sel.options.length > 1) sel.remove(1);
    ZONAS_FIJAS.forEach(z => {
      const opt = document.createElement('option');
      opt.value = z; opt.textContent = z;
      sel.appendChild(opt);
    });
  } catch(e) {}
}'''

nuevo = '''async function cargarZonasPadel() {
  // Pre-cargar apellido y telefono si ya existen
  const apEl = document.getElementById('padel-apellido');
  const telEl = document.getElementById('padel-telefono');
  if(apEl && usuario?.apellido) apEl.value = usuario.apellido;
  if(telEl && usuario?.telefono) telEl.value = usuario.telefono;
  // Pre-seleccionar zona si el usuario ya tiene una
  const zonaPrev = usuario?.zona_principal;
  if (zonaPrev) {
    zonaPerfilSeleccionada = zonaPrev;
    document.querySelectorAll('.zona-btn-perfil').forEach(b => {
      if (b.textContent.trim() === zonaPrev || 
         (zonaPrev === 'INTERIOR RIOIV' && b.textContent.trim() === 'Interior RIV')) {
        b.style.background = 'rgba(34,197,94,.2)';
        b.style.border = '1px solid #22c55e';
        b.style.color = '#22c55e';
        // Mostrar zonas extra
        const wrap = document.getElementById('perfil-zonas-extra-wrap');
        if (wrap) wrap.style.display = 'block';
        renderZonasExtraChips('perfil-zonas-extra-chips', zonaPrev, zonasExtraPerfil, (z) => {
          const idx = zonasExtraPerfil.indexOf(z);
          if (idx > -1) { zonasExtraPerfil.splice(idx, 1); }
          else if (zonasExtraPerfil.length < 2) { zonasExtraPerfil.push(z); }
          renderZonasExtraChips('perfil-zonas-extra-chips', zonaPrev, zonasExtraPerfil, arguments.callee);
        });
      }
    });
  }
}'''

content = content.replace(viejo, nuevo)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
