ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('<!-- --- SECCION PARTIDOS PUBLICOS')
if start == -1:
    start = html.find('<!-- \u2500\u2500\u2500 SECCI\u00d3N PARTIDOS P\u00daBLICOS')
print("start:", start)

end_marker = 'id="admin-partidos-pub-list"'
end_idx = html.find(end_marker)
print("end_marker idx:", end_idx)

# Encontrar el cierre de la seccion: dos </div> despues del marcador
close1 = html.find('</div>', end_idx)
close2 = html.find('</div>', close1 + 1)
close3 = html.find('</div>', close2 + 1)
end = close3 + 6
print("end:", end)
print("Seccion preview:", html[start:start+80])
print("Seccion final:", html[end-50:end+10])
