archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/index.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = """function renderMsgs(msgs) {
  const container = document.getElementById('chat-messages');
  if (!msgs.length) {
    container.innerHTML = `<div class="no-msgs">Mandá el primer mensaje 👋</div>`;
    return;
  }
  container.innerHTML = msgs.map(m => {
    const esMio = m.de_usuario === usuario.id;
    const hora = new Date(m.creado_en).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    return `<div class="msg ${esMio?'mine':'theirs'}">
      <div class="msg-bubble">${escapeHtml(m.texto)}</div>
      <div class="msg-time">${hora}</div>
    </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}"""

nuevo = """function renderChatSponsors() {
  const filtrados = sponsorsCache.filter(s => {
    if (!s.activo) return false;
    const sApp = (s.app || 'todas').toLowerCase();
    if (sApp !== 'todas' && !sApp.split(',').map(x => x.trim()).includes('córdoba')) return false;
    const sPan = (s.pantalla || 'todas').toLowerCase();
    const pans = sPan.split(',').map(x => x.trim());
    return sPan === 'todas' || pans.includes('chat') || (s.orden === 0 || s.orden === '0');
  });
  if (!filtrados.length) return '';
  const principal = filtrados.filter(s => s.orden === 0 || s.orden === '0');
  const premium   = filtrados.filter(s => { const o = parseInt(s.orden)||0; return o >= 1 && o <= 2; });
  const estandar  = filtrados.filter(s => { const o = parseInt(s.orden)||0; return o >= 3; });
  let html = '<div id="chat-sponsors" style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.06);">';
  // PROMO PRINCIPAL
  if (principal.length) {
    const s = principal[0];
    const img = s.imagen_url ? `<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : (s.emoji || '🎯');
    html += `<div class="ad-card-main" data-sid="${s.id}" style="cursor:pointer;background:linear-gradient(135deg,rgba(255,45,120,.15),rgba(120,40,200,.1));border:1px solid rgba(255,45,120,.3);border-radius:12px;padding:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
      <div style="width:44px;height:44px;flex-shrink:0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(255,255,255,.06);">${img}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--pink);margin-bottom:1px;">⭐ PROMO PRINCIPAL</div>
        <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:11px;color:var(--pink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>
    </div>`;
  }
  // PREMIUM — grid 2 columnas
  if (premium.length) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">';
    html += premium.map(s => {
      const img = s.imagen_url ? `<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : (s.emoji || '🎯');
      return `<div class="ad-card-prem" data-sid="${s.id}" style="cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px;text-align:center;">
        <div style="font-size:22px;margin-bottom:4px;">${img}</div>
        <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:10px;color:var(--pink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>`;
    }).join('');
    html += '</div>';
  }
  // ESTÁNDAR — grid 3 columnas
  if (estandar.length) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;align-items:start;">';
    html += estandar.map(s => {
      const img = s.imagen_url ? `<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : (s.emoji || '🎯');
      return `<div class="ad-card-std" data-sid="${s.id}" style="cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px;text-align:center;min-height:80px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:20px;margin-bottom:4px;">${img}</div>
        <div style="font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:9px;color:var(--pink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>`;
    }).join('');
    html += '</div>';
  }
  html += '</div>';
  return html;
}
function renderMsgs(msgs) {
  const container = document.getElementById('chat-messages');
  const sponsorsHtml = renderChatSponsors();
  if (!msgs.length) {
    container.innerHTML = sponsorsHtml + `<div class="no-msgs">Mandá el primer mensaje 👋</div>`;
    container.querySelectorAll('[data-sid]').forEach(d => { d.onclick = () => abrirPromoSponsor(d.getAttribute('data-sid')); });
    return;
  }
  container.innerHTML = sponsorsHtml + msgs.map(m => {
    const esMio = m.de_usuario === usuario.id;
    const hora = new Date(m.creado_en).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    return `<div class="msg ${esMio?'mine':'theirs'}">
      <div class="msg-bubble">${escapeHtml(m.texto)}</div>
      <div class="msg-time">${hora}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('[data-sid]').forEach(d => { d.onclick = () => abrirPromoSponsor(d.getAttribute('data-sid')); });
  container.scrollTop = container.scrollHeight;
}"""

if viejo in contenido:
    contenido = contenido.replace(viejo, nuevo)
    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("✅ Chat sponsors inyectado en renderMsgs")
else:
    print("❌ No encontré el bloque exacto")
