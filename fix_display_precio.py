with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'r') as f:
    lines = f.readlines()

i = 749  # línea 750 (índice 749)
print(f"Línea actual: {lines[i][:80]}")
lines[i] = '            \'<div style="color:var(--muted);font-size:12px;margin-top:2px">🏟️ Cancha N°\' + (t.numero_cancha||1) + \' · <span style="text-decoration:line-through;opacity:.5">$\' + Math.round(t.precio_por_hora) + \'</span> <span style="color:#22c55e;font-weight:700">📱 $\' + Math.round(t.precio_app||t.precio_por_hora) + \'</span> · \' + t.cantidad_canchas + \' turno(s) máx</div>\' +\n'

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/negocio.html', 'w') as f:
    f.writelines(lines)
print("✅ Fix aplicado")
