archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = """function renderizarAds(pantalla){
  const el=document.getElementById('ads-'+pantalla);
  if(!el)return;
  const filtrados=sponsorsCache.filter(s=>{
    if(!s.activo)return false;
    const sPan=(s.pantalla||'todas').toLowerCase();
    if(sPan==='todas')return true;
    return sPan.split(',').map(x=>x.trim()).includes(pantalla);
  });
  if(!filtrados.length){el.innerHTML='';return;}
  el.innerHTML=filtrados.map(s=>{
    const img=s.imagen_url?`<img src="${s.imagen_url}">`:(s.emoji||'🎾');
    return`<div class="ad-banner" data-sid="${s.id}"><div class="ad-img">${img}</div><div class="ad-info"><div class="ad-name">${s.nombre}</div><div class="ad-promo">${s.promo}</div></div><span class="ad-tag">${s.tag}</span></div>`;
  }).join('');
  el.querySelectorAll('[data-sid]').forEach(d=>{d.onclick=()=>abrirPromoSponsor(d.getAttribute('data-sid'));});
}"""

nuevo = """function renderizarAds(pantalla){
  const el=document.getElementById('ads-'+pantalla);
  if(!el)return;
  const filtrados=sponsorsCache.filter(s=>{
    if(!s.activo)return false;
    const sApp=(s.app||'todas').toLowerCase();
    if(sApp!=='todas'&&sApp!=='padel')return false;
    const sPan=(s.pantalla||'todas').toLowerCase();
    if(sPan==='todas')return true;
    return sPan.split(',').map(x=>x.trim()).includes(pantalla);
  });
  if(!filtrados.length){el.innerHTML='';return;}
  const principal=filtrados.filter(s=>s.orden===0||s.orden==='0');
  const premium=filtrados.filter(s=>{const o=parseInt(s.orden)||0;return o>=1&&o<=2;});
  const estandar=filtrados.filter(s=>{const o=parseInt(s.orden)||0;return o>=3;});
  let html='';
  // PROMO PRINCIPAL — banner ancho completo
  if(principal.length){
    const s=principal[0];
    const img=s.imagen_url?`<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`:(s.emoji||'🎾');
    html+=`<div class="ad-card-main" data-sid="${s.id}" style="cursor:pointer;background:linear-gradient(135deg,rgba(34,197,94,.15),rgba(34,197,94,.05));border:1px solid rgba(34,197,94,.3);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">
      <div style="width:54px;height:54px;flex-shrink:0;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:28px;background:rgba(255,255,255,.06);">${img}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:var(--green);margin-bottom:2px;">⭐ PROMO PRINCIPAL</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:12px;color:var(--green);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>
    </div>`;
  }
  // PREMIUM — grid 2 columnas
  if(premium.length){
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">';
    html+=premium.map(s=>{
      const img=s.imagen_url?`<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:(s.emoji||'🎾');
      return`<div class="ad-card-prem" data-sid="${s.id}" style="cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">${img}</div>
        <div style="font-size:12px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:11px;color:var(--green);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>`;
    }).join('');
    html+='</div>';
  }
  // ESTÁNDAR — grid 3 columnas
  if(estandar.length){
    html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;align-items:start;">';
    html+=estandar.map(s=>{
      const img=s.imagen_url?`<img src="${s.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`:(s.emoji||'🎾');
      return`<div class="ad-card-std" data-sid="${s.id}" style="cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;text-align:center;min-height:90px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:24px;margin-bottom:6px;">${img}</div>
        <div style="font-size:11px;font-weight:700;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.nombre}</div>
        <div style="font-size:10px;color:var(--green);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.promo}</div>
      </div>`;
    }).join('');
    html+='</div>';
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-sid]').forEach(d=>{d.onclick=()=>abrirPromoSponsor(d.getAttribute('data-sid'));});
}"""

if viejo in contenido:
    contenido = contenido.replace(viejo, nuevo)
    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("✅ renderizarAds actualizado en padel-connect.html")
else:
    print("❌ No encontré el bloque exacto — verificar espacios o saltos de línea")
