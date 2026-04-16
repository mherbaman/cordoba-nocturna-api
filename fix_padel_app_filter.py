archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = """    const sApp=(s.app||'todas').toLowerCase();
    if(sApp!=='todas'&&sApp!=='padel')return false;
    const sPan=(s.pantalla||'todas').toLowerCase();"""

nuevo = """    const sApp=(s.app||'todas').toLowerCase();
    if(sApp!=='todas'&&!sApp.split(',').map(x=>x.trim()).includes('padel'))return false;
    const sPan=(s.pantalla||'todas').toLowerCase();"""

if viejo in contenido:
    contenido = contenido.replace(viejo, nuevo)
    with open(archivo, 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("✅ Filtro app corregido — ahora respeta multi-app")
else:
    print("❌ No encontré el bloque")
