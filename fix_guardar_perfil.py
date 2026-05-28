with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

viejo = '''  errEl.style.display='none';
  // Guardar apellido y telefono en el perfil del usuario
  try {
    const upd = await api('/auth/perfil', { method:'PUT', body:JSON.stringify({ apellido, telefono }) });
    usuario.apellido = upd.apellido;
    usuario.telefono = upd.telefono;
    localStorage.setItem('cl_usuario', JSON.stringify(usuario));
  } catch(e) {}
  showLoader('Guardando perfil...');
  try {
    await api('/padel/jugadores', { method:'POST', body:JSON.stringify({
      usuario_id: usuario.id,
      nombre: usuario.nombre,
      nivel: nivelSeleccionado,
      zona,
      zona_principal: zona,
      zonas_extra: zonasExtraPerfil,
      foto_url: usuario.foto_url || null
    })});
    perfilPadel = { nivel: nivelSeleccionado, zona };
    await cargarJugadoresPadel();
    showScreen('swipe');
  } catch(err) {
    errEl.textContent = err.message; errEl.style.display='block';
  } finally { hideLoader(); }
}'''

nuevo = '''  errEl.style.display='none';
  showLoader('Guardando perfil...');
  try {
    // Guardar apellido y telefono
    try {
      const upd = await api('/auth/perfil', { method:'PUT', body:JSON.stringify({ apellido, telefono }) });
      if (upd && upd.apellido) {
        usuario.apellido = upd.apellido;
        usuario.telefono = upd.telefono;
        localStorage.setItem('cl_usuario', JSON.stringify(usuario));
      }
    } catch(e) { console.warn('PUT perfil:', e.message); }
    // Guardar perfil jugador
    await api('/padel/jugadores', { method:'POST', body:JSON.stringify({
      usuario_id: usuario.id,
      nombre: usuario.nombre,
      nivel: nivelSeleccionado,
      zona,
      zona_principal: zona,
      zonas_extra: zonasExtraPerfil,
      foto_url: usuario.foto_url || null
    })});
    perfilPadel = { nivel: nivelSeleccionado, zona };
    await cargarJugadoresPadel();
    showScreen('swipe');
  } catch(err) {
    errEl.textContent = err.message; errEl.style.display='block';
  } finally { hideLoader(); }
}'''

content = content.replace(viejo, nuevo)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
