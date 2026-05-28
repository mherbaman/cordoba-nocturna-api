with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    lines = f.readlines()

OPCIONES_NUEVAS = [
    '      <option value="">📍 Todas las zonas</option>\n',
    '      <option value="CBA Centro">CBA Centro</option>\n',
    '      <option value="CBA Norte">CBA Norte</option>\n',
    '      <option value="CBA Sur">CBA Sur</option>\n',
    '      <option value="CBA Este">CBA Este</option>\n',
    '      <option value="CBA Oeste">CBA Oeste</option>\n',
    '      <option value="INTERIOR RIOIV">Interior RIV</option>\n',
]

def reemplazar_opciones(lines, start_idx):
    # Desde start_idx borrar hasta encontrar </select>
    i = start_idx
    while i < len(lines) and '</select>' not in lines[i]:
        lines[i] = ''
        i += 1
    # Insertar opciones nuevas antes del </select>
    lines[i] = '    </select>\n'
    for j, opt in enumerate(reversed(OPCIONES_NUEVAS)):
        lines.insert(i, opt)
    return lines

# Encontrar los dos selectores con opciones viejas
count = 0
i = 0
while i < len(lines) and count < 2:
    if 'id="pp-filtro-zona"' in lines[i] or 'id="clubes-filtro-zona"' in lines[i]:
        # La siguiente linea es la primera option
        lines = reemplazar_opciones(lines, i + 1)
        count += 1
    i += 1

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.writelines(lines)

print(f"Reemplazados: {count} selectores")
