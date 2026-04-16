archivo = '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html'

with open(archivo, 'r', encoding='utf-8') as f:
    contenido = f.read()

viejo = '    <div style="padding:12px 16px 0;width:100%;max-width:420px">\n      <select id="filtro-zona"'

nuevo = '    <div style="padding:12px 16px 0;width:100%;max-width:420px;margin:0 auto">\n      <select id="filtro-zona"'

viejo2 = '    <div id="jugadores-padel-list" style="width:100%;max-width:420px;padding:10px 16px 80px;display:flex;flex-direction:column;gap:12px">'

nuevo2 = '    <div id="jugadores-padel-list" style="width:100%;max-width:420px;padding:10px 16px 80px;display:flex;flex-direction:column;gap:12px;margin:0 auto">'

ok1 = viejo in contenido
ok2 = viejo2 in contenido

if ok1:
    contenido = contenido.replace(viejo, nuevo)
if ok2:
    contenido = contenido.replace(viejo2, nuevo2)

with open(archivo, 'w', encoding='utf-8') as f:
    f.write(contenido)

print(f"✅ filtro-zona centrado: {ok1}")
print(f"✅ jugadores-list centrado: {ok2}")
