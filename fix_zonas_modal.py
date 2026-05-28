with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

viejo = '''function renderZonasModal() {
  const el = document.getElementById('modal-zonas-chips');
  if (!el) return;
  el.innerHTML = ZONAS_MODAL.map(z => {
    if (z === '+ Otra zona') {
      return `<button class="pv-chip" onclick="agregarZonaCustom()" style="border-style:dashed">+ Otra zona</button>`;
    }
    const sel = zonasModal.includes(z);
    return `<button class="pv-chip ${sel?'sel':''}" onclick="toggleZonaModal(this,'${z}')">${z}</button>`;
  }).join('') + `<div id="zona-custom-input" style="display:none;width:100%;margin-top:8px;gap:6px">
    <input id="zona-custom-val" class="input-field" style="margin:0;flex:1;font-size:13px" placeholder="Escribí tu zona...">
    <button onclick="confirmarZonaCustom()" style="background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.3);color:var(--green);padding:8px 14px;border-radius:50px;font-size:12px;font-weight:600;cursor:pointer">+</button>
  </div>`;
  // Mostrar input si hay zonas custom
  const customZonas = zonasModal.filter(z => !ZONAS_MODAL.includes(z) && z !== '+ Otra zona');
  if (customZonas.length) {
    customZonas.forEach(z => {
      const btn = document.createElement('button');
      btn.className = 'pv-chip sel';
      btn.textContent = z;
      btn.onclick = () => toggleZonaModal(btn, z);
      el.insertBefore(btn, el.lastChild);
    });
  }
}'''

nuevo = '''function renderZonasModal() {
  const el = document.getElementById('modal-zonas-chips');
  if (!el) return;
  el.innerHTML = ZONAS_DISPONIBLES.map(z => {
    const sel = zonasModal.includes(z);
    return `<button class="pv-chip ${sel?'sel':''}" onclick="toggleZonaModal(this,'${z}')">${z}</button>`;
  }).join('');
}'''

content = content.replace(viejo, nuevo)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
